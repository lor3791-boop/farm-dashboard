// 저장소 — 화면은 이 파일의 함수만 쓴다. Firestore / 미리보기(로컬) 두 가지 구현.
// 경로: farms/{farmId}, config/thresholds, config/nameMap, logs/{auto}
import type { AppData, Farm, Thresholds, NameMapRow, UiSaved } from '@/data/types';
import { SEED_FARMS, SEED_THRESHOLDS, SEED_NAMEMAP } from '@/data/seed';
import { nowIso } from './util';

export interface Repo {
  mode: 'cloud' | 'local';
  subscribe(cb: (d: AppData) => void, onError: (e: Error) => void): () => void;
  saveFarm(f: Farm, by: string): Promise<void>;
  deleteFarm(id: string): Promise<void>;
  saveThresholds(t: Thresholds, by: string): Promise<void>;
  saveNameMap(rows: NameMapRow[], by: string): Promise<void>;
  saveUi(patch: Partial<UiSaved>, by: string): Promise<void>;
  replaceAll(d: AppData, by: string): Promise<void>;
  log(action: string, detail: string, by: string): Promise<void>;
  addDeath(d: DeathRec, by: string): Promise<void>;
  // 기록 묶음(컬렉션) — shipments(출하 직접 입력), shareDeaths(공유 화면 폐사), share(공유 화면 자료)
  watch<T>(col: string, cb: (rows: (T & { id: string })[]) => void, onError?: (e: Error) => void): () => void;
  add(col: string, data: Record<string, unknown>, by: string): Promise<void>;
  put(col: string, id: string, data: Record<string, unknown>): Promise<void>;
  remove(col: string, id: string): Promise<void>;
}

export interface DeathRec { date: string; farm: string; dong: string; group: string; count: number }
export const emptyUi = (): UiSaved => ({ planned: {}, done: {}, heatVals: {}, firstShipByFarm: {}, shareLinks: {} });
export const withUi = (u: Partial<UiSaved> | undefined): UiSaved => ({ ...emptyUi(), ...(u ?? {}) });
export const seedData = (): AppData => ({
  farms: structuredClone(SEED_FARMS),
  thresholds: structuredClone(SEED_THRESHOLDS),
  nameMap: structuredClone(SEED_NAMEMAP),
  ui: emptyUi()
});

// 저장된 기준값에 새 항목이 없으면 기본값으로 채운다 (기준값 추가 시 안전)
export const withDefaults = (t: Partial<Thresholds> | undefined): Thresholds => ({ ...SEED_THRESHOLDS, ...(t ?? {}) });

const sortFarms = (f: Farm[]) => [...f].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ko'));

// ---------- 미리보기 모드: 이 브라우저 localStorage ----------
const LS_KEY = 'farm-dashboard:v1';
export function localRepo(): Repo {
  let listeners: ((d: AppData) => void)[] = [];
  const read = (): AppData => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { const d = JSON.parse(raw); return { farms: d.farms, thresholds: withDefaults(d.thresholds), nameMap: d.nameMap, ui: withUi(d.ui) }; }
    } catch { /* 비어 있음 */ }
    const s = seedData(); write(s); return s;
  };
  const write = (d: AppData) => { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch { /* 저장 불가 */ } };
  const emit = () => { const d = read(); d.farms = sortFarms(d.farms); listeners.forEach((l) => l(d)); };
  const mut = async (fn: (d: AppData) => void) => { const d = read(); fn(d); write(d); emit(); };
  return {
    mode: 'local',
    subscribe(cb) { listeners.push(cb); setTimeout(emit, 0); return () => { listeners = listeners.filter((l) => l !== cb); }; },
    saveFarm: (f, by) => mut((d) => { const i = d.farms.findIndex((x) => x.id === f.id); const v = { ...f, updatedAt: nowIso(), updatedBy: by }; if (i >= 0) d.farms[i] = v; else d.farms.push(v); }),
    deleteFarm: (id) => mut((d) => { d.farms = d.farms.filter((x) => x.id !== id); }),
    saveThresholds: (t) => mut((d) => { d.thresholds = t; }),
    saveNameMap: (rows) => mut((d) => { d.nameMap = rows; }),
    saveUi: (p) => mut((d) => { d.ui = { ...d.ui, ...p }; }),
    replaceAll: (n) => mut((d) => { d.farms = n.farms; d.thresholds = withDefaults(n.thresholds); d.nameMap = n.nameMap; if (n.ui) d.ui = withUi(n.ui); }),
    log: async () => {},
    ...localCols(),
    addDeath: async (r, by) => { try { const k = 'farm-dashboard:deaths'; const L = JSON.parse(localStorage.getItem(k) || '[]'); L.push({ ...r, by, at: nowIso() }); localStorage.setItem(k, JSON.stringify(L)); } catch { /* 저장 불가 */ } }
  };
}

// 미리보기 모드의 컬렉션: localStorage 'farm-dashboard:col:<이름>'
function localCols() {
  const subs: Record<string, ((r: any[]) => void)[]> = {};
  const key = (c: string) => 'farm-dashboard:col:' + c;
  const read = (c: string): any[] => { try { return JSON.parse(localStorage.getItem(key(c)) || '[]'); } catch { return []; } };
  const write = (c: string, rows: any[]) => { try { localStorage.setItem(key(c), JSON.stringify(rows)); } catch { /* 저장 불가 */ } (subs[c] || []).forEach((f) => f(rows)); };
  return {
    watch: (c: string, cb: (r: any[]) => void) => { (subs[c] ||= []).push(cb); setTimeout(() => cb(read(c)), 0); return () => { subs[c] = subs[c].filter((f) => f !== cb); }; },
    add: async (c: string, d: Record<string, unknown>, by: string) => { write(c, [...read(c), { ...d, id: Math.random().toString(36).slice(2, 12), by, at: nowIso() }]); },
    put: async (c: string, id: string, d: Record<string, unknown>) => { write(c, [...read(c).filter((x) => x.id !== id), { ...d, id }]); },
    remove: async (c: string, id: string) => { write(c, read(c).filter((x) => x.id !== id)); }
  };
}

// ---------- 클라우드 모드: Firestore ----------
export async function cloudRepo(config: Record<string, string>): Promise<Repo> {
  const { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, addDoc, getDocs, initializeFirestore, persistentLocalCache } = await import('firebase/firestore');
  const { getApp } = await import('firebase/app');
  const app = getApp();
  let db;
  try { db = initializeFirestore(app, { localCache: persistentLocalCache() }); } catch { db = getFirestore(app); }
  const farmsCol = collection(db, 'farms');
  const thrDoc = doc(db, 'config', 'thresholds');
  const nmDoc = doc(db, 'config', 'nameMap');
  const uiDoc = doc(db, 'config', 'ui');
  void config;

  return {
    mode: 'cloud',
    subscribe(cb, onError) {
      let farms: Farm[] | null = null, thr: Thresholds | null = null, nm: NameMapRow[] | null = null, ui: UiSaved | null = null;
      let seeded = false;
      const push = () => { if (farms && thr && nm && ui) cb({ farms: sortFarms(farms), thresholds: thr, nameMap: nm, ui }); };
      const seedIfEmpty = async () => {
        if (seeded) return; seeded = true;
        const s = seedData(); const b = writeBatch(db);
        s.farms.forEach((f) => b.set(doc(farmsCol, f.id), { ...f, updatedAt: nowIso(), updatedBy: 'seed' }));
        b.set(thrDoc, s.thresholds); b.set(nmDoc, { rows: s.nameMap });
        await b.commit();
      };
      const u1 = onSnapshot(farmsCol, (s) => {
        farms = s.docs.map((d) => d.data() as Farm);
        if (farms.length === 0 && !s.metadata.fromCache) seedIfEmpty().catch(onError);
        push();
      }, onError);
      const u2 = onSnapshot(thrDoc, (s) => { thr = withDefaults(s.exists() ? (s.data() as Thresholds) : undefined); push(); }, onError);
      const u3 = onSnapshot(nmDoc, (s) => { nm = s.exists() ? ((s.data().rows ?? []) as NameMapRow[]) : []; push(); }, onError);
      const u4 = onSnapshot(uiDoc, (s) => { ui = withUi(s.exists() ? (s.data() as UiSaved) : undefined); push(); }, onError);
      return () => { u1(); u2(); u3(); u4(); };
    },
    saveFarm: (f, by) => setDoc(doc(farmsCol, f.id), { ...f, updatedAt: nowIso(), updatedBy: by }),
    deleteFarm: (id) => deleteDoc(doc(farmsCol, id)),
    saveThresholds: (t, by) => setDoc(thrDoc, { ...t, updatedAt: nowIso(), updatedBy: by } as any),
    saveNameMap: (rows, by) => setDoc(nmDoc, { rows, updatedAt: nowIso(), updatedBy: by }),
    saveUi: (p, by) => setDoc(uiDoc, { ...p, updatedAt: nowIso(), updatedBy: by }, { mergeFields: [...Object.keys(p), 'updatedAt', 'updatedBy'] }),
    async replaceAll(d, by) {
      const existing = await getDocs(farmsCol);
      const b = writeBatch(db);
      existing.docs.forEach((x) => { if (!d.farms.some((f) => f.id === x.id)) b.delete(x.ref); });
      d.farms.forEach((f) => b.set(doc(farmsCol, f.id), { ...f, updatedAt: nowIso(), updatedBy: by }));
      b.set(thrDoc, { ...withDefaults(d.thresholds), updatedAt: nowIso(), updatedBy: by });
      b.set(nmDoc, { rows: d.nameMap, updatedAt: nowIso(), updatedBy: by });
      if (d.ui) b.set(uiDoc, { ...withUi(d.ui), updatedAt: nowIso(), updatedBy: by });
      await b.commit();
    },
    log: async (action, detail, by) => { await addDoc(collection(db, 'logs'), { action, detail, by, at: nowIso() }); },
    addDeath: async (r, by) => { await addDoc(collection(db, 'deaths'), { ...r, by, at: nowIso(), checked: false }); },
    watch: (c, cb, onError) => onSnapshot(collection(db, c), (s) => cb(s.docs.map((d) => ({ ...(d.data() as any), id: d.id }))), (e) => onError?.(e)),
    add: async (c, d, by) => { await addDoc(collection(db, c), { ...d, by, at: nowIso() }); },
    put: async (c, id, d) => { await setDoc(doc(db, c, id), d); },
    remove: async (c, id) => { await deleteDoc(doc(db, c, id)); }
  };
}

// 저장소 — 화면은 이 파일의 함수만 쓴다. Firestore / 미리보기(로컬) 두 가지 구현.
// 경로: farms/{farmId}, config/thresholds, config/nameMap, logs/{auto}
import type { AppData, Farm, Thresholds, NameMapRow } from '@/data/types';
import { SEED_FARMS, SEED_THRESHOLDS, SEED_NAMEMAP } from '@/data/seed';
import { nowIso } from './util';

export interface Repo {
  mode: 'cloud' | 'local';
  subscribe(cb: (d: AppData) => void, onError: (e: Error) => void): () => void;
  saveFarm(f: Farm, by: string): Promise<void>;
  deleteFarm(id: string): Promise<void>;
  saveThresholds(t: Thresholds, by: string): Promise<void>;
  saveNameMap(rows: NameMapRow[], by: string): Promise<void>;
  replaceAll(d: AppData, by: string): Promise<void>;
  log(action: string, detail: string, by: string): Promise<void>;
}

export const seedData = (): AppData => ({
  farms: structuredClone(SEED_FARMS),
  thresholds: structuredClone(SEED_THRESHOLDS),
  nameMap: structuredClone(SEED_NAMEMAP)
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
      if (raw) { const d = JSON.parse(raw); return { farms: d.farms, thresholds: withDefaults(d.thresholds), nameMap: d.nameMap }; }
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
    replaceAll: (n) => mut((d) => { d.farms = n.farms; d.thresholds = withDefaults(n.thresholds); d.nameMap = n.nameMap; }),
    log: async () => {}
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
  void config;

  return {
    mode: 'cloud',
    subscribe(cb, onError) {
      let farms: Farm[] | null = null, thr: Thresholds | null = null, nm: NameMapRow[] | null = null;
      let seeded = false;
      const push = () => { if (farms && thr && nm) cb({ farms: sortFarms(farms), thresholds: thr, nameMap: nm }); };
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
      return () => { u1(); u2(); u3(); };
    },
    saveFarm: (f, by) => setDoc(doc(farmsCol, f.id), { ...f, updatedAt: nowIso(), updatedBy: by }),
    deleteFarm: (id) => deleteDoc(doc(farmsCol, id)),
    saveThresholds: (t, by) => setDoc(thrDoc, { ...t, updatedAt: nowIso(), updatedBy: by } as any),
    saveNameMap: (rows, by) => setDoc(nmDoc, { rows, updatedAt: nowIso(), updatedBy: by }),
    async replaceAll(d, by) {
      const existing = await getDocs(farmsCol);
      const b = writeBatch(db);
      existing.docs.forEach((x) => { if (!d.farms.some((f) => f.id === x.id)) b.delete(x.ref); });
      d.farms.forEach((f) => b.set(doc(farmsCol, f.id), { ...f, updatedAt: nowIso(), updatedBy: by }));
      b.set(thrDoc, { ...withDefaults(d.thresholds), updatedAt: nowIso(), updatedBy: by });
      b.set(nmDoc, { rows: d.nameMap, updatedAt: nowIso(), updatedBy: by });
      await b.commit();
    },
    log: async (action, detail, by) => { await addDoc(collection(db, 'logs'), { action, detail, by, at: nowIso() }); }
  };
}

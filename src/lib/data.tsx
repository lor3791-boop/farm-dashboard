// 앱 데이터 컨텍스트 — 저장소를 구독해 화면에 실시간으로 내려준다. (설정 + 폐사 기록 + 출하 기록)
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppData, ManualShip } from '@/data/types';
import type { DeathRow } from './repo';
import type { ManualGroup } from './calc/herd';
import { mergeImports, type ShipImport, type ImpRow } from './shipImport';
import { unpackTotal, type TotRow } from './shipTotal';
import type { FcBaseDoc, FcBaseMonths } from './fcBase';
import { setShipBase } from './calc/ship';
import type { Loan, Monthly, FeedBin } from './bonds';

// config 컬렉션에 저장하는 올린 파일 3종 (규칙 추가 없이 관리자만 읽고 씀)
export interface TotalDoc { file: string; at: string; rows: string[] }
export interface LoanDoc { file: string; at: string; base: string; rows: string }       // rows: Loan[] JSON
export interface MonthlyDoc { file: string; at: string; rows: string; bins: string }   // Monthly[] / FeedBin[] JSON
export interface Uploaded { total: { doc: TotalDoc | null; rows: TotRow[] }; loans: { doc: LoanDoc | null; rows: Loan[] }; monthly: { doc: MonthlyDoc | null; rows: Monthly[]; bins: FeedBin[] }; fcBase: { doc: FcBaseDoc | null; months: FcBaseMonths }; fcRest: { ym: string; at: string; farms: Record<string, number> } }
const parseJ = <T,>(s: string | undefined, d: T): T => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
import { useMemo } from 'react';
import { setPyesaKey, onPyesaChange, loadSheet, pendingRows, dropSentBefore, onPendChange } from './pyesa';
import { REF } from './calc/herd';
import { todayKST } from './util';
import { useAuth } from './auth';

// removing: 농장 공유 화면에서 지운 폐사(removedAt) — 시트로 보낸 줄(rows)까지 대시보드가 지운다
export interface Removing { doc: DeathRow; rows: DeathRow[] }
// resync: 시트로 보낸 뒤 농장이 고친 폐사 → 시트 줄도 같은 값으로 고친다
export interface Resync { doc: DeathRow; rows: DeathRow[] }
// 농장이 공유 화면에서 고친·지운 '다른 곳 입력' 폐사 (share/{열쇠}/fixes) — target 못 찾으면 undefined
export interface FarmFix { id: string; _path: string; farm: string; ref: string; was: { date: string; dong: string; group: string; count: number }; date: string; dong: string; group: string; count: number; remove?: boolean; at: string }
export interface Fixing { fix: FarmFix; target?: DeathRow }
interface DataState { data: AppData | null; error: string; deaths: DeathRow[]; removing: Removing[]; resync: Resync[]; fixing: Fixing[]; relink: DeathRow[]; ships: (ManualShip & { id: string })[]; groups: (ManualGroup & { id: string })[]; uploads: (ShipImport & { id: string })[]; imports: ImpRow[]; sheetErr: string; loading: boolean; refresh: () => Promise<void>; up: Uploaded }
const Ctx = createContext<DataState>({ data: null, error: '', deaths: [], removing: [], resync: [], fixing: [], relink: [], ships: [], groups: [], uploads: [], imports: [], sheetErr: '', loading: true, refresh: async () => {}, up: { total: { doc: null, rows: [] }, loans: { doc: null, rows: [] }, monthly: { doc: null, rows: [], bins: [] }, fcBase: { doc: null, months: {} }, fcRest: { ym: '', at: '', farms: {} } } });
export const useData = () => useContext(Ctx);

export function DataProvider({ children }: { children: ReactNode }) {
  const { repo } = useAuth();
  const [st, set] = useState<{ data: AppData | null; error: string }>({ data: null, error: '' });
  const [fsDeaths, setDeaths] = useState<DeathRow[]>([]);
  const [sheet, setSheet] = useState<DeathRow[]>([]);
  // 저장을 눌렀지만 시트에 아직 안 들어온 줄 (바로 화면에 반영)
  const [pend, setPend] = useState<DeathRow[]>([]);
  const [fixes, setFixes] = useState<FarmFix[]>([]);
  useEffect(() => onPendChange(() => setPend([...pendingRows()])), []);
  const [sheetErr, setSheetErr] = useState('');
  const [sheetReady, setSheetReady] = useState(false);
  const loadRef = useRef<() => Promise<void>>(async () => {});
  const [ships, setShips] = useState<(ManualShip & { id: string })[]>([]);
  const [groups, setGroups] = useState<(ManualGroup & { id: string })[]>([]);
  const [uploads, setUploads] = useState<(ShipImport & { id: string })[]>([]);
  const imports = useMemo(() => mergeImports(uploads), [uploads]);
  const [cfg, setCfg] = useState<Record<string, any>>({});
  const up: Uploaded = useMemo(() => {
    const t = cfg.shipTotal as TotalDoc | undefined, l = cfg.bondLoan as LoanDoc | undefined, m = cfg.bondMonthly as MonthlyDoc | undefined;
    const fb = cfg.fcBase as FcBaseDoc | undefined;
    return { total: { doc: t ?? null, rows: unpackTotal(t?.rows) }, loans: { doc: l ?? null, rows: parseJ<Loan[]>(l?.rows, []) }, monthly: { doc: m ?? null, rows: parseJ<Monthly[]>(m?.rows, []), bins: parseJ<FeedBin[]>(m?.bins, []) }, fcBase: { doc: fb ?? null, months: parseJ<FcBaseMonths>(fb?.months, {}) },
      // 원료돈: 이번 달 말일까지 예상 출하(직접 입력) — 농장별 두수
      fcRest: { ym: cfg.fcRest?.ym ?? '', at: cfg.fcRest?.at ?? '', farms: parseJ<Record<string, number>>(cfg.fcRest?.farms, {}) } };
  }, [cfg]);
  // 출하실적종합을 올렸으면 그 기간은 올린 값을 쓴다 (화면이 그리기 전에 바꿔 둠)
  useMemo(() => setShipBase(up.total.rows), [up.total.rows]);
  useEffect(() => {
    if (!repo) return;
    const u1 = repo.subscribe((d) => set({ data: d, error: '' }), (e) => set((p) => ({ ...p, error: e.message })));
    const u2 = repo.watchDeaths(setDeaths, (e) => set((p) => ({ ...p, error: e.message })));
    const u3 = repo.watch<ManualShip>('shipments', setShips);
    const u4 = repo.watch<ManualGroup>('groups', setGroups);
    const u5 = repo.watch<ShipImport>('shipImport', setUploads);
    const u7 = repo.watch<FarmFix>('**/fixes', (L) => setFixes(L as FarmFix[]), () => {});
    const u6 = repo.watch<any>('config', (L) => { const o: Record<string, any> = {}; L.forEach((d) => { if (['shipTotal', 'bondLoan', 'bondMonthly', 'fcBase', 'fcRest'].includes(d.id)) o[d.id] = d; }); setCfg(o); });
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, [repo]);
  // 폐사입력 앱(구글시트) 기록: 기준일 이후를 1분마다, 저장·수정 직후에 다시 읽는다
  const key = (st.data?.ui as any)?.pyesaKey ?? '';
  const farmNames = useMemo(() => (st.data?.farms ?? []).map((f) => f.name), [st.data?.farms]);
  useEffect(() => {
    setPyesaKey(key);
    if (!key) { setSheet([]); loadRef.current = async () => {}; return; }
    let alive = true;
    // 폐사입력 앱 기록은 120일치를 읽는다 (폐사현황·목록용. 재고 차감은 기준일 이후 + 미등록 전부)
    const days = Math.max(120, Math.round((Date.parse(todayKST()) - Date.parse(REF)) / 864e5) + 1);
    // 읽는 중에 또 불리면 겹쳐 읽지 않고, 끝난 뒤 한 번만 더 읽는다
    let running: Promise<void> | null = null, again = false;
    const once = (): Promise<void> => { const t0 = Date.now(); return loadSheet(days, farmNames).then((r) => { if (alive) { setSheet(r); setSheetErr(''); dropSentBefore(t0); } }).catch((e) => { if (alive) setSheetErr(String(e.message || e)); }).finally(() => alive && setSheetReady(true)); };
    const load = (): Promise<void> => {
      if (running) { again = true; return running; }
      running = once().finally(() => { running = null; if (again && alive) { again = false; load(); } });
      return running;
    };
    loadRef.current = load;
    load();
    const t = setInterval(load, 60000);
    const off = onPyesaChange(load);
    return () => { alive = false; clearInterval(t); off(); };
  }, [key, farmNames]);
  // 공유 화면 폐사를 시트로 보낸 것(sheetAt)은 원본을 빼고 시트 줄 하나로 본다 (열쇠는 이어받아 공유 화면 계산이 겹치지 않게)
  const { deaths, removing, resync, fixing, relink } = useMemo(() => {
    const ck = (d: DeathRow) => [d.date, d.farm, d.group, d.count].join('|'); // 동은 표기가 달 수 있어 비교에서 뺌
    // 시트로 보낼 때의 값(sheetWas)으로 짝을 찾는다 — 그 뒤 농장이 고쳐도 같은 시트 줄을 가리키게
    const was = (d: DeathRow) => ((d as any).sheetWas ?? d) as { date: string; dong: string; group: string; count: number };
    const ckD = (d: DeathRow) => { const w = was(d); return [w.date, d.farm, w.group, w.count].join('|'); };
    // 농장이 시트로 보낸 뒤 값을 고쳤거나(보낼 때 값과 다름) 사진을 고쳤으면(photosAt) 시트 줄도 맞춰야 함
    const edited = (d: DeathRow) => { const w = was(d); return w.date !== d.date || String(w.dong ?? '') !== String(d.dong ?? '') || w.group !== d.group || w.count !== d.count || ((d as any).photosAt ?? '') > ((d as any).sheetAt ?? ''); };
    void ck;
    const take = new Map<string, DeathRow>(); // 시트 줄 id → 공유 화면 원본
    const gone = (d: DeathRow) => !!(d as any).removedAt;
    // 시트로 보냈거나(sheetAt) 보내는 중이었거나(sheetTry) 20분 넘게 지난 농장 입력은 시트에서 짝을 찾는다
    const sent = (d: DeathRow) => !!(d as any).sheetAt || !!(d as any).sheetTry || (d.src === 'share' && Date.now() - Date.parse(d.at || '') > 20 * 60e3);
    // 짝 = 같은 날·농장·그룹 시트 줄 중 두수 합이 보낼 때 두수인 1~3줄 (크레임 처리로 '크레임 n + 폐사 m' 두 줄로 나뉘어도 같은 기록)
    const dg = (x: unknown) => String(x ?? '').replace(/\D/g, '');
    const findRows = (d: DeathRow): DeathRow[] | null => {
      const w = was(d), wd = dg(w.dong);
      const C = sheet.filter((r) => !take.has(r.id) && r.date === w.date && r.farm === d.farm && r.group === w.group)
        .sort((a, b) => Number(dg(b.dong) === wd) - Number(dg(a.dong) === wd) || Number(b.sheetRow) - Number(a.sheetRow));
      const one = C.find((r) => r.count === w.count); if (one) return [one];
      const same = C.filter((r) => dg(r.dong) === wd);
      for (const L of [same, C]) {
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
          if (L[i].count + L[j].count === w.count) return [L[i], L[j]];
          for (let k = j + 1; k < L.length; k++) if (L[i].count + L[j].count + L[k].count === w.count) return [L[i], L[j], L[k]];
        }
      }
      return null;
    };
    // 지운 것도 먼저 짝을 찾아 둬야 그 시트 줄을 알 수 있다 → 지운 것부터, 그다음 오래된 순
    const fsAll = [...fsDeaths].sort((a, b) => Number(gone(b)) - Number(gone(a)) || String(a.at).localeCompare(String(b.at)));
    const got = new Map<string, DeathRow[]>(); // 원본 id → 짝 시트 줄들
    const fs = fsAll.filter((d) => { if (!sent(d)) return !gone(d); const m = findRows(d); if (!m) return !gone(d); m.forEach((r) => take.set(r.id, d)); got.set(d.id, m); return false; })
      .map((d) => (d.src === 'share' ? { ...d, byFarm: true } : d));
    // 짝은 찾았는데 '보냈음' 표시가 없는 원본 → 표시만 붙인다 (다시 보내면 중복)
    const rl = fsAll.filter((d) => got.has(d.id) && !(d as any).sheetAt && !gone(d));
    const rm = new Map<string, Removing>(); fsDeaths.filter(gone).forEach((d) => rm.set(d.id, { doc: d, rows: [] }));
    const rows: DeathRow[] = [], rs: Resync[] = [];
    const doneDoc = new Set<string>();
    sheet.forEach((r) => {
      const o = take.get(r.id);
      if (!o) { rows.push(r); return; }
      // 농장이 고친 값을 바로 보여 주고(공유 화면과 같게), 시트 줄은 대시보드가 뒤에서 고친다 (나뉜 줄은 한 줄로 보여 줌)
      if (!gone(o) && (o as any).sheetAt && edited(o)) { if (!doneDoc.has(o.id)) { doneDoc.add(o.id); const R = got.get(o.id)!; rs.push({ doc: o, rows: R }); rows.push({ ...R[0], date: o.date, dong: o.dong, group: o.group, count: o.count, key: o.key, byFarm: true, farmDoc: o.path }); } return; }
      // 피그온에 이미 등록한 줄은 자동으로 안 지우고 '농장 삭제 요청'으로 남김 (피그온도 고쳐야 하므로)
      if (gone(o)) { if (r.checked) rows.push({ ...r, key: o.key, byFarm: true, delReq: true }); else rm.get(o.id)!.rows.push(r); return; }
      rows.push({ ...r, key: o.key, byFarm: true, farmDoc: o.path });
    });
    // 농장이 고친·지운 '다른 곳 입력' 폐사를 바로 반영 (피그온 등록된 줄을 지우라는 건 남기고 '삭제 요청' 표시)
    let list = fs.concat(rows);
    const fx: Fixing[] = fixes.map((f) => {
      const same = (d: DeathRow) => d.farm === f.farm && d.date === f.was.date && d.group === f.was.group && d.count === f.was.count && !d.byFarm;
      const t = list.find((d) => d.path === f.ref && same(d)) ?? list.find((d) => same(d) && String(d.dong ?? '') === String(f.was.dong ?? ''));
      if (t) list = f.remove ? (t.checked ? list.map((d) => (d === t ? { ...d, delReq: true } : d)) : list.filter((d) => d !== t)) : list.map((d) => (d === t ? { ...d, date: f.date, dong: f.dong, group: f.group, count: f.count } : d));
      return { fix: f, target: t };
    });
    return { deaths: list.concat(pend), removing: [...rm.values()], resync: rs, fixing: fx, relink: rl };
  }, [fsDeaths, sheet, pend, fixes]);
  const loading = !st.data || (!!key && !sheetReady);
  const refresh = useCallback(() => loadRef.current(), []);
  return <Ctx.Provider value={{ ...st, deaths, removing, resync, fixing, relink, ships, groups, uploads, imports, sheetErr, loading, refresh, up }}>{children}</Ctx.Provider>;
}

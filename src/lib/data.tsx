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
export interface Uploaded { total: { doc: TotalDoc | null; rows: TotRow[] }; loans: { doc: LoanDoc | null; rows: Loan[] }; monthly: { doc: MonthlyDoc | null; rows: Monthly[]; bins: FeedBin[] }; fcBase: { doc: FcBaseDoc | null; months: FcBaseMonths } }
const parseJ = <T,>(s: string | undefined, d: T): T => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
import { useMemo } from 'react';
import { setPyesaKey, onPyesaChange, loadSheet } from './pyesa';
import { REF } from './calc/herd';
import { todayKST } from './util';
import { useAuth } from './auth';

interface DataState { data: AppData | null; error: string; deaths: DeathRow[]; ships: (ManualShip & { id: string })[]; groups: (ManualGroup & { id: string })[]; uploads: (ShipImport & { id: string })[]; imports: ImpRow[]; sheetErr: string; loading: boolean; refresh: () => Promise<void>; up: Uploaded }
const Ctx = createContext<DataState>({ data: null, error: '', deaths: [], ships: [], groups: [], uploads: [], imports: [], sheetErr: '', loading: true, refresh: async () => {}, up: { total: { doc: null, rows: [] }, loans: { doc: null, rows: [] }, monthly: { doc: null, rows: [], bins: [] }, fcBase: { doc: null, months: {} } } });
export const useData = () => useContext(Ctx);

export function DataProvider({ children }: { children: ReactNode }) {
  const { repo } = useAuth();
  const [st, set] = useState<{ data: AppData | null; error: string }>({ data: null, error: '' });
  const [fsDeaths, setDeaths] = useState<DeathRow[]>([]);
  const [sheet, setSheet] = useState<DeathRow[]>([]);
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
    return { total: { doc: t ?? null, rows: unpackTotal(t?.rows) }, loans: { doc: l ?? null, rows: parseJ<Loan[]>(l?.rows, []) }, monthly: { doc: m ?? null, rows: parseJ<Monthly[]>(m?.rows, []), bins: parseJ<FeedBin[]>(m?.bins, []) }, fcBase: { doc: fb ?? null, months: parseJ<FcBaseMonths>(fb?.months, {}) } };
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
    const u6 = repo.watch<any>('config', (L) => { const o: Record<string, any> = {}; L.forEach((d) => { if (['shipTotal', 'bondLoan', 'bondMonthly', 'fcBase'].includes(d.id)) o[d.id] = d; }); setCfg(o); });
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
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
    const load = () => { return loadSheet(days, farmNames).then((r) => { if (alive) { setSheet(r); setSheetErr(''); } }).catch((e) => { if (alive) setSheetErr(String(e.message || e)); }).finally(() => alive && setSheetReady(true)); };
    loadRef.current = load;
    load();
    const t = setInterval(load, 60000);
    const off = onPyesaChange(load);
    return () => { alive = false; clearInterval(t); off(); };
  }, [key, farmNames]);
  // 공유 화면 폐사를 시트로 보낸 것(sheetAt)은 원본을 빼고 시트 줄 하나로 본다 (열쇠는 이어받아 공유 화면 계산이 겹치지 않게)
  const deaths = useMemo(() => {
    const ck = (d: DeathRow) => [d.date, d.farm, d.group, d.count].join('|'); // 동은 표기가 달 수 있어 비교에서 뺌
    const pool = new Map<string, DeathRow[]>(); sheet.forEach((r) => { const k = ck(r); pool.set(k, [...(pool.get(k) ?? []), r]); });
    const take = new Map<string, string>(); // 시트 줄 id → 공유 화면 열쇠
    const fs = fsDeaths.filter((d) => { if (!(d as any).sheetAt) return true; const m = (pool.get(ck(d)) ?? []).filter((r) => !take.has(r.id)).sort((a, b) => Number(String(b.dong).replace(/\D/g, '') === String(d.dong).replace(/\D/g, '')) - Number(String(a.dong).replace(/\D/g, '') === String(d.dong).replace(/\D/g, '')) || Number(b.sheetRow) - Number(a.sheetRow))[0]; if (!m) return true; take.set(m.id, d.key); return false; });
    return fs.concat(sheet.map((r) => (take.has(r.id) ? { ...r, key: take.get(r.id)! } : r)));
  }, [fsDeaths, sheet]);
  const loading = !st.data || (!!key && !sheetReady);
  const refresh = useCallback(() => loadRef.current(), []);
  return <Ctx.Provider value={{ ...st, deaths, ships, groups, uploads, imports, sheetErr, loading, refresh, up }}>{children}</Ctx.Provider>;
}

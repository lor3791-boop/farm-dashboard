// 앱 데이터 컨텍스트 — 저장소를 구독해 화면에 실시간으로 내려준다. (설정 + 폐사 기록 + 출하 기록)
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppData, ManualShip } from '@/data/types';
import type { DeathRow } from './repo';
import type { ManualGroup } from './calc/herd';
import { mergeImports, type ShipImport, type ImpRow } from './shipImport';
import { useMemo } from 'react';
import { setPyesaKey, onPyesaChange, loadSheet } from './pyesa';
import { REF } from './calc/herd';
import { todayKST } from './util';
import { useAuth } from './auth';

interface DataState { data: AppData | null; error: string; deaths: DeathRow[]; ships: (ManualShip & { id: string })[]; groups: (ManualGroup & { id: string })[]; uploads: (ShipImport & { id: string })[]; imports: ImpRow[]; sheetErr: string; loading: boolean; refresh: () => Promise<void> }
const Ctx = createContext<DataState>({ data: null, error: '', deaths: [], ships: [], groups: [], uploads: [], imports: [], sheetErr: '', loading: true, refresh: async () => {} });
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
  useEffect(() => {
    if (!repo) return;
    const u1 = repo.subscribe((d) => set({ data: d, error: '' }), (e) => set((p) => ({ ...p, error: e.message })));
    const u2 = repo.watchDeaths(setDeaths, (e) => set((p) => ({ ...p, error: e.message })));
    const u3 = repo.watch<ManualShip>('shipments', setShips);
    const u4 = repo.watch<ManualGroup>('groups', setGroups);
    const u5 = repo.watch<ShipImport>('shipImport', setUploads);
    return () => { u1(); u2(); u3(); u4(); u5(); };
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
  const deaths = useMemo(() => fsDeaths.concat(sheet), [fsDeaths, sheet]);
  const loading = !st.data || (!!key && !sheetReady);
  const refresh = useCallback(() => loadRef.current(), []);
  return <Ctx.Provider value={{ ...st, deaths, ships, groups, uploads, imports, sheetErr, loading, refresh }}>{children}</Ctx.Provider>;
}

// 화면 상태 — 메뉴 사이를 오가도 유지되는 값(농장 필터, 열린 그룹 상세, 탭 등)과
// 저장되는 값(정산예정·작업 완료·폭염 인정두수)을 한 곳에서 관리한다. (목업 v5의 this.state)
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UiSaved } from '@/data/types';
import { useAuth } from './auth';
import { useData } from './data';
import { buildGroups, type Group } from './calc/herd';
import { allShips, liveShipsOf } from './calc/ship';
import type { Split } from '@/share/applyDeaths';

export interface UiState {
  fSel: string[] | null; fOpen: boolean; fQ: string; fStatus: 'all' | 'bad' | 'ok';
  det: string | null; exp: Record<string, boolean>;
  hView: 'table' | 'heat'; hMode: 'entry' | 'cal'; stage: 'all' | 'pre' | 'ship' | 'done'; warnOnly: boolean;
  hidden: Record<string, boolean>;
  anTab: 'surv' | 'rank' | 'report'; heat: boolean;
  herdTab: 'herd' | 'entry' | 'warn' | 'fcr'; shipTab: 'status' | 'input' | 'grade' | 'fc'; deathTab: 'input' | 'status' | 'list'; setTab: 'plan' | 'excel' | 'feed' | 'vaccine';
  rpTab: 'report' | 'settle'; sGroup: string;
  dFarm: string; dDong: string | null; dGroup: string | null;
}
const init: UiState = {
  fSel: null, fOpen: false, fQ: '', fStatus: 'all', det: null, exp: {},
  hView: 'table', hMode: 'entry', stage: 'all', warnOnly: false, hidden: { claim: true, end: true, next: true },
  anTab: 'surv', heat: false, rpTab: 'report', sGroup: '민서 26-3', herdTab: 'herd', shipTab: 'status', deathTab: 'status', setTab: 'plan', dFarm: '산성농원', dDong: '4', dGroup: null
};

interface Ctx {
  s: UiState; set: (p: Partial<UiState>) => void;
  saved: UiSaved; save: (p: Partial<UiSaved>) => void;
  go: (path: string, p?: Partial<UiState>) => void;
}
const C = createContext<Ctx | null>(null);
export const useUi = () => { const v = useContext(C); if (!v) throw new Error('UiProvider 밖'); return v; };

export function UiProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<UiState>(init);
  const { data } = useData();
  const { repo, email } = useAuth();
  const nav = useNavigate();
  // 저장 대기 중 화면이 바로 바뀌도록 낙관적 값
  const [opt, setOpt] = useState<Partial<UiSaved>>({});
  const saved: UiSaved = useMemo(() => ({ planned: {}, done: {}, heatVals: {}, firstShipByFarm: {}, shareLinks: {}, settled: {}, shipGroup: {}, bondPlan: {}, groupDong: {}, sowFarms: [], pyesaKey: '', ...(data?.ui ?? {}), ...opt }), [data, opt]);
  const set = useCallback((p: Partial<UiState>) => setS((o) => ({ ...o, ...p })), []);
  const save = useCallback((p: Partial<UiSaved>) => {
    setOpt((o) => ({ ...o, ...p }));
    repo?.saveUi(p, email).catch(() => {});
  }, [repo, email]);
  const go = useCallback((path: string, p?: Partial<UiState>) => { if (p) set(p); nav(path); window.scrollTo(0, 0); }, [nav, set]);
  return <C.Provider value={{ s, set, saved, save, go }}>{children}</C.Provider>;
}

// 필터가 적용된 그룹·농장 — 홈·돈군·분석이 함께 쓴다
export function useHerd() {
  const { data, deaths, ships, groups, imports, up } = useData();
  const { s, set, saved, save } = useUi();
  // 기준일 이후 폐사·출하를 반영한 그룹 + 폐사 기록별 나눔(크레임/폐사)
  const { all, split } = useMemo(() => {
    const sp: Record<string, Split> = {};
    const g: Group[] = data ? buildGroups(data.thresholds, saved.firstShipByFarm, { deaths, groups, ships: liveShipsOf(ships, imports), dongs: saved.groupDong }, sp) : [];
    return { all: g, split: sp };
  }, [data, saved.firstShipByFarm, saved.groupDong, deaths, ships, groups, imports]);
  const shipRows = useMemo(() => allShips(ships, imports), [ships, imports, up.total.rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const liveShips = useMemo(() => liveShipsOf(ships, imports), [ships, imports]);
  const farms = useMemo(() => [...new Set(all.map((r) => r.farm))], [all]);
  const farmBad = useMemo(() => { const m: Record<string, boolean> = {}; farms.forEach((f) => { m[f] = all.some((r) => r.farm === f && r.bad); }); return m; }, [all, farms]);
  const selSet = s.fSel === null ? farms : s.fSel;
  const passFarm = (f: string) => selSet.includes(f) && (s.fStatus === 'all' || (s.fStatus === 'bad' ? farmBad[f] : !farmBad[f]));
  const rows = all.filter((r) => passFarm(r.farm));
  const isPlanned = (r: Group) => (saved.planned[r.who] === undefined ? r.rec : saved.planned[r.who]);
  const setPlanned = (r: Group, v: boolean) => save({ planned: { ...saved.planned, [r.who]: v } });
  const togglePlan = (r: Group) => () => setPlanned(r, !isPlanned(r));
  return { all, split, deaths, ships, groups, imports, shipRows, liveShips, farms, farmBad, selSet, passFarm, rows, isPlanned, setPlanned, togglePlan, s, set, saved, save, T: data?.thresholds };
}

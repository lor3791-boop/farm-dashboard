// 앱 데이터 컨텍스트 — 저장소를 구독해 화면에 실시간으로 내려준다. (설정 + 폐사 기록 + 출하 기록)
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppData, ManualShip } from '@/data/types';
import type { DeathRow } from './repo';
import { useAuth } from './auth';

interface DataState { data: AppData | null; error: string; deaths: DeathRow[]; ships: (ManualShip & { id: string })[] }
const Ctx = createContext<DataState>({ data: null, error: '', deaths: [], ships: [] });
export const useData = () => useContext(Ctx);

export function DataProvider({ children }: { children: ReactNode }) {
  const { repo } = useAuth();
  const [st, set] = useState<{ data: AppData | null; error: string }>({ data: null, error: '' });
  const [deaths, setDeaths] = useState<DeathRow[]>([]);
  const [ships, setShips] = useState<(ManualShip & { id: string })[]>([]);
  useEffect(() => {
    if (!repo) return;
    const u1 = repo.subscribe((d) => set({ data: d, error: '' }), (e) => set((p) => ({ ...p, error: e.message })));
    const u2 = repo.watchDeaths(setDeaths, (e) => set((p) => ({ ...p, error: e.message })));
    const u3 = repo.watch<ManualShip>('shipments', setShips);
    return () => { u1(); u2(); u3(); };
  }, [repo]);
  return <Ctx.Provider value={{ ...st, deaths, ships }}>{children}</Ctx.Provider>;
}

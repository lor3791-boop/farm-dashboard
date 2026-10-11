// 앱 데이터 컨텍스트 — 저장소를 구독해 화면에 실시간으로 내려준다.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppData } from '@/data/types';
import { useAuth } from './auth';

interface DataState { data: AppData | null; error: string; }
const Ctx = createContext<DataState>({ data: null, error: '' });
export const useData = () => useContext(Ctx);

export function DataProvider({ children }: { children: ReactNode }) {
  const { repo } = useAuth();
  const [st, set] = useState<DataState>({ data: null, error: '' });
  useEffect(() => {
    if (!repo) return;
    return repo.subscribe((d) => set({ data: d, error: '' }), (e) => set((p) => ({ ...p, error: e.message })));
  }, [repo]);
  return <Ctx.Provider value={st}>{children}</Ctx.Provider>;
}

// 컬렉션 구독 훅 — 저장소의 기록 묶음을 실시간으로 받는다
import { useEffect, useState } from 'react';
import { useAuth } from './auth';
export function useCol<T>(col: string) {
  const { repo } = useAuth();
  const [rows, setRows] = useState<(T & { id: string })[]>([]);
  useEffect(() => { if (!repo) return; return repo.watch<T>(col, setRows, () => {}); }, [repo, col]);
  return rows;
}

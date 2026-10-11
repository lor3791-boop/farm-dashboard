// 공유 자료 올리기 — 대시보드가 열려 있으면 링크가 발급된 농장의 공유 자료(share/{열쇠})를 최신으로 맞춘다.
import { useEffect, useRef } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { useCol } from '@/lib/useCol';
import { buildTasks, REF, TODAY } from '@/lib/calc/herd';
import { allShips } from '@/lib/calc/ship';
import type { ManualShip } from '@/data/types';
import { buildSharePayload } from './payload';

export function useSharePublisher() {
  const { all, saved } = useHerd();
  const { repo } = useAuth();
  const manual = useCol<ManualShip>('shipments');
  const last = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!repo || !all.length) return;
    const tasks = buildTasks(all), ships = allShips(manual);
    Object.entries(saved.shareLinks).forEach(([farm, key]) => {
      if (!key) return;
      const p = buildSharePayload(farm, all, tasks, ships, REF, TODAY);
      const j = JSON.stringify(p);
      if (last.current[key] === j) return;
      last.current[key] = j;
      repo.put('share', key, { ...p, updatedAt: new Date().toISOString() }).catch(() => { delete last.current[key]; });
    });
  }, [repo, all, saved.shareLinks, manual]);
}

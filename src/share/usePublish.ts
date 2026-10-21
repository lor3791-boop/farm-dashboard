// 공유 자료 올리기 — 대시보드가 열려 있으면 링크가 발급된 농장의 공유 자료(share/{열쇠})를 최신으로 맞춘다.
// 그 농장 앱에서 등록한 폐사는 빼고 계산해서 올린다 (농장 앱이 실시간으로 더함 → 두 번 빠지지 않음).
import { useEffect, useRef } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { buildGroups, buildTasks, REF, TODAY } from '@/lib/calc/herd';
import { allShips } from '@/lib/calc/ship';
import { buildSharePayload } from './payload';

export function useSharePublisher() {
  const { all, saved, deaths, ships, T } = useHerd();
  const { repo } = useAuth();
  const last = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!repo || !all.length || !T) return;
    const tasks = buildTasks(all), rows = allShips(ships);
    const liveShips = ships.map((x) => ({ farm: x.farm, group: x.group, date: x.date, n: x.n }));
    Object.entries(saved.shareLinks).forEach(([farm, key]) => {
      if (!key) return;
      const g = buildGroups(T, saved.firstShipByFarm, { deaths: deaths.filter((d) => d.key !== key || d.path.startsWith('shareDeaths/')), ships: liveShips });
      const p = buildSharePayload(farm, g, tasks, rows, REF, TODAY, T.problemSurvivalPct);
      const j = JSON.stringify(p);
      if (last.current[key] === j) return;
      last.current[key] = j;
      repo.put('share', key, { ...p, updatedAt: new Date().toISOString() }).catch(() => { delete last.current[key]; });
    });
  }, [repo, all, saved.shareLinks, saved.firstShipByFarm, deaths, ships, T]);
}

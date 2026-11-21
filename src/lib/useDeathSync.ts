// 폐사 기록 정리 (대시보드를 열어 두면 자동) — 피그온 폐사입력 스킬은 '폐사 기록' 시트의 미등록만 보므로 시트를 맞춰 둔다.
// 1) 농장 공유 화면에서 농장이 입력한 폐사(미등록)를 시트로 보낸다 → 스킬이 피그온에 올릴 수 있게
// 2) 크레임 폐사는 피그온에 올리지 않는다 → 전부 크레임인 줄은 시트 '피그온 등록'을 체크(처리완료),
//    일부만 크레임인 줄은 원래 줄을 크레임 두수로 고쳐 체크하고, 나머지 폐사 두수는 새 줄로 넣는다 (같은 날·농장이라 사진은 묶음으로 공유)
// 크레임 판정은 대시보드와 같다: 그룹에 남은 크레임부터 먼저 깎는다.
import { useEffect, useRef } from 'react';
import { useData } from './data';
import { useHerd } from './ui';
import { useAuth } from './auth';
import { pyesaOn, saveToSheet, markSheet, editSheetCount } from './pyesa';
import type { DeathRow } from './repo';

const FROM = '2026-10-01'; // 이보다 오래된 미등록은 건드리지 않음
export function useDeathSync() {
  const { deaths, loading } = useData();
  const { split, saved } = useHerd();
  const { repo } = useAuth();
  const busy = useRef(false);
  const tried = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!pyesaOn() || loading || busy.current || !repo || document.visibilityState !== 'visible') return;
    const isSheet = (d: DeathRow) => d.path.startsWith('sheet:');
    // 1) 공유 화면 폐사 → 시트
    const fwd = deaths.find((d) => !isSheet(d) && d.src === 'share' && !d.checked && !(d as any).sheetAt && d.count > 0 && d.date >= FROM && !tried.current.has('f' + d.id));
    // 2) 크레임 줄
    const cl = deaths.find((d) => isSheet(d) && !d.checked && d.date >= FROM && (split[d.id]?.claim ?? 0) > 0 && !saved.settled[d.farm + ' ' + d.group] && !tried.current.has('c' + d.id + '|' + d.count));
    if (!fwd && !cl) return;
    busy.current = true;
    (async () => {
      try {
        if (fwd) {
          tried.current.add('f' + fwd.id);
          await saveToSheet({ date: fwd.date, farm: fwd.farm, dong: fwd.dong, group: fwd.group, count: fwd.count, photos: fwd.photos ?? [] });
          await repo.updateDeath(fwd, { sheetAt: new Date().toISOString() } as any, 'sync');
        } else if (cl) {
          tried.current.add('c' + cl.id + '|' + cl.count);
          const s = split[cl.id];
          if (s.death <= 0) await markSheet([Number(cl.sheetRow)], true);
          else {
            await editSheetCount(cl, s.claim);
            await markSheet([Number(cl.sheetRow)], true);
            await saveToSheet({ date: cl.date, farm: cl.farm, dong: cl.dong, group: cl.group, count: s.death, photos: [] }, true);
          }
        }
      } catch (e) { console.warn('[폐사정리]', e); }
      finally { busy.current = false; }
    })();
  }, [deaths, split, loading, repo, saved.settled]);
}

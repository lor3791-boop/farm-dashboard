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
// 11/21 처음 돌렸을 때 크레임으로 체크한 줄 (기록 장치가 생기기 전) — 날짜|농장|그룹|두수
// (정축산 26-4 11/15는 크레임 잔여 0 지정으로 이미 체크를 풀었고 피그온에 등록됨 → 뺌)
const SEED: Record<string, string> = Object.fromEntries(['2026-11-19|민서|26-10|4', '2026-11-19|민서|26-9|1', '2026-11-21|민서|26-11|1', '2026-11-17|아멘|26-9|1', '2026-11-16|재성|26-9|2', '2026-11-19|재성|26-9|2'].map((k) => [k, '2026-11-21']));
export function useDeathSync() {
  const { deaths, removing, loading, sheetErr } = useData();
  const { split, saved, save } = useHerd();
  const { repo } = useAuth();
  const busy = useRef(false);
  const tried = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!pyesaOn() || loading || busy.current || !repo || document.visibilityState !== 'visible') return;
    const isSheet = (d: DeathRow) => d.path.startsWith('sheet:');
    // 0) 농장 공유 화면에서 지운 폐사 → 시트로 보낸 줄을 지우고 원본도 지움 (피그온 등록된 줄은 남김 — data.tsx에서 '삭제 요청' 표시)
    //    시트를 못 읽었거나 짝 줄을 못 찾았으면(그 사이 고친 경우 등) 원본만 지우지 않는다 — 시트 줄이 고아가 되므로
    const del = sheetErr ? undefined : removing.find((x) => !tried.current.has('d' + x.doc.id) && (!(x.doc as any).sheetAt || x.rows.length > 0));
    // 1) 공유 화면 폐사 → 시트
    const fwd = deaths.find((d) => !isSheet(d) && d.src === 'share' && !d.checked && !(d as any).sheetAt && d.count > 0 && d.date >= FROM && !tried.current.has('f' + d.id));
    // 2) 크레임 줄
    const cl = deaths.find((d) => isSheet(d) && !d.checked && d.date >= FROM && (split[d.id]?.claim ?? 0) > 0 && !saved.settled[d.farm + ' ' + d.group] && !tried.current.has('c' + d.id + '|' + d.count));
    // 3) 크레임이라 체크했던 줄이 이제 폐사로 바뀌면(크레임 잔여를 고친 경우 등) 체크를 다시 푼다 → 피그온 등록 대상으로
    const MK = { ...SEED, ...(saved.claimMarked ?? {}) };
    const ck = (d: DeathRow) => [d.date, d.farm, d.group, d.count].join('|');
    const un = deaths.find((d) => isSheet(d) && d.checked && MK[ck(d)] && (split[d.id]?.claim ?? 0) === 0 && (split[d.id]?.death ?? 0) > 0 && !tried.current.has('u' + d.id));
    if (!del && !fwd && !cl && !un) return;
    busy.current = true;
    (async () => {
      try {
        if (del) {
          tried.current.add('d' + del.doc.id);
          for (const r of del.rows) await repo.removeDeath(r);
          await repo.removeDeath(del.doc);
        } else if (fwd) {
          tried.current.add('f' + fwd.id);
          await saveToSheet({ date: fwd.date, farm: fwd.farm, dong: fwd.dong, group: fwd.group, count: fwd.count, photos: fwd.photos ?? [] });
          await repo.updateDeath(fwd, { sheetAt: new Date().toISOString() } as any, 'sync');
        } else if (cl) {
          tried.current.add('c' + cl.id + '|' + cl.count);
          const s = split[cl.id];
          if (s.death <= 0) { await markSheet([Number(cl.sheetRow)], true); save({ claimMarked: { ...MK, [ck(cl)]: new Date().toISOString().slice(0, 10) } }); }
          else {
            await editSheetCount(cl, s.claim);
            await markSheet([Number(cl.sheetRow)], true);
            await saveToSheet({ date: cl.date, farm: cl.farm, dong: cl.dong, group: cl.group, count: s.death, photos: [] }, true);
            save({ claimMarked: { ...MK, [[cl.date, cl.farm, cl.group, s.claim].join('|')]: new Date().toISOString().slice(0, 10) } });
          }
        } else if (un) {
          tried.current.add('u' + un.id);
          await markSheet([Number(un.sheetRow)], false);
          // 키를 지우지 않고 빈 값으로 남김 — 지우면 SEED가 다시 살아나 사용자가 [등록]을 눌러도 계속 풀림
          save({ claimMarked: { ...MK, [ck(un)]: '' } });
        }
      } catch (e) { console.warn('[폐사정리]', e); }
      finally { busy.current = false; }
    })();
  }, [deaths, removing, sheetErr, split, loading, repo, saved.settled, saved.claimMarked, save]);
}

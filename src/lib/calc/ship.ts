// 출하성적 가중평균 — 출하실적종합 값을 그대로 합산만 한다 (재계산·재배분 없음)
import { r1 } from './dates';
import { SHIP, type ShipRow } from '@/data/snapshot';
import type { ManualShip } from '@/data/types';
export interface ShipAgg { n: number; trucks: number; avgw: number; yld: number; pay: number; g11: number; gp: number; out: number }
const sum = (L: ShipRow[], i: number) => L.reduce((a, x) => a + (x[i] as number), 0);
export function shipAgg(L: ShipRow[]): ShipAgg {
  const n = sum(L, 3), live = sum(L, 4), carc = sum(L, 5);
  const pr = L.filter((x) => x[6] > 0 && x[5] > 0); const pc = sum(pr, 5);
  return { n, trucks: L.length, avgw: n ? r1(live / n) : 0, yld: live ? r1((carc / live) * 100) : 0, pay: pc ? r1((pr.reduce((a, x) => a + x[6] * x[5], 0) / pc) * 100) : 0, g11: n ? r1(((sum(L, 7) + sum(L, 8)) / n) * 100) : 0, gp: n ? r1((sum(L, 7) / n) * 100) : 0, out: sum(L, 10) };
}
export const shortDest = (d: string) => (d.includes('일호') ? '일호' : d.includes('참푸른') ? '참푸른' : d.includes('음성신선') ? '신선' : d.includes('중앙축산') ? '중앙축산' : d.includes('논산') ? '논산축협' : d.includes('도도') ? '도도농장' : d.slice(0, 6));

// 출하실적종합 + 직접 입력을 합친 출하 목록 (직접 입력은 지육 = 생체 × 지육율, 지급율 없으면 0 → 지급율 평균에서 제외)
export const manualToRow = (m: ManualShip): ShipRow => [m.date, m.farm, m.dest + (m.kind === 'grade' ? ' (등판서)' : ' (직접 입력)'), m.n, m.live, m.carc ?? Math.round(m.live * m.yld * 10) / 1000, m.pay ? m.pay / 100 : 0, m.g1p, m.g1, m.g2, m.out];
// 같은 날·같은 농장에 출하실적종합이 있으면 종합 값을 쓰고, 없을 때만 등판서·직접 입력을 쓴다 (두 번 세지 않음)
export const shipKey = (date: string, farm: string) => date + '|' + farm;
export const SHIP_KEYS = new Set(SHIP.map((x) => shipKey(x[0], x[1])));
export const pendingManual = <T extends ManualShip>(manual: T[]) => manual.filter((m) => !SHIP_KEYS.has(shipKey(m.date, m.farm)));
export const allShips = (manual: ManualShip[]): ShipRow[] => SHIP.concat(pendingManual(manual).map(manualToRow));
// 종합이 아직 없는 출하의 예상 지급율: 같은 출하처의 최근 60일 종합 지급율(지육중량 가중)
export function estPay(dest: string, date: string): number | null {
  const sd = shortDest(dest), from = new Date(Date.parse(date) - 60 * 864e5).toISOString().slice(0, 10);
  let L = SHIP.filter((x) => shortDest(x[2]) === sd && x[0] >= from && x[0] <= date && x[6] > 0);
  if (!L.length) L = SHIP.filter((x) => shortDest(x[2]) === sd && x[6] > 0);
  const c = L.reduce((a, x) => a + x[5], 0);
  return c ? r1((L.reduce((a, x) => a + x[6] * x[5], 0) / c) * 100) : null;
}

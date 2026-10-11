// 출하성적 가중평균 — 출하실적종합 값을 그대로 합산만 한다 (재계산·재배분 없음)
import type { ShipRow } from '@/data/snapshot';
import { r1 } from './dates';
export interface ShipAgg { n: number; trucks: number; avgw: number; yld: number; pay: number; g11: number; gp: number; out: number }
const sum = (L: ShipRow[], i: number) => L.reduce((a, x) => a + (x[i] as number), 0);
export function shipAgg(L: ShipRow[]): ShipAgg {
  const n = sum(L, 3), live = sum(L, 4), carc = sum(L, 5);
  const pr = L.filter((x) => x[6] > 0 && x[5] > 0); const pc = sum(pr, 5);
  return { n, trucks: L.length, avgw: n ? r1(live / n) : 0, yld: live ? r1((carc / live) * 100) : 0, pay: pc ? r1((pr.reduce((a, x) => a + x[6] * x[5], 0) / pc) * 100) : 0, g11: n ? r1(((sum(L, 7) + sum(L, 8)) / n) * 100) : 0, gp: n ? r1((sum(L, 7) / n) * 100) : 0, out: sum(L, 10) };
}
export const shortDest = (d: string) => (d.includes('일호') ? '일호' : d.includes('참푸른') ? '참푸른' : d.includes('음성신선') ? '신선' : d.includes('중앙축산') ? '중앙축산' : d.includes('논산') ? '논산축협' : d.includes('도도') ? '도도농장' : d.slice(0, 6));

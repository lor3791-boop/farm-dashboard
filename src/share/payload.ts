// 농장 공유 화면에 내보내는 자료 — 이 농장 것만, 금액·지급율·정산·다른 농장 정보는 넣지 않는다.
// 대시보드(부장님 로그인)가 계산해서 Firestore share/{열쇠}에 올리고, 공유 사이트는 이것만 읽는다.
import type { Group, Task } from '@/lib/calc/herd';
import type { ShipRow } from '@/data/snapshot';
import { r1 } from '@/lib/calc/dates';

export interface ShareGroup { group: string; dong: string; date: string; net: number; death: number; sold: number; stock: number; surv: number; bad: boolean; age: number; week: number; weekly: number[] }
export interface ShareTask { d: string; group: string; dong: string; fmd: boolean }
export interface ShareShip { d: string; n: number; w: number | null; y: number | null; a: number; b: number; c: number; o: number }
export interface SharePayload { v: 1; farm: string; asOf: string; today: string; shipFrom: string; groups: ShareGroup[]; tasks: ShareTask[]; ships: ShareShip[] }

export function buildSharePayload(farm: string, groups: Group[], tasks: Task[], ships: ShipRow[], asOf: string, today: string, shipFrom = '2026-08-01'): SharePayload {
  const G = groups.filter((r) => r.farm === farm);
  const dongOf = (who: string) => G.find((r) => r.who === who)?.dong ?? '—';
  return {
    v: 1, farm, asOf, today, shipFrom,
    groups: G.map((r) => ({ group: r.group, dong: r.dong, date: r.date, net: r.net, death: r.death, sold: r.sold, stock: r.stock, surv: r.surv, bad: r.bad, age: r.age, week: r.week, weekly: r.weekly })),
    tasks: tasks.filter((t) => t.farm === farm).map((t) => ({ d: t.d, group: t.who.slice(farm.length + 1), dong: dongOf(t.who), fmd: t.job.startsWith('구제역') })),
    ships: ships.filter((x) => x[1] === farm && x[0] >= shipFrom).sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map((x) => ({ d: x[0], n: x[3], w: x[3] ? r1(x[4] / x[3]) : null, y: x[4] ? r1((x[5] / x[4]) * 100) : null, a: x[7], b: x[8], c: x[9], o: x[10] }))
  };
}

// 공유 열쇠: 무작위 16자 (영문·숫자). 주소에 농장 이름이 드러나지 않는다
export function newShareKey() {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, 'A').replace(/\//g, 'B').replace(/=/g, '');
}

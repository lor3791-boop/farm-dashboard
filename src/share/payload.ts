// 농장 공유 화면에 내보내는 자료 — 이 농장 것만, 금액·지급율·정산·다른 농장 정보는 넣지 않는다.
// 대시보드(부장님 로그인)가 계산해서 Firestore share/{열쇠}에 올리고, 공유 사이트는 이것만 읽는다.
import type { Group, Task } from '@/lib/calc/herd';
import type { ShipRow } from '@/data/snapshot';
import { r1 } from '@/lib/calc/dates';
const addDays = (d: string, n: number) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

export interface ShareGroup { group: string; dong: string; date: string; net: number; death: number; sold: number; stock: number; surv: number; bad: boolean; age: number; week: number; weekly: number[]; claimLeft: number }
export interface ShareTask { d: string; group: string; dong: string; fmd: boolean }
export interface ShareShip { d: string; n: number; w: number | null; y: number | null; a: number; b: number; c: number; o: number }
export interface ShareOther { date: string; dong: string; group: string; count: number }
// others = 이 농장 앱 말고 다른 곳(대시보드·폐사입력 앱)에서 입력한 이 농장 폐사 — 폐사현황에 함께 보여줌(수정은 안 됨, 재고 계산엔 이미 들어 있음)
export interface SharePayload { v: 1; farm: string; asOf: string; today: string; shipFrom: string; badPct: number; groups: ShareGroup[]; tasks: ShareTask[]; ships: ShareShip[]; others?: ShareOther[] }

// groups: 이 농장 앱에서 등록한 폐사(share/{열쇠}/deaths)는 빼고 계산한 값 — 농장 앱이 그 폐사를 직접 더한다
export function buildSharePayload(farm: string, groups: Group[], tasks: Task[], ships: ShipRow[], asOf: string, today: string, badPct = 94, shipFrom = '2026-08-01', others: ShareOther[] = []): SharePayload {
  const G = groups.filter((r) => r.farm === farm);
  const dongOf = (who: string) => G.find((r) => r.who === who)?.dong ?? '—';
  return {
    v: 1, farm, asOf, today, shipFrom, badPct,
    others: others.filter((d) => d.date >= addDays(today, -45)).map((d) => ({ date: d.date, dong: d.dong ?? '', group: d.group, count: d.count })).sort((a, b) => (a.date < b.date ? 1 : -1)),
    groups: G.map((r) => ({ group: r.group, dong: r.dong, date: r.date, net: r.net, death: r.death, sold: r.sold, stock: r.stock, surv: r.surv, bad: r.bad, age: r.age, week: r.week, weekly: r.weekly, claimLeft: r.claimLeft })),
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

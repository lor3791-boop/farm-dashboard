// 기준일 이후 입력된 폐사를 그룹에 반영한다 — 대시보드와 농장 앱이 같은 규칙을 쓴다 (다른 파일을 가져오지 않는 순수 함수).
// 규칙: 크레임 돼지가 먼저 죽은 것으로 보고 '남은 크레임'에서 먼저 뺀다. 남은 크레임이 0이 되면 그때부터 폐사로 센다.
// 재고는 실제 농장에 남은 두수(크레임 포함)라서 폐사 두수 전부를 뺀다.
export interface DeathLike { id: string; farm: string; group: string; date: string; count: number; at?: string }
export interface Split { claim: number; death: number }
export interface DeathBase { death: number; stock: number; claimLeft: number }

const order = (a: DeathLike, b: DeathLike) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.at ?? '') < (b.at ?? '') ? -1 : (a.at ?? '') > (b.at ?? '') ? 1 : a.id < b.id ? -1 : 1);

// groups: 키(농장+그룹 등) → 기준값. 값을 직접 바꾸고, 기록별 나눔(크레임/폐사)을 돌려준다.
export function applyDeaths(groups: Record<string, DeathBase>, deaths: DeathLike[], after: string, keyOf: (d: DeathLike) => string): Record<string, Split> {
  const split: Record<string, Split> = {};
  [...deaths].sort(order).forEach((d) => {
    const g = groups[keyOf(d)];
    if (!g || !(d.date > after) || !(d.count > 0)) return;
    const c = Math.min(d.count, g.claimLeft);
    g.claimLeft -= c;
    g.death += d.count - c;
    g.stock -= d.count;
    split[d.id] = { claim: c, death: d.count - c };
  });
  return split;
}
export const survOf = (net: number, death: number) => (net ? Math.round(((net - death) / net) * 1000) / 10 : 0);

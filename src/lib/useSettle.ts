// 정산 공용 계산 — 출하실적종합 줄의 그룹 배정, 그룹별 정산실적, 그룹별 상계 예정(월대·선급금)
import { useCallback, useMemo } from 'react';
import { useData } from './data';
import { useHerd } from './ui';
import { REF, TODAY, type Group } from './calc/herd';
import { assignGroups, totAgg, type TotRow } from './shipTotal';
import { monthlyOwing, suggestLoan, type Loan } from './bonds';

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

export function useSettle() {
  const { up } = useData();
  const { all, imports, ships, saved, isPlanned } = useHerd();
  const tot = up.total.rows;
  const asg = useMemo(() => assignGroups(tot,
    all.map((g) => ({ farm: g.farm, group: g.group, date: g.date, sold: g.sold, stock: g.stock, ageRef: g.age - days(REF, TODAY) })),
    saved.shipGroup ?? {}, [...ships.filter((r) => r.group), ...imports.filter((r) => r.group)].map((r) => ({ farm: r.farm, date: r.date, n: r.n, group: r.group })), REF), [tot, all, saved.shipGroup, imports, ships]);
  const rowsOf = useCallback((g: { farm: string; group: string }): TotRow[] => tot.filter((r) => r.farm === g.farm && asg[r.key]?.group === g.group), [tot, asg]);
  const headsOf = (g: Group) => { const L = rowsOf(g); return L.length ? L.reduce((a, r) => a + r.n, 0) : g.sold; };
  // 선급금 한 건의 이번 회전 상계 예정액 (직접 고친 값 우선) — 두당 조건은 그 농장 정산예정 그룹 출하두수 합으로
  const farmHeads = (farm: string) => all.filter((g) => g.farm === farm && isPlanned(g)).reduce((a, g) => a + headsOf(g), 0);
  const loanPlan = (l: Loan) => { const s = suggestLoan(l, farmHeads(l.farm)); const v = saved.bondPlan?.[l.key]; return { amt: v ?? s.amt, how: v !== undefined ? '직접 입력' : s.how, auto: s }; };
  // 그룹 상계: 월대 = 그 그룹 미정산·결재중 합계 / 선급금 = 농장 회전 상계 예정액을 정산예정 그룹 출하두수 비율로 나눔
  const offsetOf = (g: Group) => {
    const monthly = monthlyOwing(up.monthly.rows, g.farm, g.group);
    const planned = all.filter((x) => x.farm === g.farm && isPlanned(x));
    const fh = planned.reduce((a, x) => a + headsOf(x), 0);
    const share = isPlanned(g) ? (fh ? headsOf(g) / fh : 1 / Math.max(1, planned.length)) : 0;
    const loans = up.loans.rows.filter((l) => l.farm === g.farm).map((l) => ({ l, amt: Math.round(loanPlan(l).amt * share) })).filter((x) => x.amt > 0);
    const loan = loans.reduce((a, x) => a + x.amt, 0);
    return { monthly, loan, loans, total: monthly + loan };
  };
  return { tot, asg, rowsOf, headsOf, aggOf: (g: Group) => totAgg(rowsOf(g)), loanPlan, offsetOf, has: { total: tot.length > 0, bonds: up.loans.rows.length + up.monthly.rows.length > 0 } };
}

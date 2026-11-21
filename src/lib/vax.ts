// 구제역 백신 · 구충제 — 그룹별 완료 여부 (홈 '이번 주 작업'에서 체크한 것 기준)
// 로트(차수)별 예정일이 여럿이면 전부 체크돼야 완료. 공유 화면도 같은 값을 받아 쓴다.
export type VaxSt = 'done' | 'late' | 'plan';
export interface Vax { fmd: { st: VaxSt; d: string }; dew: { st: VaxSt; d: string } }
interface G { who: string; date: string; lots: (string | number)[][] }

// 'MM-DD' → 전입일 기준 연도를 붙인 ISO (연말 넘어가면 다음 해)
const full = (entry: string, mmdd: string) => { const y = Number(entry.slice(0, 4)); return (mmdd < entry.slice(5) ? y + 1 : y) + '-' + mmdd; };
export function vaxOf(g: G, done: Record<string, boolean>, today: string): Vax {
  const one = (idx: 4 | 5, job: string) => {
    const ds = [...new Set(g.lots.map((l) => String(l[idx])))].filter(Boolean);
    if (!ds.length) return { st: 'plan' as VaxSt, d: '' };
    const left = ds.filter((d) => !done[g.who + '|' + job + '|' + d]).map((d) => full(g.date, d)).sort();
    if (!left.length) return { st: 'done' as VaxSt, d: '' };
    return { st: (left[0] < today ? 'late' : 'plan') as VaxSt, d: left[0] };
  };
  return { fmd: one(4, '구제역 백신'), dew: one(5, '구충제 · 사료 2호 변경') };
}

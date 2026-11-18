// 원료돈 예상물량 기준값 — 월말에 작성한 '11~1월 출하계획' 엑셀(비육계열3팀 양식)을 읽는다.
// 양식: '월' 줄에 '11월','12월','1월' 머리, 그 아래 주차 5칸 + 합계. 담당자 칸(이오름) 줄부터 '합계' 줄 전까지가 내 농장.
// 결과 = 월(YYYY-MM)별 농장별 주차 5칸 두수. 같은 달을 다시 올리면 그 달만 바뀐다.
export type FcBaseMonths = Record<string, Record<string, number[]>>;
export interface FcBaseDoc { file: string; at: string; months: string } // months = FcBaseMonths JSON

const S = (v: unknown) => (v === null || v === undefined ? '' : String(v)).replace(/\s+/g, '').trim();
const N = (v: unknown) => { const n = Number(S(v).replace(/,/g, '')); return Number.isFinite(n) ? n : 0; };

export function parseFcBase(a: unknown[][], mgr: string, today: string): { months: FcBaseMonths; farms: string[] } {
  // 월 머리 줄: 'N월'이 2개 이상 있는 첫 줄
  const hr = a.findIndex((r) => (r ?? []).filter((c) => /^\d{1,2}월$/.test(S(c))).length >= 2);
  if (hr < 0) throw new Error("'11월·12월' 같은 월 머리 줄을 찾지 못했습니다");
  const heads: { c: number; m: number }[] = [];
  (a[hr] ?? []).forEach((c, i) => { const m = S(c).match(/^(\d{1,2})월$/); if (m) heads.push({ c: i, m: Number(m[1]) }); });
  // 첫 달의 연도 = 오늘 기준 가장 가까운 해 (머리 날짜는 오타가 있을 수 있어 쓰지 않음)
  const ty = Number(today.slice(0, 4)), tm = Number(today.slice(5, 7));
  let y = heads[0].m < tm - 6 ? ty + 1 : heads[0].m > tm + 6 ? ty - 1 : ty;
  const yms = heads.map((h, i) => { if (i && h.m < heads[i - 1].m) y++; return `${y}-${String(h.m).padStart(2, '0')}`; });
  // 담당자 줄
  const mr = a.findIndex((r, i) => i > hr && (r ?? []).some((c) => S(c) === mgr));
  if (mr < 0) throw new Error(`담당자 '${mgr}' 줄을 찾지 못했습니다`);
  const mc = (a[mr] ?? []).findIndex((c) => S(c) === mgr), fc = mc + 1;
  const months: FcBaseMonths = {}; const farms: string[] = [];
  yms.forEach((ym) => (months[ym] = {}));
  for (let i = mr; i < a.length; i++) {
    const r = a[i] ?? [], f = S(r[fc]);
    if (i > mr && S(r[mc]) && S(r[mc]) !== mgr) break; // 다음 담당자
    if (!f || f === '합계') { if (f === '합계') break; continue; }
    farms.push(f);
    heads.forEach((h, k) => { months[yms[k]][f] = [0, 1, 2, 3, 4].map((j) => N(r[h.c + j])); });
  }
  if (!farms.length) throw new Error('농장 줄을 찾지 못했습니다');
  return { months, farms };
}

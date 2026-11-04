// 피그온 '그룹 사료 사용' 엑셀 읽기 — 세로형(월·품목·kg 칸) / 가로형(월이 열 제목) 모두 지원.
// 결과 한 줄 = [농장, 그룹, 월 YYYY-MM, 사료 품목, kg]
export type FeedRow = [string, string, string, string, number];
// Firestore는 배열 안 배열을 못 담아서 한 줄을 탭으로 이은 문자열로 저장한다
export interface FeedUpload { file: string; at?: string; rows: string[] }
export const encodeFeed = (r: FeedRow) => r.join('\t');
export const decodeFeed = (s: string): FeedRow => { const [a, b, c, d, e] = s.split('\t'); return [a, b, c, d, Number(e)]; };
// 정산월 중간투입 (정산 때 직접 넣는 양)
export interface FeedMid { farm: string; group: string; month: string; item: string; kg: number; memo?: string; at?: string }
// 구제역 백신비 — 첨부(영수증 사진·PDF)는 줄여서 함께 저장
export interface Vaccine { farm: string; date: string; groups: string[]; amount: number; heads?: number; fileName?: string; fileType?: string; fileData?: string; memo?: string; at?: string }
export const FEED_ITEMS = ['윈맥스S트랜스', '리더MF1호', '리더MF2호'];

const S = (v: unknown) => (v === null || v === undefined ? '' : String(v)).replace(/\s+/g, ' ').trim();
const num = (v: unknown) => { const n = Number(S(v).replace(/[,kg\s]/gi, '')); return Number.isFinite(n) ? n : NaN; };
const find = (r: string[], re: RegExp) => r.findIndex((c) => re.test(c));
export function normMonth(v: unknown, year = new Date().getFullYear()): string {
  if (typeof v === 'number' && v > 40000 && v < 60000) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 7);
  const s = S(v);
  let m = s.match(/(20\d{2})[.\-/년\s]*(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\s*월$/); if (m) return `${year}-${m[1].padStart(2, '0')}`;
  return '';
}
export const normGroup = (v: unknown) => { const m = S(v).match(/(\d{2})\s*-\s*(\d{1,2})/); return m ? `${m[1]}-${Number(m[2])}` : S(v); };

export function parseFeedSheet(aoa: unknown[][], resolveFarm: (name: string) => string, year = new Date().getFullYear()): FeedRow[] {
  const grid = aoa.map((r) => (r ?? []).map(S));
  for (let h = 0; h < Math.min(grid.length, 40); h++) {
    const r = grid[h];
    const cF = find(r, /농장|농가|사육장|위탁처/), cG = find(r, /그룹|차수|돈군|로트/);
    if (cF < 0 || cG < 0) continue;
    const cI = find(r, /사료명|품목|제품|사료$|사료 ?코드명/);
    const cM = find(r, /년월|월$|일자|기간|사용월/);
    const cK = find(r, /kg|사용량|수량|중량|급여량/i);
    const out: FeedRow[] = [];
    const monthCols = r.map((c, j) => ({ j, m: normMonth(c, year) })).filter((x) => x.m && x.j !== cF && x.j !== cG);
    let lastF = '', lastG = '';
    for (let i = h + 1; i < grid.length; i++) {
      const x = grid[i]; if (!x.some((c) => c)) continue;
      if (/합계|소계|총계/.test(x.join(''))) continue;
      const fRaw = x[cF] || lastF, gRaw = x[cG] || lastG; lastF = fRaw; lastG = gRaw;
      const farm = resolveFarm(fRaw); if (!farm) continue;
      const group = normGroup(gRaw), item = cI >= 0 ? x[cI] : '';
      if (cM >= 0 && cK >= 0) { const m = normMonth(x[cM], year), kg = num(x[cK]); if (m && kg > 0) out.push([farm, group, m, item, kg]); }
      else if (monthCols.length) monthCols.forEach(({ j, m }) => { const kg = num(x[j]); if (kg > 0) out.push([farm, group, m, item, kg]); });
    }
    if (out.length) return out;
  }
  throw new Error('농장·그룹·월·사료량 칸을 찾지 못했습니다');
}
// 여러 번 올린 자료를 합친다 — 같은 농장·그룹·월·품목이면 나중에 올린 값
export function mergeFeed(ups: FeedUpload[]): FeedRow[] {
  const m = new Map<string, FeedRow>();
  [...ups].sort((a, b) => ((a.at ?? '') < (b.at ?? '') ? -1 : 1)).forEach((u) => u.rows.map(decodeFeed).forEach((r) => m.set(r.slice(0, 4).join('|'), r)));
  return [...m.values()];
}

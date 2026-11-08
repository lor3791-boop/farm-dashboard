// 농장채권 — 두 파일을 읽는다.
//  ① 채권채무-선급금 정리파일 '인티 선급금관리' 시트: 거래처·지급일·종류(일반/시설/장기보증금)·원 선급금·회수금·잔액·상계 조건(비고)
//  ② 위탁수수료-월대선급금 정리파일 '월대사육비' 시트: 농가·그룹(피그온)별 월별 월대 지급액 + 칸 색으로 정산 상태
//     (색 범례는 시트 위쪽의 '월대 결재중'·'월대지급완료(미정산)'·'반송'·'누적 정산 완료1~6' 칸에서 읽는다)
//     '피드빈' 시트: 피드빈 설치대금(3년 안에 거래 끝나면 회수) — 참고로만 보여준다.
// 상계 예정: 월대 = 그 그룹의 미정산·결재중 월대 합계, 선급금 = 상계 조건에서 읽은 회전당 금액(직접 고칠 수 있음)을 정산 그룹에 나눔.
import type { WorkSheet } from 'xlsx';
import * as XLSX from 'xlsx';

export interface Loan { key: string; farm: string; raw: string; date: string; kind: string; orig: number; recovered: number; balance: number; month: number; note: string }
export type MSt = 'unpaid' | 'pending' | 'returned' | 'done' | 'unknown';
export interface MCell { m: string; amt: number; st: MSt }
export interface Monthly { farm: string; group: string; raw: string; cells: MCell[] }
export interface FeedBin { farm: string; date: string; amount: number; end: string; until: string }
export const ST_LABEL: Record<MSt, string> = { unpaid: '미정산', pending: '결재중', returned: '반송', done: '정산완료', unknown: '상태 모름' };
export const owing = (st: MSt) => st === 'unpaid' || st === 'pending' || st === 'unknown';

const num = (v: unknown) => { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[,\s원]/g, '')); return isFinite(n) ? n : 0; };
const ymd = (v: unknown): string => {
  if (typeof v === 'number' && v > 30000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  if (v instanceof Date) return new Date(v.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
  return String(v ?? '').trim();
};
export const groupOf = (g: string) => { const m = String(g).match(/(\d{4})-0*(\d+)\s*$/); return m ? m[1].slice(2) + '-' + Number(m[2]) : ''; };

/** ① 선급금 시트(2차원 배열) → 담당농장 선급금 줄 + 기준일 */
export function parseLoans(a: unknown[][], resolve: (raw: string) => string): { base: string; rows: Loan[] } {
  const base = ymd(a.find((r) => r.some((c) => String(c).trim() === '기준일'))?.find((c, i, r) => i > 0 && String(r[i - 1]).trim() === '기준일'));
  const h = a.findIndex((r) => r.some((c) => String(c).trim() === '거래처') && r.some((c) => String(c).trim() === '종류'));
  if (h < 0) throw new Error("'거래처'·'종류' 머리줄을 찾지 못했습니다 — 채권채무-선급금 정리파일의 '인티 선급금관리' 시트인지 확인하세요");
  const H = a[h].map((c) => String(c).replace(/\s+/g, ''));
  const c = { farm: H.indexOf('거래처'), date: H.indexOf('지급일'), kind: H.indexOf('종류'), orig: H.findIndex((x) => x.includes('원선급금')), rec: H.indexOf('회수금'), month: H.findIndex((x) => /\d+월회수/.test(x)), bal: H.lastIndexOf('잔액') };
  const rows: Loan[] = [];
  a.slice(h + 1).forEach((r, i) => {
    const raw = String(r[c.farm] ?? '').trim();
    if (!raw || raw === '계' || !(num(r[c.orig]) > 0)) return;
    const farm = resolve(raw.replace(/-(위탁|유전자)$/, '')); if (!farm) return;
    rows.push({ key: [raw, ymd(r[c.date]), num(r[c.orig]), i].join('|'), farm, raw, date: ymd(r[c.date]), kind: String(r[c.kind] ?? '').trim() || '일반', orig: num(r[c.orig]), recovered: num(r[c.rec]), balance: num(r[c.bal]), month: c.month >= 0 ? num(r[c.month]) : 0, note: String(r[c.bal + 1] ?? '').trim() });
  });
  return { base, rows };
}

/** 상계 조건(비고)에서 이번 정산 상계 예정액 추정 — 두당 ○원이면 두수×단가, ○회전이면 원금÷회전수, '전액 상계'면 잔액. 모르면 0 */
export function suggestLoan(l: Loan, heads: number): { amt: number; how: string } {
  if (!(l.balance > 0)) return { amt: 0, how: '잔액 없음' };
  const t = l.note.replace(/\s+/g, '');
  const ph = t.match(/두\s*당([\d,]+)원/) || t.match(/([\d,]+)원\/두/);
  if (ph) { const p = num(ph[1]); return { amt: Math.min(l.balance, p * heads), how: `두당 ${p.toLocaleString()}원 × ${heads.toLocaleString()}두` }; }
  const rt = t.match(/(\d+)회전/);
  if (rt) { const n = Number(rt[1]); return { amt: Math.min(l.balance, Math.round(l.orig / n)), how: `원금 ÷ ${n}회전` }; }
  if (/전액(상계|상환)/.test(t) && !/일시|대환|금융권/.test(t)) return { amt: l.balance, how: '전액 상계' };
  return { amt: 0, how: '조건 확인 필요' };
}

// 칸 색 → 키 (rgb 또는 theme+tint)
const styleKey = (s: any) => { const f = s?.fgColor; if (!s || s.patternType !== 'solid' || !f) return ''; return f.theme !== undefined ? `t${f.theme}:${Math.round((f.tint ?? 0) * 100)}` : String(f.rgb ?? '').slice(-6).toUpperCase(); };

/** ② 월대사육비 시트(엑셀을 cellStyles:true로 읽은 것) → 담당농장 그룹별 월대 */
export function parseMonthly(ws: WorkSheet, resolve: (raw: string) => string, year = 2026): Monthly[] {
  const R = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const at = (r: number, c: number) => ws[XLSX.utils.encode_cell({ r, c })];
  const txt = (r: number, c: number) => String(at(r, c)?.v ?? '').replace(/\s+/g, '');
  // 범례
  const legend: Record<string, MSt> = {};
  for (let r = 0; r <= Math.min(8, R.e.r); r++) for (let c = 0; c <= Math.min(10, R.e.c); c++) {
    const v = txt(r, c), k = styleKey(at(r, c)?.s);
    if (!k || !v) continue;
    if (v.includes('결재중')) legend[k] = 'pending'; else if (v.includes('미정산')) legend[k] = 'unpaid'; else if (v.includes('반송')) legend[k] = 'returned'; else if (v.includes('정산완료')) legend[k] = 'done';
  }
  // 머리줄: '그룹명' 칸이 있는 줄, 그 아래 줄이 '1월'… 월 머리
  let h = -1, gc = -1;
  for (let r = 0; r <= Math.min(20, R.e.r) && h < 0; r++) for (let c = 0; c <= R.e.c; c++) if (txt(r, c).startsWith('그룹명')) { h = r; gc = c; break; }
  if (h < 0) throw new Error("'그룹명(피그온)' 머리줄을 찾지 못했습니다 — 위탁수수료-월대선급금 정리파일의 '월대사육비' 시트인지 확인하세요");
  const fc = gc - 2, tc = gc - 3; // 농가명, 팀
  const cols: { c: number; m: string }[] = [];
  let yr = year;
  for (let c = gc + 1; c <= R.e.c; c++) {
    const top = txt(h, c), m = txt(h + 1, c);
    const y = top.match(/(20\d{2})년/); if (y) yr = Number(y[1]);
    if (/^\d{1,2}월$/.test(m)) cols.push({ c, m: `${yr}-${m.replace('월', '').padStart(2, '0')}` });
    else if (/~\d+월/.test(m)) cols.push({ c, m: `${yr}-${m.replace(/누적.*$/, '').replace(/월/g, '')}` });
  }
  const out: Monthly[] = [];
  for (let r = h + 2; r <= R.e.r; r++) {
    const raw = String(at(r, fc)?.v ?? '').trim(); if (!raw) continue;
    if (String(at(r, tc)?.v ?? '').includes('팀') && !txt(r, gc) && !cols.some((x) => num(at(r, x.c)?.v) > 0)) continue;
    const farm = resolve(raw.replace(/-분할$/, '')); if (!farm) continue;
    const cells = cols.map((x) => ({ m: x.m, amt: num(at(r, x.c)?.v), st: (legend[styleKey(at(r, x.c)?.s)] ?? 'unknown') as MSt })).filter((x) => x.amt > 0);
    if (!cells.length) continue;
    out.push({ farm, group: groupOf(String(at(r, gc)?.v ?? '')), raw: raw + (at(r, gc)?.v ? '' : ''), cells });
  }
  return out;
}
/** 피드빈 시트(2차원 배열) */
export function parseFeedBin(a: unknown[][], resolve: (raw: string) => string): FeedBin[] {
  const h = a.findIndex((r) => r.some((c) => String(c).trim() === '농가명') && r.some((c) => String(c).trim() === '지급금액'));
  if (h < 0) return [];
  const H = a[h].map((c) => String(c).trim());
  const c = { f: H.indexOf('농가명'), d: H.indexOf('지급일자'), a: H.indexOf('지급금액'), e: H.indexOf('종료일자'), u: H.findIndex((x) => x.includes('3년')) };
  return a.slice(h + 1).flatMap((r) => { const farm = resolve(String(r[c.f] ?? '').trim()); return farm && num(r[c.a]) > 0 ? [{ farm, date: ymd(r[c.d]), amount: num(r[c.a]), end: ymd(r[c.e]), until: ymd(r[c.u]) }] : []; });
}
export const monthlyOwing = (L: Monthly[], farm: string, group?: string) => L.filter((x) => x.farm === farm && (group === undefined || x.group === group)).flatMap((x) => x.cells).filter((c) => owing(c.st)).reduce((a, c) => a + c.amt, 0);

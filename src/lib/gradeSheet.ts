// 등급판정서(등판서) 읽기 — 도축장 양식·축평원 양식 모두 '두당 1행' 표를 찾아 읽는다.
// 머리줄(도체번호·등급이 함께 있는 줄)을 찾고, 그 위쪽에서 출하자·판정일·작업장을 찾는다. 없으면 파일 이름에서 보충.
export type Grade = '1+' | '1' | '2' | '등외';
export interface GradeRow { no: string; trace: string; carc: number; grade: Grade }
export interface GradeSheet { file: string; kind: '도축장' | '축평원'; shipper: string; date: string; plant: string; rows: GradeRow[] }

const S = (v: unknown) => (v === null || v === undefined ? '' : String(v)).replace(/\s+/g, ' ').trim();
const num = (v: unknown) => { const n = Number(S(v).replace(/[,kg\s]/gi, '')); return Number.isFinite(n) ? n : NaN; };
export function normGrade(v: unknown): Grade | null {
  const s = S(v).replace(/\s/g, '').replace('⁺', '+').toUpperCase();
  if (!s) return null;
  if (/등외|외|^D|^E/.test(s)) return '등외';
  if (/^1\+/.test(s) || /^1\+\+/.test(s)) return '1+';
  if (/^1/.test(s) || s === 'A') return '1';
  if (/^2/.test(s) || s === 'B') return '2';
  return null;
}
// 날짜: 2026-10-06 / 2026.10.06 / 20261006 / 엑셀 날짜 숫자
export function normDate(v: unknown, year = new Date().getFullYear()): string {
  if (typeof v === 'number' && v > 40000 && v < 60000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return d.toISOString().slice(0, 10); }
  const s = S(v);
  let m = s.match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[.\-/](\d{1,2})/);
  if (m) return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return '';
}

const find = (cells: string[], re: RegExp) => cells.findIndex((c) => re.test(c));

export function parseGradeSheet(aoa: unknown[][], file: string, year = new Date().getFullYear()): GradeSheet {
  const grid = aoa.map((r) => (r ?? []).map(S));
  let h = -1;
  for (let i = 0; i < Math.min(grid.length, 60); i++) {
    const r = grid[i];
    if (find(r, /도체번호|도축번호|도체 번호|일련번호/) >= 0 && find(r, /등급/) >= 0) { h = i; break; }
  }
  if (h < 0) throw new Error('도체번호·등급 머리줄을 찾지 못했습니다');
  // 두 줄 머리(위 줄에 묶음 제목)인 경우를 위해 위 줄과 합쳐 본다
  const hr = grid[h].map((c, j) => c || (grid[h - 1]?.[j] ?? ''));
  const cNo = find(hr, /도체번호|도축번호|도체 번호|일련번호/);
  const cTrace = find(hr, /이력/);
  const cCarc = (() => { const a = find(hr, /도체중|도체 중|도체중량/); return a >= 0 ? a : find(hr, /중량|kg/i); })();
  const cGrade = (() => { const ex = hr.findIndex((c) => /^(최종)?등급$|^육질등급$|^등급판정$/.test(c.replace(/\s/g, ''))); return ex >= 0 ? ex : hr.findIndex((c, j) => /등급/.test(c) && !/육량/.test(c) && j !== cNo); })();
  if (cCarc < 0) throw new Error('도체중 칸을 찾지 못했습니다');
  const rows: GradeRow[] = [];
  for (let i = h + 1; i < grid.length; i++) {
    const r = grid[i];
    const no = r[cNo] ?? '';
    if (!no || /합계|소계|평균|계$/.test(no) || /합계|소계/.test(r.join(''))) { if (rows.length && !no) continue; if (/합계|소계|평균/.test(r.join(''))) break; continue; }
    const carc = num(r[cCarc]); const g = normGrade(r[cGrade]);
    if (!(carc > 0) || !g) continue;
    rows.push({ no, trace: cTrace >= 0 ? (r[cTrace] ?? '').replace(/\s/g, '') : '', carc, grade: g });
  }
  if (!rows.length) throw new Error('판정 행이 없습니다');
  // 머리줄 위쪽 정보: '라벨: 값' 또는 라벨 오른쪽 칸
  const meta = (re: RegExp) => {
    for (let i = 0; i < h; i++) { const r = grid[i]; for (let j = 0; j < r.length; j++) { if (!re.test(r[j])) continue; const after = r[j].split(/[:：]/)[1]?.trim(); if (after) return after; const nx = r.slice(j + 1).find((x) => x); if (nx) return nx; } }
    return '';
  };
  const all = grid.slice(0, h).flat().join(' ');
  const fnDate = normDate(file.replace(/\(.\)/, ''), year);
  const fnName = (file.match(/\)\s*([^\s(]+)\s*\(\d+두\)/) ?? file.match(/^[\d.\s()월화수목금토일]*([가-힣A-Za-z]+)/))?.[1] ?? '';
  return {
    file,
    kind: /축산물품질평가원|축평원/.test(all) ? '축평원' : '도축장',
    shipper: meta(/출하자|출하주|농가명|생산자|화주/) || fnName,
    date: normDate(meta(/판정일|등급판정일|도축일|도축일자/), year) || fnDate,
    plant: meta(/작업장|도축장|도축장명/),
    rows
  };
}

// 구간: 시작 행 위치 목록 → 구간별 묶음
export interface Seg { start: number; group: string }
export function segRows(rows: GradeRow[], segs: Seg[]) {
  const st = [...segs].sort((a, b) => a.start - b.start);
  return st.map((s, i) => {
    const R = rows.slice(s.start, i + 1 < st.length ? st[i + 1].start : rows.length);
    const c = (g: Grade) => R.filter((x) => x.grade === g).length;
    return { ...s, rows: R, n: R.length, carc: Math.round(R.reduce((a, x) => a + x.carc, 0) * 10) / 10, from: R[0]?.no ?? '', to: R[R.length - 1]?.no ?? '', g1p: c('1+'), g1: c('1'), g2: c('2'), out: c('등외') };
  });
}
// 이력번호가 바뀌는 곳마다 나눈다
export const segsByTrace = (rows: GradeRow[], group = ''): Seg[] => rows.reduce<Seg[]>((a, r, i) => (i === 0 || r.trace !== rows[i - 1].trace ? [...a, { start: i, group }] : a), []);

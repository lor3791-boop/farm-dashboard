// 출하실적종합(新) 엑셀 — 월별 시트(202511, 202512, 1~12)의 '규격돈 출하 및 매입 매출 종합 일보'를 읽어
// 담당농장 출하만 모으고, 그룹을 배정해 정산실적(그룹별)으로 쓴다.
// 파일에는 그룹이 없으므로: ① 직접 고른 그룹 ② 피그온 출하 자료(그룹 있음)와 날짜·두수가 같으면 그 그룹 ③ 먼저 들어온 그룹부터(선입선출) 채운다.
import type { ShipRow } from '@/data/snapshot';

export interface TotRow {
  key: string; date: string; farm: string; raw: string; dest: string; n: number; live: number; carc: number;
  amount: number; price: number; pay: number; g1p: number; g1: number; g2: number; out: number;
}
const num = (v: unknown) => { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[,\s원두kg%]/g, '')); return isFinite(n) ? n : 0; };
const ymd = (v: unknown): string => {
  if (v instanceof Date) return new Date(v.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
  if (typeof v === 'number' && v > 30000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  const m = String(v ?? '').match(/(20\d{2})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
};

/** 시트 하나(2차원 배열) → 담당농장 출하 줄. 머리줄('날짜'·'농가명'·'출하두수')이 없으면 [] */
export function parseTotalSheet(a: unknown[][], resolve: (raw: string) => string, sheetName = ''): TotRow[] {
  // 시트 이름이 '202512'처럼 연월이면 날짜의 연도 오타(2026-12)를 시트 연도로 바로잡는다
  const sm = sheetName.match(/^(20\d{2})(\d{2})$/);
  const h = a.findIndex((r) => r.some((c) => String(c).trim() === '날짜') && r.some((c) => String(c).trim() === '농가명') && r.some((c) => String(c).trim() === '출하두수') && r.some((c) => String(c).trim() === '담당자'));
  if (h < 0) return []; // 옛 양식(영업과장 열)은 읽지 않는다 — 같은 달 새 양식 시트가 있음
  const H = a[h].map((c) => String(c).replace(/\s+/g, ''));
  const col = (...names: string[]) => H.findIndex((c) => names.some((n) => c === n || c.startsWith(n)));
  const C = { date: col('날짜'), farm: col('농가명'), dest: col('출하처'), n: col('출하두수'), live: col('생체중량'), carc: col('지육중량'), amount: col('정산금액'), price: col('업체(적용)지육가', '업체'), pay: H.lastIndexOf('지급율') };
  // 등급 두수: '1+' 머리글 다음 칸부터 1+, 1, 2, 등외 (머리줄 위 줄에 있음)
  const up = a[h - 1]?.map((c) => String(c).trim()) ?? [];
  const g = up.findIndex((c) => c === '1+');
  const out: TotRow[] = [];
  for (const r of a.slice(h + 1)) {
    let date = ymd(r[C.date]);
    if (sm && date && date.slice(5, 7) === sm[2] && date.slice(0, 4) !== sm[1]) date = sm[1] + date.slice(4);
    const raw = String(r[C.farm] ?? '').trim(), n = num(r[C.n]);
    if (!date || !raw || !(n > 0)) continue;
    const farm = resolve(raw); if (!farm) continue;
    let pay = num(r[C.pay]); if (pay > 2) pay /= 100;
    const row: TotRow = { key: '', date, farm, raw, dest: String(r[C.dest] ?? '').trim(), n, live: num(r[C.live]), carc: num(r[C.carc]), amount: num(r[C.amount]), price: C.price >= 0 ? num(r[C.price]) : 0, pay: Math.round(pay * 10000) / 10000,
      g1p: g >= 0 ? num(r[g]) : 0, g1: g >= 0 ? num(r[g + 1]) : 0, g2: g >= 0 ? num(r[g + 2]) : 0, out: g >= 0 ? num(r[g + 3]) : 0 };
    row.key = [date, farm, row.dest.slice(0, 8), n, Math.round(row.live)].join('|');
    out.push(row);
  }
  return out;
}
/** 시트 여러 개 → 중복(같은 날·농장·출하처·두수·생체중) 없이 날짜순 */
export function mergeTotal(sheets: TotRow[][]): TotRow[] {
  const m = new Map<string, TotRow>();
  sheets.flat().forEach((r) => { if (!m.has(r.key)) m.set(r.key, r); });
  return [...m.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.key < b.key ? -1 : 1));
}
// 저장(탭으로 이은 문자열) ↔ 줄
const F: (keyof TotRow)[] = ['date', 'farm', 'raw', 'dest', 'n', 'live', 'carc', 'amount', 'price', 'pay', 'g1p', 'g1', 'g2', 'out'];
export const packTotal = (L: TotRow[]) => L.map((r) => F.map((k) => r[k]).join('\t'));
export const unpackTotal = (L: string[] = []): TotRow[] => L.map((s) => {
  const v = s.split('\t'), o: any = {};
  F.forEach((k, i) => { o[k] = ['date', 'farm', 'raw', 'dest'].includes(k) ? v[i] : Number(v[i]); });
  o.key = [o.date, o.farm, o.dest.slice(0, 8), o.n, Math.round(o.live)].join('|');
  return o as TotRow;
});
export const totToRow = (r: TotRow): ShipRow => [r.date, r.farm, r.dest, r.n, r.live, r.carc, r.pay, r.g1p, r.g1, r.g2, r.out];

export interface GroupCap { farm: string; group: string; date: string; sold: number; stock: number; ageRef: number } // ageRef: 기준일(ref) 일령
/** 그룹 배정. over: 직접 고른 그룹(key → group, '-'는 '그룹 아님'), pig: 피그온 출하(그룹 있음), ref: 피그온 기준일 */
export function assignGroups(rows: TotRow[], groups: GroupCap[], over: Record<string, string>, pig: { farm: string; date: string; n: number; group: string }[], ref: string): Record<string, { group: string; how: 'manual' | 'pigon' | 'auto' | '' }> {
  const res: Record<string, { group: string; how: 'manual' | 'pigon' | 'auto' | '' }> = {};
  const used: Record<string, number> = {};
  const byFarm = (f: string) => groups.filter((g) => g.farm === f).sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const r of rows) {
    const o = over[r.key];
    if (o) { res[r.key] = { group: o === '-' ? '' : o, how: 'manual' }; if (o !== '-') used[r.farm + ' ' + o] = (used[r.farm + ' ' + o] ?? 0) + r.n; continue; }
    // 같은 농장·출하일 기록(피그온 출하, 직접 입력·등판서 — 그룹 있음): 두수가 같으면 그 그룹, 아니면 그날 두수가 가장 많은 그룹
    const same = pig.filter((x) => x.farm === r.farm && x.date === r.date && x.group);
    const p = same.find((x) => x.n === r.n) ?? (() => { const m: Record<string, number> = {}; same.forEach((x) => (m[x.group] = (m[x.group] ?? 0) + x.n)); const g = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return g ? { group: g[0] } : undefined; })();
    if (p) { res[r.key] = { group: p.group, how: 'pigon' }; used[r.farm + ' ' + p.group] = (used[r.farm + ' ' + p.group] ?? 0) + r.n; continue; }
    // 선입선출: 출하일에 140일령 이상이고 전입 뒤인 그룹 중, 피그온 출하 누계(기준일 이후면 재고까지)를 아직 다 못 채운 가장 오래된 그룹
    const cand = byFarm(r.farm).filter((g) => r.date > g.date && g.ageRef + (Date.parse(r.date) - Date.parse(ref)) / 864e5 >= 140);
    const cap = (g: GroupCap) => (r.date <= ref ? g.sold : g.sold + g.stock);
    const g = cand.find((x) => (used[x.farm + ' ' + x.group] ?? 0) < cap(x));
    if (g) { res[r.key] = { group: g.group, how: 'auto' }; used[g.farm + ' ' + g.group] = (used[g.farm + ' ' + g.group] ?? 0) + r.n; }
    else res[r.key] = { group: '', how: '' };
  }
  return res;
}
export interface TotAgg { trucks: number; n: number; live: number; carc: number; amount: number; avgw: number; yld: number; pay: number; g11: number; price: number }
export function totAgg(L: TotRow[]): TotAgg {
  const s = (k: keyof TotRow) => L.reduce((a, r) => a + (r[k] as number), 0);
  const n = s('n'), live = s('live'), carc = s('carc'), amount = s('amount');
  const pc = L.filter((r) => r.pay > 0).reduce((a, r) => a + r.carc, 0);
  return { trucks: L.length, n, live, carc, amount, avgw: n ? Math.round((live / n) * 10) / 10 : 0, yld: live ? Math.round((carc / live) * 1000) / 10 : 0,
    pay: pc ? Math.round((L.filter((r) => r.pay > 0).reduce((a, r) => a + r.pay * r.carc, 0) / pc) * 1000) / 10 : 0,
    g11: n ? Math.round(((s('g1p') + s('g1')) / n) * 1000) / 10 : 0, price: carc ? Math.round(amount / carc) : 0 };
}

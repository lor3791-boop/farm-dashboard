// 루카 현황판 계산 그대로 옮김 — 주차(2026-01-04 일요일 기준 7일), 기준재고(2026-08-16 1,961두) + 전입 − 전출 − 주차별 폐사
import type { LukaRec, LukaSettings } from './store';

export const DAY = 864e5;
const ANCHOR = Date.UTC(2026, 0, 4);
export const BASE_DATE = '2026-08-16';
const BASE_STOCK = 1961;
export const IN_FARM = '익산 자돈사';
export const WD = '일월화수목금토';
export const ms = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const todayMs = () => ms(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10));
export const short = (t: number) => { const d = new Date(t); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WD[d.getUTCDay()]})`; };

export interface Week { idx: number; start: number; end: number; year: number; month: number; weekNum: number; label: string }
const wc = new Map<number, Week>();
export function week(idx: number): Week {
  const hit = wc.get(idx); if (hit) return hit;
  const start = ANCHOR + idx * 7 * DAY, end = start + 6 * DAY;
  const cnt: Record<string, number> = {};
  for (let i = 0; i < 7; i++) { const d = new Date(start + i * DAY); const k = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1); cnt[k] = (cnt[k] ?? 0) + 1; }
  const [year, month] = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0].split('-').map(Number);
  let weekNum = 1;
  if (idx > 0) { const p = week(idx - 1); weekNum = p.year === year && p.month === month ? p.weekNum + 1 : 1; }
  const w = { idx, start, end, year, month, weekNum, label: `${month}월 ${weekNum}주` };
  wc.set(idx, w); return w;
}
export const weekIdx = (t: number) => Math.floor((t - ANCHOR) / (7 * DAY));
export const weekOf = (t: number) => week(weekIdx(t));

export function makeLedger(S: LukaSettings, R: LukaRec[]) {
  const deathFor = (wkIso: string) => { const v = S.weeklyDeaths?.[wkIso]; return v === undefined || v === null || v === '' ? S.defaultWeeklyDeath : Number(v); };
  const ev = (max: number) => {
    const e = R.map((r) => ({ d: ms(r.date), v: r.type === 'in' ? Number(r.head) : -Number(r.head), death: false }));
    for (let i = weekIdx(ms(BASE_DATE)); i <= weekIdx(max); i++) { const w = week(i); const n = deathFor(iso(w.start)); if (n) e.push({ d: w.end, v: -n, death: true }); }
    return e.sort((a, b) => a.d - b.d || Number(a.death) - Number(b.death));
  };
  const stockAt = (q: number) => {
    const base = ms(BASE_DATE), L = ev(Math.max(q, base, todayMs() + 60 * DAY));
    let s = BASE_STOCK;
    if (q >= base) L.forEach((x) => { if (x.d >= base && x.d <= q) s += x.v; });
    else L.forEach((x) => { if (x.d > q && x.d < base) s -= x.v; });
    return s;
  };
  const weekAgg = (idx: number) => {
    const w = week(idx); let inSum = 0, farmSum = 0, extSum = 0;
    R.forEach((r) => { const d = ms(r.date); if (d < w.start || d > w.end) return; if (r.type === 'in') inSum += Number(r.head); else if (r.subtype === 'farm') farmSum += Number(r.head); else extSum += Number(r.head); });
    const death = deathFor(iso(w.start)), startStock = stockAt(w.start - DAY);
    return { w, inSum, farmSum, extSum, death, startStock, endStock: startStock + inSum - farmSum - extSum - death };
  };
  const range = () => { let lo = ms(BASE_DATE), hi = todayMs() + 56 * DAY; R.forEach((r) => { const d = ms(r.date); if (d < lo) lo = d; if (d > hi) hi = d; }); return { from: weekIdx(lo), to: weekIdx(hi) }; };
  return { stockAt, weekAgg, range, deathFor };
}

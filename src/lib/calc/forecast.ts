// 원료돈 주차별 예상 출하물량 — 설계서 v2 §3 산식 (엑셀 원료돈_주차별_출하예상.xlsx '계산' 시트와 같은 값)
// 화면은 계산식을 직접 쓰지 않고 이 파일의 결과만 쓴다. 기준값은 FcSettings에서 읽는다.
import { addIso, days } from './dates';

export interface FcSettings {
  w1: number; w2: number; shipWeeks: number; addMort: number; delta: number; teamRate: number; // addMort = 예상 추가폐사율(현재고 대비)
  sigma: { lt350: number; lt600: number; ge600: number };
  monthIndex: number[]; weightAdj: number[]; holidays: string[]; farmRates: Record<string, number>;
}
// key = 피그온 농장명(농장계수 조회), farm = 양식 농장명
export interface FcGroup { mgr: string; farm: string; key: string; group: string; indate: string; n: number; w0: number; stock: number; shipped: number; firstShip: string | null; rate?: number; rateWhy?: string } // rate: 출하실적으로 역산한 증체계수(있으면 우선)
export interface FcSeg { y?: number; month: number; k: number; start: string; end: string; days: number; label: string }
export interface FcRow extends FcGroup { rate: number; sigma: number; t1: string; status: '출하중' | '대기' | '지연'; startAt: string; endAt: string; total: number; heads: number[] }

// ── 정규분포 (Φ: Abramowitz-Stegun 7.1.26, Φ⁻¹: Acklam)
function erf(x: number) {
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
export const phi = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
export function phiInv(p: number) {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ── 누적 계절지수: cum(d) = Σ monthIndex[월(x)], x ≤ d (기준 2025-01-01)
const EPOCH = '2025-01-01';
const month = (d: string) => Number(d.slice(5, 7));
export function makeCum(S: FcSettings) {
  const cache: number[] = [];
  return (d: string) => {
    const n = days(EPOCH, d);
    if (n < 0) return 0;
    for (let i = cache.length; i <= n; i++) cache[i] = (i ? cache[i - 1] : 0) + S.monthIndex[month(addIso(EPOCH, i)) - 1];
    return cache[n];
  };
}

// ── 주차: 월~금, 월이 바뀌면 끊음, 일수 = 공휴일 제외 영업일, 영업일 0 구간은 건너뜀. 3개월 × 최대 5구간
const dow = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay(); // 0=일
function bizDays(a: string, b: string, hol: Set<string>) {
  let n = 0; for (let d = a; d <= b; d = addIso(d, 1)) { const w = dow(d); if (w >= 1 && w <= 5 && !hol.has(d)) n++; } return n;
}
export function weekSegments(startMonth: string, holidays: string[], nMonths = 3): (FcSeg | null)[] {
  const hol = new Set(holidays); const out: (FcSeg | null)[] = [];
  const [y0, m0] = startMonth.split('-').map(Number);
  for (let m = 0; m < nMonths; m++) {
    const y = y0 + Math.floor((m0 - 1 + m) / 12), mo = ((m0 - 1 + m) % 12) + 1;
    const first = `${y}-${String(mo).padStart(2, '0')}-01`;
    const eom = addIso(addIso(first, 31).slice(0, 8) + '01', -1);
    const mon = addIso(first, -((dow(first) + 6) % 7));
    const segs: FcSeg[] = [];
    for (let k = 0; k < 6; k++) {
      const s0 = addIso(mon, 7 * k); const st = s0 < first ? first : s0;
      if (st > eom) break;
      const e0 = addIso(mon, 7 * k + 4); const en = e0 > eom ? eom : e0;
      const nd = en >= st ? bizDays(st, en, hol) : 0;
      if (nd > 0) segs.push({ month: mo, k: segs.length + 1, start: st, end: en, days: nd, label: `${segs.length + 1}주(${nd}일)` });
    }
    for (let k = 0; k < 5; k++) out.push(segs[k] ? { ...segs[k], y } as FcSeg : null);
  }
  return out;
}

// ── 첫출하 예정일: 누적 계절지수로 (목표체중 − 전입평체) ÷ 증체계수 도달 + 출하월 체중보정 1회 반복
export function firstShip(g: { indate: string; w0: number }, rate: number, S: FcSettings, cum: (d: string) => number) {
  const base = cum(addIso(g.indate, -1));
  const reach = (need: number) => { const tgt = base + need / rate; let d = g.indate; while (cum(d) <= tgt) d = addIso(d, 1); return addIso(d, 1); };
  const t0 = reach(S.w1 - g.w0);
  return reach(S.w1 + S.weightAdj[month(t0) - 1] - g.w0);
}

export function sigmaOf(n: number, S: FcSettings) { return n < 350 ? S.sigma.lt350 : n < 600 ? S.sigma.lt600 : S.sigma.ge600; }

export function forecast(groups: FcGroup[], S: FcSettings, asof: string, startMonth: string, nMonths = 3) {
  const cum = makeCum(S);
  const segs = weekSegments(startMonth, S.holidays, nMonths);
  const firstSeg = segs.find(Boolean)!;
  // 배분 종료일: 빈 구간은 직전 종료일 (두수 0)
  const ends: string[] = []; let prev = addIso(firstSeg.start, -1);
  const base0 = prev;
  segs.forEach((s) => { prev = s ? s.end : prev; ends.push(prev); });
  const off = S.w1 - S.w2 + S.delta;
  const rows: FcRow[] = groups.map((g) => {
    const rate = g.rate ?? S.farmRates[g.key] ?? S.teamRate;
    const sg = sigmaOf(g.n, S);
    const started = !!g.firstShip;
    const t1 = g.firstShip ?? firstShip(g, rate, S, cum);
    const status: FcRow['status'] = started ? '출하중' : t1 <= asof ? '지연' : '대기';
    const startAt = t1 > asof ? t1 : asof;
    const endAt = addIso(t1, 7 * S.shipWeeks);
    const total = g.stock * (1 - S.addMort);
    const c0 = phi(off / sg);
    const f = started ? g.shipped / (g.shipped + g.stock || 1) : 0;
    const gs = f === 0 ? 0 : sg * phiInv(c0 + f * (1 - c0)) - off;
    const C = (gg: number) => (phi((off + gg) / sg) - c0) / (1 - c0);
    const cg = C(gs);
    const cumStart = cum(startAt);
    const crem = (x: string) => {
      if (x < startAt) return 0;
      if (x >= endAt || cg >= 0.9999) return 1;
      return (C(gs + rate * (cum(x) - cumStart)) - cg) / (1 - cg);
    };
    let p = crem(base0);
    const heads = ends.map((e) => { const c = crem(e); const h = total * (c - p); p = c; return h; });
    return { ...g, rate, sigma: sg, t1, status, startAt, endAt, total, heads };
  });
  return { segs, rows };
}

// 양식 농장별 합계 (10두 단위 반올림 + 수동조정)
export function farmTable(rows: FcRow[], adjust: Record<string, number[]> = {}) {
  const n = rows[0]?.heads.length ?? 15;
  const t: Record<string, number[]> = {};
  rows.forEach((r) => { const a = (t[r.farm] ??= Array(n).fill(0)); r.heads.forEach((h, i) => (a[i] += h)); });
  const out: Record<string, number[]> = {};
  Object.keys({ ...t, ...adjust }).forEach((f) => { out[f] = Array.from({ length: n }, (_, i) => Math.round((t[f]?.[i] ?? 0) / 10) * 10 + (adjust[f]?.[i] ?? 0)); });
  return out;
}

// 현재 돈군 출하가 끝나는 달까지 개월 수 (농장별 출하물량 예상용)
export function monthsToCover(rows: FcRow[], startMonth: string) {
  const last = rows.reduce((m, r) => (r.endAt > m ? r.endAt : m), startMonth + '-01');
  const [y0, m0] = startMonth.split('-').map(Number); const [y1, m1] = last.split('-').map(Number);
  return Math.max(1, (y1 - y0) * 12 + (m1 - m0) + 1);
}
export const ymOf = (d: string) => d.slice(0, 7);

/** 출하실적 역산 증체계수: 출하일 평체가 (전입평체 + 계수 × 전입~출하 누적 계절지수)라 보고 두수 가중 평균.
 *  ships = 그 그룹 출하 [출하일, 두수, 총생체중]. 첫출하 체중 보정(weightAdj)은 쓰지 않는다(실제 체중이므로). 0.5~1.3 밖이면 버림 */
export function backRate(g: { indate: string; w0: number }, ships: { date: string; n: number; live: number }[], S: FcSettings, cum = makeCum(S)): number | null {
  let wn = 0, wr = 0;
  const base = cum(addIso(g.indate, -1));
  ships.forEach((x) => { if (!(x.n > 0 && x.live > 0) || x.date <= g.indate) return; const dc = cum(x.date) - base; if (dc <= 0) return; const r = (x.live / x.n - g.w0) / dc; if (r > 0.5 && r < 1.3) { wn += x.n; wr += r * x.n; } });
  return wn ? Math.round((wr / wn) * 1000) / 1000 : null;
}

// 그룹 계산 — 목업 v5의 rec()/agg()를 그대로 옮기고, 숫자 기준은 설정(thresholds)에서 읽는다.
// 화면은 계산식을 직접 쓰지 않고 이 파일의 결과만 쓴다.
import type { Thresholds } from '@/data/types';
import { G, LOTS, LAST_SHIP, WEEKLY, REF, TODAY, FARM_SURV, type Lot } from '@/data/snapshot';
import { iso, days, addIso, r1 } from './dates';

export interface Group {
  farm: string; group: string; dong: string; date: string; who: string;
  inn: number; death: number; sold: number; stock: number; week: number; avgw: number;
  lots: Lot[]; claim: number; net: number; age: number; prog: number; surv: number; expSurv: number; bad: boolean;
  last: string | null; since: number | null; first: string; firstOver: number; exp: number;
  rec: boolean; recWhy: string; warn: string[]; warnBad: boolean;
  weekly: number[]; wkSum: number; wkDiff: number; marks: Record<number, string>; stage: '출하 중' | '출하 전';
}

export const dongsOf = (s: string) => (s === '—' ? [] : s.replace('동', '').split('·'));
export { REF, TODAY };

export function buildGroups(T: Thresholds, firstShipByFarm: Record<string, number> = {}): Group[] {
  return G.map((r) => {
    const farm = r[0], group = r[1], who = farm + ' ' + group;
    const lots = LOTS[who] ?? [];
    const o = { farm, group, dong: r[2], date: r[3], inn: r[4], death: r[5], sold: r[6], stock: r[7], week: r[9], avgw: r[10], who, lots } as Group;
    const tot = lots.reduce((a, l) => a + l[1], 0) || 1;
    o.claim = lots.reduce((a, l) => a + l[2], 0);
    o.net = o.inn - o.claim;
    o.age = Math.round(lots.reduce((a, l) => a + l[1] * (l[3] + days(iso(l[0]), REF)), 0) / tot);
    o.prog = o.sold + o.stock ? Math.round((o.sold / (o.sold + o.stock)) * 100) : 0;
    o.surv = r1(((o.net - o.death) / o.net) * 100);
    o.expSurv = r1(((o.sold + o.stock - o.claim) / o.net) * 100);
    o.bad = o.surv < T.problemSurvivalPct;
    o.last = LAST_SHIP[who] || null;
    o.since = o.last ? days(o.last, TODAY) : null;
    o.first = addIso(o.date, Math.round(((firstShipByFarm[farm] || T.firstShipWeightKg) - o.avgw) / T.defaultAdgKg));
    o.firstOver = o.sold === 0 ? days(o.first, TODAY) : 0;
    o.exp = Math.round(o.net * (FARM_SURV[farm] || 0.95));
    const c1 = o.prog >= T.settleProgressPct;
    const c2 = o.sold > 0 && o.stock <= (o.inn * T.settleStockPct) / 100;
    const c3 = o.since !== null && o.since >= T.settleLastShipDays && o.prog >= T.settleLastShipMinProgress;
    o.rec = c1 || c2 || c3;
    o.recWhy = c1 ? `진행률 ${T.settleProgressPct}% 이상` : c2 ? `재고 전입의 ${T.settleStockPct}% 이하` : c3 ? `마지막 출하 ${o.since}일 경과` : '';
    const why: string[] = [];
    if (o.age > T.delayRemainAge && o.stock > 0) why.push(`${T.delayRemainAge}일령 초과 · 재고 남음`);
    else if (o.age > T.delayNoShipAge && o.sold === 0) why.push(`${T.delayNoShipAge}일령 초과 · 출하 0두`);
    if (o.since !== null && o.since >= T.settleLastShipDays && o.prog < T.stallProgressPct) why.push(`출하 멈춤 ${o.since}일`);
    if (o.sold === 0 && o.firstOver >= T.firstShipOverdueDays) why.push(`첫출하예정 ${o.firstOver}일 경과`);
    o.warn = why;
    o.warnBad = o.age > T.delayRemainAge && o.stock > 0;
    o.weekly = WEEKLY[who] || [];
    o.wkSum = o.weekly.reduce((a, v) => a + v, 0);
    o.wkDiff = o.death - o.wkSum;
    o.marks = {};
    lots.forEach((l) => {
      ([[l[5], '구충'], [l[4], 'FMD']] as [string, string][]).forEach(([d, tag]) => {
        const w = Math.floor(days(o.date, iso(d)) / 7) + 1;
        if (w >= 1) o.marks[w] = o.marks[w] && o.marks[w] !== tag ? o.marks[w] + '·' + tag : tag;
      });
    });
    o.stage = o.sold > 0 ? '출하 중' : '출하 전';
    return o;
  });
}

export interface Agg { net: number; death: number; sold: number; stock: number; claim: number; exp: number; surv: number; prog: number; mort: number }
export function agg(g: Group[]): Agg {
  const s = (k: keyof Group) => g.reduce((a, r) => a + (r[k] as number), 0);
  const net = s('net'), death = s('death'), sold = s('sold'), stock = s('stock');
  return { net, death, sold, stock, claim: s('claim'), exp: s('exp'), surv: net ? r1(((net - death) / net) * 100) : 0, prog: sold + stock ? Math.round((sold / (sold + stock)) * 100) : 0, mort: net ? r1((death / net) * 100) : 0 };
}

// 작업 알림 — 로트별 예정일(전입현황)을 날짜·작업별로 묶는다
export interface Task { d: string; who: string; farm: string; job: string; heads: string; sub: string; key: string }
export function buildTasks(rows: Group[]): Task[] {
  const out: Task[] = [];
  rows.forEach((r) => {
    const map: Record<string, { d: string; job: string; n: number; idx: number[] }> = {};
    r.lots.forEach((l, i) => {
      ([['fmd', l[4], '구제역 백신'], ['dew', l[5], '구충제 · 사료 2호 변경']] as [string, string, string][]).forEach(([k, d, job]) => {
        const key = k + d;
        if (!map[key]) map[key] = { d, job, n: 0, idx: [] };
        map[key].n += l[1] - l[2]; map[key].idx.push(i + 1);
      });
    });
    Object.values(map).forEach((t) => {
      const whole = t.idx.length === r.lots.length;
      out.push({ d: t.d, who: r.who, farm: r.farm, job: t.job, heads: (whole ? r.stock : t.n).toLocaleString('ko-KR') + '두', sub: whole ? '현재 재고' : t.idx.join('·') + '차 전입', key: r.who + '|' + t.job + '|' + t.d });
    });
  });
  return out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}

// 히트맵 색 (폐사 두수)
export function heat(v: number | null) {
  if (v === null) return { bg: '#F4F2EC', fg: '#9A958B' };
  if (v === 0) return { bg: '#EEF3EF', fg: '#6B7A73' };
  if (v <= 2) return { bg: '#FBE7C6', fg: '#5A3A00' };
  if (v <= 5) return { bg: '#F2B27E', fg: '#3D1F00' };
  if (v <= 9) return { bg: '#D9773F', fg: '#FFFFFF' };
  return { bg: '#9A3216', fg: '#FFFFFF' };
}

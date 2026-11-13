// 그룹 계산 — 목업 v5의 rec()/agg()를 그대로 옮기고, 숫자 기준은 설정(thresholds)에서 읽는다.
// 화면은 계산식을 직접 쓰지 않고 이 파일의 결과만 쓴다.
import type { Thresholds } from '@/data/types';
import { G as G0, LOTS as LOTS0, LAST_SHIP, WEEKLY, REF, TODAY as SNAP_TODAY, FARM_SURV, type Lot, type GRow } from '@/data/snapshot';
import { iso, days, addIso, r1 } from './dates';
import { applyDeaths, type DeathLike, type Split, type DeathBase } from '@/share/applyDeaths';

// 기준일(스냅샷/돈수불) 이후 입력분 — 폐사와 출하(등판서·직접 입력)
export interface LiveShip { farm: string; group: string; date: string; n: number }
// 직접 등록한 그룹 (피그온 전입현황 업로드 전) — dongs: ['1','2'] (동 없이 관리면 빈 배열)
export interface ManualGroup { id?: string; farm: string; group: string; dongs: string[]; date: string; inn: number; claim: number; avgw: number; age: number; totalKg?: number; source?: string; memo?: string }
export interface Live { deaths: DeathLike[]; ships: LiveShip[]; groups?: ManualGroup[]; dongs?: Record<string, string> } // dongs: 사육현황에서 고친 그룹별 동 ('민서 26-7' → '1·2동' 또는 '—')
const mmdd = (d: string) => d.slice(5);
// 두수 기준 (피그온): 최초두수 = 실제 농장 전입두수, 전입두수 = 최초두수 − 크레임.
// 스냅샷 G[4]·로트 l[1]은 피그온 '전입두수'(크레임 뺀 값), 재고 G[7]도 크레임을 뺀 두수다.
// 직접 등록 그룹의 입식두수(m.inn)는 최초두수(실제 농장 두수)로 받는다.
const lotOf = (T: Thresholds, m: ManualGroup): Lot => {
  const light = m.avgw < T.workWeightKg;
  const dew = light ? addIso(m.date, T.dewormDaysAfterEntry) : addIso(m.date, Math.max(T.minDaysAfterEntry, T.dewormAgeHeavy - m.age));
  const fmd = light ? addIso(m.date, T.fmdDaysAfterEntry) : addIso(m.date, Math.max(T.minDaysAfterEntry, T.fmdAgeHeavy - m.age));
  return [mmdd(m.date), m.inn - m.claim, m.claim, m.age, mmdd(fmd), mmdd(dew), m.avgw];
};
// 직접 등록 그룹 → 스냅샷과 같은 모양(GRow + 로트). 같은 농장·그룹을 여러 번 등록하면(피그온에서 전입을 한 그룹으로 합친 경우) 한 그룹의 여러 차수로 합친다.
export function manualRows(T: Thresholds, L: ManualGroup[]): { row: GRow; lots: Lot[] }[] {
  const by = new Map<string, ManualGroup[]>();
  [...L].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).forEach((m) => { const k = m.farm + ' ' + m.group; by.set(k, [...(by.get(k) ?? []), m]); });
  return [...by.values()].map((M) => {
    const m = M[0], lots = M.map((x) => lotOf(T, x));
    const net = lots.reduce((a, l) => a + l[1], 0);
    const avgw = r1(M.reduce((a, x) => a + x.avgw * x.inn, 0) / Math.max(1, M.reduce((a, x) => a + x.inn, 0)));
    const dongs = [...new Set(M.flatMap((x) => x.dongs))].sort();
    const week = Math.max(1, Math.floor(days(m.date, REF) / 7) + 1);
    const row: GRow = [m.farm, m.group, dongs.length ? dongs.join('·') + '동' : '—', m.date, net, 0, 0, net, m.age, week, avgw, []];
    return { row, lots };
  });
}

export interface Group {
  farm: string; group: string; dong: string; date: string; who: string;
  inn: number; death: number; sold: number; stock: number; week: number; avgw: number;
  lots: Lot[]; claim: number; claimLeft: number; claimDead: number; liveDeath: number; liveSold: number; net: number; age: number; prog: number; surv: number; expSurv: number; bad: boolean;
  last: string | null; since: number | null; first: string; firstOver: number; exp: number;
  rec: boolean; recWhy: string; warn: string[]; warnBad: boolean;
  weekly: number[]; wkSum: number; wkDiff: number; marks: Record<number, string>; stage: '출하 중' | '출하 전';
}

export const dongsOf = (s: string) => (s === '—' ? [] : s.replace('동', '').split('·'));
// 오늘: 화면에서는 실제 오늘(한국시간), 검산 테스트에서는 스냅샷 날짜로 고정
export const TODAY = import.meta.env.MODE === 'test' ? SNAP_TODAY : new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
export { REF };

export function buildGroups(T: Thresholds, firstShipByFarm: Record<string, number> = {}, live?: Live, splitOut?: Record<string, Split>): Group[] {
  const man = live?.groups ?? [];
  const inSnap = (m: ManualGroup) => G0.some((r) => r[0] === m.farm && r[1] === m.group);
  const extra = manualRows(T, man.filter((m) => !inSnap(m)));
  // 스냅샷(피그온)에 이미 있는 그룹에 기준일 뒤 전입을 더 등록하면 그 그룹의 차수로 더한다
  const addLots: Record<string, Lot[]> = {};
  man.filter((m) => inSnap(m) && m.date > REF).forEach((m) => { const k = m.farm + ' ' + m.group; addLots[k] = [...(addLots[k] ?? []), lotOf(T, m)]; });
  // 피그온에 들어온 그룹은 피그온 값을 쓰되, 동은 직접 등록 때 넣은 값을 살린다 (피그온엔 동이 없음)
  const G = G0.map((r) => { const ad = addLots[r[0] + ' ' + r[1]]; if (!ad) return r; const n = ad.reduce((a, l) => a + l[1], 0); return [...r.slice(0, 4), r[4] + n, r[5], r[6], r[7] + n, ...r.slice(8)] as GRow; }).map((r) => { const ov = live?.dongs?.[r[0] + ' ' + r[1]]; if (ov) return [...r.slice(0, 2), ov, ...r.slice(3)] as GRow; if (r[2] !== '—') return r; const m = man.find((x) => x.farm === r[0] && x.group === r[1]); return m?.dongs.length ? ([...r.slice(0, 2), m.dongs.join('·') + '동', ...r.slice(3)] as GRow) : r; }).concat(extra.map((x) => x.row));
  const LOTS: Record<string, Lot[]> = { ...LOTS0 };
  extra.forEach((x) => { LOTS[x.row[0] + ' ' + x.row[1]] = x.lots; });
  Object.entries(addLots).forEach(([k, L]) => { LOTS[k] = [...(LOTS[k] ?? []), ...L]; });
  const base: Record<string, DeathBase & { inDeath: number }> = {};
  // 기준일 남은 크레임: 크레임 돼지가 먼저 죽고 그 폐사는 피그온에 등록하지 않는다(크레임 처리).
  // → 피그온 폐사가 1두라도 있으면 크레임은 이미 다 처리된 것(0). 피그온 폐사가 0이면 기준일까지 처리한 폐사기록만큼 뺀다.
  // 재고 = 피그온 재고(크레임 뺀 두수) + 남은 크레임 = 실제 농장 두수
  const preDead: Record<string, number> = {};
  live?.deaths.forEach((d) => { if (d.date <= REF && d.checked !== false && d.count > 0) preDead[d.farm + ' ' + d.group] = (preDead[d.farm + ' ' + d.group] ?? 0) + d.count; });
  G.forEach((r) => {
    const who = r[0] + ' ' + r[1];
    const added = (addLots[who] ?? []).reduce((a, l) => a + l[2], 0); // 기준일 뒤 더한 차수의 크레임은 그대로 남음
    const claim = (LOTS[who] ?? []).reduce((a, l) => a + l[2], 0) - added;
    const left = (r[5] > 0 ? 0 : Math.max(0, claim - (preDead[who] ?? 0))) + added;
    base[who] = { death: r[5], stock: r[7] + left, claimLeft: left, inDeath: r[5] };
  });
  const split = live ? applyDeaths(base, live.deaths, REF, (d) => d.farm + ' ' + d.group) : {};
  if (splitOut) Object.assign(splitOut, split);
  const shipped: Record<string, number> = {};
  live?.ships.forEach((x) => { if (x.date > REF && x.n > 0) shipped[x.farm + ' ' + x.group] = (shipped[x.farm + ' ' + x.group] ?? 0) + x.n; });
  return G.map((r) => {
    const farm = r[0], group = r[1], who = farm + ' ' + group;
    const lots = LOTS[who] ?? [];
    const o = { farm, group, dong: r[2], date: r[3], inn: r[4], death: r[5], sold: r[6], stock: r[7], week: r[9], avgw: r[10], who, lots } as Group;
    const tot = lots.reduce((a, l) => a + l[1], 0) || 1;
    o.claim = lots.reduce((a, l) => a + l[2], 0);
    o.net = o.inn; o.inn = o.net + o.claim; // net = 전입두수(정산, 크레임 뺌) · inn = 최초두수(실제 농장 전입)
    const b = base[who];
    o.liveDeath = b.death - b.inDeath; o.death = b.death; o.claimLeft = b.claimLeft; o.claimDead = o.claim - b.claimLeft;
    o.liveSold = shipped[who] ?? 0; o.sold += o.liveSold; o.stock = b.stock - o.liveSold;
    o.age = Math.round(lots.reduce((a, l) => a + l[1] * (l[3] + days(iso(l[0]), REF)), 0) / tot);
    o.prog = o.sold + o.stock ? Math.round((o.sold / (o.sold + o.stock)) * 100) : 0;
    o.surv = r1(((o.net - o.death) / o.net) * 100);
    o.expSurv = r1(((o.sold + o.stock - o.claimLeft) / o.net) * 100);
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
    o.weekly = [...(WEEKLY[who] || [])];
    live?.deaths.forEach((d) => { const sp = split[d.id]; if (!sp || !sp.death || d.farm + ' ' + d.group !== who) return; const w = Math.floor(days(o.date, d.date) / 7); if (w < 0) return; while (o.weekly.length <= w) o.weekly.push(0); o.weekly[w] += sp.death; });
    if (o.weekly.length > o.week) o.week = o.weekly.length;
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

export interface Agg { net: number; death: number; sold: number; stock: number; claim: number; claimLeft: number; exp: number; surv: number; prog: number; mort: number }
export function agg(g: Group[]): Agg {
  const s = (k: keyof Group) => g.reduce((a, r) => a + (r[k] as number), 0);
  const net = s('net'), death = s('death'), sold = s('sold'), stock = s('stock');
  return { net, death, sold, stock, claim: s('claim'), claimLeft: s('claimLeft'), exp: s('exp'), surv: net ? r1(((net - death) / net) * 100) : 0, prog: sold + stock ? Math.round((sold / (sold + stock)) * 100) : 0, mort: net ? r1((death / net) * 100) : 0 };
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
        map[key].n += l[1]; map[key].idx.push(i + 1);
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

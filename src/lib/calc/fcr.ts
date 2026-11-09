// 그룹 FCR(사료요구율) — 피그온 그룹 사료 사용 ÷ 정밀성장조견표(리더 표준프로그램)로 추정한 증체.
// 1) 전입평체를 조견표 위치(표 일령)로 바꾸고, 전입 후 일수만큼 표를 따라가 그 시점 체중을 추정한다.
// 2) 증체 = 살아 있는 두수 × (추정체중 − 전입평체) + 출하 생체 − 출하두수 × 전입평체 → 현재 FCR = 누적 사료 ÷ 증체.
// 3) 추세 계수 k = 실제 누적 사료 ÷ 조견표 사료(같은 두수·같은 기간). 남은 두수를 종료체중(기본 115kg)까지 키우는 사료 = 조견표 남은 사료 × k
//    → 종료예상 FCR = (누적 사료 + 남은 사료) ÷ (지금 증체 + 남은 증체).
import { days } from './dates';
import type { FeedRow } from '@/lib/feedSheet';
import { GROWTH_AGE0, GROWTH_FEED, GROWTH_W } from '@/data/growthTable';

const N = GROWTH_W.length;
const at = (L: number[], t: number) => {
  const i = t - GROWTH_AGE0;
  if (i <= 0) return L[0] + (L[1] - L[0]) * i;
  if (i >= N - 1) return L[N - 1] + (L[N - 1] - L[N - 2]) * (i - (N - 1));
  const a = Math.floor(i); return L[a] + (L[a + 1] - L[a]) * (i - a);
};
export const tableW = (t: number) => at(GROWTH_W, t);
export const tableFeed = (t: number) => at(GROWTH_FEED, t);
// 체중 → 표 일령 (소수)
export function tableAge(w: number) {
  if (w <= GROWTH_W[0]) return GROWTH_AGE0 + (w - GROWTH_W[0]) / (GROWTH_W[1] - GROWTH_W[0]);
  if (w >= GROWTH_W[N - 1]) return GROWTH_AGE0 + N - 1 + (w - GROWTH_W[N - 1]) / (GROWTH_W[N - 1] - GROWTH_W[N - 2]);
  let a = 0; while (GROWTH_W[a + 1] < w) a++;
  return GROWTH_AGE0 + a + (w - GROWTH_W[a]) / (GROWTH_W[a + 1] - GROWTH_W[a]);
}

export interface FcrOut { feed: number; now: number | null; exp: number | null; months: { m: string; fcr: number | null }[]; wNow: number; k: number; perHead: number; daily: number }
const monthEnd = (m: string) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); };
const r2 = (x: number) => Math.round(x * 100) / 100;

export function groupFcr(g: { farm: string; group: string; date: string; avgw: number; stock: number; sold: number }, feed: FeedRow[], shipLive: number, opt: { endKg: number; today: string }): FcrOut | null {
  const rows = feed.filter((r) => r[0] === g.farm && r[1] === g.group);
  if (!rows.length) return null;
  const ms = [...new Set(rows.map((r) => r[2]))].sort();
  const t0 = tableAge(g.avgw), tEnd = tableAge(opt.endKg);
  const wAt = (d: string) => Math.min(opt.endKg, tableW(t0 + Math.max(0, days(g.date, d))));
  const live = shipLive > 0 ? shipLive : g.sold * opt.endKg; // 출하 생체를 모르면 종료체중으로
  const gainAt = (d: string, alive: number, sold: number, sLive: number) => alive * Math.max(0, wAt(d) - g.avgw) + sLive - sold * g.avgw;
  let cum = 0;
  const months = ms.map((m) => {
    cum += rows.filter((r) => r[2] === m).reduce((a, r) => a + r[4], 0);
    const end = monthEnd(m) < opt.today ? monthEnd(m) : opt.today;
    // 월말 시점: 지난달은 출하 전 두수 전체로, 이번 달은 지금 값으로 근사
    const past = end < opt.today;
    const gain = days(g.date, end) > 14 ? gainAt(end, g.stock + (past ? g.sold : 0), past ? 0 : g.sold, past ? 0 : live) : 0;
    return { m, fcr: gain > 0 ? r2(cum / gain) : null };
  });
  const dNow = Math.max(0, days(g.date, opt.today));
  const wNow = wAt(opt.today);
  const gainNow = gainAt(opt.today, g.stock, g.sold, live);
  const now = gainNow > 0 ? r2(cum / gainNow) : null;
  // 추세 계수: 같은 두수가 조견표대로 먹었을 사료 대비 실제 사료
  const tNow = Math.min(t0 + dNow, tEnd);
  const sw = g.sold ? live / g.sold : opt.endKg;
  const tableUse = g.stock * (tableFeed(tNow) - tableFeed(t0)) + g.sold * (tableFeed(tableAge(sw)) - tableFeed(t0));
  const k = tableUse > 0 && cum > 0 ? cum / tableUse : 1;
  const restGain = g.stock * Math.max(0, opt.endKg - wNow);
  const restFeed = g.stock * Math.max(0, tableFeed(tEnd) - tableFeed(tNow)) * k;
  const exp = gainNow + restGain > 0 ? r2((cum + restFeed) / (gainNow + restGain)) : null;
  const n = g.stock + g.sold;
  const dLast = Math.max(1, days(g.date, monthEnd(ms[ms.length - 1]) < opt.today ? monthEnd(ms[ms.length - 1]) : opt.today));
  return { feed: cum, now, exp, months, wNow: Math.round(wNow * 10) / 10, k: r2(k), perHead: n ? cum / n : 0, daily: n ? cum / n / dLast : 0 };
}

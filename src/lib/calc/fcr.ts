// 그룹 FCR(사료요구율) — 피그온 그룹 사료 사용 기준. 증체 = 살아 있는 두수 × (지금 추정체중 − 전입평체) + 출하 생체 − 출하두수 × 전입평체
// 지금 추정체중 = 전입평체 + 일당증체 × 전입 후 일수 (일당증체는 기준값). 정산예상 = 남은 두수를 목표체중까지 키우는 사료(마무리 FCR)를 더해 계산.
import { days } from './dates';
import type { FeedRow } from '@/lib/feedSheet';

export interface FcrOut { feed: number; now: number | null; exp: number | null; months: { m: string; fcr: number | null }[]; wNow: number }
const monthEnd = (m: string) => { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); };

export function groupFcr(g: { farm: string; group: string; date: string; avgw: number; stock: number; sold: number }, feed: FeedRow[], shipLive: number, opt: { adg: number; target: number; today: string; finFcr?: number }): FcrOut | null {
  const rows = feed.filter((r) => r[0] === g.farm && r[1] === g.group);
  if (!rows.length) return null;
  const ms = [...new Set(rows.map((r) => r[2]))].sort();
  const live = shipLive > 0 ? shipLive : g.sold * opt.target; // 출하 생체를 모르면 목표체중으로
  const gainAt = (d: string, alive: number, sold: number, sLive: number) => alive * Math.max(0, Math.min(opt.target, g.avgw + opt.adg * Math.max(0, days(g.date, d))) - g.avgw) + sLive - sold * g.avgw;
  let cum = 0;
  const months = ms.map((m) => {
    cum += rows.filter((r) => r[2] === m).reduce((a, r) => a + r[4], 0);
    const end = monthEnd(m) < opt.today ? monthEnd(m) : opt.today;
    // 월말 시점: 출하 전이면 전체 두수, 출하 중이면 지금 값으로 근사
    const gain = days(g.date, end) > 14 ? gainAt(end, g.stock + (end < opt.today ? g.sold : 0), end < opt.today ? 0 : g.sold, end < opt.today ? 0 : live) : 0;
    return { m, fcr: gain > 0 ? Math.round((cum / gain) * 100) / 100 : null };
  });
  const wNow = Math.min(opt.target, g.avgw + opt.adg * Math.max(0, days(g.date, opt.today)));
  const gainNow = gainAt(opt.today, g.stock, g.sold, live);
  const now = gainNow > 0 ? Math.round((cum / gainNow) * 100) / 100 : null;
  const fin = Math.max(opt.finFcr ?? 2.9, now ?? 0);
  const restGain = g.stock * Math.max(0, opt.target - wNow);
  const exp = gainNow + restGain > 0 ? Math.round(((cum + restGain * fin) / (gainNow + restGain)) * 100) / 100 : null;
  return { feed: cum, now, exp, months, wNow: Math.round(wNow * 10) / 10 };
}

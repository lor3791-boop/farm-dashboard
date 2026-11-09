import { describe, expect, it } from 'vitest';
import { groupFcr, tableAge, tableFeed, tableW } from './fcr';

describe('정밀성장조견표 FCR', () => {
  it('체중↔표 일령', () => {
    expect(tableW(70)).toBeCloseTo(30.695, 2);
    expect(tableAge(30.695)).toBeCloseTo(70, 1);
    expect(tableAge(115)).toBeGreaterThan(171);
  });
  it('조견표대로 먹으면 계수 1, 종료예상 = 표의 전입~115kg FCR', () => {
    const t0 = tableAge(30), t1 = t0 + 60, n = 1000;
    const per = tableFeed(t1) - tableFeed(t0);
    const feed = [['A', '26-1', '2026-09', '사료', per * n * 0.5], ['A', '26-1', '2026-10', '사료', per * n * 0.5]] as any;
    const o = groupFcr({ farm: 'A', group: '26-1', date: '2026-09-01', avgw: 30, stock: n, sold: 0 }, feed, 0, { endKg: 115, today: '2026-10-31' })!;
    expect(o.k).toBeCloseTo(1, 2);
    expect(o.now).toBeCloseTo(per / (tableW(t1) - 30), 2);
    const all = (tableFeed(tableAge(115)) - tableFeed(t0)) / 85;
    expect(o.exp).toBeCloseTo(all, 2);
    expect(o.exp!).toBeGreaterThan(o.now!);
  });
});

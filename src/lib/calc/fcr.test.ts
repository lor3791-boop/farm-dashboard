import { describe, expect, it } from 'vitest';
import { groupFcr, settledFcr, tableAge, tableFeed, tableW } from './fcr';

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

describe('정산완료 FCR (정산서 식)', () => {
  it('산성농원 26-4 — 정산서 3.02와 같다', () => {
    // 피그온 그룹 사료: 5~9월 마감 53,649kg / 출하실적종합 222두 23,780kg + 폭염 11두 / 전입평체 30.88
    const kg = [6303.003, 12164.644, 14650.307, 12527.838, 8003.402];
    const rows = kg.map((v, i) => ['산성농원', '26-4', `2026-0${5 + i}`, '리더MF 1호P(B)', v]) as any;
    const heads = 222 + 11, live = 23780 + (23780 / 222) * 11;
    expect(settledFcr({ avgw: 30.88 }, rows, { heads, live, last: '2026-10-01' })!.fcr).toBe(3.02);
  });
  it('마지막 출하월의 마감 줄은 빼고 중간정산 줄은 넣는다 (욥 26-1 2.90)', () => {
    const rows = [['욥', '26-1', '2026-09', 'a', 157099.4], ['욥', '26-1', '2026-10', 'a', 5130, '중간'], ['욥', '26-1', '2026-10', 'a', 999]] as any;
    const s = settledFcr({ avgw: 34.83 }, rows, { heads: 951, live: 951 * 93.56, last: '2026-10-13' })!;
    expect(s.feed).toBeCloseTo(162229.4, 1);
    expect(s.fcr).toBe(2.9);
  });
});

describe('투입구분 없는 파일', () => {
  it('마지막 출하월의 딱 떨어지는 양은 중간정산으로 (용암 26-5 3.03)', () => {
    const rows = [['용암', '26-5', '2026-08', 'a', 77583.2], ['용암', '26-5', '2026-09', 'a', 7000]] as any;
    expect(settledFcr({ avgw: 39.35 }, rows, { heads: 408, live: 408 * 107.68, last: '2026-09-18' })!.fcr).toBe(3.03);
  });
});

import { describe, it, expect } from 'vitest';
import { applyDeaths } from './applyDeaths';
describe('폐사 반영 — 크레임 먼저', () => {
  it('남은 크레임에서 먼저 빼고 넘치면 폐사', () => {
    const g = { a: { death: 10, stock: 500, claimLeft: 3 } };
    const sp = applyDeaths(g, [{ id: '1', farm: 'f', group: 'a', date: '2026-10-12', count: 2 }, { id: '2', farm: 'f', group: 'a', date: '2026-10-13', count: 4 }, { id: '3', farm: 'f', group: 'a', date: '2026-10-01', count: 9 }], '2026-10-09', (d) => d.group);
    expect(g.a).toEqual({ death: 13, stock: 494, claimLeft: 0 });
    expect(sp['1']).toEqual({ claim: 2, death: 0 });
    expect(sp['2']).toEqual({ claim: 1, death: 3 });
    expect(sp['3']).toBeUndefined();
  });
  it('기준일 이전이라도 미등록이면 재고에서 뺀다', () => {
    const g = { a: { death: 10, stock: 500, claimLeft: 0 } };
    const sp = applyDeaths(g, [{ id: '1', farm: 'f', group: 'a', date: '2026-11-02', count: 3, checked: false }, { id: '2', farm: 'f', group: 'a', date: '2026-11-01', count: 5, checked: true }], '2026-11-05', (d) => d.group);
    expect(g.a).toEqual({ death: 13, stock: 497, claimLeft: 0 });
    expect(sp['2']).toBeUndefined();
  });
});

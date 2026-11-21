import { describe, expect, it } from 'vitest';
import { shipAssign } from './ship';
import type { TotRow } from '@/lib/shipTotal';

const caps = [
  { farm: 'A', group: '26-1', date: '2026-06-01', sold: 100, stock: 50, ageRef: 200 },
  { farm: 'A', group: '26-2', date: '2026-07-01', sold: 0, stock: 300, ageRef: 170 },
  { farm: 'A', group: '26-3', date: '2026-09-01', sold: 0, stock: 300, ageRef: 100 },
];
const tot = (date: string, n: number): TotRow => ({ key: ['t', date, n].join('|'), date, farm: 'A', raw: '', dest: '일호', n, live: n * 115, carc: 0, amount: 0, price: 0, pay: 0, g1p: 0, g1: 0, g2: 0, out: 0 });
const imp = (date: string, n: number, group = '', src: 'team' | 'pigon' = 'team') => ({ date, farm: 'A', group, dest: '일호', n, live: n * 115, carc: 0, pay: null, g1p: 0, g1: 0, g2: 0, out: 0, src });

describe('출하 → 그룹 배정·재고 차감', () => {
  it('팀 대시보드 출하(그룹 없음)도 선입선출로 배정해 재고에서 뺀다', () => {
    const { live } = shipAssign([], [imp('2026-11-10', 40), imp('2026-11-12', 30)], [], {}, caps, '2026-11-05');
    // 26-1 재고 50: 40 + (10 → 26-1, 20 → 26-2 나눠 뺌)
    expect(live.map((x) => [x.group, x.n, x.src])).toEqual([['26-1', 40, '팀 대시보드'], ['26-1', 10, '팀 대시보드'], ['26-2', 20, '팀 대시보드']]);
  });
  it('선입선출: 앞 그룹이 다 차면 다음 그룹, 140일령 안 된 그룹은 안 씀', () => {
    const { live } = shipAssign([], [imp('2026-11-10', 50), imp('2026-11-11', 100)], [], {}, caps, '2026-11-05');
    expect(live.map((x) => x.group)).toEqual(['26-1', '26-2']);
  });
  it('같은 날·농장은 종합 > 피그온 > 팀 > 직접입력 하나만 센다', () => {
    const man = [{ id: 'm', farm: 'A', group: '26-2', date: '2026-11-10', dest: '일호', n: 40, live: 4600, yld: 0, pay: null, price: null, g1p: 0, g1: 0, g2: 0, out: 0, lowReason: '', writer: '' }];
    const r1 = shipAssign([tot('2026-11-10', 40)], [imp('2026-11-10', 40)], man, {}, caps, '2026-11-05');
    expect(r1.live.map((x) => [x.src, x.group])).toEqual([['종합', '26-2']]); // 같은 날 직접입력(26-2)과 두수 같아 그 그룹
    const r2 = shipAssign([], [imp('2026-11-10', 40)], man, {}, caps, '2026-11-05');
    expect(r2.live.map((x) => x.src)).toEqual(['팀 대시보드']);
    const r3 = shipAssign([], [], man, {}, caps, '2026-11-05');
    expect(r3.live.map((x) => [x.src, x.group])).toEqual([['직접·등판서', '26-2']]);
  });
  it('기준일 이전 출하는 피그온 재고에 이미 있어 빼지 않는다', () => {
    expect(shipAssign([tot('2026-11-01', 40)], [], [], {}, caps, '2026-11-05').live).toEqual([]);
  });
  it('직접 고른 그룹이 우선', () => {
    const t = imp('2026-11-10', 40);
    const { live } = shipAssign([], [t], [], { ['팀|2026-11-10|A|40|4600']: '26-3' }, caps, '2026-11-05');
    expect(live[0].group).toBe('26-3');
  });
});

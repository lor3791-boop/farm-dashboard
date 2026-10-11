// 검산: 목업 v5 원본 계산을 그대로 실행한 결과(__fixtures__/v5-reference.json)와 한 칸도 다르지 않아야 한다.
// 기준값을 바꾸면(예: 94% → 95%) 이 테스트는 의도적으로 실패하므로, 그때는 정답 파일도 같이 다시 만든다.
import { describe, it, expect } from 'vitest';
import ref from '@/data/__fixtures__/v5-reference.json';
import { SEED_THRESHOLDS } from '@/data/seed';
import { buildGroups, buildTasks, agg } from './herd';

const all = buildGroups(SEED_THRESHOLDS);
describe('목업 v5 계산과 동일', () => {
  it('그룹 40개 × 21개 항목', () => {
    expect(all.length).toBe(ref.groups.length);
    ref.groups.forEach((g: any, i: number) => {
      const a: any = all[i];
      Object.keys(g).forEach((k) => expect([g.who, k, a[k]]).toEqual([g.who, k, g[k]]));
    });
  });
  it('작업 알림 103건 (날짜·대상·두수)', () => {
    const t = buildTasks(all).map(({ d, who, job, heads, sub }) => ({ d, who, job, heads, sub }));
    const key = (x: any) => x.d + x.who + x.job;
    expect([...t].sort((a, b) => key(a).localeCompare(key(b)))).toEqual([...ref.tasks].sort((a: any, b: any) => key(a).localeCompare(key(b))));
  });
  it('홈 KPI', () => {
    const k = ref.kpi;
    expect(all.reduce((a, r) => a + r.stock, 0)).toBe(k.stock);
    expect(agg(all).mort).toBe(k.mort);
    expect(all.filter((r) => r.warn.length).length).toBe(k.warn);
    expect(new Set(all.filter((r) => r.bad).map((r) => r.farm)).size).toBe(k.probFarms);
    expect(all.filter((r) => r.rec).map((r) => r.who)).toEqual(k.planned);
    const t = buildTasks(all);
    expect(t.filter((x) => x.d >= '10-11' && x.d <= '10-17').length).toBe(k.week);
    expect(t.filter((x) => x.d >= '10-04' && x.d < '10-11').length).toBe(k.past);
  });
});

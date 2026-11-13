import { describe, expect, it } from 'vitest';
import { SEED_THRESHOLDS } from '@/data/seed';
import { buildGroups, REF } from './herd';
import { addIso } from './dates';

const T = SEED_THRESHOLDS;
const m = (o: any) => ({ farm: '세희', group: '26-9', dongs: [], date: addIso(REF, 2), inn: 300, claim: 6, avgw: 30, age: 70, ...o });
const live = (groups: any[], deaths: any[] = []) => ({ deaths, ships: [], groups });

describe('전입두수·크레임 (피그온 기준)', () => {
  it('최초두수 = 실제 전입, 전입두수 = 최초 − 크레임, 재고 = 실제 농장 두수', () => {
    const g = buildGroups(T, {}, live([m({})])).find((x) => x.who === '세희 26-9')!;
    expect([g.inn, g.net, g.claim, g.stock, g.surv]).toEqual([300, 294, 6, 300, 100]);
  });
  it('크레임 돼지가 먼저 죽은 것으로 — 크레임 넘는 폐사만 육성률에 반영', () => {
    const d = [{ id: 'a', farm: '세희', group: '26-9', date: addIso(REF, 3), count: 8 }];
    const g = buildGroups(T, {}, live([m({})], d)).find((x) => x.who === '세희 26-9')!;
    expect([g.stock, g.death, g.claimLeft, g.surv]).toEqual([292, 2, 0, 99.3]);
  });
  it('같은 그룹 두 번 등록 = 한 그룹 두 차수', () => {
    const g = buildGroups(T, {}, live([m({}), m({ date: addIso(REF, 4), inn: 200, claim: 0, avgw: 35 })])).filter((x) => x.who === '세희 26-9');
    expect(g.length).toBe(1);
    expect([g[0].inn, g[0].net, g[0].lots.length, g[0].avgw]).toEqual([500, 494, 2, 32]);
  });
  it('피그온 그룹에 기준일 뒤 전입을 더 등록하면 차수로 더함, 기준일 이전은 무시', () => {
    const base = buildGroups(T).find((x) => x.who === '세희 26-4')!;
    const g = buildGroups(T, {}, live([m({ group: '26-4', inn: 100, claim: 2 }), m({ group: '26-4', date: REF, inn: 50, claim: 0 })])).find((x) => x.who === '세희 26-4')!;
    expect([g.inn - base.inn, g.net - base.net, g.stock - base.stock, g.lots.length - base.lots.length]).toEqual([100, 98, 100, 1]);
  });
});

describe('기준일 남은 크레임', () => {
  it('피그온 폐사가 있으면 크레임은 이미 처리된 것 — 출하 끝난 그룹에 크레임이 남지 않음', () => {
    const g = buildGroups(T).find((x) => x.who === '민서 26-7')!;
    expect([g.claim, g.claimLeft, g.stock]).toEqual([8, 0, 0]);
  });
  it('피그온 폐사 0이면 기준일까지 처리한 폐사기록만큼 크레임에서 뺌', () => {
    const d = [{ id: 'a', farm: '정축산', group: '26-4', date: '2026-11-03', count: 2, checked: true }];
    const g = buildGroups(T, {}, live([], d)).find((x) => x.who === '정축산 26-4')!;
    expect([g.claim, g.claimLeft, g.stock - 501]).toEqual([9, 7, 7]);
  });
});

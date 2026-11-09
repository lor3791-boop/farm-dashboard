// 원료돈 예상물량 — 엑셀(LibreOffice 재계산) 결과와 같은지 검산
import { describe, it, expect } from 'vitest';
import { forecast, farmTable, weekSegments, phi, phiInv } from './forecast';
import { FC_SETTINGS, FC_GROUPS, FC_ASOF } from '@/data/forecastSeed';
import fx from '@/data/__fixtures__/forecast-2026-11-05.json';

describe('원료돈 예상물량', () => {
  const { segs, rows } = forecast(FC_GROUPS, FC_SETTINGS, FC_ASOF, '2026-11');
  it('주차 구분 = 엑셀 양식 라벨', () => {
    expect(segs.map((s) => (s ? s.label : '-'))).toEqual(fx.expected.labels);
    expect(weekSegments('2027-01', FC_SETTINGS.holidays)[0]?.start).toBe('2027-01-04'); // 1/1 공휴일 건너뜀
  });
  it('정규분포 함수', () => {
    expect(phi(0)).toBeCloseTo(0.5, 6);
    expect(phiInv(phi(1.234))).toBeCloseTo(1.234, 4);
  });
  it('그룹별 첫출하 예정일 = 엑셀', () => {
    const bad = rows.filter((r, i) => r.t1 !== fx.groups[i].T1);
    expect(bad.map((r) => r.group)).toEqual([]);
  });
  it('그룹별 주차 두수 = 엑셀 (±0.5두)', () => {
    rows.forEach((r, i) => r.heads.forEach((h, j) => expect(Math.abs(h - fx.groups[i].heads[j])).toBeLessThan(0.5)));
  });
  it('농장별 양식 값·월 합계 = 엑셀', () => {
    const t = farmTable(rows);
    Object.entries(fx.expected.farmRows).forEach(([f, v]) => expect(t[f] ?? Array(15).fill(0)).toEqual(v));
    const all = Object.values(t).reduce((a, v) => a.map((x, i) => x + v[i]), Array(15).fill(0));
    const m = [0, 5, 10].map((s) => all.slice(s, s + 5).reduce((a, b) => a + b, 0));
    expect(m).toEqual(fx.expected.months);
  });
  it('첫출하체중을 올리면 출하가 뒤로 밀림', () => {
    const late = forecast(FC_GROUPS, { ...FC_SETTINGS, w1: 116 }, FC_ASOF, '2026-11').rows;
    const nov = (rs: typeof rows) => rs.reduce((a, r) => a + r.heads.slice(0, 5).reduce((x, y) => x + y, 0), 0);
    expect(nov(late)).toBeLessThan(nov(rows));
  });
});

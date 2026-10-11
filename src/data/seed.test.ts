// 묶음 1 완료 기준: 13개 농장과 동 목록이 맞게 뜬다
import { describe, it, expect } from 'vitest';
import { SEED_FARMS, EXPECTED_FARM_NAMES, SEED_THRESHOLDS } from './seed';
const dongs = (n: string) => SEED_FARMS.find((f) => f.name === n)!.dongs.join('·');
describe('초기 농장', () => {
  it('위탁 13곳 + 후기자돈사 1곳', () => {
    expect(SEED_FARMS.filter((f) => f.type === '위탁').map((f) => f.name)).toEqual(EXPECTED_FARM_NAMES);
    expect(SEED_FARMS.filter((f) => f.type === '후기자돈사').map((f) => f.name)).toEqual(['자돈_루카']);
  });
  it('동 목록 (동 배치 초안 v5)', () => {
    expect(dongs('골드피그')).toBe('1동·2동·3-1동·3-2동');
    expect(dongs('세희')).toBe('1동·3동·4동');
    expect(dongs('욥')).toBe('1동·2동·3동');
    expect(dongs('원가림')).toBe('1동·2동');
    expect(SEED_FARMS.find((f) => f.name === '명임')!.noDong).toBe(true);
  });
  it('키 중복 없음', () => expect(new Set(SEED_FARMS.map((f) => f.id)).size).toBe(SEED_FARMS.length));
  it('기준값', () => { expect(SEED_THRESHOLDS.problemSurvivalPct).toBe(94); expect(SEED_THRESHOLDS.firstShipWeightKg).toBe(113); });
});

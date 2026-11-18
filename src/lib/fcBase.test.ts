import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { parseFcBase } from './fcBase';
import { FC_HAND } from '@/data/forecastSeed';

describe('원료돈 기준값 엑셀', () => {
  it('10/26 작성 11~1월 계획 — 내 농장 주차 두수', () => {
    const wb = XLSX.read(readFileSync('src/lib/__fixtures__/fc-base-261026.xlsx'));
    const a = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as unknown[][];
    const r = parseFcBase(a, '이오름', '2026-10-26');
    expect(Object.keys(r.months)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(r.farms).toContain('산성농원');
    expect(r.farms).not.toContain('희망1');
    // 화면 기본값(FC_HAND, 같은 파일)과 같다
    r.farms.forEach((f) => expect([...r.months['2026-11'][f], ...r.months['2026-12'][f], ...r.months['2027-01'][f]]).toEqual(FC_HAND[f]));
  });
});

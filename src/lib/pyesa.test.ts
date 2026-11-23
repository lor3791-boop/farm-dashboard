import { describe, it, expect } from 'vitest';
import { fixDong } from './pyesa';

describe('fixDong — 시트가 날짜로 바꾼 동 번호 되돌리기', () => {
  it('Apps Script 날짜 문자열', () => expect(fixDong('Sun Mar 01 2026 00:00:00 GMT+0900 (한국 표준시)')).toBe('3-1'));
  it('ISO 날짜(UTC 저장)', () => expect(fixDong('2026-03-01T15:00:00.000Z')).toBe('3-2'));
  it('정상 값은 그대로', () => {
    expect(fixDong('3-1')).toBe('3-1');
    expect(fixDong('1')).toBe('1');
    expect(fixDong('1·3-2')).toBe('1·3-2');
    expect(fixDong('')).toBe('');
  });
});

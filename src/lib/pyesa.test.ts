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

import { vi } from 'vitest';
import { saveRowsToSheet, setPyesaKey, pendingRows, dropSentBefore } from './pyesa';

describe('saveRowsToSheet — 여러 줄 한 번에, 보내는 중 줄', () => {
  it('요청 1번, 저장 중엔 바로 보이고, 다시 읽으면 빠짐', async () => {
    setPyesaKey('k');
    let seen = 0;
    const body: any[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, o: any) => { seen = pendingRows().length; body.push(JSON.parse(o.body)); return { status: 200, text: async () => '{"ok":true,"total":3,"photos":0,"spike":false}' } as any; }));
    await saveRowsToSheet([{ date: '2026-11-24', farm: '골드피그', dong: '1', group: '26-1', count: 2 }, { date: '2026-11-24', farm: '골드피그', dong: '3-1', group: '26-3', count: 1 }]);
    expect(body.length).toBe(1);
    expect(body[0].rows.length).toBe(2);
    expect(seen).toBe(2);
    dropSentBefore(Date.now() + 1);
    expect(pendingRows().length).toBe(0);
  });
  it('실패하면 보내는 중 줄을 바로 지움', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200, text: async () => '{"ok":false,"error":"이미 저장된 기록"}' }) as any));
    await expect(saveRowsToSheet([{ date: '2026-11-24', farm: '골드피그', dong: '1', group: '26-1', count: 1 }])).rejects.toThrow('이미 저장');
    expect(pendingRows().length).toBe(0);
  });
});

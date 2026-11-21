import { describe, it, expect } from 'vitest';
import { makeLuka } from './legacy';
import { makeLedger, ms } from './calc';

const S = { defaultWeeklyDeath: 20, weeklyDeaths: { '2026-09-06': 5 }, lukaStatusRows: [{ date: '2026-09-01', groupKey: 'A', initIn: 500, netIn: 490, death: 10, shipped: 100, stock: 380, survivalRate: 0.98, settled: false }], reshipRows: [], feedCostRows: [], simScenarios: [] };
const R = [{ id: '1', date: '2026-09-02', type: 'in', subtype: null, farmName: '익산 자돈사', head: 300 }, { id: '2', date: '2026-09-20', type: 'out', subtype: 'farm', farmName: '민서', head: 250 }] as any;

describe('루카 현황판 계산·엑셀 (원본 코드 이식)', () => {
  it('재고 계산이 원본과 같다', () => {
    const lg = makeLuka(S, R), L = makeLedger(S as any, R);
    ['2026-08-10', '2026-09-01', '2026-09-15', '2026-10-01', '2026-12-31'].forEach((d) => expect(L.stockAt(ms(d))).toBe(lg.stockAsOf(ms(d), undefined)));
  });
  it('시뮬레이션 덮어쓰기 반영', () => {
    const lg = makeLuka(S, R);
    expect(lg.stockAsOf(ms('2026-09-30'), { '2026-09-20': { in: 0, out_farm: 100, out_external: 0 } })).toBe(lg.stockAsOf(ms('2026-09-30'), undefined) + 150);
  });
  it('입력양식 CSV 읽기', () => {
    const r = makeLuka(S, R).importCsvFile('안내\n일자,구분,세부구분,농장명,두수\n2026-10-01,전입,,,120\n2026-10-03,전출,농장전출,민서,80\n2026-10-04,전출,외부판매,홍길동,5\n잘못,전입,,,1');
    expect(r.records.length).toBe(3);
    expect(r.records[1]).toMatchObject({ type: 'out', subtype: 'farm', farmName: '민서', head: 80 });
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it('엑셀 내보내기 파일 생성', async () => {
    const b = makeLuka(S, R).buildExportWorkbookBlob();
    expect(b.size).toBeGreaterThan(2000);
    expect(new Uint8Array(await b.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
  });
  it('수정 시 재계산', () => {
    expect(makeLuka(S, R).recomputeStatusRow('lukaStatus', { netIn: 490, death: 20, shipped: 100 })).toMatchObject({ stock: 370 });
  });
});

import { describe, it, expect } from 'vitest';
import { parseShipImport, mergeImports, splitPigonGroup } from './shipImport';
const rf = (n: string) => (['명임', '아멘', '예성', '민서'].includes(n) ? n : '');
const pig = [['No', '플랜트', '그룹명', '저장위치', '전표번호', '항번호', '출하일', '돼지구분', '판매구분', '거래처', '출하두수', '출하일령', '출하체중(kg)', '평균출하체중(kg)', '출하금액(원)', '지육체중(kg)', '평균지육체중(kg)', '지육률(%)', '암비율(%)', '1+등급비율(%)', '1등급비율(%)', '2등급비율(%)', '등외비율(%)', '1+등급이상비율(%)', '화농두수'],
  [1, 'PF1B', '명임-명임-2026-007', 'B117', '8006109188', '10', '2026-11-02', '비육돈', '비육돈판매', '(주)일호이앤에프농업회사법인', 16, 199, 1878, 117.4, 8375418, 1495, 93.4, 79.6, 25, 31.3, 37.5, 31.3, 0, 68.8, 7],
  [6, 'PF1B', '희망2-희망2-2026-006', 'B060', '8006103028', '10', '2026-11-02', '비육돈', '비육돈판매', '일호', 59, 192, 6735, 114.2, 0, 5183, 87.8, 77, 45.8, 50.8, 37.3, 10.2, 1.7, 88.1, 5]];
const team = [['3팀 출하 기록 · 2026-11-04'], [], ['출하일', '요일', '농가명', '거래처', '지역부장', '두수', '총생체중', '출하평체', '지급율(예상)', '지육율', '등급율', '1+', '1', '2', '등외'],
  ['2026-11-02', '월요일', '명임', '일호', '신동영', '16두', '1,878kg', '117.4kg', '76.6%', '79.6%', '68.8%', 5, 6, 5, 0]];
describe('출하 자료 읽기', () => {
  it('그룹명 나누기', () => { expect(splitPigonGroup('명임-명임-2026-007')).toEqual({ names: ['명임'], group: '26-7' }); });
  it('피그온', () => {
    const r = parseShipImport(pig, rf);
    expect(r.kind).toBe('pigon'); expect(r.skipped).toEqual(['희망2']);
    expect(r.rows[0]).toMatchObject({ date: '2026-11-02', farm: '명임', group: '26-7', n: 16, live: 1878, carc: 1495, g1p: 5, g1: 6, g2: 5, out: 0, age: 199 });
  });
  it('팀 대시보드 + 합치기', () => {
    const t = parseShipImport(team, rf);
    expect(t.rows[0]).toMatchObject({ farm: '명임', n: 16, live: 1878, pay: 76.6, group: '' });
    const m = mergeImports([{ file: 'p', kind: 'pigon', at: '1', rows: parseShipImport(pig, rf).rows }, { file: 't', kind: 'team', at: '2', rows: t.rows }]);
    expect(m.length).toBe(1); expect(m[0]).toMatchObject({ group: '26-7', pay: 76.6, carc: 1495, src: 'pigon' });
  });
});

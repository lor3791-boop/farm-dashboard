import { describe, it, expect } from 'vitest';
import { parseGradeSheet, segRows, segsByTrace, normGrade } from './gradeSheet';

const sheet = (): unknown[][] => {
  const a: unknown[][] = [['돼지 등급판정 결과'], ['출하자', '최진수', '', '판정일', '2026-10-06'], ['작업장 : (유)금돈'], [], ['순번', '도체번호', '이력번호', '도체중(kg)', '등급', '성별']];
  for (let i = 0; i < 68; i++) a.push([i + 1, String(1318 + i), i < 21 ? '160012345678' : '160087654321', 84 + (i % 5), i % 7 === 0 ? '2' : i % 3 === 0 ? '1+' : '1', '거세']);
  a.push(['합계', '', '', 5773, '', '']);
  return a;
};

describe('등판서 읽기', () => {
  it('머리줄·출하자·판정일·작업장·행', () => {
    const g = parseGradeSheet(sheet(), '10.06(화) 최진수(68두)등판자료.xls', 2026);
    expect(g.rows.length).toBe(68);
    expect(g.shipper).toBe('최진수');
    expect(g.date).toBe('2026-10-06');
    expect(g.plant).toBe('(유)금돈');
    expect(g.rows[0]).toMatchObject({ no: '1318', grade: '2' });
  });
  it('파일 이름에서 보충', () => {
    const a = sheet(); a[1] = []; a[2] = [];
    const g = parseGradeSheet(a, '10.06(화) 최진수(68두)등판자료.xls', 2026);
    expect(g.shipper).toBe('최진수'); expect(g.date).toBe('2026-10-06');
  });
  it('구간 나누기 13·17·38', () => {
    const g = parseGradeSheet(sheet(), 'x.xls', 2026);
    const s = segRows(g.rows, [{ start: 0, group: '26-7' }, { start: 13, group: '26-7' }, { start: 30, group: '26-8' }]);
    expect(s.map((x) => x.n)).toEqual([13, 17, 38]);
    expect(s[0].from).toBe('1318'); expect(s[2].to).toBe('1385');
    expect(segsByTrace(g.rows).map((x) => x.start)).toEqual([0, 21]);
  });
  it('등급 표기', () => { expect(normGrade('1+')).toBe('1+'); expect(normGrade('1 등급')).toBe('1'); expect(normGrade('등외')).toBe('등외'); });
});

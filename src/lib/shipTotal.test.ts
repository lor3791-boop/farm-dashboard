import { describe, it, expect } from 'vitest';
import { parseTotalSheet, mergeTotal, assignGroups, totAgg } from './shipTotal';
import { suggestLoan, parseLoans } from './bonds';
const rf = (s: string) => (s.startsWith('산성') ? '산성농원' : s.startsWith('민서') ? '민서' : '');
const head2 = ['', '출하내역', '', '', '', '', '', '', '', '', '', '매출금액', '', '', '', '지급율', '', '1+, 1 출현율', '1+', 1, 2, '등외', '계'];
const head = ['', '날짜', '팀', '담당자', '농가명', '출하처', '출하두수', '생체중량', '평체', '지육중량', '지육율', '정산금액\n(지육대금)', '등급수수료', '양돈자조금', '매출액', '업체(적용)\n지육가', '지급율'];
const row = (d: number, f: string, n: number) => ['', d, '비육계열3팀', '이오름', f, '(주)일호', n, n * 115, 115, n * 88, 0.77, n * 500000, 0, 0, 0, 6000, 0.77, 0.7, 10, 10, n - 20, 0, n];
describe('출하실적종합(新)', () => {
  it('담당농장만, 시트 연도 오타 바로잡기, 등급 두수', () => {
    const a = [head2, head, row(46357, '산성농원(박재우)', 40), row(46357, '희망1', 30)]; // 46357 = 2026-12-01
    const L = parseTotalSheet(a, rf, '202512');
    expect(L.length).toBe(1);
    expect(L[0]).toMatchObject({ date: '2025-12-01', farm: '산성농원', n: 40, g1p: 10, g1: 10, g2: 20, pay: 0.77 });
    expect(mergeTotal([L, L]).length).toBe(1);
  });
  it('그룹 배정: 직접 > 피그온 > 선입선출(140일령·출하누계)', () => {
    const r = (d: string, n: number, k: string) => ({ key: k, date: d, farm: '민서', raw: '', dest: '', n, live: n * 115, carc: n * 88, amount: 1, price: 0, pay: 0.77, g1p: 0, g1: 0, g2: 0, out: 0 });
    const rows = [r('2026-10-01', 50, 'a'), r('2026-10-02', 60, 'b'), r('2026-10-03', 40, 'c'), r('2026-10-04', 30, 'd')];
    const caps = [{ farm: '민서', group: '26-6', date: '2026-06-01', sold: 100, stock: 0, ageRef: 200 }, { farm: '민서', group: '26-7', date: '2026-07-01', sold: 50, stock: 100, ageRef: 170 }];
    const A = assignGroups(rows, caps, { d: '26-6' }, [{ farm: '민서', date: '2026-10-03', n: 40, group: '26-7' }], '2026-11-05');
    expect([A.a.group, A.b.group, A.c.group, A.d.group]).toEqual(['26-6', '26-6', '26-7', '26-6']);
    expect([A.a.how, A.c.how, A.d.how]).toEqual(['auto', 'pigon', 'manual']);
    expect(totAgg(rows.slice(0, 2)).n).toBe(110);
  });
});
describe('선급금', () => {
  const l = (note: string, orig = 30000000, balance = 20000000) => ({ key: 'k', farm: 'f', raw: '', date: '', kind: '일반', orig, recovered: orig - balance, balance, month: 0, note });
  it('상계 조건 읽기', () => {
    expect(suggestLoan(l('25년 11월 입식분 정산부터 3회전 상계'), 400).amt).toBe(10000000);
    expect(suggestLoan(l('매 정산시 두 당 3,000원 상계'), 400).amt).toBe(1200000);
    expect(suggestLoan(l('26년 2월 전입분 정산시 전액 상계'), 400).amt).toBe(20000000);
    expect(suggestLoan(l('대여금집행시 일시상환'), 400).amt).toBe(0);
    expect(suggestLoan(l('3회전', 30000000, 4000000), 400).amt).toBe(4000000);
  });
  it('담당농장 줄만', () => {
    const a = [['', '기준일', 46326], [], ['', '거래처', '지급일', '종류', '원 선급금', '회수금', '선급금 잔액', '11월 회수', '잔액'], ['', '계', '', '', 100, 0, 100, 0, 100], ['', '산성농원(박재우)-위탁', 46000, '시설', 9000, 3000, 6000, '', 6000, '3회전'], ['', '한얼팜스', 46000, '일반', 5000, 0, 5000, '', 5000, '']];
    const r = parseLoans(a, rf);
    expect(r.base).toBe('2026-10-31');
    expect(r.rows.map((x) => [x.farm, x.kind, x.balance, x.note])).toEqual([['산성농원', '시설', 6000, '3회전']]);
  });
});

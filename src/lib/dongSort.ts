// 동이 지정된 농장은 동 번호순(1동, 2동 … 숫자 기준), 동 없는 그룹은 뒤에 전입일순
const dongNo = (d: string) => { const m = (d || '').match(/\d+/); return m ? Number(m[0]) : Infinity; };
export function byDong<T extends { dong: string; date: string }>(arr: T[]): T[] {
  if (!arr.some((r) => r.dong && r.dong !== '—')) return arr;
  return [...arr].sort((a, b) => dongNo(a.dong) - dongNo(b.dong) || (a.dong || '').localeCompare(b.dong || '', 'ko', { numeric: true }) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

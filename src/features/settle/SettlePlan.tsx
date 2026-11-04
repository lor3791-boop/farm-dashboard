// 정산예정 — 추천 규칙 + 수동 추가/제외
import { useHerd, useUi } from '@/lib/ui';
import { type Group } from '@/lib/calc/herd';
import { fmt, md } from '@/lib/calc/dates';
import { Grid, Lnk, Num, Txt, sortRows, useSorts, type Col } from '@/components/v5';
import { downloadXlsx } from '@/lib/xlsx';
import { todayKST } from '@/lib/util';

export function SettlePlan() {
  const { rows, isPlanned, setPlanned, saved, save } = useHerd();
  const done = (r: Group) => saved.settled[r.who];
  const toggleDone = (r: Group) => { const m = { ...saved.settled }; if (m[r.who]) delete m[r.who]; else m[r.who] = todayKST(); save({ settled: m }); };
  const { go } = useUi();
  const sorts = useSorts();
  const goDet = (who: string) => go('/herd', { herdTab: 'herd', det: who });
  const xl = async (name: string, head: string[], data: (string | number)[][]) => downloadXlsx(name, [{ name, head, rows: data }]);
  // 정산예정
  const cand = rows.filter((r) => r.sold > 0);
  const SC: Col<Group>[] = [
    { k: 'who', l: '그룹', w: 'minmax(120px,1.2fr)', sv: (r) => r.who }, { k: 'net', l: '전입', w: '62px', num: true, sv: (r) => r.net }, { k: 'death', l: '폐사', w: '54px', num: true, sv: (r) => r.death },
    { k: 'sold', l: '출하', w: '58px', num: true, sv: (r) => r.sold }, { k: 'stock', l: '재고', w: '58px', num: true, sv: (r) => r.stock }, { k: 'prog', l: '진행률', w: '64px', num: true, sv: (r) => r.prog },
    { k: 'last', l: '마지막 출하', w: '96px', sv: (r) => r.last || '' }, { k: 'rec', l: '추천', w: 'minmax(150px,1.3fr)', sv: (r) => (r.rec ? 0 : 1) }, { k: 'plan', l: '정산예정', w: '128px', sv: (r) => (isPlanned(r) ? 0 : 1) }, { k: 'done', l: '정산완료', w: '132px', sv: (r) => (done(r) ? 1 : 0) }
  ];
  const recCount = cand.filter((r) => r.rec).length;

  return (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><h2 className="h2">정산예정 · 추천 {recCount}건 · 정산완료 {cand.filter((r) => done(r)).length}건</h2><button className="btn sm" onClick={() => xl('정산예정', ['농장', '그룹', '전입', '폐사', '출하', '재고', '진행률(%)', '마지막 출하', '추천', '정산예정', '정산완료'], cand.map((r) => [r.farm, r.group, r.net, r.death, r.sold, r.stock, r.prog, r.last ?? '', r.rec ? r.recWhy : '', isPlanned(r) ? 'Y' : '', done(r) ?? '']))}>엑셀</button></div>
          <Grid cols={SC} sort={sorts.of('settle')} onSort={(k) => sorts.cycle('settle', k)} rows={sortRows(sorts.of('settle'), SC, [...cand].sort((a, b) => Number(!!done(a)) - Number(!!done(b)) || Number(b.rec) - Number(a.rec) || b.prog - a.prog)).map((r) => { const on = isPlanned(r); return {
            key: r.who, bg: done(r) ? '#ECEAE4' : on ? '#F3F8F4' : '#FFFFFF', aria: r.farm + ' ' + r.group + ' 열기', onClick: () => goDet(r.who),
            cells: [<Lnk v={r.group} sub={r.farm} />, <Num v={fmt(r.net)} />, <Num v={r.death} />, <Num v={fmt(r.sold)} />, <Num v={fmt(r.stock)} />, <Num v={r.prog + '%'} />, <Txt v={r.last ? md(r.last) : '—'} sub={r.last ? r.since + '일 전' : ''} />, r.rec ? <span className="chip ok">{r.recWhy}</span> : null,
              <button className={(on ? 'btn pri sm' : 'btn sm') + ' fg'} onClick={() => setPlanned(r, !on)}>{on ? '정산예정 ✓' : '+ 추가'}</button>,
              <button className={(done(r) ? 'btn pri sm' : 'btn sm') + ' fg'} title={done(r) ? '다시 누르면 해제' : ''} onClick={() => toggleDone(r)}>{done(r) ? '정산완료 ✓ ' + md(done(r)) : '정산완료'}</button>] }; })} />
        </div>
  );
}

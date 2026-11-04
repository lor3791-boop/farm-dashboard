// 출하지연 · 경고 — 170일령↑ 출하 0 / 190일령↑ 재고 남음 / 출하 멈춤 / 첫출하예정 경과
import { useHerd } from '@/lib/ui';
import { type Group } from '@/lib/calc/herd';
import { fmt } from '@/lib/calc/dates';
import { Grid, Lnk, Num, sortRows, useSorts, type Col } from '@/components/v5';
import { downloadXlsx } from '@/lib/xlsx';

export function DelayTab({ onOpen }: { onOpen: (who: string) => void }) {
  const { rows } = useHerd();
  const sorts = useSorts();
  const goDet = onOpen;
  const xl = async (name: string, head: string[], data: (string | number)[][]) => downloadXlsx(name, [{ name, head, rows: data }]);
  const warnRows = rows.filter((r) => r.warn.length);
  const WC: Col<Group>[] = [{ k: 'who', l: '그룹', w: 'minmax(120px,1.1fr)', sv: (r) => r.who }, { k: 'age', l: '일령', w: '56px', num: true, sv: (r) => r.age }, { k: 'sold', l: '출하', w: '58px', num: true, sv: (r) => r.sold }, { k: 'stock', l: '재고', w: '58px', num: true, sv: (r) => r.stock }, { k: 'prog', l: '진행', w: '56px', num: true, sv: (r) => r.prog }, { k: 'warn', l: '사유', w: 'minmax(220px,2.4fr)', sv: (r) => (r.warnBad ? 0 : 1) }];
  return (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}><h2 className="h2">출하지연 · 경고</h2><button className="btn sm" onClick={() => xl('출하지연경고', ['농장', '그룹', '일령', '출하', '재고', '진행(%)', '사유'], warnRows.map((r) => [r.farm, r.group, r.age, r.sold, r.stock, r.prog, r.warn.join(' · ')]))}>엑셀</button></div>
          <Grid cols={WC} sort={sorts.of('warn')} onSort={(k) => sorts.cycle('warn', k)} rows={sortRows(sorts.of('warn'), WC, warnRows).map((r) => ({
            key: r.who, aria: r.farm + ' ' + r.group + ' 열기', onClick: () => goDet(r.who),
            cells: [<Lnk v={r.group} sub={r.farm} />, <Num v={r.age} />, <Num v={fmt(r.sold)} />, <Num v={fmt(r.stock)} />, <Num v={r.prog + '%'} />, <span className={r.warnBad ? 'small neg' : 'small warnT'}>{r.warn.join(' · ')}</span>]
          }))} />
          {warnRows.length === 0 && <div className="muted small" style={{ padding: 12 }}>경고 그룹이 없습니다.</div>}
        </div>
  );
}

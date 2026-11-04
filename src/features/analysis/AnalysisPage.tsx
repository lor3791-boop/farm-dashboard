// 성적분석 — 예상육성률 / 폐사율 순위 / 보고자료(농장별 현황보고서)
import { useHerd, useUi } from '@/lib/ui';
import { agg } from '@/lib/calc/herd';
import { fmt, r1 } from '@/lib/calc/dates';
import { Grid, Lnk, Num, Tabs, sortRows, useSorts, type Col } from '@/components/v5';
import { downloadXlsx } from '@/lib/xlsx';
import { ReportTab } from './ReportTab';

export function AnalysisPage() {
  const { all, farms, rows, passFarm, isPlanned, s, set, saved, save, T } = useHerd();
  const { go } = useUi();
  const sorts = useSorts();
  if (!T) return null;
  const cand = rows.filter((r) => r.sold > 0);
  // 예상육성률
  const hv = saved.heatVals;
  const survRows = cand.filter(isPlanned);

  // 농장 집계
  const farmAgg = farms.filter(passFarm).map((f) => ({ ...agg(all.filter((r) => r.farm === f)), name: f }));
  type FA = (typeof farmAgg)[number];
  const maxM = Math.max(0.1, ...farmAgg.map((f) => f.mort));
  const RC: Col<FA>[] = [{ k: 'name', l: '농장', w: 'minmax(84px,1fr)', sv: (f) => f.name }, { k: 'net', l: '전입', w: '72px', num: true, sv: (f) => f.net }, { k: 'death', l: '폐사', w: '64px', num: true, sv: (f) => f.death }, { k: 'mort', l: '폐사율', w: '70px', num: true, sv: (f) => f.mort }, { k: 'bar', l: '비교', w: 'minmax(140px,2fr)', sv: (f) => f.mort }];
  const rankBase = [...farmAgg].sort((a, b) => b.mort - a.mort);
  const xl = async (name: string, head: string[], data: (string | number)[][]) => downloadXlsx(name, [{ name, head, rows: data }]);

  return (
    <>
      <Tabs opts={[['surv', '예상육성률'], ['rank', '폐사율 순위'], ['report', '보고자료']]} value={s.anTab} onPick={(k) => set({ anTab: k })} />
      {s.anTab === 'surv' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}><h2 className="h2">예상육성률 (정산예정 그룹)</h2><label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={s.heat} onChange={() => set({ heat: !s.heat })} style={{ minHeight: 0, width: 18, height: 18 }} /> 하절기 항목 보기</label></div>
          <div className="gt" style={{ marginTop: 10 }}>
            <div className="gr gh small muted" style={{ gridTemplateColumns: '1.2fr 0.6fr 0.6fr 0.6fr 1.6fr 1fr', minWidth: 560 }}><div>그룹</div><div className="r">전입</div><div className="r">출하</div><div className="r">재고</div><div className="r">예상육성률</div><div className="r">{s.heat ? '폭염 인정두수' : ''}</div></div>
            {survRows.length === 0 && <div className="muted small" style={{ padding: 12 }}>정산예정 그룹이 없습니다.</div>}
            {survRows.map((r) => { const h = s.heat ? Number(hv[r.who] || 0) : 0; return (
              <div key={r.who} className="gr" style={{ gridTemplateColumns: '1.2fr 0.6fr 0.6fr 0.6fr 1.6fr 1fr', minWidth: 560 }}>
                <div className="b">{r.who}</div><div className="r">{fmt(r.net)}</div><div className="r">{fmt(r.sold)}</div><div className="r">{fmt(r.stock)}</div>
                <div className="r"><b>{r.expSurv}%</b> <span className="muted">{h > 0 ? '(폭염 포함 ' + r1(((r.sold + r.stock - r.claim + h) / r.net) * 100) + '%)' : ''}</span></div>
                <div className="r">{s.heat && <input type="number" placeholder="0" value={hv[r.who] || ''} style={{ width: 80 }} onChange={(e) => save({ heatVals: { ...hv, [r.who]: e.target.value } })} aria-label="폭염 인정두수" />}</div>
              </div>
            ); })}
          </div>
        </div>
      )}
      {s.anTab === 'rank' && (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}><h2 className="h2">농장별 폐사율 순위 (진행 중 그룹 누적)</h2><button className="btn sm" onClick={() => xl('폐사율순위', ['순위', '농장', '전입', '폐사', '폐사율(%)'], rankBase.map((f, i) => [i + 1, f.name, f.net, f.death, f.mort]))}>엑셀</button></div>
          <Grid cols={RC} sort={sorts.of('rank')} onSort={(k) => sorts.cycle('rank', k)} rows={sortRows(sorts.of('rank'), RC, rankBase).map((f) => ({
            key: f.name, aria: f.name + ' 열기', onClick: () => go('/herd', { herdTab: 'herd', fSel: [f.name] }),
            cells: [<Lnk v={f.name} sub={rankBase.indexOf(f) + 1 + '위'} />, <Num v={fmt(f.net)} />, <Num v={fmt(f.death)} />, <Num v={f.mort + '%'} cls="b" />, <div className="bar"><div style={{ width: Math.max(2, (f.mort / maxM) * 100).toFixed(0) + '%' }} /></div>]
          }))} />
        </div>
      )}
      {s.anTab === 'report' && <ReportTab />}
    </>
  );
}

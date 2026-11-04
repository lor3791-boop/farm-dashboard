// 보고자료 — 농장별 현황보고서(단일/2~3개 비교 + 기간), 엑셀
import { useState } from 'react';
import { useHerd } from '@/lib/ui';
import { agg, type Group } from '@/lib/calc/herd';
import { fmt, r1 } from '@/lib/calc/dates';
import { shipAgg } from '@/lib/calc/ship';
import { MONTHS, WEEKLY } from '@/data/snapshot';
import { FarmPicker, Segs } from '@/components/v5';
import { downloadXlsx } from '@/lib/xlsx';

const monthOpts = MONTHS.map((m) => ({ v: m, l: m.slice(0, 4) + '년 ' + Number(m.slice(5)) + '월' }));

export function ReportTab() {
  const { all, farms, ships, shipRows, liveShips, T } = useHerd();
  const [r, setR] = useState({ mode: 'compare' as 'single' | 'compare', sel: ['재성', '산성농원', '민서'], open: false, q: '', from: '2026-07', to: '2026-10', msg: '', money: false });
  const SHIP = shipRows;
  if (!T) return null;
  const rMax = r.mode === 'single' ? 1 : 3;
  const rSel = r.sel.slice(0, rMax);
  const rOpts = farms.filter((f) => !r.q || f.includes(r.q)).map((f) => { const on = rSel.includes(f); const full = !on && rSel.length >= rMax; return { name: f, on, meta: full ? '최대 ' + rMax + '개' : '', toggle: () => {
    if (rMax === 1) setR({ ...r, sel: [f], open: false }); else if (on) setR({ ...r, sel: rSel.filter((x) => x !== f), msg: '' }); else if (!full) setR({ ...r, sel: rSel.concat([f]), msg: '' }); else setR({ ...r, msg: '비교는 최대 3개까지 — 하나를 빼고 고르세요' });
  } }; });
  const inRange = (g: Group) => g.date.slice(0, 7) >= r.from && g.date.slice(0, 7) <= r.to;
  const rangeBad = r.from > r.to;
  const metr: [string, (g: Group[]) => string][] = [
    ['전입 그룹 수', (g) => g.length + '개'], ['전입두수 (실정산)', (g) => fmt(agg(g).net)], ['평균 전입평체', (g) => (g.length ? r1(g.reduce((a, x) => a + x.avgw * x.net, 0) / agg(g).net) + 'kg' : '—')],
    ['폐사', (g) => fmt(agg(g).death)], ['육성률', (g) => (g.length ? agg(g).surv + '%' : '—')], ['출하', (g) => fmt(agg(g).sold)], ['재고', (g) => fmt(agg(g).stock)], ['경고 그룹', (g) => g.filter((x) => x.warn.length).length + '개']
  ];
  const rCols = rSel.map((f) => ({ f, g: all.filter((x) => x.farm === f && inRange(x)) }));
  const grid = '150px ' + rCols.map(() => 'minmax(90px,1fr)').join(' ');
  const rOk = !rangeBad && rSel.length >= (r.mode === 'single' ? 1 : 2);
  const rTitle = (r.mode === 'single' ? '단일 농장 보고서' : '농장 간 비교') + ' · ' + r.from.replace('-', '.') + ' ~ ' + r.to.replace('-', '.') + ' 전입 그룹';

  const downloadReport = () => {
    if (!rOk) return;
    const groups = rCols.flatMap((c) => c.g);
    const ships = SHIP.filter((x) => rSel.includes(x[1]) && x[0].slice(0, 7) >= r.from && x[0].slice(0, 7) <= r.to);
    const shipHead = ['농장', '출하두수', '평균체중', '지육율(%)', '1+·1 등급율(%)', '등외'].concat(r.money ? ['지급율(%)'] : []);
    downloadXlsx('현황보고서_' + rSel.join('_'), [
      { name: '요약', head: ['항목', ...rSel], rows: metr.map(([l, fn]) => [l, ...rCols.map((c) => fn(c.g))]) },
      { name: '그룹별 상세', head: ['농장', '그룹', '동', '전입일', '전입', '클레임', '폐사', '육성률(%)', '출하', '재고', '진행률(%)', '경고'], rows: groups.map((x) => [x.farm, x.group, x.dong, x.date, x.net, x.claim, x.death, x.surv, x.sold, x.stock, x.prog, x.warn.join(' · ')]) },
      { name: '주차별 폐사', head: ['농장', '그룹', ...Array.from({ length: 22 }, (_, i) => i + 1 + '주')], rows: groups.map((x) => [x.farm, x.group, ...(WEEKLY[x.who] || [])]) },
      { name: '출하성적', head: shipHead, rows: rSel.map((f) => { const a = shipAgg(ships.filter((x) => x[1] === f)); return [f, a.n, a.avgw, a.yld, a.g11, a.out, ...(r.money ? [a.pay] : [])]; }) }
    ]);
  };

  return (
        <>
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'end' }}>
              <div><div className="small muted" style={{ marginBottom: 4 }}>보고서 종류</div><Segs opts={[['single', '단일 농장'], ['compare', '농장 간 비교 (2~3개)']]} value={r.mode} onPick={(k) => setR({ ...r, mode: k, msg: '' })} /></div>
              <div>
                <div className="small muted" style={{ marginBottom: 4 }}>농장 (최대 {rMax}개)</div>
                <FarmPicker label={<b>{rSel.length ? rSel.join(', ') : '농장 선택'}</b>} open={r.open} setOpen={(v) => setR({ ...r, open: v })} q={r.q} setQ={(v) => setR({ ...r, q: v })} opts={rOpts} msg={r.msg} />
              </div>
              <label className="small muted">시작 월<br /><select value={r.from} onChange={(e) => setR({ ...r, from: e.target.value })}>{monthOpts.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></label>
              <span style={{ paddingBottom: 10 }}>~</span>
              <label className="small muted">끝 월<br /><select value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })}>{monthOpts.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></label>
              <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 10 }}><input type="checkbox" checked={r.money} onChange={() => setR({ ...r, money: !r.money })} style={{ minHeight: 0, width: 18, height: 18 }} /> 지급율·금액 포함 (사내용)</label>
              <button className="btn pri" disabled={!rOk} onClick={downloadReport}>엑셀로 내려받기</button>
            </div>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 className="h2" style={{ marginBottom: 10 }}>{rTitle}</h2>
            {rangeBad && <div className="chip bad">시작 월이 끝 월보다 늦습니다</div>}
            {!rOk && !rangeBad && <div className="chip warn">{r.mode === 'single' ? '농장을 1개 고르세요' : '비교할 농장을 2개 이상 고르세요'}</div>}
            {rOk && (
              <>
                <div className="gt"><div style={{ minWidth: 460 }}>
                  <div className="gr gh" style={{ gridTemplateColumns: grid }}><div className="small muted">항목</div>{rCols.map((c) => <div key={c.f} className="r b">{c.f}</div>)}</div>
                  {metr.map(([l, fn]) => (
                    <div key={l} className="gr" style={{ gridTemplateColumns: grid }}><div className="muted">{l}</div>{rCols.map((c) => <div key={c.f} className={l === '육성률' && c.g.length && agg(c.g).surv < T.problemSurvivalPct ? 'r b neg' : 'r'}>{fn(c.g)}</div>)}</div>
                  ))}
                </div></div>
              </>
            )}
          </div>
        </>
  );
}

// 농장별 출하성적 — 출하실적종합(+ 종합 전 등판서·직접 입력) 가중평균, 농장별/월별
import { useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { fmt, md, r1 } from '@/lib/calc/dates';
import { shipAgg, shortDest, type ShipAgg } from '@/lib/calc/ship';
import { MONTHS } from '@/data/snapshot';
import { Grid, Lnk, Num, Segs, sortRows, useSorts, type Col } from '@/components/v5';
import { downloadXlsx } from '@/lib/xlsx';

const monthOpts = MONTHS.map((m) => ({ v: m, l: m.slice(0, 4) + '년 ' + Number(m.slice(5)) + '월' }));

export function ShipGrade() {
  const { farms, passFarm, ships, shipRows, liveShips } = useHerd();
  const sorts = useSorts();
  const SHIP = shipRows;
  const [g, setG] = useState({ from: '2026-08', to: '2026-10', view: 'farm' as 'farm' | 'all', farm: '민서', setOpen: false });
  // 출하성적
  const shipIn = SHIP.filter((x) => x[0].slice(0, 7) >= g.from && x[0].slice(0, 7) <= g.to && passFarm(x[1]));
  const gTot = shipAgg(shipIn);
  const gCards: [string, string, string][] = [['출하두수', fmt(gTot.n) + '두', gTot.trucks + '회 출하'], ['평균체중', gTot.avgw + 'kg', '생체 합 ÷ 두수'], ['지급율', gTot.pay + '%', '지육중량 가중평균'], ['지육율', gTot.yld + '%', '지육 합 ÷ 생체 합'], ['등급율 (1+·1)', gTot.g11 + '%', '1+ 등급 ' + gTot.gp + '%'], ['등외', fmt(gTot.out) + '두', gTot.n ? r1((gTot.out / gTot.n) * 100) + '%' : '']];
  type GA = ShipAgg & { name: string };
  const GC: Col<GA>[] = [{ k: 'name', l: '농장', w: 'minmax(84px,1fr)', sv: (a) => a.name }, { k: 'n', l: '출하두수', w: '76px', num: true, sv: (a) => a.n }, { k: 'avgw', l: '평균체중', w: '76px', num: true, sv: (a) => a.avgw }, { k: 'pay', l: '지급율', w: '68px', num: true, sv: (a) => a.pay }, { k: 'yld', l: '지육율', w: '68px', num: true, sv: (a) => a.yld }, { k: 'g11', l: '1+·1 등급율', w: '88px', num: true, sv: (a) => a.g11 }, { k: 'gp', l: '1+ 등급율', w: '76px', num: true, sv: (a) => a.gp }, { k: 'out', l: '등외', w: '56px', num: true, sv: (a) => a.out }];
  const gCells = (a: GA, sub?: string) => [<Lnk v={a.name} sub={sub} />, <Num v={fmt(a.n)} />, <Num v={a.avgw + 'kg'} />, <Num v={a.pay + '%'} cls="b" />, <Num v={a.yld + '%'} />, <Num v={a.g11 + '%'} />, <Num v={a.gp + '%'} />, <Num v={a.out} />];
  const gFarmAgg: GA[] = [...new Set(shipIn.map((x) => x[1]))].map((f) => ({ ...shipAgg(shipIn.filter((x) => x[1] === f)), name: f }));
  const gMonths: GA[] = MONTHS.filter((m) => m >= g.from && m <= g.to).map((m) => ({ ...shipAgg(shipIn.filter((x) => x[0].slice(0, 7) === m)), name: Number(m.slice(5)) + '월' })).filter((a) => a.n > 0);
  const gList = shipIn.filter((x) => x[1] === g.farm).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const gFarmL = shipIn.filter((x) => x[1] === g.farm); const gfa = shipAgg(gFarmL);
  const noShip = farms.filter((f) => passFarm(f) && !shipIn.some((x) => x[1] === f));

  return (
        <>
          <div className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
              <label className="small muted">시작 월<br /><select value={g.from} onChange={(e) => setG({ ...g, from: e.target.value })}>{monthOpts.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></label>
              <span style={{ paddingBottom: 10 }}>~</span>
              <label className="small muted">끝 월<br /><select value={g.to} onChange={(e) => setG({ ...g, to: e.target.value })}>{monthOpts.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></label>
              <Segs label="보기" opts={[['all', '농장 전체 (월별)'], ['farm', '농장별']]} value={g.view} onPick={(k) => setG({ ...g, view: k })} />
              <div style={{ flex: 1 }} />
              <button className="btn sm ghost" onClick={() => setG({ ...g, setOpen: !g.setOpen })}>{g.setOpen ? '첫출하 체중 기준 닫기' : '첫출하 체중 기준 설정'}</button>
              <button className="btn sm" onClick={() => downloadXlsx('출하성적', [
                { name: '농장별', head: ['농장', '출하두수', '평균체중', '지급율(%)', '지육율(%)', '1+·1 등급율(%)', '1+ 등급율(%)', '등외'], rows: gFarmAgg.map((a) => [a.name, a.n, a.avgw, a.pay, a.yld, a.g11, a.gp, a.out]) },
                { name: '월별', head: ['월', '출하두수', '평균체중', '지급율(%)', '지육율(%)', '1+·1 등급율(%)', '1+ 등급율(%)', '등외'], rows: gMonths.map((a) => [a.name, a.n, a.avgw, a.pay, a.yld, a.g11, a.gp, a.out]) },
                { name: '출하내역', head: ['출하일', '농장', '출하처', '두수', '생체kg', '지육kg', '지급율', '1+', '1', '2', '등외'], rows: shipIn.map((x) => [...x]) }
              ])}>엑셀</button>
            </div>
            {g.setOpen && <FirstShipSetting />}
            {g.from > g.to && <div className="chip bad" style={{ marginTop: 10 }}>시작 월이 끝 월보다 늦습니다</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 10, marginTop: 14 }}>
            {gCards.map(([l, v, x]) => <div key={l} className="card" style={{ padding: '14px 16px' }}><div className="muted small">{l}</div><div style={{ fontSize: 24, fontWeight: 700 }}>{v}</div><div className="sub">{x}</div></div>)}
          </div>
          <div className="muted" style={{ fontSize: 12, margin: '8px 0 14px' }}>{noShip.length ? '기간 내 출하 없음: ' + noShip.map((f) => (f === '골드피그' ? '골드피그(신규 · 출하 전)' : f)).join(', ') : ''}</div>
          {g.view === 'farm' && (
            <>
              <div className="card">
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}><h2 className="h2">농장별 가중평균</h2></div>
                <Grid cols={GC} sort={sorts.of('gfarm')} onSort={(k) => sorts.cycle('gfarm', k)} rows={sortRows(sorts.of('gfarm'), GC, gFarmAgg).map((a) => ({ key: a.name, bg: a.name === g.farm ? '#E4ECF3' : '#FFFFFF', aria: a.name + ' 열기', onClick: () => setG({ ...g, farm: a.name }), cells: gCells(a) }))} />
              </div>
              {gList.length > 0 && (
                <div className="card" style={{ marginTop: 14 }}>
                  <h2 className="h2">{g.farm} 출하 내역</h2>
                  <div className="muted small" style={{ margin: '4px 0 10px' }}>{g.farm} 평균: {fmt(gfa.n)}두 · {gfa.avgw}kg · 지급율 {gfa.pay}% · 지육율 {gfa.yld}% · 1+·1 {gfa.g11}% · 등외 {gfa.out}두</div>
                  <div className="gt"><div style={{ minWidth: 720 }}>
                    <div className="gr gh small muted" style={{ gridTemplateColumns: '56px 80px 56px 70px 64px 64px 44px 44px 44px 44px' }}><div>출하일</div><div>출하처</div><div className="r">두수</div><div className="r">평체</div><div className="r">지육율</div><div className="r">지급율</div><div className="r">1+</div><div className="r">1</div><div className="r">2</div><div className="r">등외</div></div>
                    {gList.map((x, i) => (
                      <div key={i} className="gr" style={{ gridTemplateColumns: '56px 80px 56px 70px 64px 64px 44px 44px 44px 44px' }}><div>{md(x[0])}</div><div className="small">{shortDest(x[2])}</div><div className="r b">{x[3]}</div><div className="r">{x[3] ? r1(x[4] / x[3]) + 'kg' : '—'}</div><div className="r">{x[4] ? r1((x[5] / x[4]) * 100) + '%' : '—'}</div><div className="r">{x[6] > 0 ? r1(x[6] * 100) + '%' : '—'}</div><div className="r">{x[7]}</div><div className="r">{x[8]}</div><div className="r">{x[9]}</div><div className="r">{x[10]}</div></div>
                    ))}
                  </div></div>
                </div>
              )}
            </>
          )}
          {g.view === 'all' && (
            <div className="card">
              <h2 className="h2" style={{ marginBottom: 8 }}>농장 전체 · 월별 가중평균</h2>
              <Grid cols={GC.map((c, i) => (i === 0 ? { ...c, l: '월' } : c))} sort={sorts.of('gmonth')} onSort={(k) => sorts.cycle('gmonth', k)} rows={sortRows(sorts.of('gmonth'), GC, gMonths).map((a) => ({ key: a.name, cells: gCells(a) }))} />
            </div>
          )}
        </>
  );
}

// 첫출하 체중 기준 — 전체 기본값은 기준값(설정)에, 농장별 값은 화면 저장값에 저장. 적용 즉시 첫출하예정 재계산
function FirstShipSetting() {
  const { T, farms, saved, save } = useHerd();
  const { repo, email } = useAuth();
  const [v, setV] = useState(String(T?.firstShipWeightKg ?? 113));
  const [farm, setFarm] = useState('민서');
  const [fv, setFv] = useState(saved.firstShipByFarm['민서'] ? String(saved.firstShipByFarm['민서']) : '');
  const [msg, setMsg] = useState('');
  const ok = (x: number) => x >= 60 && x <= 160;
  const apply = async () => {
    const n = Number(v); if (!T || !ok(n)) { setMsg('60~160kg 사이로 넣으세요'); return; }
    if (n !== T.firstShipWeightKg) await repo!.saveThresholds({ ...T, firstShipWeightKg: n }, email);
    const m = { ...saved.firstShipByFarm };
    if (fv.trim() === '') delete m[farm]; else { const k = Number(fv); if (!ok(k)) { setMsg('농장 기준도 60~160kg 사이로 넣으세요'); return; } m[farm] = k; }
    save({ firstShipByFarm: m });
    setMsg('적용했습니다 — 첫출하예정·출하종료·다음 전입을 다시 계산했습니다');
  };
  const byFarm = Object.entries(saved.firstShipByFarm);
  return (
    <div style={{ marginTop: 14, padding: 14, background: '#F7F5F0', borderRadius: 10 }}>
      <div className="b" style={{ marginBottom: 8 }}>첫출하 체중 기준</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'end' }}>
        <label style={{ fontSize: 14 }}>전체 기본값 (kg)<br /><input type="number" value={v} onChange={(e) => setV(e.target.value)} style={{ width: 120 }} /></label>
        <label style={{ fontSize: 14 }}>농장별 따로 정하기<br /><select value={farm} onChange={(e) => { setFarm(e.target.value); setFv(saved.firstShipByFarm[e.target.value] ? String(saved.firstShipByFarm[e.target.value]) : ''); }}>{farms.map((f) => <option key={f}>{f}</option>)}</select></label>
        <label style={{ fontSize: 14 }}>이 농장 기준 (kg)<br /><input type="number" placeholder="기본값 사용" value={fv} onChange={(e) => setFv(e.target.value)} style={{ width: 140 }} /></label>
        <button className="btn pri" onClick={apply}>적용</button>
      </div>
      {msg && <div style={{ marginTop: 8 }}><span className={msg.startsWith('적용') ? 'chip ok' : 'chip warn'}>{msg}</span></div>}
      {byFarm.length > 0 && <div className="small" style={{ marginTop: 8 }}>농장별 기준: {byFarm.map(([f, k]) => f + ' ' + k + 'kg').join(' · ')}</div>}
    </div>
  );
}

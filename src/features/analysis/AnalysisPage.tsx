// 분석 — 정산예정 / 예상육성률 / 폐사율 순위 / 출하지연·경고 / 출하성적 (목업 v5)
import { useState } from 'react';
import { useHerd, useUi } from '@/lib/ui';
import { agg, type Group } from '@/lib/calc/herd';
import { fmt, md, r1 } from '@/lib/calc/dates';
import { shipAgg, shortDest, type ShipAgg } from '@/lib/calc/ship';
import { SHIP, MONTHS } from '@/data/snapshot';
import { Grid, Lnk, Num, Segs, Tabs, Txt, sortRows, useSorts, type Col } from '@/components/v5';
import { downloadXlsx } from '@/lib/xlsx';
import { useAuth } from '@/lib/auth';

const monthOpts = MONTHS.map((m) => ({ v: m, l: m.slice(0, 4) + '년 ' + Number(m.slice(5)) + '월' }));

export function AnalysisPage() {
  const H = useHerd();
  const { all, farms, rows, passFarm, isPlanned, setPlanned, s, set, saved, save, T } = H;
  const { go } = useUi();
  const sorts = useSorts();
  const [g, setG] = useState({ from: '2026-08', to: '2026-10', view: 'farm' as 'farm' | 'all', farm: '민서', setOpen: false });
  if (!T) return null;
  const goDet = (who: string) => go('/herd', { det: who });

  // 정산예정
  const cand = rows.filter((r) => r.sold > 0);
  const SC: Col<Group>[] = [
    { k: 'who', l: '그룹', w: 'minmax(120px,1.2fr)', sv: (r) => r.who }, { k: 'net', l: '전입', w: '62px', num: true, sv: (r) => r.net }, { k: 'death', l: '폐사', w: '54px', num: true, sv: (r) => r.death },
    { k: 'sold', l: '출하', w: '58px', num: true, sv: (r) => r.sold }, { k: 'stock', l: '재고', w: '58px', num: true, sv: (r) => r.stock }, { k: 'prog', l: '진행률', w: '64px', num: true, sv: (r) => r.prog },
    { k: 'last', l: '마지막 출하', w: '96px', sv: (r) => r.last || '' }, { k: 'rec', l: '추천', w: 'minmax(150px,1.3fr)', sv: (r) => (r.rec ? 0 : 1) }, { k: 'plan', l: '정산예정', w: '128px', sv: (r) => (isPlanned(r) ? 0 : 1) }
  ];
  const recCount = cand.filter((r) => r.rec).length;

  // 예상육성률
  const hv = saved.heatVals;
  const survRows = cand.filter(isPlanned);

  // 농장 집계
  const farmAgg = farms.filter(passFarm).map((f) => ({ ...agg(all.filter((r) => r.farm === f)), name: f }));
  type FA = (typeof farmAgg)[number];
  const maxM = Math.max(0.1, ...farmAgg.map((f) => f.mort));
  const RC: Col<FA>[] = [{ k: 'name', l: '농장', w: 'minmax(84px,1fr)', sv: (f) => f.name }, { k: 'net', l: '전입', w: '72px', num: true, sv: (f) => f.net }, { k: 'death', l: '폐사', w: '64px', num: true, sv: (f) => f.death }, { k: 'mort', l: '폐사율', w: '70px', num: true, sv: (f) => f.mort }, { k: 'bar', l: '비교', w: 'minmax(140px,2fr)', sv: (f) => f.mort }];
  const rankBase = [...farmAgg].sort((a, b) => b.mort - a.mort);
  const warnRows = rows.filter((r) => r.warn.length);
  const WC: Col<Group>[] = [{ k: 'who', l: '그룹', w: 'minmax(120px,1.1fr)', sv: (r) => r.who }, { k: 'age', l: '일령', w: '56px', num: true, sv: (r) => r.age }, { k: 'sold', l: '출하', w: '58px', num: true, sv: (r) => r.sold }, { k: 'stock', l: '재고', w: '58px', num: true, sv: (r) => r.stock }, { k: 'prog', l: '진행', w: '56px', num: true, sv: (r) => r.prog }, { k: 'warn', l: '사유', w: 'minmax(220px,2.4fr)', sv: (r) => (r.warnBad ? 0 : 1) }];

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

  const xl = async (name: string, head: string[], data: (string | number)[][]) => downloadXlsx(name, [{ name, head, rows: data }]);

  return (
    <>
      <Tabs opts={[['settle', '정산예정'], ['surv', '예상육성률'], ['rank', '폐사율 순위'], ['warn', '출하지연 · 경고'], ['grade', '출하성적']]} value={s.anTab} onPick={(k) => set({ anTab: k })} />
      {s.anTab === 'settle' && (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><h2 className="h2">10월 정산예정 · 추천 {recCount}건</h2><button className="btn sm" onClick={() => xl('정산예정', ['농장', '그룹', '전입', '폐사', '출하', '재고', '진행률(%)', '마지막 출하', '추천', '정산예정'], cand.map((r) => [r.farm, r.group, r.net, r.death, r.sold, r.stock, r.prog, r.last ?? '', r.rec ? r.recWhy : '', isPlanned(r) ? 'Y' : '']))}>엑셀</button></div>
          <div className="muted small" style={{ margin: '6px 0 10px', lineHeight: 1.7 }}>추천: 진행률 {T.settleProgressPct}% 이상 · 재고가 전입의 {T.settleStockPct}% 이하 · 마지막 출하 후 {T.settleLastShipDays}일 경과(진행률 {T.settleLastShipMinProgress}% 이상). 추천 그룹은 자동으로 정산예정, 버튼으로 빼거나 추가.</div>
          <Grid cols={SC} sort={sorts.of('settle')} onSort={(k) => sorts.cycle('settle', k)} rows={sortRows(sorts.of('settle'), SC, [...cand].sort((a, b) => Number(b.rec) - Number(a.rec) || b.prog - a.prog)).map((r) => { const on = isPlanned(r); return {
            key: r.who, bg: on ? '#F3F8F4' : '#FFFFFF', aria: r.farm + ' ' + r.group + ' 열기', onClick: () => goDet(r.who),
            cells: [<Lnk v={r.group} sub={r.farm} />, <Num v={fmt(r.net)} />, <Num v={r.death} />, <Num v={fmt(r.sold)} />, <Num v={fmt(r.stock)} />, <Num v={r.prog + '%'} />, <Txt v={r.last ? md(r.last) : '—'} sub={r.last ? r.since + '일 전' : ''} />, r.rec ? <span className="chip ok">{r.recWhy}</span> : null,
              <button className={(on ? 'btn pri sm' : 'btn sm') + ' fg'} onClick={() => setPlanned(r, !on)}>{on ? '정산예정 ✓' : '+ 추가'}</button>] }; })} />
        </div>
      )}
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
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>예상육성률 = (출하 + 재고 − 클레임) ÷ (실두수 − 클레임). 폭염 인정두수를 넣으면 괄호에 '폭염 포함' 값.</div>
        </div>
      )}
      {s.anTab === 'rank' && (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}><h2 className="h2">농장별 폐사율 순위 (진행 중 그룹 누적)</h2><button className="btn sm" onClick={() => xl('폐사율순위', ['순위', '농장', '전입', '폐사', '폐사율(%)'], rankBase.map((f, i) => [i + 1, f.name, f.net, f.death, f.mort]))}>엑셀</button></div>
          <Grid cols={RC} sort={sorts.of('rank')} onSort={(k) => sorts.cycle('rank', k)} rows={sortRows(sorts.of('rank'), RC, rankBase).map((f) => ({
            key: f.name, aria: f.name + ' 열기', onClick: () => go('/herd', { fSel: [f.name] }),
            cells: [<Lnk v={f.name} sub={rankBase.indexOf(f) + 1 + '위'} />, <Num v={fmt(f.net)} />, <Num v={fmt(f.death)} />, <Num v={f.mort + '%'} cls="b" />, <div className="bar"><div style={{ width: Math.max(2, (f.mort / maxM) * 100).toFixed(0) + '%' }} /></div>]
          }))} />
        </div>
      )}
      {s.anTab === 'warn' && (
        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}><h2 className="h2">출하지연 · 경고</h2><button className="btn sm" onClick={() => xl('출하지연경고', ['농장', '그룹', '일령', '출하', '재고', '진행(%)', '사유'], warnRows.map((r) => [r.farm, r.group, r.age, r.sold, r.stock, r.prog, r.warn.join(' · ')]))}>엑셀</button></div>
          <Grid cols={WC} sort={sorts.of('warn')} onSort={(k) => sorts.cycle('warn', k)} rows={sortRows(sorts.of('warn'), WC, warnRows).map((r) => ({
            key: r.who, aria: r.farm + ' ' + r.group + ' 열기', onClick: () => goDet(r.who),
            cells: [<Lnk v={r.group} sub={r.farm} />, <Num v={r.age} />, <Num v={fmt(r.sold)} />, <Num v={fmt(r.stock)} />, <Num v={r.prog + '%'} />, <span className={r.warnBad ? 'small neg' : 'small warnT'}>{r.warn.join(' · ')}</span>]
          }))} />
          {warnRows.length === 0 && <div className="muted small" style={{ padding: 12 }}>경고 그룹이 없습니다.</div>}
          <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.7 }}>{T.delayNoShipAge}일령 초과 + 출하 0두 · {T.delayRemainAge}일령 초과 + 재고 남음(빨강) · 출하 멈춤(마지막 출하 {T.settleLastShipDays}일, 진행 {T.stallProgressPct}% 미만) · 첫출하예정 {T.firstShipOverdueDays}일 이상 경과 + 출하 0두.</div>
        </div>
      )}
      {s.anTab === 'grade' && (
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
          <div className="muted" style={{ fontSize: 12, margin: '8px 0 14px' }}>위 카드 = 상단 필터의 농장 전체 가중평균 · {noShip.length ? '기간 내 출하 없음: ' + noShip.map((f) => (f === '골드피그' ? '골드피그(신규 · 출하 전)' : f)).join(', ') : ''}</div>
          {g.view === 'farm' && (
            <>
              <div className="card">
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}><h2 className="h2">농장별 가중평균</h2><span className="muted small">줄을 누르면 아래에 그 농장 출하 내역</span></div>
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
          <div className="muted" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.7 }}>자료: 출하실적종합 (5~10/9) · 평균체중 = 생체 합 ÷ 두수 · 지육율 = 지육 합 ÷ 생체 합 · 지급율 = 지육중량으로 가중한 평균 · 등급율 = (1+ + 1) ÷ 두수</div>
        </>
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
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>적용하면 돈군·분석의 첫출하예정, 출하종료(+42일), 다음 전입(+7일)이 다시 계산됩니다.</div>
    </div>
  );
}

// 원료돈 예상물량 — 설계서 v2. 내 담당농장만 표시. 기준값을 바꾸면 바로 다시 계산 (계산은 src/lib/calc/forecast.ts)
// 재고·출하누계·첫출하는 대시보드 실시간 값(피그온 기준일 + 이후 폐사·출하 입력), 기준일은 오늘.
// 증체계수는 입력된 출하실적(출하실적종합·등판서·직접 입력·피그온 출하)으로 역산: 그룹 출하가 있으면 그 그룹 값,
// 없으면 같은 농장 출하 그룹들의 평균, 그것도 없으면 기본 농장계수. 계획체중(첫출하·이후)을 바꾸면 바로 다시 계산.
import { useMemo, useState } from 'react';
import { forecast, farmTable, monthsToCover, ymOf, backRate, makeCum, type FcSettings, type FcGroup } from '@/lib/calc/forecast';
import { useHerd } from '@/lib/ui';
import { useSettle } from '@/lib/useSettle';
import { TODAY } from '@/lib/calc/herd';
import { FC_SETTINGS, FC_GROUPS, FC_HAND, MY_FARMS, MY_MGR } from '@/data/forecastSeed';
import { fmt, md } from '@/lib/calc/dates';
import { Chip, Segs } from '@/components/v5';
import { exportPlan, exportFarm } from './forecastExport';

const KEY = 'fc-adjust-v1';
const load = (): Record<string, number[]> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (v: Record<string, number[]>) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } };
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const MCOL = [[0, 5], [5, 10], [10, 15]] as const;
const ymLabel = (ym: string) => `${ym.slice(2, 4)}년 ${Number(ym.slice(5))}월`;
const shortG = (g: string) => g.split('-').slice(1).join('-');

// 대시보드 그룹 → 예상물량 그룹 (실시간)
function useLiveGroups(S: FcSettings): FcGroup[] {
  const { all, ships, imports } = useHerd();
  const st = useSettle();
  return useMemo(() => {
    const cum = makeCum(S);
    const keyOf = (f: string) => FC_GROUPS.find((x) => x.farm === f)?.key ?? f;
    const L = all.filter((g) => MY_FARMS.includes(g.farm) && (g.stock > 0 || g.sold > 0)).map((g) => {
      const [y, n] = g.group.split('-');
      // 이 그룹 출하: 출하실적종합(그룹 배정) + 그 뒤의 등판서·직접 입력·피그온 출하
      const tot = st.rowsOf(g).map((r) => ({ date: r.date, n: r.n, live: r.live }));
      const lastT = tot.reduce((a, r) => (r.date > a ? r.date : a), '');
      const more = [...ships, ...imports].filter((r) => r.farm === g.farm && r.group === g.group && r.date > lastT && r.live > 0).map((r) => ({ date: r.date, n: r.n, live: r.live }));
      const sh = [...tot, ...more];
      const seed = FC_GROUPS.find((x) => x.farm === g.farm && x.group.endsWith(`20${y}-${n.padStart(3, '0')}`));
      const first = sh.map((r) => r.date).sort()[0] ?? seed?.firstShip ?? (g.sold > 0 ? g.last ?? TODAY : null);
      const rate = backRate({ indate: g.date, w0: g.avgw }, sh, S, cum);
      return { mgr: MY_MGR, farm: g.farm, key: keyOf(g.farm), group: `${g.farm}-${g.farm}-20${y}-${n.padStart(3, '0')}`, indate: g.date, n: g.inn, w0: g.avgw, stock: g.stock, shipped: g.sold, firstShip: first, rate: rate ?? undefined, rateWhy: rate ? `그룹 출하 ${sh.length}회 역산` : undefined } as FcGroup;
    });
    // 출하 실적이 없는 그룹: 같은 농장 역산값 평균(두수 가중)
    const farmRate: Record<string, { w: number; r: number }> = {};
    L.forEach((g) => { if (g.rate) { const x = (farmRate[g.farm] ??= { w: 0, r: 0 }); x.w += g.shipped || 1; x.r += g.rate * (g.shipped || 1); } });
    return L.filter((g) => g.stock > 0).map((g) => (g.rate || !farmRate[g.farm] ? g : { ...g, rate: Math.round((farmRate[g.farm].r / farmRate[g.farm].w) * 1000) / 1000, rateWhy: '같은 농장 출하 역산' }));
  }, [all, ships, imports, st.rowsOf, S]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Forecast() {
  const [S, setS] = useState<FcSettings>(FC_SETTINGS);
  const [start, setStart] = useState(TODAY.slice(0, 7));
  const MINE = useLiveGroups(S);
  const FC_ASOF = TODAY;
  const [adj, setAdj] = useState<Record<string, number[]>>(load);
  const [edit, setEdit] = useState(false);
  const [view, setView] = useState<'form' | 'group'>('form');
  const [fFarm, setFFarm] = useState('');
  const [fIn, setFIn] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [busy, setBusy] = useState('');
  const inMonths = useMemo(() => [...new Set(MINE.map((g) => ymOf(g.indate)))].sort(), [MINE]);
  const groupOpts = MINE.filter((g) => (!fFarm || g.farm === fFarm) && (!fIn || ymOf(g.indate) === fIn));
  const picked = groupOpts.filter((g) => !fGroup || g.group === fGroup);
  const filtered = !!(fFarm || fIn || fGroup);
  const { segs, rows } = useMemo(() => forecast(picked, S, FC_ASOF, start), [picked, S, start]);
  const table = useMemo(() => farmTable(rows, filtered ? {} : adj), [rows, adj, filtered]);
  const farms = MY_FARMS.filter((f) => !fFarm || f === fFarm).filter((f) => !filtered || rows.some((r) => r.farm === f));
  const row = (f: string) => table[f] ?? Array(15).fill(0);
  const total = farms.reduce((a, f) => a.map((x, i) => x + row(f)[i]), Array(15).fill(0) as number[]);
  const months = MCOL.map(([a, b]) => segs.slice(a, b).find(Boolean)?.month ?? 0);
  const setAdjCell = (f: string, i: number, v: number) => { const n = { ...adj, [f]: [...(adj[f] ?? Array(15).fill(0))] }; n[f][i] = v; setAdj(n); save(n); };
  const num = (k: keyof FcSettings, step: number, label: string, pct = false) => (
    <label className="small muted">{label}<br />
      <input type="number" step={step} value={pct ? Math.round((S[k] as number) * 1e4) / 1e2 : (S[k] as number)} style={{ width: 84 }}
        onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setS({ ...S, [k]: pct ? v / 100 : v }); }} />
    </label>
  );
  const cellsOf = (vals: number[], f?: string) => MCOL.flatMap(([a, b], mi) => [
    ...vals.slice(a, b).map((v, j) => {
      const i = a + j; const seg = segs[i];
      if (!seg) return <td key={i} className="r muted">-</td>;
      if (edit && f && !filtered) return <td key={i}><input type="number" step={10} value={adj[f]?.[i] ?? 0} style={{ width: 56 }} onChange={(e) => setAdjCell(f, i, Number(e.target.value) || 0)} /></td>;
      return <td key={i} className={'r' + (f && !filtered && adj[f]?.[i] ? ' b' : '')}>{v ? fmt(v) : ''}</td>;
    }),
    <td key={'m' + mi} className="r b" style={{ background: 'var(--soft, #f3f6f4)' }}>{fmt(sum(vals.slice(a, b)))}</td>
  ]);
  // 내보내기는 필터와 상관없이 내 담당농장 전체
  const run = async (k: 'plan' | 'farm') => {
    setBusy(k);
    try {
      if (k === 'plan') { const r = forecast(MINE, S, FC_ASOF, start); await exportPlan(r.segs, farmTable(r.rows, adj), MY_FARMS); }
      else {
        const asofM = FC_ASOF.slice(0, 7); const base = start < asofM ? start : asofM;
        const n = monthsToCover(forecast(MINE, S, FC_ASOF, base).rows, base);
        const r = forecast(MINE, S, FC_ASOF, base, Math.min(n, 12));
        await exportFarm(r.rows, r.segs, MY_FARMS);
      }
    } finally { setBusy(''); }
  };
  const maxBar = Math.max(1, ...total);
  const hand = (a: number, b: number) => farms.reduce((x, f) => x + sum((FC_HAND[f] ?? []).slice(a, b)), 0);

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          <label className="small muted">계획 시작월<br /><input type="month" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} /></label>
          {num('w1', 1, '첫출하 체중(kg)')}
          {num('w2', 1, '이후 출하체중(kg)')}
          {num('shipWeeks', 1, '출하완료(주)')}
          {num('addMort', 0.5, '예상 추가폐사율(%)', true)}
          <div style={{ flex: 1 }} />
          <button className="btn sm ghost" onClick={() => setS(FC_SETTINGS)}>기본값</button>
          <button className={'btn sm' + (edit ? '' : ' ghost')} disabled={filtered} onClick={() => setEdit(!edit)}>{edit ? '조정 끝' : '수동조정'}</button>
          <button className="btn sm" disabled={!!busy} onClick={() => run('plan')}>{busy === 'plan' ? '만드는 중…' : '원료돈 엑셀'}</button>
          <button className="btn sm" disabled={!!busy} onClick={() => run('farm')}>{busy === 'farm' ? '만드는 중…' : '농장별 출하물량 예상'}</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end', marginTop: 12 }}>
          <label className="small muted">농장<br /><select value={fFarm} onChange={(e) => { setFFarm(e.target.value); setFGroup(''); }}><option value="">전체</option>{MY_FARMS.filter((f) => MINE.some((g) => g.farm === f)).map((f) => <option key={f}>{f}</option>)}</select></label>
          <label className="small muted">전입월<br /><select value={fIn} onChange={(e) => { setFIn(e.target.value); setFGroup(''); }}><option value="">전체</option>{inMonths.map((m) => <option key={m} value={m}>{ymLabel(m)}</option>)}</select></label>
          <label className="small muted">그룹<br /><select value={fGroup} onChange={(e) => setFGroup(e.target.value)}><option value="">전체</option>{groupOpts.map((g) => <option key={g.group} value={g.group}>{shortG(g.group)}</option>)}</select></label>
          {filtered && <button className="btn sm ghost" onClick={() => { setFFarm(''); setFIn(''); setFGroup(''); }}>필터 해제</button>}
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>{MY_MGR} 담당농장 · 오늘({md(FC_ASOF)}) 실시간 재고 · 증체계수는 출하실적 역산 · 주차 = 월~금(공휴일 제외 영업일) · 10두 단위{filtered ? ' · 필터 중에는 수동조정 제외' : ''}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 10, marginTop: 14 }}>
        {MCOL.map(([a, b], i) => {
          const h = hand(a, b); const v = sum(total.slice(a, b));
          return <div key={i} className="card" style={{ padding: '14px 16px' }}><div className="muted small">{months[i]}월 예상</div><div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(v)}두</div>
            <div className="sub">{start === '2026-11' && !fIn && !fGroup && h ? `10/26 손작성 ${fmt(h)}두 (${v >= h ? '+' : ''}${fmt(v - h)})` : ''}</div></div>;
        })}
        <div className="card" style={{ padding: '14px 16px' }}><div className="muted small">현재 돈군 전체</div><div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(Math.round(sum(rows.map((r) => r.total)) / 10) * 10)}두</div><div className="sub">{rows.length}개 그룹 · 첫출하 지연 {rows.filter((r) => r.status === '지연').length}개</div></div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 className="h2">주차별 예상 출하두수</h2>
        <svg viewBox={`0 0 ${15 * 40} 170`} style={{ width: '100%', maxHeight: 220 }} role="img" aria-label="주차별 예상 출하두수">
          {total.map((v, i) => {
            const s = segs[i]; if (!s) return null;
            const h = (v / maxBar) * 130;
            return <g key={i}>
              <rect x={i * 40 + 8} y={140 - h} width={24} height={h} fill="#2f6f4f"><title>{`${s.month}월 ${s.label} ${fmt(v)}두`}</title></rect>
              <text x={i * 40 + 20} y={136 - h} fontSize="9" textAnchor="middle" fill="currentColor">{v ? fmt(v) : ''}</text>
              <text x={i * 40 + 20} y={154} fontSize="9" textAnchor="middle" fill="currentColor">{s.month}/{s.k}</text>
            </g>;
          })}
        </svg>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <h2 className="h2">{months[0]}~{months[2]}월 출하계획</h2>
          <Segs opts={[['form', '양식'], ['group', '그룹별']]} value={view} onPick={setView} />
        </div>
        {view === 'form' ? (
          <div className="hscroll" style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 1050, fontSize: 13 }}>
              <thead>
                <tr><th rowSpan={2} className="stick">농장</th>{MCOL.map((_, mi) => <th key={mi} colSpan={6}>{months[mi]}월</th>)}</tr>
                <tr>{MCOL.flatMap(([a, b], mi) => [...segs.slice(a, b).map((s, j) => <th key={a + j}>{s ? <>{s.label}<div className="sub">{md(s.start)}</div></> : '-'}</th>), <th key={'t' + mi}>합계</th>])}</tr>
              </thead>
              <tbody>
                {farms.map((f) => <tr key={f}><td className="stick b">{f}</td>{cellsOf(row(f), f)}</tr>)}
                <tr className="b" style={{ background: 'var(--soft, #f3f6f4)' }}><td className="stick">합계</td>{cellsOf(total)}</tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="hscroll" style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 980, fontSize: 13 }}>
              <thead><tr><th className="stick">그룹</th><th>전입월</th><th>전입일</th><th>평체</th><th>현재고</th><th>출하누계</th><th>첫출하</th><th>증체계수</th><th>상태</th><th>예상두수</th>{MCOL.map((_, mi) => <th key={mi}>{months[mi]}월</th>)}<th>기간 외</th></tr></thead>
              <tbody>
                {rows.slice().sort((a, b) => (a.t1 < b.t1 ? -1 : 1)).map((r) => {
                  const in3 = sum(r.heads);
                  return (
                    <tr key={r.group}>
                      <td className="stick">{r.farm} {shortG(r.group).replace(/^.*?-/, '')}</td><td>{ymLabel(ymOf(r.indate))}</td><td>{md(r.indate)}</td><td className="r">{r.w0}</td><td className="r">{fmt(r.stock)}</td><td className="r">{r.shipped ? fmt(r.shipped) : ''}</td>
                      <td>{md(r.t1)}</td><td className="r" title={r.rateWhy ?? '기본 농장계수'}>{r.rate.toFixed(3)}{r.rateWhy ? <div className="sub" style={{ fontSize: 10 }}>{r.rateWhy.includes('같은') ? '농장 역산' : '역산'}</div> : null}</td><td><Chip t={r.status === '지연' ? 'bad' : r.status === '출하중' ? 'ok' : 'info'}>{r.status}</Chip></td>
                      <td className="r b">{fmt(Math.round(r.total))}</td>
                      {MCOL.map(([a, b], mi) => <td key={mi} className="r">{fmt(Math.round(sum(r.heads.slice(a, b))))}</td>)}
                      <td className="r muted">{fmt(Math.max(0, Math.round(r.total - in3)))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

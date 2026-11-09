// 원료돈 예상물량 — 설계서 v2. 내 담당농장만 표시. 기준값을 바꾸면 바로 다시 계산 (계산은 src/lib/calc/forecast.ts)
// 지금은 피그온 2026-11-05 자료(forecastSeed)로 동작. 피그온 업로드 연동·Firestore 저장은 다음 단계.
import { useMemo, useState } from 'react';
import { forecast, farmTable, monthsToCover, ymOf, type FcSettings } from '@/lib/calc/forecast';
import { FC_SETTINGS, FC_GROUPS, FC_ASOF, FC_HAND, MY_FARMS, MY_MGR } from '@/data/forecastSeed';
import { fmt, md } from '@/lib/calc/dates';
import { Chip, Segs } from '@/components/v5';
import { exportPlan, exportFarm } from './forecastExport';

const KEY = 'fc-adjust-v1';
const load = (): Record<string, number[]> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (v: Record<string, number[]>) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } };
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const MCOL = [[0, 5], [5, 10], [10, 15]] as const;
const MINE = FC_GROUPS.filter((g) => MY_FARMS.includes(g.farm));
const ymLabel = (ym: string) => `${ym.slice(2, 4)}년 ${Number(ym.slice(5))}월`;
const shortG = (g: string) => g.split('-').slice(1).join('-');

export function Forecast() {
  const [S, setS] = useState<FcSettings>(FC_SETTINGS);
  const [start, setStart] = useState('2026-11');
  const [adj, setAdj] = useState<Record<string, number[]>>(load);
  const [edit, setEdit] = useState(false);
  const [view, setView] = useState<'form' | 'group'>('form');
  const [fFarm, setFFarm] = useState('');
  const [fIn, setFIn] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [busy, setBusy] = useState('');
  const inMonths = useMemo(() => [...new Set(MINE.map((g) => ymOf(g.indate)))].sort(), []);
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
        <div className="muted small" style={{ marginTop: 8 }}>{MY_MGR} 담당농장 · 피그온 {md(FC_ASOF)} 기준 재고 · 주차 = 월~금(공휴일 제외 영업일) · 10두 단위{filtered ? ' · 필터 중에는 수동조정 제외' : ''}</div>
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
              <thead><tr><th className="stick">그룹</th><th>전입월</th><th>전입일</th><th>평체</th><th>현재고</th><th>출하누계</th><th>첫출하</th><th>상태</th><th>예상두수</th>{MCOL.map((_, mi) => <th key={mi}>{months[mi]}월</th>)}<th>기간 외</th></tr></thead>
              <tbody>
                {rows.slice().sort((a, b) => (a.t1 < b.t1 ? -1 : 1)).map((r) => {
                  const in3 = sum(r.heads);
                  return (
                    <tr key={r.group}>
                      <td className="stick">{r.farm} {shortG(r.group).replace(/^.*?-/, '')}</td><td>{ymLabel(ymOf(r.indate))}</td><td>{md(r.indate)}</td><td className="r">{r.w0}</td><td className="r">{fmt(r.stock)}</td><td className="r">{r.shipped ? fmt(r.shipped) : ''}</td>
                      <td>{md(r.t1)}</td><td><Chip t={r.status === '지연' ? 'bad' : r.status === '출하중' ? 'ok' : 'info'}>{r.status}</Chip></td>
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

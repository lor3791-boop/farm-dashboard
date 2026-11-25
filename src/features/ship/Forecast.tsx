// 원료돈 예상물량 — 설계서 v2. 내 담당농장만 표시. 기준값을 바꾸면 바로 다시 계산 (계산은 src/lib/calc/forecast.ts)
// 재고·출하누계·첫출하는 대시보드 실시간 값(피그온 기준일 + 이후 폐사·출하 입력), 기준일은 오늘.
// 증체계수는 입력된 출하실적(출하실적종합·등판서·직접 입력·피그온 출하)으로 역산: 그룹 출하가 있으면 그 그룹 값,
// 없으면 같은 농장 출하 그룹들의 평균, 그것도 없으면 기본 농장계수. 계획체중(첫출하·이후)을 바꾸면 바로 다시 계산.
import { useMemo, useState } from 'react';
import { forecast, farmTable, monthsToCover, ymOf, backRate, makeCum, weekActual, splitRest, takeRest, type FcSettings, type FcGroup, type FcSeg } from '@/lib/calc/forecast';
import { addIso } from '@/lib/calc/dates';
import { useHerd } from '@/lib/ui';
import { useSettle } from '@/lib/useSettle';
import { TODAY } from '@/lib/calc/herd';
import { FC_SETTINGS, FC_GROUPS, FC_HAND, MY_FARMS, MY_MGR } from '@/data/forecastSeed';
import { fmt, md } from '@/lib/calc/dates';
import { Chip, Segs } from '@/components/v5';
import { exportPlan, exportFarm } from './forecastExport';
import * as XLSX from 'xlsx';
import { DropCard } from '@/components/Drop';
import { useData } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { parseFcBase, type FcBaseMonths } from '@/lib/fcBase';
import { teamKey } from '@/lib/calc/ship';

const KEY = 'fc-adjust-v1';
const load = (): Record<string, number[]> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const save = (v: Record<string, number[]>) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } };
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const MCOL = [[0, 5], [5, 10], [10, 15]] as const;
const ymLabel = (ym: string) => `${ym.slice(2, 4)}년 ${Number(ym.slice(5))}월`;
const shortG = (g: string) => g.split('-').slice(1).join('-');

// 대시보드 그룹 → 예상물량 그룹 (실시간)
function useLiveGroups(S: FcSettings): FcGroup[] {
  const { all, ships, imports, asg } = useHerd();
  const st = useSettle();
  return useMemo(() => {
    const cum = makeCum(S);
    const keyOf = (f: string) => FC_GROUPS.find((x) => x.farm === f)?.key ?? f;
    const L = all.filter((g) => MY_FARMS.includes(g.farm) && (g.stock > 0 || g.sold > 0)).map((g) => {
      const [y, n] = g.group.split('-');
      // 이 그룹 출하: 출하실적종합(그룹 배정) + 그 뒤의 등판서·직접 입력·피그온 출하
      const tot = st.rowsOf(g).map((r) => ({ date: r.date, n: r.n, live: r.live }));
      const lastT = tot.reduce((a, r) => (r.date > a ? r.date : a), '');
      // 팀 대시보드 출하(그룹 없음)는 재고 계산과 같은 배정(asg) 그룹으로
      const gOf = (r: { group: string; date: string; farm: string; n: number; live: number }) => r.group || asg[teamKey(r)]?.group || '';
      const more = [...ships, ...imports].filter((r) => r.farm === g.farm && gOf(r) === g.group && r.date > lastT && r.live > 0).map((r) => ({ date: r.date, n: r.n, live: r.live }));
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
  }, [all, ships, imports, asg, st.rowsOf, S]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function Forecast() {
  const [S, setS] = useState<FcSettings>(FC_SETTINGS);
  const [start, setStart] = useState(TODAY.slice(0, 7));
  const MINE = useLiveGroups(S);
  // 실적 자료가 오늘까지 안 들어왔으면(출하실적 업로드 전) 그 사이 날짜는 '예상'으로 채운다 — 비워 두면 그만큼 빠짐
  const { shipRows } = useHerd();
  const lastShip = useMemo(() => shipRows.reduce((m, x) => (MY_FARMS.includes(x[1]) && x[0] <= TODAY && x[0] > m ? x[0] : m), ''), [shipRows]);
  const FC_ASOF = lastShip && addIso(lastShip, 1) < TODAY ? addIso(lastShip, 1) : TODAY;
  const [adj, setAdj] = useState<Record<string, number[]>>(load);
  const [edit, setEdit] = useState(false);
  const [view, setView] = useState<'form' | 'cmp' | 'group'>('form');
  const [fFarm, setFFarm] = useState('');
  const [fIn, setFIn] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [busy, setBusy] = useState('');
  const inMonths = useMemo(() => [...new Set(MINE.map((g) => ymOf(g.indate)))].sort(), [MINE]);
  const groupOpts = MINE.filter((g) => (!fFarm || g.farm === fFarm) && (!fIn || ymOf(g.indate) === fIn));
  const picked = groupOpts.filter((g) => !fGroup || g.group === fGroup);
  const filtered = !!(fFarm || fIn || fGroup);
  const byGroup = !!(fIn || fGroup); // 전입월·그룹으로 거르면 실제 출하는 그룹별로 못 나눠 예상만
  const isPast = (s: FcSeg | null) => !!s && s.end < FC_ASOF;
  const { up } = useData();
  const { repo } = useAuth();
  // 말일까지 예상 출하(직접 입력): 이번 달(오늘이 든 달)만. 입력한 농장은 이번 달 남은 주차에 그 두수를 나눠 넣고, 다음 달부터는 그만큼 뺀 재고로 다시 예상
  const restYm = TODAY.slice(0, 7);
  const [restEd, setRestEd] = useState<Record<string, string> | null>(null);
  const restSaved = up.fcRest.ym === restYm ? up.fcRest.farms : {};
  const restVals: Record<string, number> = useMemo(() => {
    const src = restEd ? Object.fromEntries(Object.entries(restEd).filter(([, v]) => v !== '').map(([k, v]) => [k, Math.max(0, Math.round(Number(v) || 0))])) : restSaved;
    return src;
  }, [restEd, restSaved]);
  const segYm = (s: FcSeg | null) => (s ? `${s.y}-${String(s.month).padStart(2, '0')}` : '');
  // 표 만들기: 지난 주차 = 실제, 이번 주 = 실제 + 남은 예상, 앞으로 = 예상, 말일까지 입력한 농장은 입력값 + 다음 달부터 재계산
  const build = (G: FcGroup[], adjUse: Record<string, number[]>, withActual: boolean, useRest: boolean) => {
    const A = forecast(G, S, FC_ASOF, start), F = farmTable(A.rows, adjUse), segs = A.segs;
    const act = withActual ? weekActual(segs, shipRows.map((x) => ({ date: x[0], farm: x[1], n: x[3] })), MY_FARMS) : {};
    const curIdx = segs.map((s, i) => (s && segYm(s) === restYm && !isPast(s) ? i : -1)).filter((i) => i >= 0);
    const rest = useRest && curIdx.length ? Object.fromEntries(Object.entries(restVals).filter(([f]) => G.some((g) => g.farm === f))) : {};
    const monthEnd = addIso(addIso(restYm + '-01', 32).slice(0, 8) + '01', -1);
    const B = Object.keys(rest).length ? farmTable(forecast(takeRest(G, A.rows, rest, curIdx, monthEnd), S, addIso(monthEnd, 1), start).rows, adjUse) : {};
    const model: Record<string, number> = {};
    const T: Record<string, number[]> = {};
    MY_FARMS.forEach((f) => {
      const a = act[f] ?? Array(15).fill(0), p = F[f] ?? Array(15).fill(0);
      model[f] = curIdx.reduce((x, i) => x + p[i], 0);
      const sp = f in rest ? splitRest(rest[f], curIdx, p, segs.map((s) => s?.days ?? 0)) : null;
      T[f] = segs.map((s, i) => {
        if (!s) return 0;
        if (sp && segYm(s) === restYm) return isPast(s) ? a[i] : a[i] + sp[i];
        if (sp && segYm(s) > restYm) return B[f]?.[i] ?? 0;
        return isPast(s) ? a[i] : a[i] + p[i];
      });
    });
    return { segs, rows: A.rows, table: T, actual: act as Record<string, number[]>, model, curIdx };
  };
  const view0 = useMemo(() => build(picked, filtered ? {} : adj, !byGroup, !byGroup), [picked, S, start, adj, filtered, byGroup, shipRows, restVals, FC_ASOF]); // eslint-disable-line react-hooks/exhaustive-deps
  const { segs, rows, table, actual } = view0;
  // 입력칸 안내용: 필터와 상관없이 전체, 입력 반영 전 모델 값
  const full0 = useMemo(() => build(MINE, adj, true, false), [MINE, S, start, adj, shipRows, FC_ASOF]); // eslint-disable-line react-hooks/exhaustive-deps
  const [restMsg, setRestMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const saveRest = async (farms: Record<string, number>) => {
    setRestMsg(null);
    try { await repo!.put('config', 'fcRest', { ym: restYm, at: new Date().toISOString(), farms: JSON.stringify(farms) }); setRestEd(null); setRestMsg({ ok: true, t: Object.keys(farms).length ? `저장: ${Object.keys(farms).length}개 농장` : '입력값을 지웠습니다' }); }
    catch (e) { setRestMsg({ ok: false, t: '저장하지 못했습니다: ' + (e as Error).message }); }
  };
  const restFarms = MY_FARMS.filter((f) => MINE.some((g) => g.farm === f) || (full0.actual[f] ?? []).some(Boolean));
  const monthAct = (f: string) => full0.segs.reduce((a, s, i) => a + (s && segYm(s) === restYm ? full0.actual[f]?.[i] ?? 0 : 0), 0);
  const farms = MY_FARMS.filter((f) => !fFarm || f === fFarm).filter((f) => !filtered || rows.some((r) => r.farm === f) || (!byGroup && (actual[f] ?? []).some(Boolean)));
  const row = (f: string) => table[f] ?? Array(15).fill(0);
  // 기준값(월말 작성 계획): 올린 엑셀 > 10/26 작성분(기본값)
  const baseMonths = useMemo<FcBaseMonths>(() => {
    const d: FcBaseMonths = {}; const yms = ['2026-11', '2026-12', '2027-01'];
    Object.entries(FC_HAND).forEach(([f, v]) => yms.forEach((ym, k) => { (d[ym] ??= {})[f] = v.slice(k * 5, k * 5 + 5); }));
    Object.entries(up.fcBase.months).forEach(([ym, m]) => { d[ym] = m; });
    return d;
  }, [up.fcBase.months]);
  const ymOfSegs = MCOL.map(([a, b]) => { const s = segs.slice(a, b).find(Boolean) as FcSeg | undefined; return s ? `${s.y}-${String(s.month).padStart(2, '0')}` : ''; });
  const hasBase = ymOfSegs.some((ym) => !!baseMonths[ym]);
  const baseRow = (f: string) => ymOfSegs.flatMap((ym) => baseMonths[ym]?.[f] ?? [0, 0, 0, 0, 0]);
  const [bMsg, setBMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const upBase = async (file: File) => {
    setBMsg(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const a = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as unknown[][];
      const r = parseFcBase(a, MY_MGR, TODAY);
      const merged = { ...up.fcBase.months, ...r.months };
      await repo!.put('config', 'fcBase', { file: file.name, at: new Date().toISOString(), months: JSON.stringify(merged) });
      const miss = r.farms.filter((f) => !MY_FARMS.includes(f));
      setBMsg({ ok: true, t: `기준값 저장: ${Object.keys(r.months).map(ymLabel).join('·')} · ${r.farms.length}개 농장` + (miss.length ? ` (양식에 없는 농장: ${miss.join(', ')})` : '') });
    } catch (e) { setBMsg({ ok: false, t: '읽지 못했습니다: ' + (e as Error).message }); }
  };
  const total = farms.reduce((a, f) => a.map((x, i) => x + row(f)[i]), Array(15).fill(0) as number[]);
  const months = MCOL.map(([a, b]) => segs.slice(a, b).find(Boolean)?.month ?? 0);
  const setAdjCell = (f: string, i: number, v: number) => { const n = { ...adj, [f]: [...(adj[f] ?? Array(15).fill(0))] }; n[f][i] = v; setAdj(n); save(n); };
  const num = (k: keyof FcSettings, step: number, label: string, pct = false) => (
    <label className="small muted">{label}<br />
      <input type="number" step={step} value={pct ? Math.round((S[k] as number) * 1e4) / 1e2 : (S[k] as number)} style={{ width: 84 }}
        onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setS({ ...S, [k]: pct ? v / 100 : v }); }} />
    </label>
  );
  // 기준 대비 칸: 위 = 지금(실적+예상), 아래 = 기준 · 차이
  const big = (d: number, b: number) => Math.abs(d) >= Math.max(50, b * 0.2);
  const dCell = (v: number, b: number) => { const d = v - b; return <><div>{v ? fmt(v) : '·'}</div><div className="sub" style={{ fontSize: 11 }}>{b ? fmt(b) : '·'} <b style={{ color: d > 0 ? '#1F6B4A' : d < 0 ? '#A3361A' : '#8A877E' }}>{d ? (d > 0 ? '+' : '') + fmt(d) : '±0'}</b></div></>; };
  const cellsOf = (vals: number[], f?: string, base?: number[]) => MCOL.flatMap(([a, b], mi) => [
    ...vals.slice(a, b).map((v, j) => {
      const i = a + j; const seg = segs[i];
      if (!seg) return <td key={i} className="r muted">-</td>;
      const past = isPast(seg) && !byGroup;
      if (base) return <td key={i} className="r" style={big(v - base[i], base[i]) ? { background: v - base[i] > 0 ? '#E3EFE7' : '#F8E1D8' } : undefined}>{dCell(v, base[i])}</td>;
      if (edit && f && !filtered && !past) return <td key={i}><input type="number" step={10} value={adj[f]?.[i] ?? 0} style={{ width: 56 }} onChange={(e) => setAdjCell(f, i, Number(e.target.value) || 0)} /></td>;
      return <td key={i} className={'r' + (f && !filtered && adj[f]?.[i] && !past ? ' b' : '')} style={past ? { color: '#24486B' } : undefined} title={past ? '실제 출하' : undefined}>{v ? fmt(v) : ''}</td>;
    }),
    base ? <td key={'m' + mi} className="r b" style={{ background: big(sum(vals.slice(a, b)) - sum(base.slice(a, b)), sum(base.slice(a, b))) ? (sum(vals.slice(a, b)) > sum(base.slice(a, b)) ? '#D3E8DB' : '#F3D3C6') : 'var(--soft, #f3f6f4)' }}>{dCell(sum(vals.slice(a, b)), sum(base.slice(a, b)))}</td>
      : <td key={'m' + mi} className="r b" style={{ background: 'var(--soft, #f3f6f4)' }}>{fmt(sum(vals.slice(a, b)))}</td>
  ]);
  // 내보내기는 필터와 상관없이 내 담당농장 전체
  const run = async (k: 'plan' | 'farm') => {
    setBusy(k);
    try {
      if (k === 'plan') {
        const r = build(MINE, adj, true, true);
        await exportPlan(r.segs, r.table, MY_FARMS);
      }
      else {
        const asofM = FC_ASOF.slice(0, 7); const base = start < asofM ? start : asofM;
        const n = monthsToCover(forecast(MINE, S, FC_ASOF, base).rows, base);
        const r = forecast(MINE, S, FC_ASOF, base, Math.min(n, 12));
        await exportFarm(r.rows, r.segs, MY_FARMS);
      }
    } finally { setBusy(''); }
  };
  const maxBar = Math.max(1, ...total);
  const baseTotal = farms.reduce((a, f) => a.map((x, i) => x + baseRow(f)[i]), Array(15).fill(0) as number[]);
  const actTotal = farms.reduce((a, f) => a.map((x, i) => x + (actual[f]?.[i] ?? 0)), Array(15).fill(0) as number[]);

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
        <div className="muted small" style={{ marginTop: 8 }}>{MY_MGR} 담당농장 · 오늘({md(TODAY)}) 실시간 재고 · 출하실적 {lastShip ? md(lastShip) : "-"}까지 반영, 이후는 예상 · 증체계수는 출하실적 역산 · 주차 = 월~금(공휴일 제외 영업일) · 10두 단위{filtered ? ' · 필터 중에는 수동조정 제외' : ''}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 10, marginTop: 14 }}>
        {MCOL.map(([a, b], i) => {
          const h = sum(baseTotal.slice(a, b)); const v = sum(total.slice(a, b)); const act = sum(actTotal.slice(a, b));
          return <div key={i} className="card" style={{ padding: '14px 16px' }}><div className="muted small">{months[i]}월 예상 (실적 포함)</div><div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(v)}두</div>
            <div className="sub">{act ? `실적 ${fmt(act)} + 예상 ${fmt(v - act)}` : '전부 예상'}</div>
            {!byGroup && h > 0 && <div className="sub" style={{ color: v - h >= 0 ? '#1F6B4A' : '#A3361A' }}>기준 {fmt(h)}두 ({v >= h ? '+' : ''}{fmt(v - h)})</div>}</div>;
        })}
        <div className="card" style={{ padding: '14px 16px' }}><div className="muted small">현재 돈군 전체</div><div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(Math.round(sum(rows.map((r) => r.total)) / 10) * 10)}두</div><div className="sub">{rows.length}개 그룹 · 첫출하 지연 {rows.filter((r) => r.status === '지연').length}개</div></div>
      </div>

      {full0.curIdx.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <h2 className="h2" style={{ flex: 1 }}>{Number(restYm.slice(5))}월 말일까지 예상 출하</h2>
            {restEd && <button className="btn sm ghost" onClick={() => setRestEd(null)}>취소</button>}
            {Object.keys(restSaved).length > 0 && !restEd && <button className="btn sm ghost" onClick={() => saveRest({})}>입력값 지우기</button>}
            <button className="btn sm pri" disabled={!restEd} onClick={() => saveRest(restVals)}>저장</button>
          </div>
          <div className="muted small" style={{ margin: '6px 0 10px' }}>실적 자료 {lastShip ? md(lastShip) : '-'}까지 · {md(FC_ASOF)}부터 말일까지 나갈 두수 · 비우면 모델 예상(칸 안 회색) · 입력하면 {Number(restYm.slice(5))}월 남은 주차에 나눠 넣고 다음 달부터 남은 재고로 다시 계산</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {restFarms.map((f) => {
              const v = restEd ? restEd[f] ?? '' : restSaved[f] != null ? String(restSaved[f]) : '';
              return <label key={f} className="small" style={{ display: 'grid', gap: 4 }}><span><b>{f}</b> <span className="muted">실적 {fmt(monthAct(f))}</span></span>
                <input type="number" inputMode="numeric" min={0} step={10} value={v} placeholder={fmt(Math.round(full0.model[f] ?? 0))} style={{ minHeight: 40 }}
                  onChange={(e) => setRestEd({ ...(restEd ?? Object.fromEntries(Object.entries(restSaved).map(([k, x]) => [k, String(x)]))), [f]: e.target.value })} /></label>;
            })}
          </div>
          <div className="small" style={{ marginTop: 10 }}>{Number(restYm.slice(5))}월 합계: 실적 {fmt(restFarms.reduce((a, f) => a + monthAct(f), 0))} + 말일까지 {fmt(restFarms.reduce((a, f) => a + (f in restVals ? restVals[f] : Math.round(full0.model[f] ?? 0)), 0))} = <b>{fmt(restFarms.reduce((a, f) => a + monthAct(f) + (f in restVals ? restVals[f] : Math.round(full0.model[f] ?? 0)), 0))}두</b></div>
          {restMsg && <div className={'chip ' + (restMsg.ok ? 'ok' : 'bad')} style={{ marginTop: 8 }}>{restMsg.t}</div>}
        </div>
      )}

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
          <Segs opts={[['form', '양식'], ['cmp', '기준 대비'], ['group', '그룹별']]} value={view} onPick={setView} />
        </div>
        <div className="muted small" style={{ marginBottom: 6 }}>{byGroup ? '전입월·그룹으로 거르면 예상만 (실제 출하는 농장 단위)' : <><span style={{ color: '#24486B' }}>파란 숫자</span> = 지난 주차 실제 출하 · 이번 주 = 실적 + 남은 예상</>}{view === 'cmp' ? ` · 칸 아래 = 기준(${up.fcBase.doc ? up.fcBase.doc.file : '10/26 작성'}) · 차이, 50두·20% 넘게 차이 나면 색` : ''}</div>
        {view === 'cmp' ? (
          <div className="hscroll" style={{ overflowX: 'auto' }}>
            {!hasBase ? <div className="muted">이 기간 기준값이 없습니다. 아래 '기준값 올리기'에 월말 작성 엑셀을 올려 주세요.</div> : (
            <table className="tbl" style={{ minWidth: 1150, fontSize: 13 }}>
              <thead>
                <tr><th rowSpan={2} className="stick">농장</th>{MCOL.map((_, mi) => <th key={mi} colSpan={6}>{months[mi]}월</th>)}</tr>
                <tr>{MCOL.flatMap(([a, b], mi) => [...segs.slice(a, b).map((s, j) => <th key={a + j}>{s ? <>{s.label}<div className="sub">{md(s.start)}</div></> : '-'}</th>), <th key={'t' + mi}>합계</th>])}</tr>
              </thead>
              <tbody>
                {farms.map((f) => <tr key={f}><td className="stick b">{f}</td>{cellsOf(row(f), f, baseRow(f))}</tr>)}
                <tr className="b"><td className="stick">합계</td>{cellsOf(total, undefined, baseTotal)}</tr>
              </tbody>
            </table>)}
          </div>
        ) : view === 'form' ? (
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
              <thead><tr><th className="stick">그룹</th><th>전입월</th><th>전입일</th><th>평체</th><th>현재고</th><th>출하누계</th><th>첫출하</th><th>일당증체</th><th>상태</th><th>예상두수</th>{MCOL.map((_, mi) => <th key={mi}>{months[mi]}월</th>)}<th>기간 외</th></tr></thead>
              <tbody>
                {rows.slice().sort((a, b) => (a.t1 < b.t1 ? -1 : 1)).map((r) => {
                  const in3 = sum(r.heads);
                  return (
                    <tr key={r.group}>
                      <td className="stick">{r.farm} {shortG(r.group).replace(/^.*?-/, '')}</td><td>{ymLabel(ymOf(r.indate))}</td><td>{md(r.indate)}</td><td className="r">{r.w0}</td><td className="r">{fmt(r.stock)}</td><td className="r">{r.shipped ? fmt(r.shipped) : ''}</td>
                      <td>{md(r.t1)}</td><td className="r" title={(r.rateWhy ?? '기본 농장계수') + ' · 증체계수 ' + r.rate.toFixed(3) + ' (계절지수 1일 때 kg/일)'}>{Math.round(r.rate * 1000)}g{r.rateWhy ? <div className="sub" style={{ fontSize: 10 }}>{r.rateWhy.includes('같은') ? '농장 역산' : '역산'}</div> : null}</td><td><Chip t={r.status === '지연' ? 'bad' : r.status === '출하중' ? 'ok' : 'info'}>{r.status}</Chip></td>
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
      {!byGroup && hasBase && <DiffChart farms={farms.filter((f) => sum(row(f)) || sum(baseRow(f)))} months={months} cur={(f) => MCOL.map(([a, b]) => sum(row(f).slice(a, b)))} base={(f) => MCOL.map(([a, b]) => sum(baseRow(f).slice(a, b)))} />}

      <DropCard style={{ marginTop: 14 }} accept=".xlsx,.xls" onFiles={(L) => upBase(L[0])}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <h2 className="h2" style={{ flex: 1 }}>기준값 (월말 작성 원료돈 예상물량)</h2>
          <label className="btn sm">기준값 엑셀 올리기<input type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upBase(f); e.target.value = ''; }} /></label>
        </div>
        <div className="muted small" style={{ marginTop: 6 }}>{up.fcBase.doc ? `${up.fcBase.doc.file} · ${md(up.fcBase.doc.at.slice(0, 10))} 올림` : '10/26 작성분(11~1월)을 기본값으로 씀'} · 들어 있는 달: {Object.keys(baseMonths).sort().map(ymLabel).join(', ')} · 같은 달을 다시 올리면 그 달만 바뀜</div>
        {bMsg && <div className={'chip ' + (bMsg.ok ? 'ok' : 'bad')} style={{ marginTop: 8, whiteSpace: 'normal' }}>{bMsg.t}</div>}
      </DropCard>
    </>
  );
}

// 농장별 기준 대비 차이 — 월마다 막대 (오른쪽 +, 왼쪽 −), 50두·20% 넘게 차이 나면 진하게
function DiffChart({ farms, months, cur, base }: { farms: string[]; months: number[]; cur: (f: string) => number[]; base: (f: string) => number[] }) {
  const D = farms.map((f) => ({ f, c: cur(f), b: base(f) }));
  const mx = Math.max(50, ...D.flatMap((x) => x.c.map((v, i) => Math.abs(v - x.b[i]))));
  const W = 640, L = 90, mid = L + (W - L - 60) / 2, half = (W - L - 60) / 2, RH = 30, BH = 7;
  const col = ['#2F6F4F', '#5B8DB8', '#B08A3E'];
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 className="h2">농장별 차이 (지금 − 기준)</h2>
        <div className="small" style={{ display: 'flex', gap: 12 }}>{months.map((m, i) => <span key={i}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: col[i], marginRight: 4 }} />{m}월</span>)}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${D.length * RH + 24}`} style={{ width: '100%', maxWidth: 820 }} role="img" aria-label="농장별 기준 대비 차이">
        <line x1={mid} x2={mid} y1={0} y2={D.length * RH} stroke="#B9B3A6" />
        <text x={mid - half} y={D.length * RH + 16} fontSize="10" fill="#8A877E">−{fmt(Math.round(mx))}</text>
        <text x={mid} y={D.length * RH + 16} fontSize="10" textAnchor="middle" fill="#8A877E">0</text>
        <text x={mid + half} y={D.length * RH + 16} fontSize="10" textAnchor="end" fill="#8A877E">+{fmt(Math.round(mx))}</text>
        {D.map((x, r) => (
          <g key={x.f}>
            {r % 2 === 1 && <rect x={0} y={r * RH} width={W} height={RH} fill="#F4F2EC" />}
            <text x={L - 8} y={r * RH + RH / 2 + 4} fontSize="12" textAnchor="end" fill="currentColor">{x.f}</text>
            {x.c.map((v, i) => {
              const d = v - x.b[i], w = (Math.abs(d) / mx) * half, y = r * RH + 4 + i * (BH + 1), strong = Math.abs(d) >= Math.max(50, x.b[i] * 0.2);
              return <g key={i}><rect x={d >= 0 ? mid : mid - w} y={y} width={Math.max(w, d ? 1 : 0)} height={BH} fill={col[i]} opacity={strong ? 1 : 0.45}><title>{`${x.f} ${months[i]}월: 기준 ${fmt(x.b[i])} → 지금 ${fmt(v)} (${d >= 0 ? '+' : ''}${fmt(d)})`}</title></rect>
                {strong && <text x={d >= 0 ? Math.min(mid + w + 3, W - 30) : Math.max(mid - w - 3, L + 26)} y={y + BH - 1} fontSize="9" textAnchor={d >= 0 ? 'start' : 'end'} fill={d >= 0 ? '#1F6B4A' : '#A3361A'}>{(d > 0 ? '+' : '') + fmt(d)}</text>}</g>;
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

// 후기자돈사 현황 — 기존 루카 현황판(루카 Firestore)을 대시보드 화면으로. 4개 메뉴: 후기자돈현황 · 전입출 현황판 · 전입전출 계획표 · 사육비산출
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs } from '@/components/v5';
import { fmt } from '@/lib/calc/dates';
import { useLuka, type LukaRec, type LukaSettings, type Row } from './store';
import { DAY, IN_FARM, WD, iso, makeLedger, ms, short, todayMs, week, weekOf } from './calc';

export const LUKA_TABS: [string, string][] = [['status', '후기자돈현황'], ['dash', '전입출 현황판'], ['calendar', '전입전출 계획표'], ['feed', '사육비산출']];

type ColT = 'date' | 'text' | 'number' | 'percent' | 'check';
interface ColDef { k: string; l: string; t: ColT; dec?: number; w?: string; suf?: string; sum?: boolean }
type TabKey = 'lukaStatus' | 'reship' | 'feedCost';
const DEFS: Record<TabKey, { key: keyof LukaSettings; title: string; dateKey: string; cols: ColDef[]; edit: string[] }> = {
  lukaStatus: { key: 'lukaStatusRows', title: '후기자돈 전입현황', dateKey: 'date', edit: ['directSale', 'death', 'shipped'], cols: [
    { k: 'date', l: '날짜', t: 'date' }, { k: 'groupKey', l: '그룹명', t: 'text' }, { k: 'initIn', l: '최초 전입', t: 'number', sum: true }, { k: 'avgWeight', l: '전입평체', t: 'number', dec: 1, w: 'netIn' },
    { k: 'claim', l: '크레임', t: 'number', sum: true }, { k: 'directSale', l: '외부판매', t: 'number', sum: true }, { k: 'netIn', l: '실 전입', t: 'number', sum: true }, { k: 'death', l: '폐사', t: 'number', sum: true },
    { k: 'shipped', l: '분양', t: 'number', sum: true }, { k: 'stock', l: '현재고', t: 'number', sum: true }, { k: 'survivalRate', l: '육성률', t: 'percent', w: 'netIn' }, { k: 'note', l: '비고', t: 'text' }, { k: 'settled', l: '정산', t: 'check' }] },
  reship: { key: 'reshipRows', title: '재분양돈군 현황', dateKey: 'date', edit: ['death', 'shipped'], cols: [
    { k: 'date', l: '날짜', t: 'date' }, { k: 'groupKey', l: '그룹명', t: 'text' }, { k: 'week', l: '전입주차', t: 'number', suf: '주차' }, { k: 'farm', l: '분양농장', t: 'text' },
    { k: 'in', l: '전입', t: 'number', sum: true }, { k: 'avgWeight', l: '전입평체', t: 'number', dec: 1, w: 'in' }, { k: 'claim', l: '크레임', t: 'number', sum: true }, { k: 'netIn', l: '실전입', t: 'number', sum: true },
    { k: 'death', l: '폐사', t: 'number', sum: true }, { k: 'shipped', l: '출하', t: 'number', sum: true }, { k: 'stock', l: '현재고', t: 'number', sum: true }, { k: 'survivalRate', l: '육성률', t: 'percent', w: 'in' }, { k: 'note', l: '비고', t: 'text' }, { k: 'settled', l: '정산', t: 'check' }] },
  feedCost: { key: 'feedCostRows', title: '월대사육비', dateKey: 'inDate', edit: [], cols: [
    { k: 'batchNo', l: '그룹명', t: 'text' }, { k: 'inDate', l: '전입일자', t: 'date' }, { k: 'inHead', l: '전입두수', t: 'number', sum: true }, { k: 'amount', l: '지급액(계)', t: 'number', sum: true },
    { k: 'settleHead', l: '정산예정두수', t: 'number', sum: true }, { k: 'perHead', l: '두당금액', t: 'number', w: 'inHead' }, { k: 'settleMonth', l: '정산예정월', t: 'text' }, { k: 'settled', l: '정산완료', t: 'check' }, { k: 'note', l: '특이사항', t: 'text' }] }
};
const num = (v: any) => Number(v) || 0;
const f1 = (v: number, d = 0) => (d ? (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d }) : fmt(Math.round(v)));
const wavg = (rows: Row[], k: string, b: string) => { const s = rows.reduce((a, r) => a + num(r[b]), 0); return s ? rows.reduce((a, r) => a + num(r[k]) * num(r[b]), 0) / s : 0; };
const surv = (rows: Row[], b: string) => { const s = rows.reduce((a, r) => a + num(r[b]), 0); return s ? (s - rows.reduce((a, r) => a + num(r.death), 0)) / s : 0; };
// 루카 현황판과 같은 재계산
function recompute(t: TabKey, r: Row): Row {
  if (t === 'lukaStatus') { const n = num(r.netIn); return { ...r, stock: Math.max(0, n - num(r.death) - num(r.shipped)), survivalRate: n ? (n - num(r.death)) / n : 0 }; }
  if (t === 'reship') { const n = num(r.in); return { ...r, stock: Math.max(0, n - num(r.claim) - num(r.death) - num(r.shipped)), survivalRate: n ? (n - num(r.death)) / n : 0 }; }
  return r;
}

function StatusTable({ t, rows, all, save }: { t: TabKey; rows: Row[]; all: Row[]; save: (rows: Row[]) => void }) {
  const D = DEFS[t];
  const [ed, setEd] = useState<{ i: number; k: string; v: string } | null>(null);
  const commit = () => { if (!ed) return; const L = [...all]; L[ed.i] = recompute(t, { ...L[ed.i], [ed.k]: Math.max(0, Math.round(Number(ed.v) || 0)) }); save(L); setEd(null); };
  const cell = (r: Row, c: ColDef) => {
    const i = all.indexOf(r), v = r[c.k];
    if (c.t === 'check') return <input type="checkbox" checked={!!v} aria-label={c.l} onChange={() => { const L = [...all]; L[i] = { ...r, [c.k]: !v }; save(L); }} />;
    if (D.edit.includes(c.k)) return ed && ed.i === i && ed.k === c.k
      ? <input type="number" inputMode="numeric" autoFocus value={ed.v} onChange={(e) => setEd({ ...ed, v: e.target.value })} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEd(null); }} style={{ width: 64, minHeight: 32, textAlign: 'right' }} />
      : <button className="lnk" style={{ fontWeight: 400, color: c.k === 'death' && num(v) > 0 ? '#9A3216' : undefined }} title="눌러서 수정" onClick={() => setEd({ i, k: c.k, v: String(num(v)) })}>{f1(num(v))}</button>;
    if (c.t === 'number') return <span className={c.k === 'death' && num(v) > 0 ? 'neg' : ''}>{f1(num(v), c.dec)}{c.suf ?? ''}</span>;
    if (c.t === 'percent') { const p = num(v) * 100; return <span className={p && p < 90 ? 'neg' : ''}>{f1(p, 1)}%</span>; }
    return v ?? '';
  };
  const total = (c: ColDef, i: number) => i === 0 ? '합계' : c.t === 'number' ? (c.w ? f1(wavg(rows, c.k, c.w), c.dec) : c.sum ? f1(rows.reduce((a, r) => a + num(r[c.k]), 0), c.dec) : '') : c.t === 'percent' && c.w ? f1(surv(rows, c.w) * 100, 1) + '%' : '';
  return (
    <div className="tblbox"><table>
      <thead><tr>{D.cols.map((c) => <th key={c.k} className={c.t === 'number' || c.t === 'percent' ? 'r' : ''}>{c.l}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={D.cols.length} className="muted">표시할 내역이 없습니다</td></tr>}
        {rows.map((r, j) => <tr key={j}>{D.cols.map((c) => <td key={c.k} className={c.t === 'number' || c.t === 'percent' ? 'r' : ''}>{cell(r, c)}</td>)}</tr>)}
        {rows.length > 0 && <tr className="b" style={{ background: '#F1EEE6' }}>{D.cols.map((c, i) => <td key={c.k} className={c.t === 'number' || c.t === 'percent' ? 'r' : ''}>{total(c, i)}</td>)}</tr>}
      </tbody>
    </table></div>
  );
}

const Tile = ({ l, v, s, tone }: { l: string; v: string; s?: string; tone?: 'neg' | 'ok' }) => (
  <div className="card" style={{ padding: '12px 14px' }}><div className="muted small">{l}</div><div style={{ fontSize: 22, fontWeight: 700, color: tone === 'neg' ? '#9A3216' : tone === 'ok' ? '#1F4E3D' : undefined }}>{v}</div>{s && <div className="sub">{s}</div>}</div>
);
const tiles = (xs: { l: string; v: string; s?: string; tone?: 'neg' | 'ok' }[]) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, margin: '10px 0 12px' }}>{xs.map((x) => <Tile key={x.l} {...x} />)}</div>;
const months = (rows: Row[], k: string) => [...new Set(rows.map((r) => String(r[k] ?? '').slice(0, 7)).filter(Boolean))].sort().reverse();
const MonthSel = ({ L, v, set }: { L: string[]; v: string; set: (s: string) => void }) => (
  <select className="sel" style={{ minWidth: 130 }} value={v} onChange={(e) => set(e.target.value)} aria-label="전입월"><option value="">전체 월</option>{L.map((m) => <option key={m} value={m}>{m.slice(0, 4)}년 {Number(m.slice(5))}월</option>)}</select>
);

function StatusTab({ S, save }: { S: LukaSettings; save: (p: Partial<LukaSettings>) => void }) {
  const cur = iso(todayMs()).slice(0, 7);
  const [m1, setM1] = useState(cur), [m2, setM2] = useState(cur), [farm, setFarm] = useState('');
  const A = S.lukaStatusRows ?? [], B = S.reshipRows ?? [];
  const a = A.filter((r) => !m1 || String(r.date ?? '').startsWith(m1));
  const b = B.filter((r) => (!m2 || String(r.date ?? '').startsWith(m2)) && (!farm || r.farm === farm));
  const sa = { n: a.reduce((x, r) => x + num(r.netIn), 0), d: a.reduce((x, r) => x + num(r.death), 0), s: a.reduce((x, r) => x + num(r.shipped), 0) };
  const sb = { n: b.reduce((x, r) => x + num(r.in), 0), d: b.reduce((x, r) => x + num(r.death), 0), s: b.reduce((x, r) => x + num(r.shipped), 0) };
  const ra = sa.n ? (sa.n - sa.d) / sa.n : 0, rb = sb.n ? (sb.n - sb.d) / sb.n : 0;
  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}><h2 className="h2">1. {DEFS.lukaStatus.title}</h2><MonthSel L={months(A, 'date')} v={m1} set={setM1} /></div>
        {tiles([{ l: '총 실전입', v: fmt(sa.n) + '두' }, { l: '총 폐사', v: fmt(sa.d) + '두', tone: sa.d ? 'neg' : undefined }, { l: '총 분양', v: fmt(sa.s) + '두', tone: sa.s ? 'ok' : undefined }, { l: '평균 육성률', v: f1(ra * 100, 1) + '%', tone: sa.n ? (ra >= 0.9 ? 'ok' : 'neg') : undefined }])}
        <StatusTable t="lukaStatus" rows={a} all={A} save={(L) => save({ lukaStatusRows: L })} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}><h2 className="h2">2. {DEFS.reship.title}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><MonthSel L={months(B, 'date')} v={m2} set={setM2} />
            <select className="sel" style={{ minWidth: 130 }} value={farm} onChange={(e) => setFarm(e.target.value)} aria-label="분양농장"><option value="">전체 농장</option>{[...new Set(B.map((r) => r.farm).filter(Boolean))].sort().map((f) => <option key={f}>{f}</option>)}</select></div></div>
        {tiles([{ l: '총 전입', v: fmt(sb.n) + '두' }, { l: '총 폐사', v: fmt(sb.d) + '두', tone: sb.d ? 'neg' : undefined }, { l: '총 출하', v: fmt(sb.s) + '두', tone: sb.s ? 'ok' : undefined }, { l: '평균 육성률', v: f1(rb * 100, 1) + '%', tone: sb.n ? (rb >= 0.9 ? 'ok' : 'neg') : undefined }])}
        <StatusTable t="reship" rows={b} all={B} save={(L) => save({ reshipRows: L })} />
      </div>
    </>
  );
}

const kindOf = (r: LukaRec) => (r.type === 'in' ? '전입' : r.subtype === 'farm' ? '전출' : '외부판매');
const KIND_T: Record<string, 'ok' | 'info' | 'warn'> = { 전입: 'ok', 전출: 'info', 외부판매: 'warn' };

function DashTab({ S, R, L, save, add, del }: { S: LukaSettings; R: LukaRec[]; L: ReturnType<typeof makeLedger>; save: (p: Partial<LukaSettings>) => void; add: (r: Omit<LukaRec, 'id'>) => Promise<unknown>; del: (id: string) => Promise<unknown> }) {
  const today = todayMs(), tw = weekOf(today), ta = L.weekAgg(tw.idx);
  const [f, setF] = useState({ date: iso(today), kind: 'in', farm: '', head: '' });
  const [q, setQ] = useState(iso(today));
  const [wm, setWm] = useState(iso(today).slice(0, 7));
  const [rm, setRm] = useState(iso(today).slice(0, 7));
  const [askDel, setAskDel] = useState('');
  const [busy, setBusy] = useState(false);
  const { from, to } = L.range();
  const W = useMemo(() => { const x = []; for (let i = from; i <= to; i++) x.push(L.weekAgg(i)); return x; }, [from, to, L]);
  const wMonths = [...new Set(W.map((w) => w.w.year + '-' + String(w.w.month).padStart(2, '0')))];
  const farms = [...new Set(R.filter((r) => r.type === 'out' && r.farmName).map((r) => r.farmName!))].sort();
  const submit = async () => {
    const head = Math.round(Number(f.head)); if (!(head > 0) || !f.date || busy) return;
    setBusy(true);
    try { await add(f.kind === 'in' ? { date: f.date, type: 'in', head } : { date: f.date, type: 'out', subtype: f.kind === 'farm' ? 'farm' : 'external', farmName: f.farm.trim(), head }); setF({ ...f, head: '' }); } finally { setBusy(false); }
  };
  const recs = [...R].filter((r) => !rm || r.date.startsWith(rm)).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <>
      {tiles([{ l: '현재 재고', v: fmt(L.stockAt(today)) + '두', s: short(today) + ' 기준' }, { l: '이번주 전입 (' + tw.label + ')', v: fmt(ta.inSum) + '두', s: short(tw.start) + '~' + short(tw.end) }, { l: '이번주 전출', v: fmt(ta.farmSum + ta.extSum) + '두', s: '농장 ' + fmt(ta.farmSum) + ' · 외판 ' + fmt(ta.extSum) }, { l: '이번주 말 예상 재고', v: fmt(ta.endStock) + '두', s: '예상 폐사 ' + ta.death + '두 반영' }])}
      <div className="card">
        <h2 className="h2" style={{ marginBottom: 10 }}>전입 · 전출 입력</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
          <label className="small">날짜<br /><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} style={{ minHeight: 40 }} /></label>
          <label className="small">구분<br /><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} style={{ minHeight: 40 }}><option value="in">전입</option><option value="farm">전출</option><option value="ext">외부판매</option></select></label>
          <label className="small" style={{ flex: '1 1 140px' }}>농장명<br />{f.kind === 'in' ? <input value={IN_FARM} disabled style={{ minHeight: 40, width: '100%' }} /> : <><input list="luka-farms" value={f.farm} onChange={(e) => setF({ ...f, farm: e.target.value })} style={{ minHeight: 40, width: '100%' }} /><datalist id="luka-farms">{farms.map((x) => <option key={x} value={x} />)}</datalist></>}</label>
          <label className="small">두수<br /><input type="number" inputMode="numeric" min={1} value={f.head} onChange={(e) => setF({ ...f, head: e.target.value })} style={{ minHeight: 40, width: 90 }} /></label>
          <button className="btn pri" disabled={busy || !(Number(f.head) > 0) || (f.kind !== 'in' && !f.farm.trim())} onClick={submit}>추가</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>재고 조회</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <input type="date" value={q} onChange={(e) => setQ(e.target.value)} style={{ minHeight: 40 }} aria-label="조회 날짜" />
          {q && <span><span className="muted small">{weekOf(ms(q)).label} · {short(ms(q))} 기준 </span><b style={{ fontSize: 20 }}>{fmt(L.stockAt(ms(q)))}두</b></span>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}><h2 className="h2">주차별 예상 물량</h2><MonthSel L={wMonths} v={wm} set={setWm} /></div>
        <div className="tblbox"><table>
          <thead><tr><th>주차</th><th>기간</th><th className="r">시작재고</th><th className="r">전입</th><th className="r">폐사</th><th className="r">전출</th><th className="r">외부판매</th><th className="r">종료재고</th></tr></thead>
          <tbody>{W.filter((w) => !wm || w.w.year + '-' + String(w.w.month).padStart(2, '0') === wm).map((w) => (
            <tr key={w.w.idx} style={w.w.idx === tw.idx ? { background: '#E4ECF3' } : undefined}>
              <td className="b">{w.w.label}</td><td className="small">{short(w.w.start)}~{short(w.w.end)}</td><td className="r">{fmt(w.startStock)}</td><td className="r">{fmt(w.inSum)}</td>
              <td className="r"><input type="number" min={0} defaultValue={w.death} key={w.death} aria-label={w.w.label + ' 폐사'} onBlur={(e) => { const v = e.target.value; if (String(w.death) !== v) save({ weeklyDeaths: { ...S.weeklyDeaths, [iso(w.w.start)]: v === '' ? '' : Number(v) } }); }} style={{ width: 60, minHeight: 32, textAlign: 'right' }} /> <span className="sub">{w.w.end < today ? '실제' : '예상'}</span></td>
              <td className="r">{fmt(w.farmSum)}</td><td className="r">{fmt(w.extSum)}</td><td className="r b">{fmt(w.endStock)}</td>
            </tr>))}</tbody>
        </table></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}><h2 className="h2">입력 내역 <span className="muted small">총 {fmt(R.length)}건</span></h2><MonthSel L={[...new Set(R.map((r) => r.date.slice(0, 7)))].sort().reverse()} v={rm} set={setRm} /></div>
        <div className="tblbox"><table>
          <thead><tr><th>날짜</th><th>주차</th><th>구분</th><th>농장명</th><th className="r">두수</th><th className="r">당시 재고</th><th /></tr></thead>
          <tbody>
            {recs.length === 0 && <tr><td colSpan={7} className="muted">내역이 없습니다</td></tr>}
            {recs.map((r) => <tr key={r.id}><td>{short(ms(r.date))}</td><td>{weekOf(ms(r.date)).label}</td><td><span className={'chip ' + KIND_T[kindOf(r)]}>{kindOf(r)}</span></td><td>{r.type === 'in' ? IN_FARM : r.farmName}</td><td className="r">{fmt(r.head)}두</td><td className="r">{fmt(L.stockAt(ms(r.date)))}</td>
              <td className="r">{askDel === r.id ? <><button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={() => { del(r.id); setAskDel(''); }}>삭제</button> <button className="btn sm ghost" onClick={() => setAskDel('')}>취소</button></> : <button className="btn sm ghost" onClick={() => setAskDel(r.id)}>삭제</button>}</td></tr>)}
          </tbody>
        </table></div>
      </div>
    </>
  );
}

function CalendarTab({ R, L }: { R: LukaRec[]; L: ReturnType<typeof makeLedger> }) {
  const t = new Date(todayMs());
  const [cur, setCur] = useState({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  const first = Date.UTC(cur.y, cur.m, 1), last = Date.UTC(cur.y, cur.m + 1, 0);
  const by: Record<number, LukaRec[]> = {}; R.forEach((r) => { (by[ms(r.date)] ??= []).push(r); });
  const days: number[] = []; for (let i = weekOf(first).idx; i <= weekOf(last).idx; i++) for (let d = 0; d < 7; d++) days.push(week(i).start + d * DAY);
  const mv = (n: number) => { const d = new Date(Date.UTC(cur.y, cur.m + n, 1)); setCur({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); };
  const C = { in: ['#E3EFE7', '#1F4E3D'], farm: ['#E4ECF3', '#24476B'], ext: ['#FBEFD5', '#7A4F00'] } as const;
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button className="btn sm ghost" onClick={() => mv(-1)} aria-label="이전 달">‹</button><b style={{ fontSize: 17 }}>{cur.y}년 {cur.m + 1}월</b><button className="btn sm ghost" onClick={() => mv(1)} aria-label="다음 달">›</button>
        <button className="btn sm ghost" onClick={() => setCur({ y: t.getUTCFullYear(), m: t.getUTCMonth() })}>오늘</button>
      </div>
      <div className="tblbox"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(92px, 1fr))', gap: 4, minWidth: 680 }}>
        {[...WD].map((w, i) => <div key={w} className="small b" style={{ textAlign: 'center', padding: 4, color: i === 0 ? '#9A3216' : undefined }}>{w}</div>)}
        {days.map((d) => { const L0 = by[d] ?? [], out = new Date(d).getUTCMonth() !== cur.m; return (
          <div key={d} style={{ minHeight: 92, borderRadius: 8, padding: 6, background: d === todayMs() ? '#E4ECF3' : out ? 'transparent' : '#F7F5F0', border: d === todayMs() ? '2px solid #1F4E3D' : '1px solid #EFEBE3', opacity: out ? 0.45 : 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span className="small b">{new Date(d).getUTCDate()}</span>
            {L0.slice(0, 4).map((r) => { const k = r.type === 'in' ? 'in' : r.subtype === 'farm' ? 'farm' : 'ext'; return <span key={r.id} style={{ fontSize: 11, borderRadius: 4, padding: '1px 4px', background: C[k][0], color: C[k][1], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kindOf(r)} {r.type === 'in' ? '+' : '−'}{fmt(r.head)}{r.farmName ? ' · ' + r.farmName : ''}</span>; })}
            {L0.length > 4 && <span className="sub">+{L0.length - 4}건</span>}
            {L0.length > 0 && <span className="sub" style={{ marginTop: 'auto' }}>재고 {fmt(L.stockAt(d))}</span>}
          </div>); })}
      </div></div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10 }} className="small">{(['in', 'farm', 'ext'] as const).map((k) => <span key={k}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: C[k][1], marginRight: 4 }} />{k === 'in' ? '전입' : k === 'farm' ? '전출' : '외부판매'}</span>)}</div>
    </div>
  );
}

function FeedTab({ S, save }: { S: LukaSettings; save: (p: Partial<LukaSettings>) => void }) {
  const A = S.feedCostRows ?? [];
  const amt = A.reduce((x, r) => x + num(r.amount), 0), hd = A.reduce((x, r) => x + num(r.inHead), 0);
  return (
    <div className="card">
      <h2 className="h2">{DEFS.feedCost.title}</h2>
      {tiles([{ l: '총 지급액', v: fmt(amt) + '원' }, { l: '총 전입두수', v: fmt(hd) + '두' }, { l: '두당금액(평균)', v: fmt(hd ? Math.round(amt / hd) : 0) + '원' }])}
      <StatusTable t="feedCost" rows={A} all={A} save={(L) => save({ feedCostRows: L })} />
    </div>
  );
}

export function LukaPage() {
  const { tab = 'status' } = useParams();
  const nav = useNavigate();
  const { settings: S, records: R, state, saveSettings, addRecord, deleteRecord } = useLuka();
  const L = useMemo(() => makeLedger(S, R), [S, R]);
  const save = (p: Partial<LukaSettings>) => { saveSettings(p).catch(() => alert('저장하지 못했습니다')); };
  return (
    <>
      <Tabs opts={LUKA_TABS as [string, string][]} value={tab} onPick={(k) => nav('/luka/' + k)} />
      {state === 'err' && <div className="chip bad" style={{ display: 'block', whiteSpace: 'normal', margin: '12px 0' }}>루카 자료 서버에 연결하지 못했습니다</div>}
      {state === 'wait' && <div className="card skel" aria-busy="true" style={{ marginTop: 12 }}><i style={{ width: '40%' }} /><i style={{ width: '85%' }} /><i style={{ width: '70%' }} /></div>}
      {state === 'ok' && <div style={{ marginTop: 14 }}>
        {tab === 'status' && <StatusTab S={S} save={save} />}
        {tab === 'dash' && <DashTab S={S} R={R} L={L} save={save} add={addRecord} del={deleteRecord} />}
        {tab === 'calendar' && <CalendarTab R={R} L={L} />}
        {tab === 'feed' && <FeedTab S={S} save={save} />}
      </div>}
    </>
  );
}

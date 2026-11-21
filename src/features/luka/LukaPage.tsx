// 후기자돈사 현황 — 기존 루카 현황판(루카 Firestore)을 대시보드 화면으로. 4개 메뉴: 후기자돈현황 · 전입출 현황판 · 전입전출 계획표 · 사육비산출
import { useMemo, useRef, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { DropCard } from '@/components/Drop';
import { makeLuka } from './legacy';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs } from '@/components/v5';
import { fmt } from '@/lib/calc/dates';
import { useLuka, type LukaRec, type LukaSettings, type Row } from './store';
import { DAY, IN_FARM, WD, iso, makeLedger, ms, short, todayMs, week, weekOf } from './calc';

import { SUBS } from '@/app/menu';
export const LUKA_TABS: [string, string][] = SUBS.luka;

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
type Lg = ReturnType<typeof makeLuka>;
const download = (blob: Blob, name: string) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); };
const Msg = ({ m }: { m: { ok: boolean; t: string } | null }) => (m ? <div className={m.ok ? 'chip ok' : 'chip bad'} style={{ display: 'block', whiteSpace: 'normal', marginTop: 8 }}>{m.t}</div> : null);

// 엑셀 업로드 — 농장전체전입현황 · 월대사육비 · 농장별 돈수불 시트 (여러 파일 한 번에 가능), 확인 누르면 해당 표 전체 교체
function WorkbookImport({ lg, save }: { lg: Lg; save: (p: Partial<LukaSettings>) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pend, setPend] = useState<Partial<LukaSettings> | null>(null);
  const go = async (L: File[]) => { if (!L.length) return; setBusy(true); setMsg(null); setPend(null); try { setPend(await lg.importFarmwideFiles(L)); } catch (e) { setMsg({ ok: false, t: (e as Error).message || '파일을 읽지 못했습니다' }); } finally { setBusy(false); } };
  const cnt = pend ? [pend.lukaStatusRows && '후기자돈 전입현황 ' + pend.lukaStatusRows.length + '건', pend.reshipRows && '재분양돈군 ' + pend.reshipRows.length + '건', pend.feedCostRows && '사육비 ' + pend.feedCostRows.length + '건'].filter(Boolean).join(' · ') : '';
  return (
    <DropCard accept=".xlsx,.xls" onFiles={go} style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <h2 className="h2" style={{ flex: 1 }}>엑셀 업로드</h2>
        <input ref={ref} type="file" accept=".xlsx,.xls" multiple hidden onChange={(e) => { const L = Array.from(e.target.files ?? []); e.target.value = ''; go(L); }} />
        <button className="btn sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? '읽는 중…' : '파일 고르기'}</button>
      </div>
      <div className="muted small" style={{ marginTop: 4 }}>농장전체전입현황 · 월대사육비 · 농장별 돈수불</div>
      {pend && <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}><span className="small">{cnt} 읽음 — 반영하면 해당 표를 전체 교체 (정산 체크는 유지)</span><button className="btn sm pri" onClick={() => { save(pend); setPend(null); setMsg({ ok: true, t: '반영했습니다' }); }}>이 내용으로 반영</button><button className="btn sm ghost" onClick={() => setPend(null)}>취소</button></div>}
      <Msg m={msg} />
    </DropCard>
  );
}

// 수정/추가 — 전입현황·재분양은 엑셀 값은 잠그고 외부판매·폐사·분양(출하)만, 사육비는 전체 칸 수정. 행 추가 · 선택 삭제
function EditSheet({ t, lg, all, save, onClose }: { t: TabKey; lg: Lg; all: Row[]; save: (rows: Row[]) => void; onClose: () => void }) {
  const D = DEFS[t], ed = (lg.STATUS_EDITABLE_FIELDS as Record<string, string[] | undefined>)[t];
  const [bulk, setBulk] = useState(false), [chk, setChk] = useState<Record<number, boolean>>({}), [ask, setAsk] = useState(false);
  const n = Object.values(chk).filter(Boolean).length;
  const setCell = (i: number, c: ColDef, raw: string | boolean) => { const L = [...all]; let r: Row = { ...L[i] }; r[c.k] = c.t === 'number' ? Number(raw) || 0 : c.t === 'percent' ? (Number(raw) || 0) / 100 : raw; r = lg.recomputeStatusRow(t, r); L[i] = r; save(L); };
  const show = (r: Row, c: ColDef) => { const v = r[c.k]; return c.t === 'number' ? f1(num(v), c.dec) + (c.suf ?? '') : c.t === 'percent' ? f1(num(v) * 100, 1) + '%' : c.t === 'check' ? (v ? '✓' : '—') : v === undefined || v === null || v === '' ? '—' : String(v); };
  return (
    <Sheet title={D.title + ' 수정'} onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {!bulk && <><button className="btn sm" onClick={() => save([...all, lg.blankStatusRow(t)])}>+ 행 추가</button><button className="btn sm ghost" onClick={() => { setBulk(true); setChk({}); setAsk(false); }}>삭제</button></>}
        {bulk && !ask && <><button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} disabled={!n} onClick={() => setAsk(true)}>선택 삭제 ({n})</button><button className="btn sm ghost" onClick={() => setBulk(false)}>취소</button></>}
        {bulk && ask && <><span className="small">{n}개 항목을 삭제할까요?</span><button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={() => { save(all.filter((_, i) => !chk[i])); setBulk(false); setAsk(false); }}>확인 삭제</button><button className="btn sm ghost" onClick={() => setBulk(false)}>취소</button></>}
      </div>
      {all.length === 0 && <div className="muted">내역이 없습니다</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {all.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, background: '#F7F5F0', borderRadius: 10, padding: 10 }}>
            {bulk && <input type="checkbox" checked={!!chk[i]} onChange={(e) => setChk({ ...chk, [i]: e.target.checked })} aria-label={(i + 1) + '번째 행 선택'} style={{ width: 22, height: 22 }} />}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {D.cols.map((c) => { const open = ed ? ed.includes(c.k) : true; return (
                <label key={c.k} className="small" style={{ display: 'grid', gap: 2 }}><span className="muted">{c.l}</span>
                  {c.t === 'check' ? <input type="checkbox" checked={!!r[c.k]} onChange={(e) => setCell(i, c, e.target.checked)} style={{ width: 22, height: 22 }} />
                    : open ? <input type={c.t === 'number' || c.t === 'percent' ? 'number' : c.t === 'date' ? 'date' : 'text'} min={0} step={c.t === 'percent' ? 0.1 : undefined} defaultValue={c.t === 'percent' ? Math.round(num(r[c.k]) * 1000) / 10 : r[c.k] ?? ''} onBlur={(e) => { const v = e.target.value; const old = c.t === 'percent' ? String(Math.round(num(r[c.k]) * 1000) / 10) : String(r[c.k] ?? ''); if (v !== old) setCell(i, c, v); }} style={{ minHeight: 36, width: '100%', boxSizing: 'border-box' }} />
                    : <b style={{ minHeight: 36, display: 'flex', alignItems: 'center' }}>{show(r, c)}</b>}
                </label>); })}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
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

function StatusTab({ S, save, lg }: { S: LukaSettings; save: (p: Partial<LukaSettings>) => void; lg: Lg }) {
  const [edit, setEdit] = useState<TabKey | null>(null);
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
      <WorkbookImport lg={lg} save={save} />
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}><h2 className="h2">1. {DEFS.lukaStatus.title}</h2><div style={{ display: 'flex', gap: 8 }}><MonthSel L={months(A, 'date')} v={m1} set={setM1} /><button className="btn sm ghost" onClick={() => setEdit('lukaStatus')}>수정/추가</button></div></div>
        {tiles([{ l: '총 실전입', v: fmt(sa.n) + '두' }, { l: '총 폐사', v: fmt(sa.d) + '두', tone: sa.d ? 'neg' : undefined }, { l: '총 분양', v: fmt(sa.s) + '두', tone: sa.s ? 'ok' : undefined }, { l: '평균 육성률', v: f1(ra * 100, 1) + '%', tone: sa.n ? (ra >= 0.9 ? 'ok' : 'neg') : undefined }])}
        <StatusTable t="lukaStatus" rows={a} all={A} save={(L) => save({ lukaStatusRows: L })} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}><h2 className="h2">2. {DEFS.reship.title}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><MonthSel L={months(B, 'date')} v={m2} set={setM2} />
            <select className="sel" style={{ minWidth: 130 }} value={farm} onChange={(e) => setFarm(e.target.value)} aria-label="분양농장"><option value="">전체 농장</option>{[...new Set(B.map((r) => r.farm).filter(Boolean))].sort().map((f) => <option key={f}>{f}</option>)}</select><button className="btn sm ghost" onClick={() => setEdit('reship')}>수정/추가</button></div></div>
        {tiles([{ l: '총 전입', v: fmt(sb.n) + '두' }, { l: '총 폐사', v: fmt(sb.d) + '두', tone: sb.d ? 'neg' : undefined }, { l: '총 출하', v: fmt(sb.s) + '두', tone: sb.s ? 'ok' : undefined }, { l: '평균 육성률', v: f1(rb * 100, 1) + '%', tone: sb.n ? (rb >= 0.9 ? 'ok' : 'neg') : undefined }])}
        <StatusTable t="reship" rows={b} all={B} save={(L) => save({ reshipRows: L })} />
      </div>
      {edit && <EditSheet t={edit} lg={lg} all={edit === 'lukaStatus' ? A : B} save={(L) => save(edit === 'lukaStatus' ? { lukaStatusRows: L } : { reshipRows: L })} onClose={() => setEdit(null)} />}
    </>
  );
}

const kindOf = (r: LukaRec) => (r.type === 'in' ? '전입' : r.subtype === 'farm' ? '전출' : '외부판매');
const KIND_T: Record<string, 'ok' | 'info' | 'warn'> = { 전입: 'ok', 전출: 'info', 외부판매: 'warn' };

function DashTab({ S, R, L, lg, save, add, del, replaceAll }: { S: LukaSettings; R: LukaRec[]; L: ReturnType<typeof makeLedger>; lg: Lg; save: (p: Partial<LukaSettings>) => void; add: (r: Omit<LukaRec, 'id'>) => Promise<unknown>; del: (id: string) => Promise<unknown>; replaceAll: (L: Omit<LukaRec, 'id'>[]) => Promise<unknown> }) {
  const fref = useRef<HTMLInputElement>(null);
  const [imp, setImp] = useState<{ records: Omit<LukaRec, 'id'>[]; warnings: string[]; name: string } | null>(null);
  const [impMsg, setImpMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [open, setOpen] = useState(false), [rk, setRk] = useState(''), [rf, setRf] = useState('');
  const readImp = async (f?: File) => { if (!f) return; setImp(null); setImpMsg(null); try { const r = /\.csv$/i.test(f.name) ? lg.importCsvFile(await f.text()) : await lg.importXlsxFile(f); if (!r.records.length) setImpMsg({ ok: false, t: '가져올 수 있는 행이 없습니다' }); else setImp({ ...r, name: f.name }); } catch (e) { setImpMsg({ ok: false, t: (e as Error).message || '파일을 읽지 못했습니다' }); } };
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
    try { await add(f.kind === 'in' ? { date: f.date, type: 'in', subtype: null, farmName: IN_FARM, head } : { date: f.date, type: 'out', subtype: f.kind === 'farm' ? 'farm' : 'external', farmName: f.farm.trim(), head }); setF({ ...f, head: '' }); } finally { setBusy(false); }
  };
  const recs = [...R].filter((r) => (!rm || r.date.startsWith(rm)) && (!rk || kindOf(r) === rk) && (!rf || (r.farmName ?? '') === rf)).sort((a, b) => (a.date < b.date ? 1 : -1));
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
        <DropCard className="" accept=".xlsx,.csv" onFiles={(F) => readImp(F[0])} style={{ marginTop: 14, padding: 12, border: '1px dashed #CFC9BC', borderRadius: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input ref={fref} type="file" accept=".xlsx,.csv" hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ''; readImp(x); }} />
            <button className="btn sm" onClick={() => fref.current?.click()}>엑셀 불러오기 (.xlsx / .csv)</button>
            <a className="small" href="https://github.com/lor3791-boop/luka-piglets/raw/main/%EC%9E%85%EB%A0%A5%EC%96%91%EC%8B%9D.xlsx">입력양식 받기</a>
            <span className="muted small">불러오면 입력 내역 전체 교체</span>
          </div>
          {imp && <div style={{ marginTop: 10 }}>
            <div className="small"><b>{imp.name}</b> · {fmt(imp.records.length)}건 (전입 {fmt(imp.records.filter((r) => r.type === 'in').length)} · 전출 {fmt(imp.records.filter((r) => r.type === 'out' && r.subtype === 'farm').length)} · 외부판매 {fmt(imp.records.filter((r) => r.type === 'out' && r.subtype !== 'farm').length)})</div>
            {imp.warnings.length > 0 && <ul className="small" style={{ color: '#7A4F00', margin: '6px 0', paddingLeft: 18 }}>{imp.warnings.slice(0, 20).map((w, i) => <li key={i}>{w}</li>)}{imp.warnings.length > 20 && <li>외 {imp.warnings.length - 20}건</li>}</ul>}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}><button className="btn sm pri" onClick={async () => { const L0 = imp.records; setImp(null); try { await replaceAll(L0); setImpMsg({ ok: true, t: fmt(L0.length) + '건으로 교체했습니다' }); } catch { setImpMsg({ ok: false, t: '저장하지 못했습니다' }); } }}>이 내용으로 교체</button><button className="btn sm ghost" onClick={() => setImp(null)}>취소</button></div>
          </div>}
          <Msg m={impMsg} />
        </DropCard>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}><h2 className="h2">입력 내역 <span className="muted small">총 {fmt(R.length)}건</span></h2><button className="btn sm ghost" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '숨기기 ▴' : '펼쳐보기 ▾'}</button></div>
        {open && <><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0' }}>
          <MonthSel L={[...new Set(R.map((r) => r.date.slice(0, 7)))].sort().reverse()} v={rm} set={setRm} />
          <select className="sel" style={{ minWidth: 110 }} value={rk} onChange={(e) => setRk(e.target.value)} aria-label="구분"><option value="">전체 구분</option>{['전입', '전출', '외부판매'].map((k) => <option key={k}>{k}</option>)}</select>
          <select className="sel" style={{ minWidth: 130 }} value={rf} onChange={(e) => setRf(e.target.value)} aria-label="농장명"><option value="">전체 농장</option>{[...new Set(R.map((r) => r.farmName).filter(Boolean))].sort().map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <div className="tblbox"><table>
          <thead><tr><th>날짜</th><th>주차</th><th>구분</th><th>농장명</th><th className="r">두수</th><th className="r">당시 재고</th><th /></tr></thead>
          <tbody>
            {recs.length === 0 && <tr><td colSpan={7} className="muted">내역이 없습니다</td></tr>}
            {recs.map((r) => <tr key={r.id}><td>{short(ms(r.date))}</td><td>{weekOf(ms(r.date)).label}</td><td><span className={'chip ' + KIND_T[kindOf(r)]}>{kindOf(r)}</span></td><td>{r.type === 'in' ? IN_FARM : r.farmName}</td><td className="r">{fmt(r.head)}두</td><td className="r">{fmt(L.stockAt(ms(r.date)))}</td>
              <td className="r">{askDel === r.id ? <><button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={() => { del(r.id); setAskDel(''); }}>삭제</button> <button className="btn sm ghost" onClick={() => setAskDel('')}>취소</button></> : <button className="btn sm ghost" onClick={() => setAskDel(r.id)}>삭제</button>}</td></tr>)}
          </tbody>
        </table></div></>}
      </div>
    </>
  );
}

type Ov = Record<string, { in: number; out_farm: number; out_external: number; out_farm_name: string; out_external_name: string }>;
const CC = { in: ['#E3EFE7', '#1F4E3D'], farm: ['#E4ECF3', '#24476B'], ext: ['#FBEFD5', '#7A4F00'] } as const;
const chipS = (k: keyof typeof CC) => ({ fontSize: 11, borderRadius: 4, padding: '1px 4px', background: CC[k][0], color: CC[k][1], whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' });

// 달력 틀 — 주차(일~토) 기준으로 그 달을 덮는 칸
function MonthGrid({ cur, setCur, cell, onPick, mark, extra }: { cur: { y: number; m: number }; setCur: (c: { y: number; m: number }) => void; cell: (d: number) => React.ReactNode; onPick: (d: number) => void; mark?: (d: number) => boolean; extra?: React.ReactNode }) {
  const t = new Date(todayMs());
  const first = Date.UTC(cur.y, cur.m, 1), last = Date.UTC(cur.y, cur.m + 1, 0);
  const days: number[] = []; for (let i = weekOf(first).idx; i <= weekOf(last).idx; i++) for (let d = 0; d < 7; d++) days.push(week(i).start + d * DAY);
  const mv = (n: number) => { const d = new Date(Date.UTC(cur.y, cur.m + n, 1)); setCur({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button className="btn sm ghost" onClick={() => mv(-1)} aria-label="이전 달">‹</button><b style={{ fontSize: 17 }}>{cur.y}년 {cur.m + 1}월</b><button className="btn sm ghost" onClick={() => mv(1)} aria-label="다음 달">›</button>
        <button className="btn sm ghost" onClick={() => setCur({ y: t.getUTCFullYear(), m: t.getUTCMonth() })}>오늘</button>{extra}
      </div>
      <div className="tblbox"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(92px, 1fr))', gap: 4, minWidth: 680 }}>
        {[...WD].map((w, i) => <div key={w} className="small b" style={{ textAlign: 'center', padding: 4, color: i === 0 ? '#9A3216' : undefined }}>{w}</div>)}
        {days.map((d) => { const out = new Date(d).getUTCMonth() !== cur.m, td = d === todayMs(); return (
          <button key={d} onClick={() => onPick(d)} style={{ font: 'inherit', textAlign: 'left', cursor: 'pointer', minHeight: 92, borderRadius: 8, padding: 6, background: mark?.(d) ? '#FFF6DC' : td ? '#E4ECF3' : out ? 'transparent' : '#F7F5F0', border: td ? '2px solid #1F4E3D' : mark?.(d) ? '1px dashed #C9962B' : '1px solid #EFEBE3', opacity: out ? 0.45 : 1, display: 'flex', flexDirection: 'column', gap: 3, color: 'inherit', minWidth: 0 }}>
            <span className="small b">{new Date(d).getUTCDate()}</span>{cell(d)}
          </button>); })}
      </div></div>
      <div style={{ display: 'flex', gap: 12, marginTop: 10 }} className="small">{(['in', 'farm', 'ext'] as const).map((k) => <span key={k}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: CC[k][1], marginRight: 4 }} />{k === 'in' ? '전입' : k === 'farm' ? '전출' : '외부판매'}</span>)}</div>
    </>
  );
}

function CalendarTab({ S, R, L, lg, save, add, del, setHead }: { S: LukaSettings; R: LukaRec[]; L: ReturnType<typeof makeLedger>; lg: Lg; save: (p: Partial<LukaSettings>) => void; add: (r: Omit<LukaRec, 'id'>) => Promise<unknown>; del: (id: string) => Promise<unknown>; setHead: (id: string, h: number) => Promise<unknown> }) {
  const t = new Date(todayMs());
  const [cur, setCur] = useState({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  const [day, setDay] = useState<number | null>(null);
  const [nf, setNf] = useState({ kind: 'in', farm: '', head: '' });
  const [askDel, setAskDel] = useState('');
  const [copy, setCopy] = useState('');
  const by: Record<number, LukaRec[]> = {}; R.forEach((r) => { (by[ms(r.date)] ??= []).push(r); });
  const copyImg = () => {
    lg.setCalCursor(cur.y, cur.m);
    const blob: Promise<Blob> = (document.fonts?.ready ?? Promise.resolve()).then(() => new Promise((res) => (lg.drawCalendarCanvas() as HTMLCanvasElement).toBlob((b) => res(b!), 'image/png')));
    const done = (k: string) => { setCopy(k); setTimeout(() => setCopy(''), 1500); };
    const save2 = () => blob.then((b) => { download(b, '루카_전입출현황_' + cur.y + String(cur.m + 1).padStart(2, '0') + '.png'); done('saved'); });
    if (navigator.clipboard && 'ClipboardItem' in window) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => done('copied')).catch(save2); else save2();
  };
  const farmsF = lg.farmNameFrequency('farm') as string[], farmsE = lg.farmNameFrequency('external') as string[];
  // 시뮬레이션 (화면에서만 바꿔보는 가안, 이름 붙여 최대 3개 저장)
  const [scur, setScur] = useState({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
  const [ov, setOv] = useState<Ov>({});
  const [act, setAct] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sday, setSday] = useState<number | null>(null);
  const [sf, setSf] = useState({ in: '', out_farm: '', out_external: '', out_farm_name: '', out_external_name: '' });
  const SC = (S.simScenarios ?? []) as { id: string; name: string; overrides: Ov }[];
  const val = (d: number) => { const o = ov[iso(d)]; if (o) return { in: num(o.in), out_farm: num(o.out_farm), out_external: num(o.out_external), fn: o.out_farm_name ? [o.out_farm_name] : [], en: o.out_external_name ? [o.out_external_name] : [] }; const a = lg.aggregateRecordsForDay(d); return { in: a.in, out_farm: a.out_farm, out_external: a.out_external, fn: a.out_farm_names as string[], en: a.out_external_names as string[] }; };
  const openSim = (d: number) => { const v = val(d); setSday(d); setSf({ in: String(v.in), out_farm: String(v.out_farm), out_external: String(v.out_external), out_farm_name: v.fn.length === 1 ? v.fn[0] : '', out_external_name: v.en.length === 1 ? v.en[0] : '' }); };
  const saveSc = () => {
    const nm = name.trim(); if (!nm) { alert('가안 이름을 입력하세요'); return; }
    let L0 = [...SC];
    if (act) L0 = L0.map((x) => (x.id === act ? { id: x.id, name: nm, overrides: { ...ov } } : x));
    else { if (L0.length >= 3) { alert('가안은 최대 3개까지 저장할 수 있습니다'); return; } const id = 'sim_' + Date.now() + '_' + Math.random().toString(36).slice(2); L0.push({ id, name: nm, overrides: { ...ov } }); setAct(id); }
    save({ simScenarios: L0 });
  };
  const dayRecs = day === null ? [] : R.filter((r) => r.date === iso(day));
  return (
    <>
      <div className="card">
        <MonthGrid cur={cur} setCur={setCur} onPick={setDay} extra={<button className="btn sm ghost" onClick={copyImg}>{copy === 'copied' ? '이미지 복사됨 ✓' : copy === 'saved' ? '이미지 저장됨 ✓' : '이미지로 복사'}</button>}
          cell={(d) => { const L0 = by[d] ?? []; return <>
            {L0.slice(0, 4).map((r) => { const k = r.type === 'in' ? 'in' : r.subtype === 'farm' ? 'farm' : 'ext'; return <span key={r.id} style={chipS(k)}>{kindOf(r)} {r.type === 'in' ? '+' : '−'}{fmt(r.head)}{r.farmName && r.type !== 'in' ? ' · ' + r.farmName : ''}</span>; })}
            {L0.length > 4 && <span className="sub">+{L0.length - 4}건</span>}
            {L0.length > 0 && <span className="sub" style={{ marginTop: 'auto' }}>재고 {fmt(L.stockAt(d))}</span>}</>; }} />
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2 className="h2" style={{ marginBottom: 10 }}>전입전출 시뮬레이션</h2>
        {SC.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>{SC.map((x) => <span key={x.id} className={x.id === act ? 'chip ok' : 'chip'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, padding: '4px 8px' }}><button className="lnk" onClick={() => { setOv({ ...x.overrides }); setAct(x.id); setName(x.name); }}>{x.name}</button><button aria-label={x.name + ' 삭제'} onClick={() => { if (act === x.id) setAct(null); save({ simScenarios: SC.filter((z) => z.id !== x.id) }); }} style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 15 }}>×</button></span>)}</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', marginBottom: 12 }}>
          <label className="small" style={{ flex: '1 1 180px' }}>가안 이름<br /><input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} style={{ minHeight: 40, width: '100%' }} /></label>
          <button className="btn sm" disabled={SC.length >= 3 && !act} onClick={saveSc}>{act ? '덮어쓰기 저장' : '저장'}</button>
          <button className="btn sm ghost" onClick={() => { setOv({}); setAct(null); setName(''); }}>초기화</button>
          {SC.length >= 3 && !act && <span className="muted small">가안은 최대 3개 — 기존 가안 삭제 후 저장</span>}
        </div>
        <MonthGrid cur={scur} setCur={setScur} onPick={openSim} mark={(d) => !!ov[iso(d)]}
          cell={(d) => { const v = val(d); const any = v.in || v.out_farm || v.out_external; return <>
            {v.in > 0 && <span style={chipS('in')}>전입 +{fmt(v.in)}</span>}
            {v.out_farm > 0 && <span style={chipS('farm')}>전출 −{fmt(v.out_farm)}{v.fn.length ? ' · ' + v.fn.join(', ') : ''}</span>}
            {v.out_external > 0 && <span style={chipS('ext')}>외부판매 −{fmt(v.out_external)}{v.en.length ? ' · ' + v.en.join(', ') : ''}</span>}
            {any ? <span className="sub" style={{ marginTop: 'auto' }}>재고 {fmt(lg.stockAsOf(d, ov))}</span> : null}</>; }} />
      </div>
      {day !== null && (
        <Sheet title={short(day) + ' 전입·전출'} onClose={() => { setDay(null); setAskDel(''); }}>
          {dayRecs.length === 0 && <div className="muted" style={{ marginBottom: 10 }}>내역이 없습니다</div>}
          {dayRecs.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #EFEBE3', flexWrap: 'wrap' }}>
              <span className={'chip ' + KIND_T[kindOf(r)]}>{kindOf(r)}</span><span style={{ flex: 1 }}>{r.type === 'in' ? IN_FARM : r.farmName}</span>
              <input type="number" min={1} defaultValue={r.head} key={r.head} aria-label="두수" onBlur={(e) => { const h = Math.round(Number(e.target.value)); if (h > 0 && h !== r.head) setHead(r.id, h); }} style={{ width: 80, minHeight: 36, textAlign: 'right' }} />두
              {askDel === r.id ? <><button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={() => { del(r.id); setAskDel(''); }}>삭제</button><button className="btn sm ghost" onClick={() => setAskDel('')}>취소</button></> : <button className="btn sm ghost" onClick={() => setAskDel(r.id)}>삭제</button>}
            </div>
          ))}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end', marginTop: 12 }}>
            <label className="small">구분<br /><select value={nf.kind} onChange={(e) => setNf({ ...nf, kind: e.target.value })} style={{ minHeight: 40 }}><option value="in">전입</option><option value="farm">전출</option><option value="ext">외부판매</option></select></label>
            <label className="small" style={{ flex: '1 1 130px' }}>농장명<br />{nf.kind === 'in' ? <input value={IN_FARM} disabled style={{ minHeight: 40, width: '100%' }} /> : <><input list="luka-day-farms" value={nf.farm} onChange={(e) => setNf({ ...nf, farm: e.target.value })} style={{ minHeight: 40, width: '100%' }} /><datalist id="luka-day-farms">{(nf.kind === 'farm' ? farmsF : farmsE).map((x) => <option key={x} value={x} />)}</datalist></>}</label>
            <label className="small">두수<br /><input type="number" inputMode="numeric" min={1} value={nf.head} onChange={(e) => setNf({ ...nf, head: e.target.value })} style={{ minHeight: 40, width: 80 }} /></label>
            <button className="btn pri" disabled={!(Number(nf.head) > 0) || (nf.kind !== 'in' && !nf.farm.trim())} onClick={() => { const h = Math.round(Number(nf.head)); add(nf.kind === 'in' ? { date: iso(day), type: 'in', subtype: null, farmName: IN_FARM, head: h } : { date: iso(day), type: 'out', subtype: nf.kind === 'farm' ? 'farm' : 'external', farmName: nf.farm.trim(), head: h }); setNf({ kind: 'in', farm: '', head: '' }); }}>추가</button>
          </div>
        </Sheet>
      )}
      {sday !== null && (
        <Sheet title={short(sday) + ' 시뮬레이션'} onClose={() => setSday(null)}>
          <datalist id="luka-sim-f">{farmsF.map((x) => <option key={x} value={x} />)}</datalist><datalist id="luka-sim-e">{farmsE.map((x) => <option key={x} value={x} />)}</datalist>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'end' }}>
            <label className="small">전입두수<br /><input type="number" min={0} value={sf.in} onChange={(e) => setSf({ ...sf, in: e.target.value })} style={{ minHeight: 40, width: '100%' }} /></label><span />
            <label className="small">전출(농장)<br /><input type="number" min={0} value={sf.out_farm} onChange={(e) => setSf({ ...sf, out_farm: e.target.value })} style={{ minHeight: 40, width: '100%' }} /></label>
            <label className="small">전출 농장명<br /><input list="luka-sim-f" value={sf.out_farm_name} onChange={(e) => setSf({ ...sf, out_farm_name: e.target.value })} style={{ minHeight: 40, width: '100%' }} /></label>
            <label className="small">외부판매<br /><input type="number" min={0} value={sf.out_external} onChange={(e) => setSf({ ...sf, out_external: e.target.value })} style={{ minHeight: 40, width: '100%' }} /></label>
            <label className="small">판매처명<br /><input list="luka-sim-e" value={sf.out_external_name} onChange={(e) => setSf({ ...sf, out_external_name: e.target.value })} style={{ minHeight: 40, width: '100%' }} /></label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn pri" onClick={() => { setOv({ ...ov, [iso(sday)]: { in: num(sf.in), out_farm: num(sf.out_farm), out_external: num(sf.out_external), out_farm_name: sf.out_farm_name.trim(), out_external_name: sf.out_external_name.trim() } }); setSday(null); }}>적용</button>
            {ov[iso(sday)] && <button className="btn ghost" onClick={() => { const o = { ...ov }; delete o[iso(sday)]; setOv(o); setSday(null); }}>실제값으로 되돌리기</button>}
          </div>
        </Sheet>
      )}
    </>
  );
}

function FeedTab({ S, save, lg }: { S: LukaSettings; save: (p: Partial<LukaSettings>) => void; lg: Lg }) {
  const A = S.feedCostRows ?? [];
  const [edit, setEdit] = useState(false);
  const amt = A.reduce((x, r) => x + num(r.amount), 0), hd = A.reduce((x, r) => x + num(r.inHead), 0);
  return (
    <>
    <WorkbookImport lg={lg} save={save} />
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 className="h2">{DEFS.feedCost.title}</h2><button className="btn sm ghost" onClick={() => setEdit(true)}>수정/추가</button></div>
      {tiles([{ l: '총 지급액', v: fmt(amt) + '원' }, { l: '총 전입두수', v: fmt(hd) + '두' }, { l: '두당금액(평균)', v: fmt(hd ? Math.round(amt / hd) : 0) + '원' }])}
      <StatusTable t="feedCost" rows={A} all={A} save={(L) => save({ feedCostRows: L })} />
    </div>
    {edit && <EditSheet t="feedCost" lg={lg} all={A} save={(L) => save({ feedCostRows: L })} onClose={() => setEdit(false)} />}
    </>
  );
}

export function LukaPage() {
  const { tab = 'status' } = useParams();
  const nav = useNavigate();
  const { settings: S, records: R, state, saveSettings, addRecord, deleteRecord, setHead, replaceAll } = useLuka();
  const L = useMemo(() => makeLedger(S, R), [S, R]);
  const lg = useMemo(() => makeLuka(S, R), [S, R]);
  const exportXl = () => { try { download(lg.buildExportWorkbookBlob(), '후기자돈사_운영현황_' + iso(todayMs()) + '.xlsx'); } catch (e) { alert('엑셀 다운로드 실패: ' + (e as Error).message); } };
  const save = (p: Partial<LukaSettings>) => { saveSettings(p).catch(() => alert('저장하지 못했습니다')); };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}><div style={{ flex: 1, minWidth: 0 }}><Tabs opts={LUKA_TABS as [string, string][]} value={tab} onPick={(k) => nav('/luka/' + k)} /></div>{state === 'ok' && <button className="btn sm" style={{ marginBottom: 6 }} onClick={exportXl}>엑셀 다운로드</button>}</div>
      {state === 'err' && <div className="chip bad" style={{ display: 'block', whiteSpace: 'normal', margin: '12px 0' }}>루카 자료 서버에 연결하지 못했습니다</div>}
      {state === 'wait' && <div className="card skel" aria-busy="true" style={{ marginTop: 12 }}><i style={{ width: '40%' }} /><i style={{ width: '85%' }} /><i style={{ width: '70%' }} /></div>}
      {state === 'ok' && <div style={{ marginTop: 14 }}>
        {tab === 'status' && <StatusTab S={S} save={save} lg={lg} />}
        {tab === 'dash' && <DashTab S={S} R={R} L={L} lg={lg} save={save} add={addRecord} del={deleteRecord} replaceAll={replaceAll} />}
        {tab === 'calendar' && <CalendarTab S={S} R={R} L={L} lg={lg} save={save} add={addRecord} del={deleteRecord} setHead={setHead} />}
        {tab === 'feed' && <FeedTab S={S} save={save} lg={lg} />}
      </div>}
    </>
  );
}

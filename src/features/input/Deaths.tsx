// 폐사 — 미등록(피그온) 확인 + 등록한 폐사 목록·수정. 대시보드 입력과 농장 앱 입력이 한 목록이다.
import { useMemo, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { dongsOf } from '@/lib/calc/herd';
import { fmt, md } from '@/lib/calc/dates';
import { todayKST } from '@/lib/util';
import type { DeathRow } from '@/lib/repo';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const wd = (d: string) => WD[new Date(d + 'T00:00:00Z').getUTCDay()];
const srcChip = (r: DeathRow) => <span className={r.src === 'share' ? 'chip info' : 'chip'} style={{ fontSize: 12 }}>{r.src === 'share' ? '농장 앱' : '대시보드'}</span>;

// 농장의 동·그룹 선택지 ('3동 · 26-7', 동 없이 관리하면 그룹만)
export function useDongGroupOpts() {
  const { all } = useHerd();
  return (farm: string) => all.filter((r) => r.farm === farm).flatMap((r) => { const ds = dongsOf(r.dong); return ds.length ? ds.map((d) => ({ v: d + '|' + r.group, l: d + '동 · ' + r.group })) : [{ v: '|' + r.group, l: r.group }]; });
}
const dgLabel = (r: { dong: string; group: string }) => (r.dong ? r.dong + '동 · ' : '') + r.group;

function SplitTxt({ r }: { r: DeathRow }) {
  const { split } = useHerd();
  const x = split[r.id];
  if (!x || !x.claim) return null;
  return <div className="sub" style={{ fontSize: 12 }}>크레임 {x.claim}{x.death ? ' · 폐사 ' + x.death : ''}</div>;
}

// 한 줄 수정 — 날짜 · 동(그룹) · 두수. 저장하면 피그온 등록완료가 풀린다
function EditRow({ r, onDone }: { r: DeathRow; onDone: () => void }) {
  const { repo, email } = useAuth();
  const opts = useDongGroupOpts()(r.farm);
  const [date, setDate] = useState(r.date);
  const [dg, setDg] = useState((r.dong ?? '') + '|' + r.group);
  const [cnt, setCnt] = useState(String(r.count));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const has = opts.some((o) => o.v === dg);
  const save = async () => {
    const n = Number(cnt);
    if (!date) return setErr('날짜를 넣으세요');
    if (!(Number.isInteger(n) && n >= 1 && n <= 300)) return setErr('두수는 1~300');
    const [dong, group] = dg.split('|');
    setBusy(true);
    try { await repo!.updateDeath(r, { date, dong, group, count: n }, email); onDone(); } catch (e) { setErr('저장하지 못했습니다: ' + String(e)); } finally { setBusy(false); }
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end', padding: '10px 12px', background: '#F7F5F0', borderRadius: 8, margin: '4px 0' }}>
      <b style={{ alignSelf: 'center', minWidth: 60 }}>{r.farm}</b>
      <label style={{ fontSize: 13 }}>날짜<br /><input type="date" value={date} max={todayKST()} onChange={(e) => { setDate(e.target.value); setErr(''); }} /></label>
      <label style={{ fontSize: 13 }}>동 (그룹)<br /><select value={dg} onChange={(e) => { setDg(e.target.value); setErr(''); }}>{!has && <option value={dg}>{dgLabel({ dong: dg.split('|')[0], group: dg.split('|')[1] })} (지금 값)</option>}{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></label>
      <label style={{ fontSize: 13 }}>두수<br /><input type="number" inputMode="numeric" min={1} max={300} value={cnt} onChange={(e) => { setCnt(e.target.value); setErr(''); }} style={{ width: 90 }} /></label>
      <button className="btn sm ghost" onClick={onDone}>취소</button>
      <button className="btn sm pri" disabled={busy} onClick={save}>{busy ? '저장 중…' : '저장'}</button>
      {r.checked && <span className="chip warn" style={{ fontSize: 12 }}>저장하면 다시 미등록</span>}
      {err && <span className="chip bad">{err}</span>}
    </div>
  );
}

// 미등록(피그온에 아직 안 올린) 폐사 — 등록완료를 누르면 목록에서 빠진다
export function UnregisteredDeaths() {
  const { deaths, passFarm } = useHerd();
  const { repo, email } = useAuth();
  const [edit, setEdit] = useState<string | null>(null);
  const [allOk, setAllOk] = useState(false);
  const rows = deaths.filter((r) => !r.checked && passFarm(r.farm)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.farm.localeCompare(b.farm, 'ko')));
  const byFarm = useMemo(() => { const m: Record<string, number> = {}; rows.forEach((r) => { m[r.farm] = (m[r.farm] ?? 0) + r.count; }); return m; }, [rows]);
  const mark = (r: DeathRow) => repo!.updateDeath(r, { checked: true }, email);
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 className="h2">피그온 미등록 · {rows.length}건 {rows.length > 0 && <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({fmt(rows.reduce((a, r) => a + r.count, 0))}두)</span>}</h2>
        {rows.length > 1 && (allOk
          ? <span style={{ display: 'flex', gap: 6 }}><button className="btn sm ghost" onClick={() => setAllOk(false)}>취소</button><button className="btn sm pri" onClick={async () => { setAllOk(false); for (const r of rows) await mark(r); }}>{rows.length}건 모두 등록완료</button></span>
          : <button className="btn sm" onClick={() => setAllOk(true)}>모두 등록완료</button>)}
      </div>
      {rows.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 4px' }}>{Object.entries(byFarm).map(([f, n]) => <span key={f} className="chip warn">{f} {n}두</span>)}</div>}
      {rows.length === 0 && <div className="muted" style={{ marginTop: 8 }}>미등록 폐사가 없습니다</div>}
      {rows.map((r) => edit === r.id ? <EditRow key={r.id} r={r} onDone={() => setEdit(null)} /> : (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #EFEBE3', fontSize: 14, flexWrap: 'wrap' }}>
          <span style={{ width: 66 }}>{md(r.date)}({wd(r.date)})</span>
          <div style={{ flex: 1, minWidth: 140 }}><b>{r.farm}</b> {dgLabel(r)}{r.editedAt ? <span className="muted" style={{ fontSize: 12 }}> · 수정됨</span> : null}</div>
          <div style={{ textAlign: 'right' }}><b>{r.count}두</b><SplitTxt r={r} /></div>
          {srcChip(r)}
          <button className="btn sm ghost" onClick={() => setEdit(r.id)}>수정</button>
          <button className="btn sm pri" onClick={() => mark(r)}>등록완료</button>
        </div>
      ))}
    </div>
  );
}

// 등록한 폐사 전체 목록 — 농장·월·상태로 거르고, 날짜·동(그룹)·두수 수정, 삭제(두 번 눌러 확인)
export function DeathList() {
  const { deaths, farms } = useHerd();
  const { repo, email } = useAuth();
  const months = useMemo(() => [...new Set(deaths.map((r) => r.date.slice(0, 7)))].sort().reverse(), [deaths]);
  const [farm, setFarm] = useState('');
  const [mon, setMon] = useState('');
  const [st, setSt] = useState<'all' | 'no' | 'ok'>('all');
  const [edit, setEdit] = useState<string | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const rows = deaths.filter((r) => (!farm || r.farm === farm) && (!mon || r.date.startsWith(mon)) && (st === 'all' || (st === 'ok') === r.checked))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.at < b.at ? 1 : -1));
  const shown = more ? rows : rows.slice(0, 30);
  const g = '84px minmax(140px,1.4fr) 110px 80px 92px 150px';
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 className="h2">등록한 폐사 · {rows.length}건 <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({fmt(rows.reduce((a, r) => a + r.count, 0))}두)</span></h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select aria-label="농장" value={farm} onChange={(e) => setFarm(e.target.value)}><option value="">농장 전체</option>{farms.map((f) => <option key={f}>{f}</option>)}</select>
          <select aria-label="월" value={mon} onChange={(e) => setMon(e.target.value)}><option value="">기간 전체</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}</select>
          <select aria-label="상태" value={st} onChange={(e) => setSt(e.target.value as any)}><option value="all">상태 전체</option><option value="no">미등록</option><option value="ok">등록완료</option></select>
        </div>
      </div>
      {rows.length === 0 ? <div className="muted" style={{ marginTop: 10 }}>해당하는 폐사 기록이 없습니다</div> : (
        <div className="gt" style={{ marginTop: 10 }}><div style={{ minWidth: 720 }}>
          <div className="gr gh small muted" style={{ gridTemplateColumns: g }}><div>날짜</div><div>농장 · 동(그룹)</div><div className="r">두수</div><div>입력</div><div>피그온</div><div /></div>
          {shown.map((r) => edit === r.id ? <EditRow key={r.id} r={r} onDone={() => setEdit(null)} /> : (
            <div key={r.id} className="gr" style={{ gridTemplateColumns: g }}>
              <div>{md(r.date)}({wd(r.date)})</div>
              <div><b>{r.farm}</b> {dgLabel(r)}{r.editedAt ? <div className="sub" style={{ fontSize: 12 }}>수정 {md(r.editedAt.slice(0, 10))}</div> : null}</div>
              <div className="r"><b>{r.count}</b><SplitTxt r={r} /></div>
              <div>{srcChip(r)}</div>
              <div><button className={r.checked ? 'chip ok' : 'chip warn'} style={{ border: 0, cursor: 'pointer', font: 'inherit', fontSize: 12 }} onClick={() => repo!.updateDeath(r, { checked: !r.checked }, email)}>{r.checked ? '등록완료' : '미등록'}</button></div>
              <div className="r" style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button className="btn sm ghost" onClick={() => { setEdit(r.id); setDel(null); }}>수정</button>
                {del === r.id ? <button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={async () => { await repo!.removeDeath(r); setDel(null); }}>정말 삭제</button> : <button className="btn sm ghost" onClick={() => setDel(r.id)}>삭제</button>}
              </div>
            </div>
          ))}
        </div></div>
      )}
      {!more && rows.length > 30 && <button className="btn" style={{ marginTop: 10 }} onClick={() => setMore(true)}>{rows.length - 30}건 더 보기</button>}
    </div>
  );
}

// 폐사입력현황 — 미등록 / 등록완료 / 전체를 한 목록에서. 줄을 누르면 수정·삭제, 오른쪽 버튼은 피그온 등록완료.
// 대시보드·농장 앱·폐사입력 앱(구글시트) 입력이 한 목록이다 (어디서 넣었는지는 표시하지 않음).
import { useMemo, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { dongsOf } from '@/lib/calc/herd';
import { fmt, md } from '@/lib/calc/dates';
import { todayKST } from '@/lib/util';
import type { DeathRow } from '@/lib/repo';
import { Sheet, Stepper, toast } from '@/components/Sheet';
import { thisMonth } from '@/lib/useIsPhone';

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const wd = (d: string) => WD[new Date(d + 'T00:00:00Z').getUTCDay()];

// 농장의 동·그룹 선택지 ('3동 · 26-7', 동 없이 관리하면 그룹만)
export function useDongGroupOpts() {
  const { all } = useHerd();
  return (farm: string) => all.filter((r) => r.farm === farm).flatMap((r) => { const ds = dongsOf(r.dong); return ds.length ? ds.map((d) => ({ v: d + '|' + r.group, l: d + '동 · ' + r.group })) : [{ v: '|' + r.group, l: r.group }]; });
}
const dgLabel = (r: { dong: string; group: string }) => (r.dong ? r.dong + '동 · ' : '') + r.group;
const nPhotos = (r: DeathRow) => r.photoUrls?.length || r.photos?.length || 0;

// 사진 — 드라이브 링크면 새 탭, 대시보드 사진이면 눌러서 크게
export function Photos({ r }: { r: DeathRow }) {
  const [big, setBig] = useState<number | null>(null);
  if (r.photoUrls?.length) return <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{r.photoUrls.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="btn sm ghost">사진 {i + 1}</a>)}</div>;
  if (!r.photos?.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {r.photos.map((p, i) => <button key={i} onClick={() => setBig(big === i ? null : i)} aria-label={'사진 ' + (i + 1)} style={{ padding: 0, border: big === i ? '2px solid #1F4E3D' : '1px solid #E2DDD2', borderRadius: 6 }}><img src={p} alt="" style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 5, display: 'block' }} /></button>)}
      {big !== null && <img src={r.photos[big]} alt={'폐사 사진 ' + (big + 1)} style={{ width: '100%', maxHeight: 520, objectFit: 'contain', borderRadius: 8, background: '#000' }} onClick={() => setBig(null)} />}
    </div>
  );
}

// 펼친 줄 — 날짜·동(그룹)·두수 고치기, 사진, 삭제(두 번 눌러 확인)
function EditPanel({ r, onDone }: { r: DeathRow; onDone: () => void }) {
  const { repo, email } = useAuth();
  const opts = useDongGroupOpts()(r.farm);
  const [date, setDate] = useState(r.date);
  const [dg, setDg] = useState((r.dong ?? '') + '|' + r.group);
  const [cnt, setCnt] = useState(r.count);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const has = opts.some((o) => o.v === dg);
  const dirty = date !== r.date || dg !== (r.dong ?? '') + '|' + r.group || cnt !== r.count;
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(''); try { await f(); onDone(); } catch (e) { setErr((e as Error).message || String(e)); } finally { setBusy(false); } };
  const save = () => {
    const n = cnt;
    if (!date) return setErr('날짜를 넣으세요');
    if (!(Number.isInteger(n) && n >= 1 && n <= 300)) return setErr('두수는 1~300');
    const [dong, group] = dg.split('|');
    run(() => repo!.updateDeath(r, { date, dong, group, count: n }, email));
  };
  const lab = { fontSize: 13, color: '#6B6A63', display: 'grid', gap: 4 } as const;
  const inp = { width: '100%', minHeight: 44, boxSizing: 'border-box' } as const;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        <label style={lab}>날짜<input type="date" value={date} max={todayKST()} onChange={(e) => { setDate(e.target.value); setErr(''); }} style={inp} /></label>
        <label style={lab}>동 · 그룹<select value={dg} onChange={(e) => { setDg(e.target.value); setErr(''); }} style={inp}>{!has && <option value={dg}>{dgLabel({ dong: dg.split('|')[0], group: dg.split('|')[1] })}</option>}{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></label>
      </div>
      <div style={lab}>두수<Stepper value={cnt} onChange={(n) => { setCnt(n); setErr(''); }} /></div>
      <Photos r={r} />
      {r.checked && dirty && <div className="small" style={{ color: '#7A4F00' }}>고쳐 저장하면 미등록으로 돌아갑니다</div>}
      {err && <div className="small" style={{ color: '#9A3216' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {del
          ? <><button className="btn" disabled={busy} style={{ background: '#9A3216', borderColor: '#9A3216', color: '#fff' }} onClick={() => run(() => repo!.removeDeath(r))}>삭제 확인</button><button className="btn ghost" onClick={() => setDel(false)}>그대로 두기</button></>
          : <button className="btn ghost" style={{ color: '#9A3216', borderColor: '#E7C3B5' }} onClick={() => setDel(true)}>삭제</button>}
        <div style={{ flex: 1 }} />
        {!del && <button className="btn pri" disabled={busy || !dirty} onClick={save} style={{ minHeight: 48, minWidth: 110 }}>{busy ? '저장 중…' : '저장'}</button>}
      </div>
    </div>
  );
}

// 한 줄: [농장 · 동(그룹) · 사진/폭염] [두수] [등록완료 버튼]
function Item({ r, open, onOpen, onCheck }: { r: DeathRow; open: boolean; onOpen: () => void; onCheck: () => void }) {
  const { split } = useHerd();
  const x = split[r.id];
  const extra = [nPhotos(r) ? '사진 ' + nPhotos(r) : '', r.heat ? '폭염' : '', x?.claim ? '크레임 ' + x.claim : ''].filter(Boolean).join(' · ');
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #EFEBE3', background: open ? '#EEF3EF' : undefined }}>
        <button onClick={onOpen} aria-expanded={open} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', font: 'inherit', background: 'transparent', border: 0, padding: '10px 4px 10px 8px', cursor: 'pointer', minHeight: 52, color: 'inherit' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><b>{r.farm}</b> <span>{dgLabel(r)}</span></div>
            {extra && <div className="muted" style={{ fontSize: 12 }}>{extra}</div>}
          </div>
          <b style={{ fontSize: 17, fontVariantNumeric: 'tabular-nums' }}>{r.count}<span style={{ fontSize: 13, fontWeight: 400 }}>두</span></b>
        </button>
        <button onClick={onCheck} aria-pressed={r.checked} aria-label={r.checked ? '등록완료 풀기' : '피그온 등록완료'}
          style={{ minWidth: 64, minHeight: 40, borderRadius: 20, font: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginRight: 4,
            ...(r.checked ? { background: '#E6EFE9', color: '#1F4E3D', border: '1px solid #E6EFE9' } : { background: '#fff', color: '#1F4E3D', border: '1px solid #1F4E3D' }) }}>
          {r.checked ? '✓ 완료' : '○ 등록'}
        </button>
      </div>
    </>
  );
}

// 미등록 폐사를 작은 새 창으로 — 피그온 옆에 띄워 두고 입력하기 위함
export const openUnregWindow = () => {
  const w = Math.min(600, Math.round(screen.availWidth / 2));
  window.open(location.href.split('#')[0] + '#/popup/unreg', 'unregDeaths', `width=${w},height=${screen.availHeight},left=${screen.availWidth - w},top=0`);
};

type St = 'no' | 'ok' | 'all';
export function DeathRecords({ popup = false }: { popup?: boolean }) {
  const { deaths, passFarm } = useHerd();
  const { repo, email } = useAuth();
  const [st, setSt] = useState<St>('no');
  const [farm, setFarm] = useState('');
  const [mon, setMon] = useState(thisMonth());
  const [open, setOpen] = useState<string | null>(null);
  const [allOk, setAllOk] = useState(false);
  const [more, setMore] = useState(false);
  const base = deaths.filter((r) => popup || passFarm(r.farm));
  const unregN = base.filter((r) => !r.checked).length;
  const inSt = base.filter((r) => st === 'all' || (st === 'ok') === r.checked);
  const months = useMemo(() => [...new Set([thisMonth(), ...base.map((r) => r.date.slice(0, 7))])].sort().reverse(), [base]);
  const monF = st === 'no' ? '' : mon;
  const byFarm = useMemo(() => { const m: Record<string, number> = {}; inSt.filter((r) => !monF || r.date.startsWith(monF)).forEach((r) => { m[r.farm] = (m[r.farm] ?? 0) + r.count; }); return m; }, [inSt, monF]);
  const rows = inSt.filter((r) => (!farm || r.farm === farm) && (!monF || r.date.startsWith(monF)))
    .sort((a, b) => (st === 'no' ? (a.date < b.date ? -1 : a.date > b.date ? 1 : a.farm.localeCompare(b.farm, 'ko')) : (a.date < b.date ? 1 : a.date > b.date ? -1 : a.at < b.at ? 1 : -1)));
  const lim = st === 'no' || more ? rows : rows.slice(0, 60);
  const days = useMemo(() => { const m = new Map<string, DeathRow[]>(); lim.forEach((r) => { if (!m.has(r.date)) m.set(r.date, []); m.get(r.date)!.push(r); }); return [...m]; }, [lim]);
  const check = async (r: DeathRow) => { await repo!.updateDeath(r, { checked: !r.checked }, email); if (!r.checked) toast(`${r.farm} ${dgLabel(r)} ${r.count}두 등록완료`, { label: '되돌리기', run: () => { repo!.updateDeath({ ...r, checked: true }, { checked: false }, email); } }); };
  const total = rows.reduce((a, r) => a + r.count, 0);
  const seg = (k: St, l: string) => <button key={k} className={st === k ? 'seg on' : 'seg'} onClick={() => { setSt(k); setOpen(null); setAllOk(false); setMore(false); }}>{l}</button>;

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="segs" role="group" aria-label="상태">{seg('no', `미등록 ${unregN}`)}{seg('ok', '등록완료')}{seg('all', '전체')}</div>
        <div style={{ flex: 1 }} />
        {!popup && <button className="btn sm ghost" onClick={openUnregWindow}>새 창</button>}
      </div>
      <div className="hscroll" style={{ alignItems: 'center', margin: '10px 0 4px' }}>
        {st !== 'no' && <select aria-label="월" value={mon} onChange={(e) => setMon(e.target.value)} style={{ minHeight: 34 }}><option value="">기간 전체</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}</select>}
        {Object.entries(byFarm).map(([f, n]) => <button key={f} className={farm === f ? 'pill on' : 'pill'} style={{ minHeight: 34, padding: '4px 10px', fontSize: 13 }} onClick={() => setFarm(farm === f ? '' : f)}>{f} {fmt(n)}</button>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 2px', minHeight: 34 }}>
        <span className="muted small">{rows.length}건 · {fmt(total)}두</span>
        <div style={{ flex: 1 }} />
        {st === 'no' && rows.length > 1 && (allOk
          ? <><button className="btn sm ghost" onClick={() => setAllOk(false)}>취소</button><button className="btn sm pri" onClick={async () => { setAllOk(false); for (const r of rows) await repo!.updateDeath(r, { checked: true }, email); }}>{rows.length}건 모두 완료</button></>
          : <button className="btn sm ghost" onClick={() => setAllOk(true)}>모두 등록완료</button>)}
      </div>
      {rows.length === 0 && <div className="muted" style={{ padding: '16px 4px' }}>{st === 'no' ? '미등록 폐사가 없습니다' : '해당하는 폐사 기록이 없습니다'}</div>}
      {days.map(([d, L]) => (
        <div key={d}>
          <div style={{ position: 'sticky', top: 0, zIndex: 1, background: '#fff', display: 'flex', justifyContent: 'space-between', padding: '12px 8px 4px', fontSize: 13, fontWeight: 700, color: wd(d) === '일' ? '#9A3216' : '#6B6A63', borderBottom: '1px solid #E2DDD2' }}>
            <span>{md(d)} ({wd(d)})</span><span>{fmt(L.reduce((a, r) => a + r.count, 0))}두</span>
          </div>
          {L.map((r) => <Item key={r.id} r={r} open={open === r.id} onOpen={() => setOpen(open === r.id ? null : r.id)} onCheck={() => check(r)} />)}
        </div>
      ))}
      {(() => { const r = rows.find((x) => x.id === open); return r ? <Sheet title={<>{r.farm} <span className="muted" style={{ fontWeight: 400, fontSize: 14 }}>{md(r.date)}({wd(r.date)}) · {dgLabel(r)} · {r.count}두</span></>} onClose={() => setOpen(null)}><EditPanel key={r.id} r={r} onDone={() => setOpen(null)} /></Sheet> : null; })()}
      {st !== 'no' && !more && rows.length > 60 && <button className="btn" style={{ marginTop: 10, width: '100%' }} onClick={() => setMore(true)}>{rows.length - 60}건 더 보기</button>}
    </div>
  );
}

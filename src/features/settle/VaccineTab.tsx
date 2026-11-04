// 구제역 백신비 — 농장·접종일·대상 그룹·금액 + 영수증 첨부(사진은 줄여서, PDF는 700KB 이하) 저장
import { useEffect, useRef, useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { useCol } from '@/lib/useCol';
import type { Vaccine } from '@/lib/feedSheet';
import { fmt, md } from '@/lib/calc/dates';
import { todayKST } from '@/lib/util';

const MAX = 700 * 1024;
const readUrl = (f: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(f); });
// 사진은 긴 변 1600px · JPEG로 줄인다
async function shrinkImage(f: File): Promise<string> {
  const url = await readUrl(f);
  const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('사진을 열 수 없습니다 (HEIC는 JPG로 바꿔 올려주세요)')); i.src = url; });
  for (const [side, q] of [[1600, 0.75], [1200, 0.65], [900, 0.6]] as const) {
    const k = Math.min(1, side / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/jpeg', q);
    if (d.length * 0.75 < MAX) return d;
  }
  throw new Error('사진이 너무 큽니다');
}
const toBlobUrl = (d: string) => { const [h, b] = d.split(','); const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type: h.slice(5, h.indexOf(';')) })); };

function Attachment({ v }: { v: Vaccine }) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (!v.fileData) return; const u = toBlobUrl(v.fileData); setUrl(u); return () => URL.revokeObjectURL(u); }, [v.fileData]);
  if (!url) return null;
  return v.fileType?.startsWith('image/') ? <img src={url} alt={v.fileName ?? '영수증'} style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, marginTop: 8 }} /> : <iframe src={url} title={v.fileName ?? '첨부'} style={{ width: '100%', height: 480, border: '1px solid #E2DDD2', borderRadius: 8, marginTop: 8 }} />;
}

export function VaccineTab() {
  const { all, farms } = useHerd();
  const { repo, email } = useAuth();
  const list = useCol<Vaccine>('vaccine');
  const ref = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ farm: farms[0] ?? '', date: todayKST(), groups: [] as string[], heads: '', amount: '', memo: '' });
  const [file, setFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const gs = all.filter((r) => r.farm === f.farm && r.stock > 0);
  const pick = async (x: File) => {
    setErr(''); setOk('');
    try {
      if (x.type.startsWith('image/')) setFile({ name: x.name, type: 'image/jpeg', data: await shrinkImage(x) });
      else if (x.type === 'application/pdf') { if (x.size > MAX) throw new Error('PDF가 700KB를 넘습니다 — 사진으로 찍어 올려주세요'); setFile({ name: x.name, type: x.type, data: await readUrl(x) }); }
      else throw new Error('사진 또는 PDF만 올릴 수 있습니다');
    } catch (e) { setFile(null); setErr((e as Error).message); }
  };
  const save = async () => {
    const a = Number(f.amount);
    if (!f.farm) return setErr('농장을 고르세요');
    if (!f.groups.length) return setErr('대상 그룹을 하나 이상 고르세요');
    if (!(a > 0)) return setErr('금액을 넣으세요');
    setBusy(true);
    try {
      const rec: Vaccine = { farm: f.farm, date: f.date, groups: f.groups, amount: a, memo: f.memo.trim(), ...(f.heads ? { heads: Number(f.heads) } : {}), ...(file ? { fileName: file.name, fileType: file.type, fileData: file.data } : {}) };
      await repo!.add('vaccine', rec as any, email);
      setOk(`저장됨: ${f.farm} ${f.groups.join('·')} · ${fmt(a)}원${file ? ' · 첨부 1개' : ''}`);
      setF({ ...f, groups: [], heads: '', amount: '', memo: '' }); setFile(null);
    } catch (e) { setErr('저장하지 못했습니다: ' + String(e)); } finally { setBusy(false); }
  };
  const rows = [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <h2 className="h2">구제역 백신비 입력</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end', marginTop: 10 }}>
          <label className="small muted">농장<br /><select value={f.farm} onChange={(e) => setF({ ...f, farm: e.target.value, groups: [] })}>{farms.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label className="small muted">접종일<br /><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label className="small muted">접종 두수<br /><input type="number" inputMode="numeric" value={f.heads} onChange={(e) => setF({ ...f, heads: e.target.value })} style={{ width: 110 }} /></label>
          <label className="small muted">금액 (원)<br /><input type="number" inputMode="numeric" value={f.amount} onChange={(e) => { setF({ ...f, amount: e.target.value }); setErr(''); }} style={{ width: 140 }} /></label>
          <label className="small muted">메모<br /><input value={f.memo} onChange={(e) => setF({ ...f, memo: e.target.value })} style={{ width: 160 }} /></label>
        </div>
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <div className="small muted" style={{ marginBottom: 6 }}>대상 그룹</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {gs.map((g) => { const on = f.groups.includes(g.group); return <button key={g.group} className={on ? 'pill on' : 'pill'} onClick={() => setF({ ...f, groups: on ? f.groups.filter((x) => x !== g.group) : [...f.groups, g.group] })}>{g.group} · 재고 {fmt(g.stock)}</button>; })}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 14 }}>
          <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) pick(x); e.target.value = ''; }} />
          <button className="btn" onClick={() => ref.current?.click()}>파일 찾기 (영수증)</button>
          {file && <span className="chip info">{file.name}{file.type.startsWith('image/') ? ' · 줄여서 저장' : ''} <button aria-label="첨부 빼기" onClick={() => setFile(null)} style={{ marginLeft: 6 }}>✕</button></span>}
          <div style={{ flex: 1 }} />
          <button className="btn pri" disabled={busy} onClick={save}>{busy ? '저장 중…' : '저장'}</button>
        </div>
        {err && <div style={{ marginTop: 8 }}><span className="chip bad" style={{ whiteSpace: 'normal' }}>{err}</span></div>}
        {ok && <div style={{ marginTop: 8 }}><span className="chip ok">{ok}</span></div>}
      </div>
      <div className="card">
        <h2 className="h2">저장한 백신비 · {rows.length}건 <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({fmt(rows.reduce((a, v) => a + v.amount, 0))}원)</span></h2>
        {rows.length === 0 && <div className="muted" style={{ marginTop: 8 }}>저장한 백신비가 없습니다</div>}
        {rows.map((v) => (
          <div key={v.id} style={{ padding: '10px 0', borderBottom: '1px solid #EFEBE3', fontSize: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ width: 52 }}>{md(v.date)}</span><b style={{ minWidth: 70 }}>{v.farm}</b><span style={{ flex: 1 }}>{v.groups.join(' · ')}{v.heads ? ` · ${fmt(v.heads)}두` : ''}{v.memo ? <span className="muted"> · {v.memo}</span> : null}</span>
              <b>{fmt(v.amount)}원</b>
              {v.fileData ? <button className="btn sm ghost" onClick={() => setView(view === v.id ? null : v.id)}>{view === v.id ? '첨부 닫기' : '첨부 보기'}</button> : <span className="muted small">첨부 없음</span>}
              {del === v.id ? <button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={async () => { await repo!.remove('vaccine', v.id); setDel(null); }}>정말 삭제</button> : <button className="btn sm ghost" onClick={() => setDel(v.id)}>삭제</button>}
            </div>
            {view === v.id && <Attachment v={v} />}
          </div>
        ))}
      </div>
    </div>
  );
}

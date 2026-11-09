// 폐사관리 — 폐사현황(일자별) / 폐사입력 / 폐사입력현황(미등록·등록완료 목록, 수정·삭제)
import { DropCard } from '@/components/Drop';
import { useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { dongsOf } from '@/lib/calc/herd';
import { fmt, md } from '@/lib/calc/dates';
import { Tabs } from '@/components/v5';
import { todayKST } from '@/lib/util';
import { survOf } from '@/share/applyDeaths';
import { DeathRecords } from './Deaths';
import { DeathDaily } from './DeathDaily';
import { useRef } from 'react';
import { shrinkImage } from '@/lib/image';
import { pyesaOn, saveToSheet } from '@/lib/pyesa';
import { takeInbox } from '@/lib/inbox';
import { Stepper } from '@/components/Sheet';
import { useEffect } from 'react';

export function DeathPage() {
  const { s, set } = useHerd();
  return (
    <>
      <Tabs opts={[['status', '폐사현황'], ['input', '폐사입력'], ['list', '폐사입력현황']]} value={s.deathTab} onPick={(k) => set({ deathTab: k })} />
      {s.deathTab === 'status' && <DeathDaily />}
      {s.deathTab === 'input' && <DeathEntry />}
      {s.deathTab === 'list' && <DeathRecords />}
    </>
  );
}

function DeathEntry() {
  const { all, farms, s, set, saved: ui } = useHerd();
  const { repo, email } = useAuth();
  const [cnt, setCnt] = useState(1);
  const [date, setDate] = useState(todayKST());
  const [saved, setSaved] = useState('');
  const [savedOk, setSavedOk] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [forceUntil, setForceUntil] = useState(0);
  // '+ 동 추가'로 담아 둔 줄 — 저장 한 번에 지금 고른 것과 함께 모두 저장 (사진은 첫 줄에만 붙음)
  const [queue, setQueue] = useState<{ dong: string; group: string; count: number }[]>([]);
  const pref = useRef<HTMLInputElement>(null);
  const addPhotos = async (L: FileList) => {
    const room = 3 - photos.length; const out: string[] = [];
    try { for (const f of [...L].slice(0, room)) out.push(await shrinkImage(f, pyesaOn() ? 1500 * 1024 : 220 * 1024, pyesaOn() ? [[1600, 0.85], [1280, 0.75]] : [[1280, 0.7], [1024, 0.6], [800, 0.55]])); setSaved(L.length > room ? '사진은 한 건에 3장까지 붙습니다' : ''); setSavedOk(true); }
    catch (e) { setSavedOk(false); setSaved((e as Error).message); }
    setPhotos([...photos, ...out]);
  };
  // 폰 '공유'로 들어온 사진
  useEffect(() => { takeInbox('image').then((L) => { if (L.length) { const dt = new DataTransfer(); L.forEach((f) => dt.items.add(f)); addPhotos(dt.files); setSavedOk(true); setSaved(`공유받은 사진 ${L.length}장 — 농장·동·두수를 고르고 저장하세요`); } }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!all.length) return null;
  const pill = (on: boolean) => (on ? 'pill on' : 'pill');
  // 재고 없는 그룹(출하 끝)·정산완료 그룹은 고를 수 없게
  const dRows = all.filter((r) => r.farm === s.dFarm && r.stock > 0);
  const hasDong = dRows.some((r) => r.dong !== '—');
  const dongs = [...new Set(dRows.flatMap((r) => dongsOf(r.dong)))].sort();
  // 동으로 관리하는 그룹과 동 없이 관리하는 그룹이 섞인 농장: '동 없음'(dDong === '')을 따로 고른다
  const noDong = dRows.filter((r) => !dongsOf(r.dong).length);
  const cover = hasDong ? (s.dDong === '' ? noDong : dRows.filter((r) => s.dDong !== null && dongsOf(r.dong).includes(s.dDong))) : dRows;
  const auto = hasDong && cover.length === 1;
  const chosen = auto ? cover[0].group : s.dGroup;
  const addLine = () => {
    if (!chosen) { setSavedOk(false); setSaved('동·그룹을 고른 뒤 추가하세요'); return; }
    setQueue([...queue, { dong: s.dDong ?? '', group: chosen, count: cnt }]);
    set({ dDong: null, dGroup: null }); setCnt(1); setSavedOk(true); setSaved('');
  };
  const save = async () => {
    const lines = [...queue, ...(chosen ? [{ dong: s.dDong ?? '', group: chosen, count: cnt }] : [])];
    if (!lines.length) { setSavedOk(false); setSaved('그룹을 먼저 골라야 저장됩니다'); return; }
    setBusy(true);
    const done: string[] = []; let spike = false;
    try {
      for (let i = 0; i < lines.length; i++) {
        const L = lines[i];
        const rec = { date, farm: s.dFarm, dong: L.dong, group: L.group, count: L.count, ...(i === 0 && photos.length ? { photos } : {}) };
        // 폐사입력 서버 연결 시: 구글시트 기록 + 드라이브 사진 + 카톡 알림. 중복이면 30초 안에 한 번 더 누르면 저장
        if (pyesaOn()) { const j = await saveToSheet(rec, Date.now() < forceUntil); spike = spike || j.spike; }
        else await repo!.addDeath(rec, email, ui.shareLinks[s.dFarm] ?? '');
        done.push(`${L.dong ? L.dong + '동 ' : ''}${L.group} ${L.count}두`);
        if (i === 0) setPhotos([]);
      }
      setForceUntil(0); setQueue([]);
      setSavedOk(true); setSaved(`저장됨: ${s.dFarm} ${done.join(', ')} · ${md(date)}` + (photos.length ? ` · 사진 ${photos.length}장 드라이브 저장` : '') + (spike ? ' · 폐사 급증 카톡 알림 보냄' : ''));
      setCnt(1);
    } catch (e) {
      const m = (e as Error).message;
      setQueue(lines.slice(done.length));
      if (done.length) set({ dDong: null, dGroup: null });
      const pre = done.length ? `저장됨: ${done.join(', ')} / 남은 줄 ` : '';
      if (/이미 저장/.test(m)) { setForceUntil(Date.now() + 30000); setSavedOk(false); setSaved(pre + m + ' — 그래도 저장하려면 30초 안에 저장을 한 번 더 누르세요'); }
      else { setSavedOk(false); setSaved(pre + '저장하지 못했습니다: ' + m); }
    } finally { setBusy(false); }
  };
  const cur = chosen ? dRows.find((r) => r.group === chosen) ?? null : null;
  const after = cur ? (() => { const c = Math.min(cnt, cur.claimLeft); const d = cur.death + cnt - c; return { c, d, stock: cur.stock - cnt, surv: survOf(cur.net, d) }; })() : null;
  return (
    <DropCard style={{ maxWidth: 560 }} accept="image/*" onFiles={(F) => { const dt = new DataTransfer(); F.forEach((f) => dt.items.add(f)); addPhotos(dt.files); }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 className="h2">폐사 입력</h2>
        <span><input ref={pref} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files?.length) addPhotos(e.target.files); e.target.value = ''; }} /><button className="btn" disabled={photos.length >= 3} onClick={() => pref.current?.click()}>사진 등록{photos.length ? ` (${photos.length}/3)` : ''}</button></span>
      </div>
      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {photos.map((p, i) => <div key={i} style={{ position: 'relative' }}><img src={p} alt={'폐사 사진 ' + (i + 1)} style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8 }} /><button aria-label="사진 빼기" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 26, height: 26, borderRadius: 13, background: 'rgba(0,0,0,.55)', color: '#fff' }}>✕</button></div>)}
        </div>
      )}
      <div style={{ fontWeight: 700, margin: '14px 0 8px' }}>① 농장</div>
      <div className="hscroll">
        {farms.map((f) => <button key={f} className={pill(s.dFarm === f)} onClick={() => { set({ dFarm: f, dDong: null, dGroup: null }); setCnt(1); setQueue([]); setSaved(''); }}>{f}</button>)}
      </div>
      {hasDong && (
        <>
          <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>② 동</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{dongs.map((x) => <button key={x} className={pill(s.dDong === x)} onClick={() => { set({ dDong: x, dGroup: null }); setSaved(''); }}>{x}동</button>)}{noDong.length > 0 && <button className={pill(s.dDong === '')} onClick={() => { set({ dDong: '', dGroup: null }); setSaved(''); }}>동 없음 ({noDong.map((r) => r.group).join('·')})</button>}</div>
        </>
      )}
      {(!hasDong || (s.dDong !== null && cover.length > 1)) && (
        <>
          <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>{hasDong ? '③ 이 동에 그룹이 여럿 — 어느 그룹인가요?' : '② 그룹 (명임은 동 없이 관리)'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{cover.map((r) => <button key={r.group} className={pill(s.dGroup === r.group)} onClick={() => { set({ dGroup: r.group }); setSaved(''); }}>{r.group} · 재고 {fmt(r.stock)} · {r.surv}%</button>)}</div>
        </>
      )}
      {auto && <div style={{ marginTop: 12 }}><span className="chip ok">자동 연결: {s.dFarm} {cover[0].group}</span></div>}
      {cur && after && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#F4F2EC', borderRadius: 8, fontSize: 14, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 6 }}>
          <div><div className="muted" style={{ fontSize: 12 }}>재고</div><b style={{ fontSize: 17 }}>{fmt(cur.stock)}</b><div className="muted" style={{ fontSize: 12 }}>→ {fmt(after.stock)}</div></div>
          <div><div className="muted" style={{ fontSize: 12 }}>육성률</div><b style={{ fontSize: 17, color: cur.bad ? '#9A3216' : undefined }}>{cur.surv}%</b><div className="muted" style={{ fontSize: 12 }}>→ {after.surv}%</div></div>
          <div><div className="muted" style={{ fontSize: 12 }}>폐사</div><b style={{ fontSize: 17 }}>{fmt(cur.death)}</b><div className="muted" style={{ fontSize: 12 }}>→ {fmt(after.d)}</div></div>
          <div><div className="muted" style={{ fontSize: 12 }}>크레임 남음</div><b style={{ fontSize: 17 }}>{fmt(cur.claimLeft)}</b><div className="muted" style={{ fontSize: 12 }}>→ {fmt(cur.claimLeft - after.c)}</div></div>
        </div>
      )}
      <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>④ 두수 · 날짜</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Stepper value={cnt} onChange={(n) => { setCnt(n); setSaved(''); }} />
        <label style={{ fontSize: 14 }}>날짜 <input type="date" value={date} max={todayKST()} onChange={(e) => setDate(e.target.value || todayKST())} style={{ minHeight: 44 }} /></label>
      </div>
      {queue.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {queue.map((q, i) => <span key={i} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{q.dong ? q.dong + '동 · ' : ''}{q.group} · {q.count}두<button aria-label="줄 빼기" onClick={() => setQueue(queue.filter((_, j) => j !== i))} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0 }}>✕</button></span>)}
        </div>
      )}
      <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn pri" disabled={busy} onClick={save} style={{ minHeight: 48, minWidth: 120, fontSize: 16 }}>{busy ? '저장 중…' : queue.length ? `저장 (${queue.length + (chosen ? 1 : 0)}줄)` : '저장'}</button>
        <button className="btn" disabled={!chosen} onClick={addLine}>+ 동 추가</button>
      </div>
      {saved && <div style={{ marginTop: 12 }}><span className={savedOk ? 'chip ok' : 'chip bad'} style={{ whiteSpace: 'normal' }}>{saved}</span></div>}
    </DropCard>
  );
}

// 새 창 — 미등록 폐사만 (피그온 옆에 화면 분할로 띄움)
export function UnregPopup() {
  return (
    <div className="v5" style={{ padding: '12px 12px 32px', minHeight: '100vh', boxSizing: 'border-box' }}>
      <DeathRecords popup />
    </div>
  );
}

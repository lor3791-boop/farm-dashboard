// 폐사관리 — 폐사입력(입력 + 피그온 미등록 + 등록 목록) / 폐사현황(일자별)
import { useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { dongsOf } from '@/lib/calc/herd';
import { fmt, md } from '@/lib/calc/dates';
import { Tabs } from '@/components/v5';
import { todayKST } from '@/lib/util';
import { survOf } from '@/share/applyDeaths';
import { UnregisteredDeaths, DeathList } from './Deaths';
import { DeathDaily } from './DeathDaily';
import { useRef } from 'react';
import { shrinkImage } from '@/lib/image';

export function DeathPage() {
  const { s, set } = useHerd();
  return (
    <>
      <Tabs opts={[['input', '폐사입력'], ['status', '폐사현황']]} value={s.deathTab} onPick={(k) => set({ deathTab: k })} />
      {s.deathTab === 'input' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 16 }}>
            <DeathEntry />
            <UnregisteredDeaths />
          </div>
          <DeathList />
        </>
      )}
      {s.deathTab === 'status' && <DeathDaily />}
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
  const pref = useRef<HTMLInputElement>(null);
  const addPhotos = async (L: FileList) => {
    const room = 3 - photos.length; const out: string[] = [];
    try { for (const f of [...L].slice(0, room)) out.push(await shrinkImage(f, 220 * 1024, [[1280, 0.7], [1024, 0.6], [800, 0.55]])); setSaved(L.length > room ? '사진은 한 건에 3장까지 붙습니다' : ''); setSavedOk(true); }
    catch (e) { setSavedOk(false); setSaved((e as Error).message); }
    setPhotos([...photos, ...out]);
  };
  if (!all.length) return null;
  const pill = (on: boolean) => (on ? 'pill on' : 'pill');
  const dRows = all.filter((r) => r.farm === s.dFarm);
  const hasDong = dRows.some((r) => r.dong !== '—');
  const dongs = [...new Set(dRows.flatMap((r) => dongsOf(r.dong)))].sort();
  const cover = hasDong ? dRows.filter((r) => s.dDong !== null && dongsOf(r.dong).includes(s.dDong)) : dRows;
  const auto = hasDong && cover.length === 1;
  const chosen = auto ? cover[0].group : s.dGroup;
  const save = async () => {
    if (!chosen) { setSavedOk(false); setSaved('그룹을 먼저 골라야 저장됩니다'); return; }
    const before = cur;
    await repo!.addDeath({ date, farm: s.dFarm, dong: s.dDong ?? '', group: chosen, count: cnt, ...(photos.length ? { photos } : {}) }, email, ui.shareLinks[s.dFarm] ?? '');
    setPhotos([]);
    setSavedOk(true); setSaved(`저장됨: ${s.dFarm} ${chosen} ${cnt}두 · ${md(date)}` + (before && before.claimLeft > 0 ? ` (크레임 ${Math.min(cnt, before.claimLeft)}두 먼저 차감)` : ''));
    setCnt(1);
  };
  const cur = chosen ? dRows.find((r) => r.group === chosen) ?? null : null;
  const after = cur ? (() => { const c = Math.min(cnt, cur.claimLeft); const d = cur.death + cnt - c; return { c, d, stock: cur.stock - cnt, surv: survOf(cur.net, d) }; })() : null;
  return (
          <div className="card" style={{ maxWidth: 520 }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6 }}>
        {farms.map((f) => <button key={f} className={pill(s.dFarm === f)} onClick={() => { set({ dFarm: f, dDong: null, dGroup: null }); setCnt(1); setSaved(''); }}>{f}</button>)}
      </div>
      {hasDong && (
        <>
          <div style={{ fontWeight: 700, margin: '16px 0 8px' }}>② 동</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{dongs.map((x) => <button key={x} className={pill(s.dDong === x)} onClick={() => { set({ dDong: x, dGroup: null }); setSaved(''); }}>{x}동</button>)}</div>
        </>
      )}
      {(!hasDong || (!!s.dDong && cover.length > 1)) && (
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
        <button className="pill" onClick={() => { setCnt(Math.max(1, cnt - 1)); setSaved(''); }} aria-label="두수 줄이기">−</button>
        <span style={{ fontSize: 24, fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{cnt}</span>
        <button className="pill" onClick={() => { setCnt(cnt + 1); setSaved(''); }} aria-label="두수 늘리기">+</button>
        <label style={{ fontSize: 14, marginLeft: 8 }}>날짜 <input type="date" value={date} max={todayKST()} onChange={(e) => setDate(e.target.value || todayKST())} /></label>
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn pri" onClick={save}>저장</button>
        <button className="btn" onClick={() => { setSaved('한 사진에 여러 동: 이 동을 저장한 뒤 동을 바꿔 한 번 더 저장하세요'); setSavedOk(true); }}>+ 동 추가 (한 사진에 여러 동)</button>
      </div>
      {saved && <div style={{ marginTop: 12 }}><span className={savedOk ? 'chip ok' : 'chip bad'} style={{ whiteSpace: 'normal' }}>{saved}</span></div>}
    </div>
  );
}

// 새 창 — 미등록 폐사만 (피그온 옆에 화면 분할로 띄움)
export function UnregPopup() {
  return (
    <div className="v5" style={{ padding: '12px 12px 32px', minHeight: '100vh', boxSizing: 'border-box' }}>
      <UnregisteredDeaths popup />
    </div>
  );
}

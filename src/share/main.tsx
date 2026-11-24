// 농장 공유 사이트(농장 앱) — 대시보드와 따로 배포. 주소 끝 '#열쇠'로 그 농장 자료(share/{열쇠})만 읽는다.
// 로그인 없음. 읽기: 열쇠를 아는 문서 1개 + 그 아래 폐사 기록. 쓰기: 폐사 등록·수정(share/{열쇠}/deaths)만.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, addDoc, updateDoc, collection } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig';
import { ShareView, type ShareDeath, type ShareFix } from './ShareView';
import type { SharePayload } from './payload';
import '@/styles/index.css';

const db = getFirestore(initializeApp(firebaseConfig!));
// 폰에 앱으로 설치하면 주소 끝(#열쇠) 없이 열리므로, 링크로 처음 열 때 열쇠를 기억해 둔다
const hashKey = location.hash.replace(/^#\/?/, '').trim();
const okKey = (k: string) => /^[A-Za-z0-9]{12,40}$/.test(k);
const stored = (() => { try { return localStorage.getItem('farmKey') ?? ''; } catch { return ''; } })();
const key = okKey(hashKey) ? hashKey : stored;
if (okKey(hashKey)) { try { localStorage.setItem('farmKey', hashKey); } catch { /* 저장 안 되는 브라우저 */ } }
else if (okKey(stored)) history.replaceState(null, '', '#' + stored);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./farm-sw.js').catch(() => {});
const now = () => new Date().toISOString();

function App() {
  const [p, setP] = useState<SharePayload | null>(null);
  const [deaths, setDeaths] = useState<ShareDeath[]>([]);
  const [fixes, setFixes] = useState<ShareFix[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'none'>('loading');
  useEffect(() => {
    if (!/^[A-Za-z0-9]{12,40}$/.test(key)) { setState('none'); return; }
    // today는 올린 날이 아니라 지금 날짜(한국) — 대시보드를 며칠 안 열어도 날짜·일령이 맞게
    const u1 = onSnapshot(doc(db, 'share', key), (s) => { if (s.exists()) { setP({ ...(s.data() as SharePayload), today: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) }); setState('ok'); } else setState('none'); }, () => setState('none'));
    // 지운 것(removedAt)은 빼고 — 대시보드가 시트 줄까지 정리한 뒤 원본을 지운다
    const u2 = onSnapshot(collection(db, 'share', key, 'deaths'), (s) => setDeaths(s.docs.map((d) => ({ ...(d.data() as any), id: d.id })).filter((d) => !d.removedAt)), () => {});
    // 다른 곳(대시보드·폐사입력 앱)에서 입력한 폐사를 농장이 고친·지운 요청 — 대시보드가 반영하면 지워진다
    const u3 = onSnapshot(collection(db, 'share', key, 'fixes'), (s) => setFixes(s.docs.map((d) => ({ ...(d.data() as any), id: d.id }))), () => {});
    return () => { u1(); u2(); u3(); };
  }, []);
  if (state === 'loading') return <div className="v5 share" style={{ padding: 40, textAlign: 'center' }}>…</div>;
  if (state === 'none' || !p) return <div className="v5 share" style={{ padding: 40, textAlign: 'center', fontSize: 15 }}>링크가 맞지 않습니다 · लिङ्क मिलेन</div>;
  return (
    <ShareView p={p} deaths={deaths} fixes={fixes}
      onSaveDeath={async (d) => { await addDoc(collection(db, 'share', key, 'deaths'), { farm: p.farm, date: d.date, dong: d.dong, group: d.group, count: d.count, ...(d.photos?.length ? { photos: d.photos } : {}), src: 'share', checked: false, at: now() }); }}
      onEditDeath={async (id, d) => { await updateDoc(doc(db, 'share', key, 'deaths', id), { date: d.date, dong: d.dong, group: d.group, count: d.count, checked: false, editedAt: now() }); }}
      onDeleteDeath={async (id) => { await updateDoc(doc(db, 'share', key, 'deaths', id), { removedAt: now() }); }}
      onFixOther={async (o, d) => { await addDoc(collection(db, 'share', key, 'fixes'), { farm: p.farm, ref: o.ref ?? '', was: { date: o.date, dong: o.dong ?? '', group: o.group, count: o.count }, ...(d ? { date: d.date, dong: d.dong, group: d.group, count: d.count } : { date: o.date, dong: o.dong ?? '', group: o.group, count: o.count, remove: true }), at: now() }); }} />
  );
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

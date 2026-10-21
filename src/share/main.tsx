// 농장 공유 사이트(농장 앱) — 대시보드와 따로 배포. 주소 끝 '#열쇠'로 그 농장 자료(share/{열쇠})만 읽는다.
// 로그인 없음. 읽기: 열쇠를 아는 문서 1개 + 그 아래 폐사 기록. 쓰기: 폐사 등록·수정(share/{열쇠}/deaths)만.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, addDoc, updateDoc, collection } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig';
import { ShareView, type ShareDeath } from './ShareView';
import type { SharePayload } from './payload';
import '@/styles/index.css';

const db = getFirestore(initializeApp(firebaseConfig!));
const key = location.hash.replace(/^#\/?/, '').trim();
const now = () => new Date().toISOString();

function App() {
  const [p, setP] = useState<SharePayload | null>(null);
  const [deaths, setDeaths] = useState<ShareDeath[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'none'>('loading');
  useEffect(() => {
    if (!/^[A-Za-z0-9]{12,40}$/.test(key)) { setState('none'); return; }
    const u1 = onSnapshot(doc(db, 'share', key), (s) => { if (s.exists()) { setP(s.data() as SharePayload); setState('ok'); } else setState('none'); }, () => setState('none'));
    const u2 = onSnapshot(collection(db, 'share', key, 'deaths'), (s) => setDeaths(s.docs.map((d) => ({ ...(d.data() as any), id: d.id }))), () => {});
    return () => { u1(); u2(); };
  }, []);
  if (state === 'loading') return <div className="v5 share" style={{ padding: 40, textAlign: 'center' }}>…</div>;
  if (state === 'none' || !p) return <div className="v5 share" style={{ padding: 40, textAlign: 'center', fontSize: 15 }}>링크가 맞지 않습니다 · लिङ्क मिलेन</div>;
  return (
    <ShareView p={p} deaths={deaths}
      onSaveDeath={async (d) => { await addDoc(collection(db, 'share', key, 'deaths'), { farm: p.farm, date: d.date, dong: d.dong, group: d.group, count: d.count, src: 'share', checked: false, at: now() }); }}
      onEditDeath={async (id, d) => { await updateDoc(doc(db, 'share', key, 'deaths', id), { date: d.date, dong: d.dong, group: d.group, count: d.count, checked: false, editedAt: now() }); }} />
  );
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

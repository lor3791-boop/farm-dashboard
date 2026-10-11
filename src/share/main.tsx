// 농장 공유 사이트 — 대시보드와 따로 배포. 주소 끝 '#열쇠'로 그 농장 자료(share/{열쇠})만 읽는다.
// 로그인 없음. 읽기: 열쇠를 아는 문서 1개만. 쓰기: shareDeaths(폐사 등록)만.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig';
import { ShareView } from './ShareView';
import type { SharePayload } from './payload';
import '@/styles/index.css';

const db = getFirestore(initializeApp(firebaseConfig!));
const key = location.hash.replace(/^#\/?/, '').trim();

function App() {
  const [p, setP] = useState<SharePayload | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'none'>('loading');
  useEffect(() => {
    if (!/^[A-Za-z0-9]{12,40}$/.test(key)) { setState('none'); return; }
    return onSnapshot(doc(db, 'share', key), (s) => { if (s.exists()) { setP(s.data() as SharePayload); setState('ok'); } else setState('none'); }, () => setState('none'));
  }, []);
  if (state === 'loading') return <div className="v5 share" style={{ padding: 40, textAlign: 'center' }}>…</div>;
  if (state === 'none' || !p) return <div className="v5 share" style={{ padding: 40, textAlign: 'center', fontSize: 15 }}>링크가 맞지 않습니다 · लिङ्क मिलेन</div>;
  return <ShareView p={p} onSaveDeath={async (d) => { await addDoc(collection(db, 'shareDeaths'), { token: key, farm: p.farm, date: d.date, dong: d.dong, group: d.group, count: d.count, at: serverTimestamp() }); }} />;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

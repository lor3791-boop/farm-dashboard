// 맨 위로 — 조금 내려가면 + 버튼 위에 나타난다 (농장 공유 화면도 같이 씀)
import { useEffect, useState } from 'react';

export function ToTop({ low }: { low?: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const f = () => setShow(window.scrollY > 400); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  if (!show) return null;
  return (
    <button className={low ? 'totop low' : 'totop'} aria-label="맨 위로" title="맨 위로" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  );
}

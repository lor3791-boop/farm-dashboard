// 폰 화면(가로 640px 미만)인지 — 표를 카드로 바꾸는 등에 쓴다
import { useEffect, useState } from 'react';
const Q = '(max-width: 639px)';
export function useIsPhone() {
  const [p, setP] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(Q).matches);
  useEffect(() => { const m = matchMedia(Q); const f = () => setP(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return p;
}
export const thisMonth = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);

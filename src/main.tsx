import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/index.css';

// 새 버전 배포 직후, 휴대폰·브라우저에 남은 옛 화면이 지워진 파일을 찾으면 한 번만 새로고침해서 새 버전을 받는다
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  try {
    const k = 'farm-dashboard:reloadedAt', last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 30000) return;
    sessionStorage.setItem(k, String(Date.now()));
  } catch { /* 저장 불가 */ }
  location.reload();
});
// 끌어놓기 영역 밖에 파일을 떨어뜨려도 브라우저가 파일을 열지 않게
['dragover', 'drop'].forEach((t) => window.addEventListener(t, (e) => { if ((e as DragEvent).dataTransfer?.types.includes('Files')) e.preventDefault(); }));
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

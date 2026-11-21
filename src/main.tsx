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
// 폰 앱(홈 화면 설치): 앱을 다시 볼 때마다 새 버전 확인, 새 버전이 들어오면 바로 새로고침 (입력 창이 열려 있으면 닫힌 뒤)
if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_MOCK) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
      const chk = () => { reg.update().catch(() => undefined); };
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') chk(); });
      setInterval(chk, 15 * 60e3);
    }).catch(() => undefined);
  });
  let had = !!navigator.serviceWorker.controller;
  const reload = () => { if (document.querySelector('.sheet') || document.activeElement?.matches('input,textarea,select')) { setTimeout(reload, 5000); return; } location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) reload(); had = true; });
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

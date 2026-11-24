// 농장 공유 사이트를 폰에 앱으로 설치할 수 있게 하는 최소 서비스워커 — 저장(캐시)은 하지 않고 그대로 인터넷에서 받는다
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => { if (e.request.mode === 'navigate') e.respondWith(fetch(e.request)); });

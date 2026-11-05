// 폰 '공유' 받기 (manifest share_target) — 파일을 캐시에 넣고 대시보드 '#/share-in' 화면으로 보낸다
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'POST' || !url.pathname.endsWith('/share-target')) return;
  e.respondWith((async () => {
    try {
      const form = await e.request.formData();
      const cache = await caches.open('share-inbox');
      const stamp = Date.now(); let i = 0;
      for (const [, v] of form.entries()) {
        if (!v || typeof v !== 'object' || !v.size) continue;
        await cache.put(`./inbox/${stamp}-${i++}`, new Response(v, { headers: { 'Content-Type': v.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(v.name || '') } }));
      }
    } catch (err) { /* 받지 못하면 빈 화면으로 */ }
    return Response.redirect(new URL('./#/share-in', self.registration.scope).href, 303);
  })());
});

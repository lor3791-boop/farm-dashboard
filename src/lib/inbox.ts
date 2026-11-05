// 폰 '공유'로 받은 파일 — 서비스워커(public/share-sw.js)가 캐시 'share-inbox'에 넣어 두면 화면이 꺼내 쓴다.
// 사진 → 폐사 입력, 엑셀 → 출하(등판서·출하 자료) 올리기
export type InboxKind = 'image' | 'sheet';
const CACHE = 'share-inbox';
const isImg = (t: string, n: string) => t.startsWith('image/') || /\.(jpe?g|png|webp|hei[cf])$/i.test(n);
export async function peekInbox(): Promise<{ image: number; sheet: number }> {
  try {
    const c = await caches.open(CACHE); const ks = await c.keys(); let image = 0, sheet = 0;
    for (const k of ks) { const r = await c.match(k); const t = r?.headers.get('Content-Type') ?? '', n = decodeURIComponent(r?.headers.get('X-File-Name') ?? ''); if (isImg(t, n)) image++; else sheet++; }
    return { image, sheet };
  } catch { return { image: 0, sheet: 0 }; }
}
export async function takeInbox(kind: InboxKind): Promise<File[]> {
  try {
    const c = await caches.open(CACHE); const out: File[] = [];
    for (const k of await c.keys()) {
      const r = await c.match(k); if (!r) continue;
      const t = r.headers.get('Content-Type') ?? '', n = decodeURIComponent(r.headers.get('X-File-Name') ?? '') || 'shared';
      if (isImg(t, n) !== (kind === 'image')) continue;
      out.push(new File([await r.blob()], n, { type: t })); await c.delete(k);
    }
    return out;
  } catch { return []; }
}

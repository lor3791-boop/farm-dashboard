// 사진 줄이기 — 긴 변을 줄이고 JPEG로 바꿔 data URL로 돌려준다 (Firestore 문서 1MB 제한 때문)
export const readUrl = (f: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(f); });
// 아이폰 HEIC/HEIF — 대부분 브라우저(안드로이드·윈도 크롬)가 직접 못 열어서 heic2any로 JPEG로 바꾼 뒤 처리 (필요할 때만 불러옴)
export const isHeic = (f: File) => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
export const isImageFile = (f: File) => f.type.startsWith('image/') || isHeic(f);
const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('img')); i.src = src; });
async function heicToJpeg(f: Blob): Promise<Blob> {
  const { default: heic2any } = await import('heic2any');
  const r = await heic2any({ blob: f, toType: 'image/jpeg', quality: 0.9 });
  return Array.isArray(r) ? r[0] : r;
}
export async function shrinkImage(f: File, maxBytes = 700 * 1024, steps: [number, number][] = [[1600, 0.75], [1200, 0.65], [900, 0.6]]): Promise<string> {
  let img: HTMLImageElement | null = null;
  if (!isHeic(f)) img = await load(await readUrl(f)).catch(() => null);
  // HEIC거나, 확장자는 JPG인데 속은 HEIC라 못 여는 경우 → JPEG로 바꿔서 다시
  if (!img) img = await heicToJpeg(f).then(readUrl).then(load).catch(() => { throw new Error('사진을 열 수 없습니다: ' + f.name); });
  for (const [side, q] of steps) {
    const k = Math.min(1, side / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/jpeg', q);
    if (d.length * 0.75 < maxBytes) return d;
  }
  throw new Error('사진이 너무 큽니다');
}

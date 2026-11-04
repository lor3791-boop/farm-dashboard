// 사진 줄이기 — 긴 변을 줄이고 JPEG로 바꿔 data URL로 돌려준다 (Firestore 문서 1MB 제한 때문)
export const readUrl = (f: Blob) => new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(r.error); r.readAsDataURL(f); });
export async function shrinkImage(f: File, maxBytes = 700 * 1024, steps: [number, number][] = [[1600, 0.75], [1200, 0.65], [900, 0.6]]): Promise<string> {
  const url = await readUrl(f);
  const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('사진을 열 수 없습니다 (HEIC는 JPG로 바꿔 올려주세요)')); i.src = url; });
  for (const [side, q] of steps) {
    const k = Math.min(1, side / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const d = c.toDataURL('image/jpeg', q);
    if (d.length * 0.75 < maxBytes) return d;
  }
  throw new Error('사진이 너무 큽니다');
}

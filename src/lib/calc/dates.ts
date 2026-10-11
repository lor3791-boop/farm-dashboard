export const iso = (mmdd: string) => '2026-' + mmdd;
export const days = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
export const md = (s: string) => s.slice(5).replace('-', '/');
export const addIso = (d: string, n: number) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const r1 = (x: number) => Math.round(x * 10) / 10;
export const fmt = (n: number) => Number(n).toLocaleString('ko-KR');

// 폐사입력 서버(구글 Apps Script '폐사 입력 앱') 연동 — 폐사 기록의 원본은 '폐사 기록' 구글시트.
// 사진은 드라이브 폐사사진/<농장>/<날짜> 폴더, 카톡 알림(미등록·급증·주간)도 이 서버가 보낸다.
// 접속 키는 설정 › 폐사입력 앱 연결에서 넣고 config/ui(관리자만 읽기)에 보관한다.
import type { DeathRow, DeathRec, DeathPatch, Repo } from './repo';
import { editResetsCheck } from './repo';

export const PYESA_EXEC = 'https://script.google.com/macros/s/AKfycbwmyNqtik9FKDVG2TdNiJxkYDlmX7qIvXm_kcH0Tx_gNc8M56LAfNipZVMWjptc5x3KtQ/exec';
let KEY = '';
let farmNames: string[] = [];          // 시트(앱)의 농장 이름 — '아멘농장', '산성농원' 등
const subs = new Set<() => void>();
export const setPyesaKey = (k: string) => { KEY = k || ''; subs.forEach((f) => f()); };
export const pyesaOn = () => !!KEY;
export const onPyesaChange = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const changed = () => subs.forEach((f) => f());

const norm = (s: string) => String(s || '').replace(/\s+/g, '').replace(/(농장|농원)$/, '');
export const toDash = (sheetFarm: string, farms: string[]) => farms.find((f) => norm(f) === norm(sheetFarm)) ?? sheetFarm;
const toSheet = (farm: string) => farmNames.find((f) => norm(f) === norm(farm)) ?? farm;

async function get(params: Record<string, string>) {
  const r = await fetch(PYESA_EXEC + '?' + new URLSearchParams({ key: KEY, ...params }));
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || '폐사입력 서버 오류');
  return j;
}
async function post(body: Record<string, unknown>) {
  const r = await fetch(PYESA_EXEC, { method: 'POST', body: JSON.stringify({ key: KEY, ...body }) });
  const t = await r.text();
  let j: any; try { j = JSON.parse(t); } catch { throw new Error('폐사입력 서버 응답 오류 (HTTP ' + r.status + ')'); }
  if (!j.ok) throw new Error(j.error || '폐사입력 서버 오류');
  return j;
}

export interface SheetRow { row: number; date: string; farm: string; dong: string; count: number; group: string; done: boolean; heat: boolean; photos: number; photoUrls?: string[] }
export async function loadSheet(days: number, farms: string[]): Promise<DeathRow[]> {
  if (!KEY) return [];
  if (!farmNames.length) { try { farmNames = (await get({ action: 'farms' })).farms ?? []; } catch { /* 이름 맞춤 생략 */ } }
  const j = await get({ action: 'list', days: String(days) });
  return (j.rows as SheetRow[]).map((r) => ({
    id: 'sheet:' + r.row, path: 'sheet:' + r.row, sheetRow: r.row, sheetFarm: r.farm,
    date: r.date, farm: toDash(r.farm, farms), dong: r.dong, group: r.group, count: r.count,
    src: 'app' as const, checked: r.done, key: '', at: r.date + 'T' + String(r.row).padStart(6, '0'), heat: r.heat, photoUrls: r.photoUrls ?? []
  }));
}

// 사진(data URL) → 서버가 받는 {mime, data}
const toPayload = (u: string) => { const m = u.match(/^data:([^;]+);base64,(.*)$/); return m ? { mime: m[1], data: m[2] } : null; };
async function hash(s: string) { const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); return [...d.slice(0, 8)].map((x) => x.toString(16).padStart(2, '0')).join(''); }

export async function saveToSheet(d: DeathRec & { heat?: boolean }, force = false) {
  const photos = (d.photos ?? []).map(toPayload).filter(Boolean) as { mime: string; data: string }[];
  const ph = await Promise.all(photos.map((p) => hash(p.data)));
  const j = await post({ farm: toSheet(d.farm), date: d.date, rows: [{ dong: d.dong, group: d.group, count: d.count, heat: !!d.heat }], photos, ph, ...(force ? { force: true } : {}) });
  changed();
  return j as { total: number; photos: number; spike: boolean };
}

const isSheet = (r: DeathRow) => r.path.startsWith('sheet:');
// 대시보드 저장소에 시트 연동을 얹는다: 시트 행은 시트로, 나머지는 원래대로
export function withPyesa(repo: Repo): Repo {
  const orig = { add: repo.addDeath, upd: repo.updateDeath, rm: repo.removeDeath };
  return Object.assign(repo, {
    addDeath: async (d: DeathRec, by: string, key?: string) => { if (KEY) { await saveToSheet(d); return; } return orig.add(d, by, key); },
    updateDeath: async (row: DeathRow, p: DeathPatch, by: string) => {
      if (!isSheet(row)) return orig.upd(row, p, by);
      const n = Number(row.sheetRow);
      if (!editResetsCheck(p)) { await post({ action: 'mark', rows: [n], done: !!p.checked }); changed(); return; }
      await post({ action: 'edit', row: n, was: { date: row.date, farm: row.sheetFarm, count: row.count },
        date: p.date ?? row.date, dong: p.dong ?? row.dong, group: p.group ?? row.group, count: p.count ?? row.count });
      changed();
    },
    removeDeath: async (row: DeathRow) => {
      if (!isSheet(row)) return orig.rm(row);
      await post({ action: 'delete', row: Number(row.sheetRow), was: { date: row.date, farm: row.sheetFarm, count: row.count } });
      changed();
    }
  });
}

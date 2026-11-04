// 출하 자료 올리기 — 피그온 출하 엑셀(그룹명 있음, 등급은 비율) / 팀 대시보드 출하기록 엑셀(그룹 없음, 지급율 있음)
// 같은 날·농장·두수·생체중이면 한 건으로 합친다: 그룹은 피그온, 지급율·등급 두수는 팀 대시보드 값.
import { normDate } from './gradeSheet';
export interface ImpRow { date: string; farm: string; group: string; dest: string; n: number; live: number; carc: number; pay: number | null; g1p: number; g1: number; g2: number; out: number; src: 'pigon' | 'team'; age?: number }
export interface ShipImport { file: string; kind: 'pigon' | 'team'; at?: string; rows: ImpRow[] }

const S = (v: unknown) => (v === null || v === undefined ? '' : String(v)).replace(/\s+/g, ' ').trim();
const num = (v: unknown) => { const n = Number(S(v).replace(/[,%두kg원\s]/gi, '')); return Number.isFinite(n) ? n : NaN; };
const find = (r: string[], re: RegExp) => r.findIndex((c) => re.test(c));
// '명임-명임-2026-007' → { name: '명임', group: '26-7' }
export function splitPigonGroup(v: string) {
  const parts = v.split('-'); const m = v.match(/(20)?(\d{2})-0*(\d{1,3})\s*$/);
  return { names: [...new Set(parts.slice(0, Math.max(1, parts.length - 2)))], group: m ? `${m[2]}-${Number(m[3])}` : '' };
}
// 비율(%) → 두수, 합이 두수를 넘지 않게
function pctToHeads(n: number, pcts: number[]) {
  const h = pcts.map((p) => Math.round((n * (p || 0)) / 100));
  let diff = h.reduce((a, x) => a + x, 0) - n;
  while (diff > 0) { const i = h.indexOf(Math.max(...h)); h[i]--; diff--; }
  return h;
}

export function parseShipImport(aoa: unknown[][], resolveFarm: (name: string) => string): { kind: 'pigon' | 'team'; rows: ImpRow[]; skipped: string[] } {
  const grid = aoa.map((r) => (r ?? []).map(S));
  const skipped = new Set<string>();
  for (let h = 0; h < Math.min(grid.length, 30); h++) {
    const r = grid[h];
    // 피그온
    if (find(r, /^그룹명$/) >= 0 && find(r, /출하두수/) >= 0) {
      const c = (re: RegExp) => find(r, re);
      const cG = c(/^그룹명$/), cD = c(/^출하일$/), cDest = c(/거래처/), cN = c(/출하두수/), cL = c(/^출하체중/), cC = c(/^지육체중/), cA = c(/출하일령/);
      const cP = [c(/^1\+등급비율/), c(/^1등급비율/), c(/^2등급비율/), c(/^등외비율/)];
      const rows: ImpRow[] = [];
      grid.slice(h + 1).forEach((x) => {
        const n = num(x[cN]); if (!(n > 0)) return;
        const { names, group } = splitPigonGroup(x[cG]);
        const farm = names.map(resolveFarm).find((f) => f) ?? '';
        if (!farm) { skipped.add(names[0] || x[cG]); return; }
        const [a, b, cc, d] = pctToHeads(n, cP.map((i) => num(x[i])));
        rows.push({ date: normDate(x[cD]), farm, group, dest: x[cDest], n, live: num(x[cL]), carc: num(x[cC]), pay: null, g1p: a, g1: b, g2: cc, out: d, src: 'pigon', ...(cA >= 0 && num(x[cA]) > 0 ? { age: num(x[cA]) } : {}) });
      });
      return { kind: 'pigon', rows, skipped: [...skipped] };
    }
    // 팀 대시보드
    if (find(r, /^농가명$/) >= 0 && find(r, /^두수$/) >= 0 && find(r, /총생체중/) >= 0) {
      const c = (re: RegExp) => find(r, re);
      const cD = c(/^출하일$/), cF = c(/^농가명$/), cDest = c(/^거래처$/), cN = c(/^두수$/), cL = c(/총생체중/), cPay = c(/지급율/), cY = c(/지육율/);
      const cG = [c(/^1\+$/), c(/^1$/), c(/^2$/), c(/^등외$/)];
      const rows: ImpRow[] = [];
      grid.slice(h + 1).forEach((x) => {
        const n = num(x[cN]); if (!(n > 0)) return;
        const farm = resolveFarm(x[cF]); if (!farm) { skipped.add(x[cF]); return; }
        const live = num(x[cL]), y = num(x[cY]), pay = num(x[cPay]);
        rows.push({ date: normDate(x[cD]), farm, group: '', dest: x[cDest], n, live, carc: y > 0 ? Math.round(live * y * 10) / 1000 : NaN, pay: pay > 0 ? pay : null, g1p: num(x[cG[0]]) || 0, g1: num(x[cG[1]]) || 0, g2: num(x[cG[2]]) || 0, out: num(x[cG[3]]) || 0, src: 'team' });
      });
      return { kind: 'team', rows, skipped: [...skipped] };
    }
  }
  throw new Error('피그온 출하 또는 팀 대시보드 출하기록 양식이 아닙니다');
}

// 여러 파일을 합친다.
// 같은 종류(피그온/팀) 안에서는 같은 날·농장·두수·생체중이면 나중 파일 값.
// 같은 날·농장에 피그온 자료가 있으면 그룹별 피그온 행을 쓰고, 지급율은 그날 팀 대시보드 행의 지육 가중평균을 넣는다.
// 피그온이 없는 날·농장은 팀 대시보드 행(그룹 없음)을 그대로 쓴다.
export function mergeImports(ups: ShipImport[]): ImpRow[] {
  const by: Record<'pigon' | 'team', ImpRow[]> = { pigon: [], team: [] };
  [...ups].sort((a, b) => ((a.at ?? '') < (b.at ?? '') ? -1 : 1)).forEach((u) => u.rows.forEach((r) => {
    const L = by[r.src]; const i = L.findIndex((o) => o.date === r.date && o.farm === r.farm && o.group === r.group && o.n === r.n && Math.abs(o.live - r.live) <= 2);
    if (i >= 0) L[i] = { ...r }; else L.push({ ...r });
  }));
  const key = (r: ImpRow) => r.date + '|' + r.farm;
  const pigKeys = new Set(by.pigon.map(key));
  const out = by.pigon.map((r) => {
    const T = by.team.filter((t) => key(t) === key(r) && t.pay != null && t.carc > 0);
    const c = T.reduce((a, t) => a + t.carc, 0);
    return c ? { ...r, pay: Math.round((T.reduce((a, t) => a + t.pay! * t.carc, 0) / c) * 10) / 10 } : r;
  });
  return out.concat(by.team.filter((t) => !pigKeys.has(key(t)))).filter((r) => r.date && r.live > 0);
}

// 파일에 적힌 농장 이름 → 대시보드 농장 이름 (이름 맞춤표 → 농장 이름 포함 여부 순)
// 저장된 이름 맞춤표에 없는 기본 항목(정성조→정축산, 예성·희망2 담당 아님 등)은 초기값에서 보충한다.
import type { NameMapRow } from '@/data/types';
import { SEED_NAMEMAP } from '@/data/seed';
const strip = (x: string) => x.replace(/\(.*\)/, '').trim();
export function makeResolver(farms: string[], nameMap: NameMapRow[] = []) {
  const map = nameMap.concat(SEED_NAMEMAP.filter((d) => !nameMap.some((x) => x.source === d.source)));
  const hit = (n: string) => map.find((x) => x.source === n || strip(x.source) === strip(n));
  const fn = (raw: string) => {
    const n = (raw ?? '').trim(); if (!n) return '';
    if (farms.includes(n)) return n;
    const m = hit(n);
    if (m) return m.excluded || !farms.includes(m.target) ? '' : m.target;
    return farms.find((f) => n.includes(f)) ?? '';
  };
  // 담당 아님으로 정해 둔 이름이면 true (알림에 띄우지 않음)
  fn.excluded = (raw: string) => { const n = (raw ?? '').trim(); return !n || n === '-' || !!hit(n)?.excluded; };
  return fn;
}

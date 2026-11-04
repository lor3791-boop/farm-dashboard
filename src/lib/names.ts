// 파일에 적힌 농장 이름 → 대시보드 농장 이름 (이름 맞춤표 → 농장 이름 포함 여부 순)
import type { NameMapRow } from '@/data/types';
export function makeResolver(farms: string[], nameMap: NameMapRow[] = []) {
  return (raw: string) => {
    const n = (raw ?? '').trim(); if (!n) return '';
    if (farms.includes(n)) return n;
    const m = nameMap.find((x) => x.source === n || x.source.replace(/\(.*\)/, '').trim() === n.replace(/\(.*\)/, '').trim());
    if (m) return m.excluded || !farms.includes(m.target) ? '' : m.target;
    return farms.find((f) => n.includes(f)) ?? '';
  };
}

// 그룹명 옆 구제역·구충 표시 — ✓ 완료 / 날짜 = 예정 / 빨강 = 예정일 지났는데 체크 안 됨
import type { Vax } from '@/lib/vax';

const S = { done: { bg: '#E3EFE7', fg: '#1F4E3D' }, plan: { bg: '#EFECE4', fg: '#5F5A50' }, late: { bg: '#F7DCD2', fg: '#9A3216' } };
export function VaxTags({ v, labels = ['구제역', '구충'], onToggle }: { v?: Vax; labels?: [string, string]; onToggle?: (k: 'fmd' | 'dew') => void }) {
  if (!v) return null;
  const tag = (x: Vax['fmd'], l: string, k: 'fmd' | 'dew') => {
    const c = S[x.st];
    const txt = x.st === 'done' ? l + ' ✓' : l + ' ' + (x.d ? Number(x.d.slice(5, 7)) + '/' + Number(x.d.slice(8)) : '—');
    const act = onToggle ? { role: 'button', tabIndex: 0, 'aria-pressed': x.st === 'done', onClick: (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); onToggle(k); }, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onToggle(k); } } } : {};
    return <span {...act} title={(x.st === 'done' ? l + ' 완료' : x.st === 'late' ? l + ' 예정일 지남 · 미완료' : l + ' 예정') + (onToggle ? (x.st === 'done' ? ' (누르면 완료 취소)' : ' (누르면 완료)') : '')} style={{ cursor: onToggle ? 'pointer' : undefined, display: 'inline-block', fontSize: 11, fontWeight: 600, lineHeight: '16px', padding: '0 5px', borderRadius: 4, background: c.bg, color: c.fg, marginLeft: 4, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{txt}</span>;
  };
  return <>{tag(v.fmd, labels[0], 'fmd')}{tag(v.dew, labels[1], 'dew')}</>;
}

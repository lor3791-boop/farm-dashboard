import type { ReactNode } from 'react';
import { cn } from '@/lib/util';
const tone = { ok: 'bg-ok-bg text-ok-fg', warn: 'bg-warn-bg text-warn-fg', bad: 'bg-bad-bg text-bad-fg', info: 'bg-info-bg text-info-fg', muted: 'bg-[#EEEAE1] text-muted' };
export const Badge = ({ t = 'muted', children, className }: { t?: keyof typeof tone; children: ReactNode; className?: string }) => (
  <span className={cn('inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-bold', tone[t], className)}>{children}</span>
);

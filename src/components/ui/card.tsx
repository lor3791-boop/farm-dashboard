import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/util';
export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-xl border border-line bg-white p-4 sm:px-5 sm:py-[18px]', className)} {...p} />
);
export const CardTitle = ({ children, right, className }: { children: ReactNode; right?: ReactNode; className?: string }) => (
  <div className={cn('mb-3 flex flex-wrap items-center justify-between gap-2', className)}>
    <h2 className="text-[17px] font-bold">{children}</h2>
    {right}
  </div>
);

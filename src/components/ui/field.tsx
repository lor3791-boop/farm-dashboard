import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/util';
const base = 'h-10 w-full rounded-lg border border-[#B9B3A6] bg-white px-2.5 text-ink placeholder:text-[#8F978F]';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, r) => <input ref={r} className={cn(base, className)} {...p} />);
Input.displayName = 'Input';
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(base, 'pr-8', className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn(base, 'h-auto min-h-[72px] py-2', className)} {...p} />;
export const Field = ({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) => (
  <label className={cn('flex flex-col gap-1', className)}>
    <span className="text-[13px] font-medium text-[#4C5A54]">{label}</span>
    {children}
    {hint && <span className="text-[12px] text-muted">{hint}</span>}
  </label>
);
export const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-md px-1.5 text-[14px] hover:bg-[#EEF3EF]">
    <input type="checkbox" className="h-[18px] w-[18px] accent-brand" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

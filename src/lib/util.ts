import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...v: ClassValue[]) => twMerge(clsx(v));
export const nowIso = () => new Date().toISOString();
export const uid = () => Math.random().toString(36).slice(2, 10);
export const fmt = (n: number | null | undefined, digits = 0) =>
  n == null || Number.isNaN(n) ? '—' : n.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const todayKST = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

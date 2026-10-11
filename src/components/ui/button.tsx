import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/util';

const button = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white border-brand hover:bg-brand-ink',
        outline: 'bg-white text-brand border-brand hover:bg-brand-50',
        ghost: 'bg-white text-ink border-[#CFC9BC] hover:bg-bg',
        danger: 'bg-white text-bad-fg border-[#E3B4A3] hover:bg-bad-bg',
        link: 'border-transparent bg-transparent text-brand underline underline-offset-4 px-0'
      },
      size: { md: 'h-10 px-3.5 text-[14px]', sm: 'h-[34px] px-2.5 text-[13px]', icon: 'h-10 w-10' }
    },
    defaultVariants: { variant: 'outline', size: 'md' }
  }
);
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = 'button', ...p }, ref) => (
  <button ref={ref} type={type} className={cn(button({ variant, size }), className)} {...p} />
));
Button.displayName = 'Button';

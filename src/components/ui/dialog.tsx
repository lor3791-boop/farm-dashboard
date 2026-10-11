import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Dialog({ open, onOpenChange, title, children, footer, wide }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-[rgba(20,30,25,.35)]" />
        <D.Content className={`fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-24px)] ${wide ? 'max-w-[760px]' : 'max-w-[520px]'} -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-line bg-white shadow-xl`}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <D.Title className="text-[17px] font-bold">{title}</D.Title>
            <D.Close className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-bg" aria-label="닫기"><X size={18} /></D.Close>
          </div>
          <D.Description className="sr-only">{title}</D.Description>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

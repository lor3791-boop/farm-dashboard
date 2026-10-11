import * as T from '@radix-ui/react-tabs';
import { cn } from '@/lib/util';
export const Tabs = T.Root;
export const TabsContent = T.Content;
export const TabsList = ({ className, ...p }: T.TabsListProps) => (
  <T.List className={cn('mb-4 flex gap-5 overflow-x-auto border-b border-line', className)} {...p} />
);
export const TabsTrigger = ({ className, ...p }: T.TabsTriggerProps) => (
  <T.Trigger
    className={cn('min-h-[44px] whitespace-nowrap border-b-[3px] border-transparent px-1 text-[15px] text-muted data-[state=active]:border-brand data-[state=active]:font-bold data-[state=active]:text-brand', className)}
    {...p}
  />
);

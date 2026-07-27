import { DetachedSheet } from '@client/components/silk/detached-sheet';
import { cn } from '@client/lib/utils';
import type { ReactNode } from 'react';

export type ActionSheetItem = {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

type ActionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  items: ActionSheetItem[];
};

export function ActionSheet({ open, onOpenChange, title, description, items }: ActionSheetProps) {
  return (
    <DetachedSheet.Root presented={open} onPresentedChange={onOpenChange}>
      <DetachedSheet.Portal>
        <DetachedSheet.View>
          <DetachedSheet.Backdrop />
          <DetachedSheet.Content>
            <DetachedSheet.Handle />
            <div className='px-5 pt-2 pb-1 md:pt-5'>
              {title ? (
                <DetachedSheet.Title className='font-heading text-base font-semibold tracking-tight'>
                  {title}
                </DetachedSheet.Title>
              ) : (
                <DetachedSheet.Title className='sr-only'>Actions</DetachedSheet.Title>
              )}
              {description ? (
                <DetachedSheet.Description className='mt-1 text-sm text-muted-foreground'>
                  {description}
                </DetachedSheet.Description>
              ) : null}
            </div>
            <ul className='flex flex-col gap-1 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-4'>
              {items.map((item) => (
                <li key={item.key}>
                  <button
                    type='button'
                    disabled={item.disabled}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-[transform,background-color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)]',
                      'active:scale-[0.985] disabled:opacity-50',
                      item.destructive
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'text-foreground hover:bg-muted/80'
                    )}
                    onClick={() => {
                      item.onSelect();
                      onOpenChange(false);
                    }}
                  >
                    {item.icon ? (
                      <span
                        className={cn(
                          'inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
                          item.destructive ? 'bg-destructive/10' : 'bg-muted'
                        )}
                      >
                        {item.icon}
                      </span>
                    ) : null}
                    <span className='min-w-0 flex-1'>
                      <span className='block text-sm font-medium'>{item.label}</span>
                      {item.description ? (
                        <span className='mt-0.5 block text-xs text-muted-foreground'>{item.description}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </DetachedSheet.Content>
        </DetachedSheet.View>
      </DetachedSheet.Portal>
    </DetachedSheet.Root>
  );
}

import type { ReactNode } from 'react';
import { buttonVariants } from '@client/components/ui/button';
import { DetachedSheet } from '@client/components/silk/detached-sheet';
import { cn } from '@client/lib/utils';
import { XIcon } from 'lucide-react';

type ResponsiveOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ResponsiveOverlayProps) {
  return (
    <DetachedSheet.Root presented={open} onPresentedChange={onOpenChange}>
      <DetachedSheet.Portal>
        <DetachedSheet.View>
          <DetachedSheet.Backdrop />
          <DetachedSheet.Content className={className}>
            <DetachedSheet.Handle />
            <div className='flex items-start justify-between gap-3 px-5 pt-3 pb-2 md:pt-5'>
              <div className='min-w-0 space-y-1'>
                <DetachedSheet.Title className='font-heading text-lg font-semibold tracking-tight'>
                  {title}
                </DetachedSheet.Title>
                {description ? (
                  <DetachedSheet.Description className='text-sm text-muted-foreground'>
                    {description}
                  </DetachedSheet.Description>
                ) : null}
              </div>
              <DetachedSheet.Trigger
                action='dismiss'
                className={cn(
                  'hidden size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground md:inline-flex',
                  'transition-[transform,background-color,color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)]',
                  'hover:bg-muted hover:text-foreground active:scale-[0.96]'
                )}
                aria-label='Close'
              >
                <XIcon className='size-4' />
              </DetachedSheet.Trigger>
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3'>{children}</div>
            {footer ? (
              <div className='sticky bottom-0 flex flex-col gap-2 border-t border-border/70 bg-popover/95 px-5 py-4 backdrop-blur supports-[backdrop-filter]:bg-popover/80'>
                {footer}
                <DetachedSheet.Trigger
                  action='dismiss'
                  className={cn(buttonVariants({ variant: 'outline' }), 'w-full md:hidden')}
                >
                  Close
                </DetachedSheet.Trigger>
              </div>
            ) : null}
          </DetachedSheet.Content>
        </DetachedSheet.View>
      </DetachedSheet.Portal>
    </DetachedSheet.Root>
  );
}

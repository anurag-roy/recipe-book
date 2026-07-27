import { Button, buttonVariants } from '@client/components/ui/button';
import { DetachedSheet } from '@client/components/silk/detached-sheet';
import { cn } from '@client/lib/utils';
import type { ReactNode } from 'react';

type ConfirmSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  onConfirm: () => void;
  children?: ReactNode;
};

export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isLoading = false,
  loadingText = 'Working…',
  onConfirm,
  children,
}: ConfirmSheetProps) {
  return (
    <DetachedSheet.Root presented={open} onPresentedChange={onOpenChange}>
      <DetachedSheet.Portal>
        <DetachedSheet.View>
          <DetachedSheet.Backdrop />
          <DetachedSheet.Content>
            <DetachedSheet.Handle />
            <div className='space-y-3 px-5 pt-2 md:pt-5'>
              <DetachedSheet.Title className='font-heading text-lg font-semibold tracking-tight'>
                {title}
              </DetachedSheet.Title>
              {description ? (
                <DetachedSheet.Description className='text-sm text-muted-foreground'>
                  {description}
                </DetachedSheet.Description>
              ) : null}
              {children}
            </div>
            <div className='mt-4 flex flex-col gap-2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex-row-reverse md:justify-start md:pb-5'>
              <Button
                type='button'
                variant={destructive ? 'destructive' : 'default'}
                className='w-full md:w-auto'
                isLoading={isLoading}
                loadingText={loadingText}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
              <DetachedSheet.Trigger
                action='dismiss'
                disabled={isLoading}
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full md:w-auto')}
              >
                {cancelLabel}
              </DetachedSheet.Trigger>
            </div>
          </DetachedSheet.Content>
        </DetachedSheet.View>
      </DetachedSheet.Portal>
    </DetachedSheet.Root>
  );
}

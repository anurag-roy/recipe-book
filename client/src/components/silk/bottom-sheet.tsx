import { Sheet } from '@silk-hq/components';
import { cn } from '@client/lib/utils';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import './bottom-sheet.css';

type SheetRootProps = ComponentPropsWithoutRef<typeof Sheet.Root>;

const BottomSheetRoot = forwardRef<ElementRef<typeof Sheet.Root>, Omit<SheetRootProps, 'license'> & { license?: SheetRootProps['license'] }>(
  ({ children, className, ...restProps }, ref) => (
    <Sheet.Root license='non-commercial' className={cn(className)} {...restProps} ref={ref}>
      {children}
    </Sheet.Root>
  )
);
BottomSheetRoot.displayName = 'BottomSheet.Root';

const BottomSheetView = forwardRef<ElementRef<typeof Sheet.View>, ComponentPropsWithoutRef<typeof Sheet.View>>(
  ({ children, className, ...restProps }, ref) => (
    <Sheet.View
      className={cn('BottomSheet-view', className)}
      nativeEdgeSwipePrevention
      {...restProps}
      ref={ref}
    >
      {children}
    </Sheet.View>
  )
);
BottomSheetView.displayName = 'BottomSheet.View';

const BottomSheetBackdrop = forwardRef<ElementRef<typeof Sheet.Backdrop>, ComponentPropsWithoutRef<typeof Sheet.Backdrop>>(
  ({ className, ...restProps }, ref) => (
    <Sheet.Backdrop
      className={cn('BottomSheet-backdrop', className)}
      themeColorDimming='auto'
      travelAnimation={{ opacity: ({ progress }) => Math.min(progress * 0.35, 0.35) }}
      {...restProps}
      ref={ref}
    />
  )
);
BottomSheetBackdrop.displayName = 'BottomSheet.Backdrop';

const BottomSheetContent = forwardRef<ElementRef<typeof Sheet.Content>, ComponentPropsWithoutRef<typeof Sheet.Content>>(
  ({ children, className, ...restProps }, ref) => (
    <Sheet.Content className={cn('BottomSheet-content', className)} {...restProps} ref={ref}>
      <Sheet.BleedingBackground className='BottomSheet-bleedingBackground' />
      {children}
    </Sheet.Content>
  )
);
BottomSheetContent.displayName = 'BottomSheet.Content';

const BottomSheetHandle = forwardRef<ElementRef<typeof Sheet.Handle>, ComponentPropsWithoutRef<typeof Sheet.Handle>>(
  ({ className, ...restProps }, ref) => (
    <Sheet.Handle className={cn('BottomSheet-handle', className)} action='dismiss' {...restProps} ref={ref} />
  )
);
BottomSheetHandle.displayName = 'BottomSheet.Handle';

export const BottomSheet = {
  Root: BottomSheetRoot,
  Portal: Sheet.Portal,
  View: BottomSheetView,
  Backdrop: BottomSheetBackdrop,
  Content: BottomSheetContent,
  Trigger: Sheet.Trigger,
  Handle: BottomSheetHandle,
  Outlet: Sheet.Outlet,
  Title: Sheet.Title,
  Description: Sheet.Description,
};

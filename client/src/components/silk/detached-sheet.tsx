import { Sheet, useClientMediaQuery, type SheetViewProps } from '@silk-hq/components';
import { cn } from '@client/lib/utils';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import './detached-sheet.css';

type SheetRootProps = ComponentPropsWithoutRef<typeof Sheet.Root>;

const DetachedSheetRoot = forwardRef<
  ElementRef<typeof Sheet.Root>,
  Omit<SheetRootProps, 'license'> & { license?: SheetRootProps['license'] }
>(({ children, className, ...restProps }, ref) => (
  <Sheet.Root license='non-commercial' className={cn(className)} {...restProps} ref={ref}>
    {children}
  </Sheet.Root>
));
DetachedSheetRoot.displayName = 'DetachedSheet.Root';

const DetachedSheetView = forwardRef<ElementRef<typeof Sheet.View>, ComponentPropsWithoutRef<typeof Sheet.View>>(
  ({ children, className, ...restProps }, ref) => {
    const largeViewport = useClientMediaQuery('(min-width: 768px)');
    const contentPlacement = largeViewport ? 'center' : 'bottom';
    const tracks: SheetViewProps['tracks'] = largeViewport ? ['top', 'bottom'] : 'bottom';

    return (
      <Sheet.View
        className={cn('DetachedSheet-view', `contentPlacement-${contentPlacement}`, className)}
        contentPlacement={contentPlacement}
        tracks={tracks}
        nativeEdgeSwipePrevention
        {...restProps}
        ref={ref}
      >
        {children}
      </Sheet.View>
    );
  }
);
DetachedSheetView.displayName = 'DetachedSheet.View';

const DetachedSheetBackdrop = forwardRef<
  ElementRef<typeof Sheet.Backdrop>,
  ComponentPropsWithoutRef<typeof Sheet.Backdrop>
>(({ className, ...restProps }, ref) => (
  <Sheet.Backdrop
    className={cn('DetachedSheet-backdrop', className)}
    themeColorDimming='auto'
    travelAnimation={{
      opacity: ({ progress }) => Math.min(progress * 0.4, 0.4),
    }}
    {...restProps}
    ref={ref}
  />
));
DetachedSheetBackdrop.displayName = 'DetachedSheet.Backdrop';

const DetachedSheetContent = forwardRef<
  ElementRef<typeof Sheet.Content>,
  ComponentPropsWithoutRef<typeof Sheet.Content>
>(({ children, className, ...restProps }, ref) => (
  <Sheet.Content className={cn('DetachedSheet-content', className)} {...restProps} ref={ref}>
    <div className='DetachedSheet-innerContent'>{children}</div>
  </Sheet.Content>
));
DetachedSheetContent.displayName = 'DetachedSheet.Content';

const DetachedSheetHandle = forwardRef<
  ElementRef<typeof Sheet.Handle>,
  ComponentPropsWithoutRef<typeof Sheet.Handle>
>(({ className, ...restProps }, ref) => (
  <Sheet.Handle className={cn('DetachedSheet-handle', className)} action='dismiss' {...restProps} ref={ref} />
));
DetachedSheetHandle.displayName = 'DetachedSheet.Handle';

export const DetachedSheet = {
  Root: DetachedSheetRoot,
  Portal: Sheet.Portal,
  View: DetachedSheetView,
  Backdrop: DetachedSheetBackdrop,
  Content: DetachedSheetContent,
  Trigger: Sheet.Trigger,
  Handle: DetachedSheetHandle,
  Outlet: Sheet.Outlet,
  Title: Sheet.Title,
  Description: Sheet.Description,
};

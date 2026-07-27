import { Sheet } from '@silk-hq/components';
import { cn } from '@client/lib/utils';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import './page-sheet.css';

type SheetRootProps = ComponentPropsWithoutRef<typeof Sheet.Root>;

const PageSheetRoot = forwardRef<
  ElementRef<typeof Sheet.Root>,
  Omit<SheetRootProps, 'license'> & { license?: SheetRootProps['license'] }
>(({ children, className, ...restProps }, ref) => (
  <Sheet.Root license='non-commercial' className={cn(className)} {...restProps} ref={ref}>
    {children}
  </Sheet.Root>
));
PageSheetRoot.displayName = 'PageSheet.Root';

const PageSheetView = forwardRef<ElementRef<typeof Sheet.View>, ComponentPropsWithoutRef<typeof Sheet.View>>(
  ({ children, className, ...restProps }, ref) => (
    <Sheet.View
      className={cn('PageSheet-view', className)}
      contentPlacement='bottom'
      swipe={false}
      nativeEdgeSwipePrevention
      {...restProps}
      ref={ref}
    >
      {children}
    </Sheet.View>
  )
);
PageSheetView.displayName = 'PageSheet.View';

const PageSheetBackdrop = forwardRef<
  ElementRef<typeof Sheet.Backdrop>,
  ComponentPropsWithoutRef<typeof Sheet.Backdrop>
>(({ className, ...restProps }, ref) => (
  <Sheet.Backdrop
    className={cn('PageSheet-backdrop', className)}
    travelAnimation={{ opacity: [0, 0.15] }}
    themeColorDimming='auto'
    {...restProps}
    ref={ref}
  />
));
PageSheetBackdrop.displayName = 'PageSheet.Backdrop';

const PageSheetContent = forwardRef<
  ElementRef<typeof Sheet.Content>,
  ComponentPropsWithoutRef<typeof Sheet.Content>
>(({ children, className, ...restProps }, ref) => (
  <Sheet.Content className={cn('PageSheet-content', className)} {...restProps} ref={ref}>
    {children}
  </Sheet.Content>
));
PageSheetContent.displayName = 'PageSheet.Content';

export const PageSheet = {
  Root: PageSheetRoot,
  Portal: Sheet.Portal,
  View: PageSheetView,
  Backdrop: PageSheetBackdrop,
  Content: PageSheetContent,
  Trigger: Sheet.Trigger,
  Handle: Sheet.Handle,
  Outlet: Sheet.Outlet,
  Title: Sheet.Title,
  Description: Sheet.Description,
};

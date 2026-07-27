import type { QueryClient } from '@tanstack/react-query';
import { Toaster } from '@client/components/ui/sonner';
import { TooltipProvider } from '@client/components/ui/tooltip';
import { useTheme } from '@client/hooks/use-theme';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import '../index.css';

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const { theme } = useTheme();
  return (
    <TooltipProvider>
      <Outlet />
      <Toaster richColors theme={theme} />
    </TooltipProvider>
  );
}

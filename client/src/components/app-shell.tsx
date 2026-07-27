import type { ReactNode } from 'react';
import { Button } from '@client/components/ui/button';
import { useTheme } from '@client/hooks/use-theme';
import { cn } from '@client/lib/utils';
import { Link, useRouterState } from '@tanstack/react-router';
import { BookOpenIcon, MoonIcon, PlusIcon, SettingsIcon, SunIcon } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Recipes', icon: BookOpenIcon },
  { to: '/imports', label: 'Imports', icon: PlusIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
] as const;

export function AppShell({ children, title, actions }: { children: ReactNode; title?: string; actions?: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className='min-h-svh bg-background text-foreground'>
      <header className='sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur'>
        <div className='mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3'>
          <div className='flex items-center gap-3'>
            <Link to='/' className='flex items-center gap-2 font-semibold tracking-tight'>
              <span className='inline-flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
                <BookOpenIcon className='size-4' />
              </span>
              <span className='hidden sm:inline'>Food Journal</span>
            </Link>
            {title ? <span className='text-sm text-muted-foreground'>{title}</span> : null}
          </div>
          <div className='flex items-center gap-2'>
            {actions}
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              aria-label='Toggle theme'
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <SunIcon className='size-4' /> : <MoonIcon className='size-4' />}
            </Button>
          </div>
        </div>
      </header>

      <main className='mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-8'>{children}</main>

      <nav className='fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden'>
        <ul className='mx-auto grid max-w-lg grid-cols-3 gap-1 px-2 py-2'>
          {navItems.map((item) => {
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className='size-4' />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <aside className='fixed top-20 right-4 hidden w-44 flex-col gap-1 md:flex'>
        {navItems.map((item) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className='size-4' />
              {item.label}
            </Link>
          );
        })}
      </aside>
    </div>
  );
}

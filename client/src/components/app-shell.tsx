import type { ReactNode } from 'react';
import { Button } from '@client/components/ui/button';
import { useTheme } from '@client/hooks/use-theme';
import { cn } from '@client/lib/utils';
import { Link, useRouterState } from '@tanstack/react-router';
import { BookOpenIcon, MoonIcon, PlusIcon, SettingsIcon, SunIcon } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Recipes', icon: BookOpenIcon, match: (pathname: string) => pathname === '/' || pathname.startsWith('/recipes') },
  { to: '/imports', label: 'Imports', icon: PlusIcon, match: (pathname: string) => pathname.startsWith('/imports') },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, match: (pathname: string) => pathname.startsWith('/settings') },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  actions,
  back,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className='app-shell relative min-h-dvh text-foreground'>
      <div aria-hidden className='app-shell-atmosphere pointer-events-none absolute inset-0' />

      <div className='relative mx-auto flex min-h-dvh w-full max-w-6xl md:gap-8 md:px-6 lg:px-8'>
        <aside className='sticky top-0 hidden h-dvh w-56 shrink-0 flex-col py-6 md:flex lg:w-60'>
          <Link to='/' className='group mb-8 flex items-center gap-3 px-2'>
            <span className='inline-flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] group-active:scale-[0.96]'>
              <BookOpenIcon className='size-5' />
            </span>
            <span className='min-w-0'>
              <span className='block font-heading text-base font-semibold tracking-tight'>Food Journal</span>
              <span className='block text-xs text-muted-foreground'>Cook · Order · Shop</span>
            </span>
          </Link>

          <nav className='flex flex-1 flex-col gap-1'>
            {navItems.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-[transform,background-color,color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)]',
                    'active:scale-[0.985]',
                    active
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  <Icon className='size-4' />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Button
            type='button'
            variant='ghost'
            className='mt-auto justify-start'
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <SunIcon className='size-4' /> : <MoonIcon className='size-4' />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </Button>
        </aside>

        <div className='flex min-w-0 flex-1 flex-col'>
          <header className='sticky top-0 z-40 border-b border-border/70 bg-background px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 shadow-sm shadow-black/[0.04] md:px-0 md:pt-5 md:pb-3'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 flex-1'>
                {!back ? (
                  <div className='mb-1 flex items-center gap-2 md:hidden'>
                    <Link
                      to='/'
                      className='inline-flex items-center gap-2 font-heading text-sm font-semibold tracking-tight'
                    >
                      <span className='inline-flex size-7 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
                        <BookOpenIcon className='size-3.5' />
                      </span>
                      Food Journal
                    </Link>
                  </div>
                ) : null}
                <div className='flex items-center gap-2'>
                  {back}
                  <div className='min-w-0'>
                    {title ? (
                      <h1 className='truncate font-heading text-xl font-semibold tracking-tight md:text-2xl'>
                        {title}
                      </h1>
                    ) : null}
                    {subtitle ? <p className='mt-0.5 truncate text-sm text-muted-foreground'>{subtitle}</p> : null}
                  </div>
                </div>
              </div>
              <div className='flex shrink-0 items-center gap-1.5'>
                {actions}
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  className='md:hidden'
                  aria-label='Toggle theme'
                  tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <SunIcon className='size-4' /> : <MoonIcon className='size-4' />}
                </Button>
              </div>
            </div>
          </header>

          <main className='flex-1 px-4 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-0 md:pt-2 md:pb-10'>
            <div className='animate-page-enter'>{children}</div>
          </main>
        </div>
      </div>

      <nav className='fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden'>
        <ul className='mx-auto grid max-w-md grid-cols-3 gap-1 rounded-2xl border border-border/70 bg-background/90 p-1.5 shadow-lg shadow-black/5 backdrop-blur-xl'>
          {navItems.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-[transform,background-color,color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)]',
                    'active:scale-[0.96]',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
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
    </div>
  );
}

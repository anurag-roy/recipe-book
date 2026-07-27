import { cn } from '@client/lib/utils';

/** Swiggy S-pin brand mark (simplified for in-app use). */
export function SwiggyLogo({ className, title = 'Swiggy' }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox='0 0 64 80'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={cn('size-5 shrink-0', className)}
      role='img'
      aria-label={title}
    >
      <title>{title}</title>
      <path
        d='M32 2C17.088 2 5 14.088 5 29c0 16.5 18.2 35.4 24.6 42.1a3.4 3.4 0 0 0 4.8 0C40.8 64.4 59 45.5 59 29 59 14.088 46.912 2 32 2Z'
        fill='#FC8019'
      />
      <path
        d='M22.5 27.2c0-5.4 4.2-9.2 10.2-9.2 4.7 0 8.1 2.2 9.4 5.7l-5.1 2.1c-.7-1.7-2.3-2.8-4.4-2.8-2.7 0-4.5 1.7-4.5 4.1 0 2.2 1.5 3.5 5.1 4.7 5.1 1.7 8.4 4.3 8.4 9.1 0 5.7-4.5 9.7-10.8 9.7-5.4 0-9.4-2.6-10.7-6.7l5.2-2.1c.8 2.1 2.8 3.5 5.5 3.5 2.9 0 4.9-1.7 4.9-4.2 0-2.3-1.5-3.6-5.4-4.9-5-1.7-8.1-4.4-8.1-9Z'
        fill='white'
      />
    </svg>
  );
}

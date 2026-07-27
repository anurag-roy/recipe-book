import { AppShell } from '@client/components/app-shell';
import { Button } from '@client/components/ui/button';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';

export function NotFound() {
  return (
    <AppShell title='Not found' subtitle='This page does not exist'>
      <section className='mx-auto flex max-w-md flex-col items-center rounded-[1.75rem] bg-card px-6 py-14 text-center shadow-sm ring-1 ring-foreground/5'>
        <p className='font-heading text-5xl font-semibold tracking-tight text-primary'>404</p>
        <h2 className='mt-3 font-heading text-lg font-semibold tracking-tight'>Page missing</h2>
        <p className='mt-2 text-sm text-muted-foreground'>It may have been moved, renamed, or never existed.</p>
        <Button render={<Link to='/' />} className='mt-6'>
          <ArrowLeftIcon />
          Back to recipes
        </Button>
      </section>
    </AppShell>
  );
}

import { cn } from '@client/lib/utils';
import { LoaderIcon } from 'lucide-react';

interface DisplayLoadingProps {
  className?: string;
  message?: string;
}

export function DisplayLoading({ message, className }: DisplayLoadingProps) {
  return (
    <div className={cn('grid min-h-[50dvh] place-content-center place-items-center px-4 text-muted-foreground', className)}>
      <div className='flex items-center gap-2 rounded-full bg-card/80 px-4 py-2.5 shadow-sm ring-1 ring-foreground/5'>
        <LoaderIcon className='size-4 animate-spin' />
        <p className='text-sm'>{message || 'Loading…'}</p>
      </div>
    </div>
  );
}

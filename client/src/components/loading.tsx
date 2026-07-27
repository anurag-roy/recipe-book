import { cn } from '@client/lib/utils';
import { LoaderIcon } from 'lucide-react';

interface DisplayLoadingProps {
  className?: string;
  message?: string;
}

export function DisplayLoading({ message, className }: DisplayLoadingProps) {
  return (
    <div className={cn('grid h-full place-content-center place-items-center text-muted-foreground', className)}>
      <div className='flex items-center gap-2'>
        <LoaderIcon className='size-4 animate-spin' />
        <p>{message || 'Loading...'}</p>
      </div>
    </div>
  );
}

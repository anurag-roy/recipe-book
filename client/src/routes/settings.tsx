import { AppShell } from '@client/components/app-shell';
import { ConfirmSheet } from '@client/components/confirm-sheet';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import {
  disconnectSwiggy,
  setPreferredAddress,
  startSwiggyConnect,
  swiggyAddressesQueryOptions,
  swiggyStatusQueryOptions,
} from '@client/lib/swiggy';
import { cn } from '@client/lib/utils';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { CheckIcon, MapPinIcon, UnplugIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/settings')({
  loader: ({ context }) => context.queryClient.ensureQueryData(swiggyStatusQueryOptions),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: status } = useSuspenseQuery(swiggyStatusQueryOptions);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const addressesQuery = useQuery({
    ...swiggyAddressesQueryOptions,
    enabled: status.connected,
  });

  const connectMutation = useMutation({
    mutationFn: startSwiggyConnect,
    onSuccess: (result) => {
      window.location.href = result.authorizeUrl;
    },
    onError: (error) => toast.error(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectSwiggy,
    onSuccess: async () => {
      setDisconnectOpen(false);
      toast.success('Disconnected Swiggy');
      await queryClient.invalidateQueries({ queryKey: ['swiggy'] });
    },
    onError: (error) => toast.error(error.message),
  });

  const preferredMutation = useMutation({
    mutationFn: setPreferredAddress,
    onSuccess: async () => {
      toast.success('Preferred address saved');
      await queryClient.invalidateQueries({ queryKey: ['swiggy'] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <AppShell title='Settings' subtitle='Swiggy connection and delivery defaults'>
      <div className='mx-auto flex max-w-2xl flex-col gap-4'>
        <section className='rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h2 className='font-heading text-base font-semibold tracking-tight'>Swiggy connection</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Localhost-only OAuth. Access tokens last about five days and stay in local SQLite.
              </p>
            </div>
            <Badge variant={status.connected ? 'default' : 'secondary'}>
              {status.connected ? 'Connected' : 'Offline'}
            </Badge>
          </div>

          <div className='mt-4 space-y-3'>
            <p className='text-sm'>
              {status.connected ? 'Connected' : 'Not connected'}
              {status.expiresAt ? (
                <span className='text-muted-foreground'> · expires {new Date(status.expiresAt).toLocaleString()}</span>
              ) : null}
            </p>
            <p className='rounded-2xl bg-muted/55 p-3.5 text-sm leading-relaxed text-muted-foreground'>
              {status.privacyDisclosure}
            </p>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <Button
                type='button'
                className='w-full sm:w-auto'
                onClick={() => connectMutation.mutate()}
                isLoading={connectMutation.isPending}
                loadingText='Connecting…'
              >
                {status.connected ? 'Reconnect Swiggy' : 'Connect Swiggy'}
              </Button>
              {status.connected ? (
                <Button
                  type='button'
                  variant='outline'
                  className='w-full sm:w-auto'
                  onClick={() => setDisconnectOpen(true)}
                >
                  <UnplugIcon />
                  Disconnect
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {status.connected ? (
          <section className='rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-5'>
            <div className='mb-4'>
              <h2 className='font-heading text-base font-semibold tracking-tight'>Preferred delivery address</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Remembered locally and confirmed before every Food or Instamart flow.
              </p>
            </div>
            <div className='space-y-2'>
              {addressesQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading addresses…</p> : null}
              {addressesQuery.error ? <p className='text-sm text-destructive'>{addressesQuery.error.message}</p> : null}
              {(addressesQuery.data ?? []).map((address) => {
                const selected = status.preferredAddress?.addressId === address.addressId;
                return (
                  <button
                    key={address.addressId}
                    type='button'
                    className={cn(
                      'flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-[transform,background-color,border-color] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)]',
                      'active:scale-[0.99]',
                      selected
                        ? 'border-primary bg-accent text-accent-foreground'
                        : 'border-border hover:bg-muted/70'
                    )}
                    onClick={() => preferredMutation.mutate(address)}
                  >
                    <span
                      className={cn(
                        'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl',
                        selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {selected ? <CheckIcon className='size-4' /> : <MapPinIcon className='size-4' />}
                    </span>
                    <span className='min-w-0'>
                      <span className='block font-medium'>{address.label ?? 'Address'}</span>
                      <span className='mt-0.5 block text-sm text-muted-foreground'>
                        {address.displayAddress ?? address.addressId}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <ConfirmSheet
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title='Disconnect Swiggy?'
        description='Food and Instamart cart sync will stop until you reconnect.'
        confirmLabel='Disconnect'
        destructive
        isLoading={disconnectMutation.isPending}
        loadingText='Disconnecting…'
        onConfirm={() => disconnectMutation.mutate()}
      />
    </AppShell>
  );
}

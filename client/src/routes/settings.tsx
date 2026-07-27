import { AppShell } from '@client/components/app-shell';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import {
  disconnectSwiggy,
  setPreferredAddress,
  startSwiggyConnect,
  swiggyAddressesQueryOptions,
  swiggyStatusQueryOptions,
} from '@client/lib/swiggy';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

export const Route = createFileRoute('/settings')({
  loader: ({ context }) => context.queryClient.ensureQueryData(swiggyStatusQueryOptions),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: status } = useSuspenseQuery(swiggyStatusQueryOptions);
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
    <AppShell title='Settings'>
      <div className='mx-auto flex max-w-2xl flex-col gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>Swiggy connection</CardTitle>
            <CardDescription>
              Localhost-only OAuth. Access tokens last about five days and are stored in the local SQLite database.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <p className='text-sm'>
              Status: <span className='font-medium'>{status.connected ? 'Connected' : 'Not connected'}</span>
              {status.expiresAt ? (
                <span className='text-muted-foreground'> · expires {new Date(status.expiresAt).toLocaleString()}</span>
              ) : null}
            </p>
            <p className='rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground'>{status.privacyDisclosure}</p>
            <div className='flex flex-wrap gap-2'>
              <Button type='button' onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
                {status.connected ? 'Reconnect Swiggy' : 'Connect Swiggy'}
              </Button>
              {status.connected ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {status.connected ? (
          <Card>
            <CardHeader>
              <CardTitle>Preferred delivery address</CardTitle>
              <CardDescription>Remembered locally and confirmed before every Food or Instamart flow.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {addressesQuery.isLoading ? <p className='text-sm text-muted-foreground'>Loading addresses…</p> : null}
              {addressesQuery.error ? <p className='text-sm text-destructive'>{addressesQuery.error.message}</p> : null}
              {(addressesQuery.data ?? []).map((address) => {
                const selected = status.preferredAddress?.addressId === address.addressId;
                return (
                  <button
                    key={address.addressId}
                    type='button'
                    className={`w-full rounded-xl border px-3 py-3 text-left ${
                      selected ? 'border-primary bg-accent text-accent-foreground' : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => preferredMutation.mutate(address)}
                  >
                    <div className='font-medium'>{address.label ?? 'Address'}</div>
                    <div className='text-sm text-muted-foreground'>{address.displayAddress ?? address.addressId}</div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

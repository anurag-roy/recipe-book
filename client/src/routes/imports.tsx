import { AppShell } from '@client/components/app-shell';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Input } from '@client/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import { Textarea } from '@client/components/ui/textarea';
import { createTextImport, createUrlImport, importsQueryOptions, retryImport } from '@client/lib/imports';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const TERMINAL_SUCCESS = new Set(['completed', 'duplicate']);

export const Route = createFileRoute('/imports')({
  loader: ({ context }) => context.queryClient.ensureQueryData(importsQueryOptions),
  component: ImportsPage,
});

function ImportsPage() {
  const queryClient = useQueryClient();
  const { data: jobs } = useSuspenseQuery(importsQueryOptions);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const currentJobs = useMemo(() => jobs.filter((job) => !TERMINAL_SUCCESS.has(job.status)), [jobs]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['imports'] });
    await queryClient.invalidateQueries({ queryKey: ['recipes'] });
  };

  const urlMutation = useMutation({
    mutationFn: createUrlImport,
    onSuccess: async () => {
      setUrl('');
      toast.success('Import started');
      await invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const textMutation = useMutation({
    mutationFn: createTextImport,
    onSuccess: async () => {
      setText('');
      toast.success('Import started');
      await invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const retryMutation = useMutation({
    mutationFn: retryImport,
    onSuccess: async () => {
      toast.success('Retry queued');
      await invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <AppShell title='Imports'>
      <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Import a recipe</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue='url'>
              <TabsList>
                <TabsTrigger value='url'>Blog URL</TabsTrigger>
                <TabsTrigger value='text'>Pasted text</TabsTrigger>
              </TabsList>
              <TabsContent value='url' className='space-y-3'>
                <Input
                  placeholder='https://example.com/recipe'
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
                <Button
                  type='button'
                  disabled={!url.trim() || urlMutation.isPending}
                  onClick={() => urlMutation.mutate(url.trim())}
                >
                  Import URL
                </Button>
                <p className='text-sm text-muted-foreground'>
                  Public server-rendered HTML only. Login walls, paywalls, and JS-only pages are rejected.
                </p>
              </TabsContent>
              <TabsContent value='text' className='space-y-3'>
                <Textarea
                  rows={10}
                  placeholder='Paste the full recipe text…'
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
                <Button
                  type='button'
                  disabled={text.trim().length < 20 || textMutation.isPending}
                  onClick={() => textMutation.mutate(text.trim())}
                >
                  Import text
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current job</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {currentJobs.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No import in progress.</p>
            ) : (
              currentJobs.map((job) => (
                <div key={job.id} className='rounded-xl border border-border p-3'>
                  <div className='mb-2 flex items-center justify-between gap-2'>
                    <Badge variant='secondary'>{job.status}</Badge>
                    <span className='text-xs text-muted-foreground'>{job.sourceType}</span>
                  </div>
                  <p className='truncate text-sm'>{job.sourceUrl ?? 'Pasted text'}</p>
                  {job.stageMessage ? <p className='mt-1 text-xs text-muted-foreground'>{job.stageMessage}</p> : null}
                  {job.error ? <p className='mt-1 text-xs text-destructive'>{job.error}</p> : null}
                  {job.status === 'failed' ? (
                    <div className='mt-2'>
                      <Button size='sm' onClick={() => retryMutation.mutate(job.id)} disabled={retryMutation.isPending}>
                        Retry
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

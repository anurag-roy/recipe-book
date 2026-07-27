import { AppShell } from '@client/components/app-shell';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import { Textarea } from '@client/components/ui/textarea';
import { createTextImport, createUrlImport, importsQueryOptions, retryImport } from '@client/lib/imports';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { LinkIcon, RefreshCwIcon, TextIcon } from 'lucide-react';
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
    <AppShell title='Imports' subtitle='Turn a blog post or paste into a recipe'>
      <div className='grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:gap-6'>
        <section className='rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-5'>
          <div className='mb-4'>
            <h2 className='font-heading text-base font-semibold tracking-tight'>Import a recipe</h2>
            <p className='mt-1 text-sm text-muted-foreground'>Public HTML pages or pasted recipe text.</p>
          </div>
          <Tabs defaultValue='url'>
            <TabsList className='mb-4 grid w-full grid-cols-2'>
              <TabsTrigger value='url'>
                <LinkIcon className='size-3.5' />
                Blog URL
              </TabsTrigger>
              <TabsTrigger value='text'>
                <TextIcon className='size-3.5' />
                Pasted text
              </TabsTrigger>
            </TabsList>
            <TabsContent value='url' className='space-y-3'>
              <Input
                placeholder='https://example.com/recipe'
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className='h-11 rounded-2xl'
                inputMode='url'
                autoCapitalize='none'
                autoCorrect='off'
              />
              <Button
                type='button'
                className='w-full sm:w-auto'
                disabled={!url.trim()}
                isLoading={urlMutation.isPending}
                loadingText='Importing…'
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
                className='min-h-40 rounded-2xl'
              />
              <Button
                type='button'
                className='w-full sm:w-auto'
                disabled={text.trim().length < 20}
                isLoading={textMutation.isPending}
                loadingText='Importing…'
                onClick={() => textMutation.mutate(text.trim())}
              >
                Import text
              </Button>
            </TabsContent>
          </Tabs>
        </section>

        <section className='rounded-[1.75rem] bg-card p-4 shadow-sm ring-1 ring-foreground/5 sm:p-5'>
          <div className='mb-4 flex items-center justify-between gap-2'>
            <h2 className='font-heading text-base font-semibold tracking-tight'>Current jobs</h2>
            <Badge variant='secondary'>{currentJobs.length}</Badge>
          </div>
          {currentJobs.length === 0 ? (
            <div className='rounded-2xl bg-muted/45 px-4 py-8 text-center'>
              <p className='text-sm text-muted-foreground'>No import in progress.</p>
            </div>
          ) : (
            <ul className='space-y-3'>
              {currentJobs.map((job) => (
                <li key={job.id} className='rounded-2xl border border-border/80 bg-background/60 p-3.5'>
                  <div className='mb-2 flex items-center justify-between gap-2'>
                    <Badge variant={job.status === 'failed' ? 'destructive' : 'secondary'}>{job.status}</Badge>
                    <span className='text-xs text-muted-foreground'>{job.sourceType}</span>
                  </div>
                  <p className='truncate text-sm font-medium'>{job.sourceUrl ?? 'Pasted text'}</p>
                  {job.stageMessage ? <p className='mt-1 text-xs text-muted-foreground'>{job.stageMessage}</p> : null}
                  {job.error ? <p className='mt-1 text-xs text-destructive'>{job.error}</p> : null}
                  {job.status === 'failed' ? (
                    <Button
                      size='sm'
                      className='mt-3'
                      onClick={() => retryMutation.mutate(job.id)}
                      isLoading={retryMutation.isPending && retryMutation.variables === job.id}
                      loadingText='Retrying…'
                    >
                      <RefreshCwIcon />
                      Retry
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

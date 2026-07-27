import type { ImportJob } from '@shared/types';
import { api } from '@client/lib/api';
import { queryOptions } from '@tanstack/react-query';

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const importsQueryOptions = queryOptions({
  queryKey: ['imports'],
  queryFn: async () => {
    const response = await api.imports.$get();
    return parseJson<ImportJob[]>(response);
  },
  refetchInterval: (query) => {
    const jobs = query.state.data;
    if (!jobs) {
      return false;
    }
    const active = jobs.some((job) =>
      ['queued', 'fetching', 'extracting', 'structuring', 'copying_image'].includes(job.status)
    );
    return active ? 500 : false;
  },
});

export async function createUrlImport(sourceUrl: string) {
  const response = await api.imports.$post({
    json: { sourceType: 'url', sourceUrl },
  });
  return parseJson<ImportJob>(response);
}

export async function createTextImport(sourceText: string) {
  const response = await api.imports.$post({
    json: { sourceType: 'text', sourceText },
  });
  return parseJson<ImportJob>(response);
}

export async function retryImport(id: number) {
  const response = await api.imports[':id'].retry.$post({ param: { id: String(id) } });
  return parseJson<ImportJob>(response);
}

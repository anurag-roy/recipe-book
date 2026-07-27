import { api } from '@client/lib/api';
import type { SwiggyConnectionStatus } from '@shared/types';
import { queryOptions } from '@tanstack/react-query';

export type AppStatus = {
  swiggy: SwiggyConnectionStatus;
  privacyDisclosure: string;
  demoMode: boolean;
  demoImportUrl: string | null;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const appStatusQueryOptions = queryOptions({
  queryKey: ['settings', 'status'],
  queryFn: async () => {
    const response = await api.settings.status.$get();
    const data = await parseJson<Partial<AppStatus> & { swiggy: SwiggyConnectionStatus; privacyDisclosure: string }>(
      response
    );
    return {
      swiggy: data.swiggy,
      privacyDisclosure: data.privacyDisclosure,
      demoMode: Boolean(data.demoMode),
      demoImportUrl: data.demoImportUrl ?? null,
    } satisfies AppStatus;
  },
});

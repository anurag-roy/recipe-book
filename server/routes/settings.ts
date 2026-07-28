import { DEMO_IMPORT_URL, isDemoMode } from '@server/demo';
import { getConnectionStatus, privacyDisclosure } from '@server/services/swiggy/oauth';
import { Hono } from 'hono';

export const settingsRoute = new Hono().get('/status', async (c) => {
  const swiggy = await getConnectionStatus();
  return c.json({
    swiggy,
    privacyDisclosure,
    demoMode: isDemoMode(),
    demoImportUrl: isDemoMode() ? DEMO_IMPORT_URL : null,
  });
});

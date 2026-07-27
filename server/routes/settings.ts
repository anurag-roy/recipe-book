import { getConnectionStatus, privacyDisclosure } from '@server/services/swiggy/oauth';
import { Hono } from 'hono';

export const settingsRoute = new Hono().get('/status', async (c) => {
  const swiggy = await getConnectionStatus();
  return c.json({ swiggy, privacyDisclosure });
});

import { routeValidator } from '@server/lib/middlewares/validator';
import { ensureAddressSelected, listAddresses, setPreferredAddress } from '@server/services/swiggy/addresses';
import {
  completeAuthorization,
  disconnect,
  getConnectionStatus,
  startAuthorization,
} from '@server/services/swiggy/oauth';
import { preferredAddressSchema } from '@shared/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

const callbackSchema = z.object({ code: z.string().min(1), state: z.string().min(1), error: z.string().optional() });

function failure(error: unknown): never {
  throw new HTTPException(400, {
    message: error instanceof Error ? error.message : 'Swiggy request failed',
    cause: error,
  });
}

export const swiggyRoute = new Hono()
  .post('/connect', async (c) => {
    try {
      return c.json(await startAuthorization());
    } catch (error) {
      return failure(error);
    }
  })
  .get('/callback', routeValidator('query', callbackSchema), async (c) => {
    const input = c.req.valid('query');
    if (input.error) {
      throw new HTTPException(400, { message: `Swiggy authorization failed: ${input.error}` });
    }
    try {
      await completeAuthorization(input.code, input.state);
      return c.redirect('/settings?swiggy=connected');
    } catch (error) {
      return failure(error);
    }
  })
  .get('/status', async (c) => c.json(await getConnectionStatus()))
  .get('/addresses', async (c) => {
    try {
      return c.json(await listAddresses(c.req.query('server') === 'im' ? 'im' : 'food'));
    } catch (error) {
      return failure(error);
    }
  })
  .put('/addresses/preferred', routeValidator('json', preferredAddressSchema), async (c) => {
    try {
      const value = c.req.valid('json');
      const address = await ensureAddressSelected(value.addressId);
      return c.json(
        await setPreferredAddress({
          ...address,
          label: value.label ?? address.label,
          displayAddress: value.displayAddress ?? address.displayAddress,
        })
      );
    } catch (error) {
      return failure(error);
    }
  })
  .post('/disconnect', async (c) => {
    await disconnect();
    return c.json({ connected: false });
  });

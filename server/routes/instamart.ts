import { routeValidator } from '@server/lib/middlewares/validator';
import {
  confirmInstamartCartReview,
  generateBasket,
  getIngredientBasket,
  prepareInstamartCartReview,
  updateBasketLine,
} from '@server/services/swiggy/instamart';
import { confirmCartReviewSchema, generateBasketSchema, updateBasketLineSchema } from '@shared/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

function recipeId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new HTTPException(400, { message: 'Invalid recipe id' });
  return id;
}
async function handle<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new HTTPException(400, {
      message: error instanceof Error ? error.message : 'Instamart request failed',
      cause: error,
    });
  }
}

export const instamartRoute = new Hono()
  .post('/basket', routeValidator('json', generateBasketSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => generateBasket(recipeId(c.req.param('id') ?? ''), input)));
  })
  .get('/basket', async (c) => c.json(await handle(() => getIngredientBasket(recipeId(c.req.param('id') ?? '')))))
  .patch('/basket/lines', routeValidator('json', updateBasketLineSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => updateBasketLine(recipeId(c.req.param('id') ?? ''), input.ingredientKey, input)));
  })
  .post('/review', async (c) =>
    c.json(await handle(() => prepareInstamartCartReview(recipeId(c.req.param('id') ?? ''))))
  )
  .post('/confirm', routeValidator('json', confirmCartReviewSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => confirmInstamartCartReview(input.reviewId, input.payloadHash)));
  });

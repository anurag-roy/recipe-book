import { routeValidator } from '@server/lib/middlewares/validator';
import {
  confirmFoodCartReview,
  generateDishOffers,
  getFoodProposal,
  prepareFoodCartReview,
  selectOffer,
} from '@server/services/swiggy/food';
import { confirmCartReviewSchema, generateFoodOffersSchema, selectFoodOfferSchema } from '@shared/schemas';
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
      message: error instanceof Error ? error.message : 'Food request failed',
      cause: error,
    });
  }
}

export const foodRoute = new Hono()
  .post('/offers', routeValidator('json', generateFoodOffersSchema), async (c) =>
    c.json(await handle(() => generateDishOffers(recipeId(c.req.param('id') ?? ''), c.req.valid('json').addressId)))
  )
  .get('/proposal', async (c) => c.json(await handle(() => getFoodProposal(recipeId(c.req.param('id') ?? '')))))
  .post('/select', routeValidator('json', selectFoodOfferSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(
      await handle(() => selectOffer(recipeId(c.req.param('id') ?? ''), input.offerId, input.customization))
    );
  })
  .post('/review', async (c) => c.json(await handle(() => prepareFoodCartReview(recipeId(c.req.param('id') ?? '')))))
  .post('/confirm', routeValidator('json', confirmCartReviewSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => confirmFoodCartReview(input.reviewId, input.payloadHash)));
  });

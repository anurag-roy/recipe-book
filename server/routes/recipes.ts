import { routeValidator } from '@server/lib/middlewares/validator';
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  toggleFavorite,
  updateRecipe,
} from '@server/services/recipes/repository';
import {
  confirmFoodCartReview,
  generateDishOffers,
  getFoodProposal,
  prepareFoodCartReview,
  selectOffer,
} from '@server/services/swiggy/food';
import {
  confirmInstamartCartReview,
  generateBasket,
  getIngredientBasket,
  prepareInstamartCartReview,
  updateBasketLine,
} from '@server/services/swiggy/instamart';
import {
  confirmCartReviewSchema,
  generateBasketSchema,
  generateFoodOffersSchema,
  recipeListQuerySchema,
  recipeUpdateSchema,
  recipeWriteSchema,
  selectFoodOfferSchema,
  updateBasketLineSchema,
} from '@shared/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

function parseId(value: string): number {
  const id = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HTTPException(400, { message: 'Invalid recipe id' });
  }
  return id;
}

function toWriteIngredients(ingredients: ReturnType<typeof recipeWriteSchema.parse>['ingredients']) {
  return ingredients.map((ingredient) => ({
    originalText: ingredient.originalText,
    name: ingredient.name,
    amount: ingredient.quantity?.amount ?? null,
    amountMax: ingredient.quantity?.amountMax ?? null,
    unit: ingredient.quantity?.unit ?? null,
    qualitative: ingredient.quantity?.qualitative ?? null,
    preparation: ingredient.preparation ?? null,
    optional: ingredient.optional,
    pantryDefault: ingredient.pantryDefault,
    group: ingredient.group ?? null,
  }));
}

async function handle<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new HTTPException(400, {
      message: error instanceof Error ? error.message : 'Request failed',
      cause: error,
    });
  }
}

export const recipesRoute = new Hono()
  .get('/', routeValidator('query', recipeListQuerySchema), async (c) => {
    const query = c.req.valid('query');
    return c.json(await listRecipes(query));
  })
  .post('/', routeValidator('json', recipeWriteSchema), async (c) => {
    const body = c.req.valid('json');
    const recipe = await createRecipe({
      title: body.title,
      description: body.description,
      yieldText: body.yieldText,
      servings: body.servings,
      prepTimeMinutes: body.prepTimeMinutes,
      cookTimeMinutes: body.cookTimeMinutes,
      totalTimeMinutes: body.totalTimeMinutes,
      cuisine: body.cuisine,
      dishName: body.dishName,
      searchAliases: body.searchAliases,
      tags: body.tags,
      notes: body.notes,
      ingredients: toWriteIngredients(body.ingredients),
      instructions: body.instructions,
    });
    return c.json(recipe, 201);
  })
  .get('/:id', async (c) => {
    const recipe = await getRecipe(parseId(c.req.param('id')));
    if (!recipe) {
      throw new HTTPException(404, { message: 'Recipe not found' });
    }
    return c.json(recipe);
  })
  .patch('/:id', routeValidator('json', recipeUpdateSchema), async (c) => {
    const id = parseId(c.req.param('id'));
    const body = c.req.valid('json');
    try {
      const recipe = await updateRecipe(id, {
        ...body,
        ingredients: body.ingredients ? toWriteIngredients(body.ingredients) : undefined,
      });
      return c.json(recipe);
    } catch (error) {
      throw new HTTPException(404, {
        message: error instanceof Error ? error.message : 'Recipe not found',
        cause: error,
      });
    }
  })
  .delete('/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    try {
      await deleteRecipe(id);
      return c.json({ id });
    } catch (error) {
      throw new HTTPException(404, {
        message: error instanceof Error ? error.message : 'Recipe not found',
        cause: error,
      });
    }
  })
  .post('/:id/favorite', async (c) => {
    try {
      return c.json(await toggleFavorite(parseId(c.req.param('id'))));
    } catch (error) {
      throw new HTTPException(404, {
        message: error instanceof Error ? error.message : 'Recipe not found',
        cause: error,
      });
    }
  })
  .post('/:id/food/offers', routeValidator('json', generateFoodOffersSchema), async (c) =>
    c.json(await handle(() => generateDishOffers(parseId(c.req.param('id')), c.req.valid('json').addressId)))
  )
  .get('/:id/food/proposal', async (c) => c.json(await handle(() => getFoodProposal(parseId(c.req.param('id'))))))
  .post('/:id/food/select', routeValidator('json', selectFoodOfferSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => selectOffer(parseId(c.req.param('id')), input.offerId, input.customization)));
  })
  .post('/:id/food/review', async (c) => c.json(await handle(() => prepareFoodCartReview(parseId(c.req.param('id'))))))
  .post('/:id/food/confirm', routeValidator('json', confirmCartReviewSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => confirmFoodCartReview(input.reviewId, input.payloadHash)));
  })
  .post('/:id/instamart/basket', routeValidator('json', generateBasketSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => generateBasket(parseId(c.req.param('id')), input)));
  })
  .get('/:id/instamart/basket', async (c) =>
    c.json(await handle(() => getIngredientBasket(parseId(c.req.param('id')))))
  )
  .patch('/:id/instamart/basket/lines', routeValidator('json', updateBasketLineSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => updateBasketLine(parseId(c.req.param('id')), input.ingredientKey, input)));
  })
  .post('/:id/instamart/review', async (c) =>
    c.json(await handle(() => prepareInstamartCartReview(parseId(c.req.param('id')))))
  )
  .post('/:id/instamart/confirm', routeValidator('json', confirmCartReviewSchema), async (c) => {
    const input = c.req.valid('json');
    return c.json(await handle(() => confirmInstamartCartReview(input.reviewId, input.payloadHash)));
  });

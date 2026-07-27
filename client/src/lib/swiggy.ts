import type { CartReview, FoodProposal, IngredientBasket, SwiggyAddress, SwiggyConnectionStatus } from '@shared/types';
import { api } from '@client/lib/api';
import { queryOptions } from '@tanstack/react-query';

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const swiggyStatusQueryOptions = queryOptions({
  queryKey: ['swiggy', 'status'],
  queryFn: async () => {
    const response = await api.swiggy.status.$get();
    return parseJson<SwiggyConnectionStatus>(response);
  },
});

export const swiggyAddressesQueryOptions = queryOptions({
  queryKey: ['swiggy', 'addresses'],
  queryFn: async () => {
    const response = await api.swiggy.addresses.$get();
    return parseJson<SwiggyAddress[]>(response);
  },
});

export async function startSwiggyConnect() {
  const response = await api.swiggy.connect.$post();
  return parseJson<{ authorizeUrl: string }>(response);
}

export async function disconnectSwiggy() {
  const response = await api.swiggy.disconnect.$post();
  return parseJson<{ connected: boolean }>(response);
}

export async function setPreferredAddress(address: SwiggyAddress) {
  const response = await api.swiggy.addresses.preferred.$put({ json: address });
  return parseJson<SwiggyAddress>(response);
}

export const foodProposalQueryOptions = (recipeId: number) =>
  queryOptions({
    queryKey: ['food-proposal', recipeId],
    queryFn: async () => {
      const response = await api.recipes[':id'].food.proposal.$get({
        param: { id: String(recipeId) },
      });
      return parseJson<FoodProposal | null>(response);
    },
  });

export async function generateFoodOffers(recipeId: number, addressId: string) {
  const response = await api.recipes[':id'].food.offers.$post({
    param: { id: String(recipeId) },
    json: { addressId },
  });
  return parseJson<FoodProposal>(response);
}

export async function selectFoodOffer(recipeId: number, offerId: string, customization?: unknown) {
  const response = await api.recipes[':id'].food.select.$post({
    param: { id: String(recipeId) },
    json: { offerId, customization },
  });
  return parseJson<FoodProposal>(response);
}

export async function prepareFoodReview(recipeId: number) {
  const response = await api.recipes[':id'].food.review.$post({
    param: { id: String(recipeId) },
  });
  return parseJson<CartReview>(response);
}

export async function confirmFoodReview(recipeId: number, reviewId: string, payloadHash: string) {
  const response = await api.recipes[':id'].food.confirm.$post({
    param: { id: String(recipeId) },
    json: { reviewId, payloadHash },
  });
  return parseJson<unknown>(response);
}

export const basketQueryOptions = (recipeId: number) =>
  queryOptions({
    queryKey: ['ingredient-basket', recipeId],
    queryFn: async () => {
      const response = await api.recipes[':id'].instamart.basket.$get({
        param: { id: String(recipeId) },
      });
      return parseJson<IngredientBasket | null>(response);
    },
  });

export async function generateBasket(
  recipeId: number,
  body: {
    addressId: string;
    targetServings: number;
    includeOptionalIds?: number[];
    includePantryIds?: number[];
  }
) {
  const response = await api.recipes[':id'].instamart.basket.$post({
    param: { id: String(recipeId) },
    json: {
      addressId: body.addressId,
      targetServings: body.targetServings,
      includeOptionalIds: body.includeOptionalIds ?? [],
      includePantryIds: body.includePantryIds ?? [],
    },
  });
  return parseJson<IngredientBasket>(response);
}

export async function updateBasketLine(
  recipeId: number,
  body: { ingredientKey: string; included?: boolean; spinId?: string; quantity?: number }
) {
  const response = await api.recipes[':id'].instamart.basket.lines.$patch({
    param: { id: String(recipeId) },
    json: body,
  });
  return parseJson<IngredientBasket>(response);
}

export async function prepareInstamartReview(recipeId: number) {
  const response = await api.recipes[':id'].instamart.review.$post({
    param: { id: String(recipeId) },
  });
  return parseJson<CartReview>(response);
}

export async function confirmInstamartReview(recipeId: number, reviewId: string, payloadHash: string) {
  const response = await api.recipes[':id'].instamart.confirm.$post({
    param: { id: String(recipeId) },
    json: { reviewId, payloadHash },
  });
  return parseJson<unknown>(response);
}

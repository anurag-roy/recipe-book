import type { DishOffer, FoodProposal } from '@shared/types';
import { db } from '@server/db';
import { cartReviews, foodProposals, recipes } from '@server/db/schema';
import { randomUrlSafe, sha256 } from '@server/lib/crypto-hash';
import { and, eq, isNull } from 'drizzle-orm';
import { ensureAddressSelected } from './addresses';
import { callSwiggyTool } from './mcp';
import { rankDishOffers } from './ranking';

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asOffers(value: unknown): DishOffer[] {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  const nestedData = record?.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : null;
  const raw = Array.isArray(value)
    ? value
    : Array.isArray(record?.items)
      ? record.items
      : Array.isArray(record?.offers)
        ? record.offers
        : Array.isArray(nestedData?.items)
          ? nestedData.items
          : Array.isArray(nestedData?.offers)
            ? nestedData.offers
            : [];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): DishOffer[] => {
    if (!item || typeof item !== 'object') return [];
    const source = item as Record<string, unknown>;
    const menuItemId = asString(source.menuItemId ?? source.menu_item_id ?? source.id);
    const restaurantId = asString(source.restaurantId ?? source.restaurant_id);
    const itemName = asString(source.itemName ?? source.name);
    if (!menuItemId || !restaurantId || !itemName) return [];
    const restaurantName =
      asString(source.restaurantName) ?? asString(source.restaurant_name) ?? 'Unknown restaurant';
    const inStock = source.inStock;
    const availabilityStatus =
      asString(source.availabilityStatus) ??
      (typeof inStock === 'number' ? (inStock > 0 ? 'available' : 'unavailable') : null);
    return [
      {
        id: `${restaurantId}:${menuItemId}`,
        menuItemId,
        itemName,
        restaurantId,
        restaurantName,
        price: asNumber(source.price) ?? 0,
        rating: asNumber(source.rating),
        ratingCount: asNumber(source.ratingCount ?? source.rating_count),
        etaMinutes: asNumber(source.etaMinutes ?? source.eta_minutes ?? source.sla),
        distanceKm: asNumber(source.distanceKm ?? source.distance_km ?? source.distance),
        availabilityStatus,
        capturedAt: new Date().toISOString(),
        variants: source.variants,
        addons: source.addons,
        raw: source,
      },
    ];
  });
}

async function proposal(recipeId: number): Promise<FoodProposal | null> {
  const saved = (await db.select().from(foodProposals).where(eq(foodProposals.recipeId, recipeId)).limit(1))[0];
  if (!saved) {
    return null;
  }
  return {
    recipeId,
    addressId: saved.addressId,
    addressDisplay: saved.addressDisplay,
    offers: JSON.parse(saved.offersJson) as DishOffer[],
    selectedOfferId: saved.selectedOfferId,
    selectedCustomization: saved.selectedCustomizationJson ? JSON.parse(saved.selectedCustomizationJson) : undefined,
    capturedAt: saved.capturedAt,
  };
}

async function requireProposal(recipeId: number): Promise<FoodProposal> {
  const current = await proposal(recipeId);
  if (!current) {
    throw new Error('Generate dish offers before selecting or reviewing');
  }
  return current;
}

export async function generateDishOffers(recipeId: number, addressId: string): Promise<FoodProposal> {
  const recipe = (await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1))[0];
  if (!recipe) throw new Error('Recipe not found');
  const address = await ensureAddressSelected(addressId);
  const queries = [recipe.dishName, recipe.title, ...(JSON.parse(recipe.searchAliasesJson) as string[])].filter(
    (value): value is string => Boolean(value)
  );
  const results = await Promise.all(
    queries.map((query) => callSwiggyTool('food', 'search_menu', { addressId, query }))
  );
  const seen = new Set<string>();
  const offers = rankDishOffers(
    results
      .flatMap(asOffers)
      .filter((offer) => !offer.availabilityStatus || /open|available/i.test(offer.availabilityStatus))
      .filter((offer) => {
        if (seen.has(offer.id)) return false;
        seen.add(offer.id);
        return true;
      })
  ).slice(0, 5);
  const saved: FoodProposal = {
    recipeId,
    addressId,
    addressDisplay: address.displayAddress ?? address.label,
    offers,
    selectedOfferId: null,
    capturedAt: new Date().toISOString(),
  };
  await db
    .insert(foodProposals)
    .values({
      recipeId,
      addressId,
      addressDisplay: saved.addressDisplay ?? null,
      offersJson: JSON.stringify(offers),
      capturedAt: saved.capturedAt,
    })
    .onConflictDoUpdate({
      target: foodProposals.recipeId,
      set: {
        addressId,
        addressDisplay: saved.addressDisplay ?? null,
        offersJson: JSON.stringify(offers),
        selectedOfferId: null,
        selectedCustomizationJson: null,
        capturedAt: saved.capturedAt,
        updatedAt: new Date().toISOString(),
      },
    });
  return saved;
}

export const getFoodProposal = proposal;

export async function selectOffer(recipeId: number, offerId: string, customization?: unknown): Promise<FoodProposal> {
  const current = await requireProposal(recipeId);
  if (!current.offers.some((offer) => offer.id === offerId)) {
    throw new Error('Offer is not part of the current proposal');
  }
  await db
    .update(foodProposals)
    .set({
      selectedOfferId: offerId,
      selectedCustomizationJson: customization === undefined ? null : JSON.stringify(customization),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(foodProposals.recipeId, recipeId));
  return { ...current, selectedOfferId: offerId, selectedCustomization: customization };
}

export async function prepareFoodCartReview(recipeId: number) {
  const current = await requireProposal(recipeId);
  const selected = current.offers.find((offer) => offer.id === current.selectedOfferId);
  if (!selected) {
    throw new Error('Select a dish offer before reviewing the cart');
  }
  const liveCart = await callSwiggyTool('food', 'get_food_cart', { addressId: current.addressId });
  const cartRestaurantId =
    liveCart && typeof liveCart === 'object' ? (liveCart as Record<string, unknown>).restaurantId : undefined;
  const warnings =
    cartRestaurantId && cartRestaurantId !== selected.restaurantId
      ? ['Your Food cart contains another restaurant. Confirming will replace it.']
      : [];
  const customization =
    current.selectedCustomization && typeof current.selectedCustomization === 'object'
      ? (current.selectedCustomization as Record<string, unknown>)
      : {};
  const proposedPayload = {
    addressId: current.addressId,
    restaurantId: selected.restaurantId,
    restaurantName: selected.restaurantName,
    cartItems: [
      {
        menu_item_id: selected.menuItemId,
        quantity: 1,
        ...customization,
      },
    ],
  };
  const payloadHash = await sha256(proposedPayload);
  const id = randomUrlSafe(24);
  await db.insert(cartReviews).values({
    id,
    kind: 'food',
    recipeId,
    addressId: current.addressId,
    addressDisplay: current.addressDisplay ?? null,
    payloadHash,
    liveCartSnapshotJson: JSON.stringify(liveCart),
    proposedPayloadJson: JSON.stringify(proposedPayload),
    warningsJson: JSON.stringify(warnings),
  });
  return {
    id,
    kind: 'food' as const,
    recipeId,
    addressId: current.addressId,
    addressDisplay: current.addressDisplay,
    payloadHash,
    liveCartSnapshot: liveCart,
    proposedPayload,
    warnings,
    createdAt: new Date().toISOString(),
  };
}

export async function confirmFoodCartReview(reviewId: string, payloadHash: string): Promise<unknown> {
  const [review] = await db
    .update(cartReviews)
    .set({ consumedAt: new Date().toISOString() })
    .where(
      and(
        eq(cartReviews.id, reviewId),
        eq(cartReviews.kind, 'food'),
        eq(cartReviews.payloadHash, payloadHash),
        isNull(cartReviews.consumedAt)
      )
    )
    .returning();
  if (!review) {
    throw new Error('Cart review is invalid, changed, or already consumed');
  }
  const payload = JSON.parse(review.proposedPayloadJson) as Record<string, unknown>;
  await callSwiggyTool('food', 'update_food_cart', payload);
  return callSwiggyTool('food', 'get_food_cart', {
    addressId: review.addressId,
    restaurantName: typeof payload.restaurantName === 'string' ? payload.restaurantName : undefined,
  });
}

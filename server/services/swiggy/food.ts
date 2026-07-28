import type { DishOffer, FoodCustomization, FoodProposal } from '@shared/types';
import { db } from '@server/db';
import { cartReviews, foodProposals, recipes } from '@server/db/schema';
import { randomUrlSafe, sha256 } from '@server/lib/crypto-hash';
import { and, eq, isNull } from 'drizzle-orm';
import { ensureAddressSelected } from './addresses';
import {
  applyCustomizationSelection,
  buildCartItemFromCustomization,
  fetchOfferCustomization,
  isCustomizationResolved,
} from './customization';
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
    const rawImage =
      asString(source.imageUrl ?? source.image_url ?? source.cloudinaryImageId ?? source.imageId) ??
      null;
    const rawRestaurantImage =
      asString(source.restaurantImageUrl ?? source.restaurant_image_url ?? source.restaurantCloudinaryImageId) ??
      null;
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
        imageUrl: toMediaUrl(rawImage),
        restaurantImageUrl: toMediaUrl(rawRestaurantImage),
        capturedAt: new Date().toISOString(),
        variants: source.variants,
        addons: source.addons,
        raw: source,
      },
    ];
  });
}

function toMediaUrl(value: string | null): string | null {
  if (!value) return null;
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('data:')
  ) {
    return value;
  }
  return `https://media-assets.swiggy.com/swiggy/image/upload/${value}`;
}

async function enrichRestaurantImages(addressId: string, offers: DishOffer[]): Promise<DishOffer[]> {
  const missing = [...new Map(
    offers
      .filter((offer) => !offer.restaurantImageUrl)
      .map((offer) => [offer.restaurantId, offer.restaurantName] as const)
  ).entries()];
  if (missing.length === 0) return offers;

  const images = new Map<string, string>();
  await Promise.all(
    missing.map(async ([restaurantId, restaurantName]) => {
      try {
        const result = await callSwiggyTool('food', 'search_restaurants', {
          addressId,
          query: restaurantName,
        });
        const root = result && typeof result === 'object' ? (result as Record<string, unknown>) : null;
        const list = Array.isArray(root?.restaurants)
          ? root.restaurants
          : Array.isArray((root?.data as { restaurants?: unknown } | undefined)?.restaurants)
            ? ((root?.data as { restaurants: unknown[] }).restaurants)
            : [];
        const match = list.find((entry) => {
          if (!entry || typeof entry !== 'object') return false;
          const id = asString((entry as Record<string, unknown>).id ?? (entry as Record<string, unknown>).restaurant_id);
          return id === restaurantId;
        }) as Record<string, unknown> | undefined;
        const imageUrl = toMediaUrl(
          asString(match?.imageUrl ?? match?.image_url ?? match?.cloudinaryImageId) ?? null
        );
        if (imageUrl) {
          images.set(restaurantId, imageUrl);
        }
      } catch {
        // Restaurant imagery is best-effort; offers still work without it.
      }
    })
  );

  if (images.size === 0) return offers;
  return offers.map((offer) => ({
    ...offer,
    restaurantImageUrl: offer.restaurantImageUrl ?? images.get(offer.restaurantId) ?? null,
  }));
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
  const ranked = rankDishOffers(
    results
      .flatMap(asOffers)
      .filter((offer) => !offer.availabilityStatus || /open|available/i.test(offer.availabilityStatus))
      .filter((offer) => {
        if (seen.has(offer.id)) return false;
        seen.add(offer.id);
        return true;
      })
  ).slice(0, 5);
  const offers = await enrichRestaurantImages(addressId, ranked);
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

export async function selectOffer(
  recipeId: number,
  offerId: string,
  selection?: {
    selectedVariants?: Record<string, string>;
    selectedAddons?: Record<string, string[]>;
  }
): Promise<FoodProposal> {
  const current = await requireProposal(recipeId);
  const offer = current.offers.find((candidate) => candidate.id === offerId);
  if (!offer) {
    throw new Error('Offer is not part of the current proposal');
  }

  let customization: FoodCustomization;
  if (current.selectedOfferId === offerId && current.selectedCustomization) {
    customization = current.selectedCustomization;
    if (selection) {
      customization = applyCustomizationSelection(customization, selection);
    }
  } else {
    customization = await fetchOfferCustomization(offer, current.addressId);
    if (selection) {
      customization = applyCustomizationSelection(customization, selection);
    }
  }

  await db
    .update(foodProposals)
    .set({
      selectedOfferId: offerId,
      selectedCustomizationJson: JSON.stringify(customization),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(foodProposals.recipeId, recipeId));
  return { ...current, selectedOfferId: offerId, selectedCustomization: customization };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function foodCartPayload(result: unknown): Record<string, unknown> | null {
  const root = asRecord(result);
  if (!root) return null;
  const nested = asRecord(root.data);
  if (nested && (nested.items !== undefined || nested.cart_id !== undefined || nested.result !== undefined)) {
    return nested;
  }
  if (root.items !== undefined || root.cart_id !== undefined) {
    return root;
  }
  return nested ?? root;
}

function assertFoodCartSynced(result: unknown): void {
  const root = asRecord(result);
  if (!root) {
    throw new Error('Swiggy returned an empty cart response');
  }
  const errorCodes = Array.isArray(root.errorCodes) ? root.errorCodes : [];
  if (root.successful === false || root.statusCode === 1 || errorCodes.length > 0) {
    throw new Error(
      asString(root.statusMessage) ?? asString(root.titleMessage) ?? 'Food cart sync failed on Swiggy'
    );
  }
  const data = foodCartPayload(result);
  const items = data?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Swiggy cart is empty after sync. This item may need required customizations.');
  }
}

function requiredAddonsFromUpdate(result: unknown): {
  auto: Array<{ group_id: string; choice_id: string; name?: string }>;
  unresolved: string[];
} {
  const data = foodCartPayload(result);
  const items = Array.isArray(data?.items) ? data.items : [];
  const auto: Array<{ group_id: string; choice_id: string; name?: string }> = [];
  const unresolved: string[] = [];

  for (const item of items) {
    const record = asRecord(item);
    const groups = Array.isArray(record?.valid_addons) ? record.valid_addons : [];
    for (const group of groups) {
      const groupRecord = asRecord(group);
      if (!groupRecord) continue;
      const minAddons = asNumber(groupRecord.minAddons) ?? 0;
      if (minAddons <= 0) continue;
      const maxAddons = asNumber(groupRecord.maxAddons);
      const maxAllowed = maxAddons !== null && maxAddons > 0 ? maxAddons : null;

      const choices = Array.isArray(groupRecord.choices) ? groupRecord.choices.map(asRecord).filter(Boolean) : [];
      const selectedCount = choices.filter((choice) => choice && choice.selected === 1).length;
      if (selectedCount >= minAddons) continue;

      const candidates = choices
        .filter((choice): choice is Record<string, unknown> => {
          if (!choice || choice.selected === 1) return false;
          return (asNumber(choice.inStock) ?? 1) > 0;
        })
        .sort((left, right) => (asNumber(right.default) ?? 0) - (asNumber(left.default) ?? 0));

      const needed = Math.min(minAddons - selectedCount, maxAllowed ?? minAddons - selectedCount);
      const groupName = asString(groupRecord.group_name ?? groupRecord.groupName) ?? 'Required option';

      if (candidates.length === 1 && needed === 1) {
        const choice = candidates[0]!;
        const groupId = asString(groupRecord.group_id ?? groupRecord.groupId);
        const choiceId = asString(choice.id ?? choice.choice_id ?? choice.choiceId);
        if (groupId && choiceId) {
          auto.push({
            group_id: groupId,
            choice_id: choiceId,
            ...(asString(choice.name) ? { name: asString(choice.name)! } : {}),
          });
          continue;
        }
      }

      if (candidates.length < needed) {
        unresolved.push(`${groupName} (unavailable)`);
      } else {
        unresolved.push(groupName);
      }
    }
  }

  return { auto, unresolved };
}

async function syncFoodCart(payload: Record<string, unknown>): Promise<unknown> {
  const firstUpdate = await callSwiggyTool('food', 'update_food_cart', payload);
  const { auto, unresolved } = requiredAddonsFromUpdate(firstUpdate);

  if (unresolved.length > 0) {
    throw new Error(`Choose required options before syncing: ${unresolved.join(', ')}`);
  }

  if (auto.length > 0) {
    const cartItems = Array.isArray(payload.cartItems) ? [...payload.cartItems] : [];
    const firstItem = asRecord(cartItems[0]);
    if (!firstItem) {
      throw new Error('Food cart payload is missing cart items');
    }
    const existingAddons = Array.isArray(firstItem.addons) ? firstItem.addons : [];
    cartItems[0] = {
      ...firstItem,
      addons: [...existingAddons, ...auto],
    };
    await callSwiggyTool('food', 'update_food_cart', {
      ...payload,
      cartItems,
    });
  }

  const cart = await callSwiggyTool('food', 'get_food_cart', {
    addressId: payload.addressId,
    restaurantName: typeof payload.restaurantName === 'string' ? payload.restaurantName : undefined,
  });
  assertFoodCartSynced(cart);
  return cart;
}

export async function prepareFoodCartReview(recipeId: number) {
  const current = await requireProposal(recipeId);
  const selected = current.offers.find((offer) => offer.id === current.selectedOfferId);
  if (!selected) {
    throw new Error('Select a dish offer before reviewing the cart');
  }
  const liveCart = await callSwiggyTool('food', 'get_food_cart', { addressId: current.addressId });
  const liveCartData = foodCartPayload(liveCart);
  const liveRestaurant = asRecord(liveCartData?.restaurant) ?? asRecord(asRecord(liveCart)?.restaurant);
  const cartRestaurantId =
    asString(liveCartData?.restaurantId) ??
    asString(liveCartData?.restaurant_id) ??
    asString(liveRestaurant?.id) ??
    asString(asRecord(liveCart)?.restaurantId);
  const cartRestaurantName =
    asString(liveRestaurant?.name) ?? asString(liveCartData?.restaurantName) ?? asString(liveCartData?.restaurant_name);
  const warnings: string[] = [];
  if (cartRestaurantId && cartRestaurantId !== selected.restaurantId) {
    warnings.push(
      `Your Food cart currently has ${cartRestaurantName ?? 'another restaurant'}. Confirming will replace it.`
    );
  }
  const customization = current.selectedCustomization;
  if (!customization || !isCustomizationResolved(customization)) {
    throw new Error('Resolve required variants and add-ons before reviewing the Food cart');
  }
  const proposedPayload = {
    addressId: current.addressId,
    restaurantId: selected.restaurantId,
    restaurantName: selected.restaurantName,
    cartItems: [buildCartItemFromCustomization(customization)],
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
  const review = db
    .select()
    .from(cartReviews)
    .where(
      and(
        eq(cartReviews.id, reviewId),
        eq(cartReviews.kind, 'food'),
        eq(cartReviews.payloadHash, payloadHash),
        isNull(cartReviews.consumedAt)
      )
    )
    .get();
  if (!review) {
    throw new Error('Cart review is invalid, changed, or already consumed');
  }

  const payload = JSON.parse(review.proposedPayloadJson) as Record<string, unknown>;
  const cart = await syncFoodCart(payload);

  db.update(cartReviews)
    .set({ consumedAt: new Date().toISOString() })
    .where(eq(cartReviews.id, reviewId))
    .run();

  return cart;
}

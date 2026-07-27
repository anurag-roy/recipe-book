import type { BasketLine, IngredientBasket } from '@shared/types';
import { db } from '@server/db';
import { cartReviews, ingredientBaskets, ingredients, recipes } from '@server/db/schema';
import { randomUrlSafe, sha256 } from '@server/lib/crypto-hash';
import { and, eq, isNull } from 'drizzle-orm';
import { ensureAddressSelected } from './addresses';
import { callSwiggyTool } from './mcp';
import { chooseBestPack, type Pack } from './pack-optimizer';

function products(value: unknown): Pack[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? ((value as { products?: unknown }).products ?? [])
      : [];
  if (!Array.isArray(list)) return [];
  return list.flatMap((item): Pack[] => {
    if (!item || typeof item !== 'object') return [];
    const source = item as Record<string, unknown>;
    const spinId = source.spinId ?? source.spin_id ?? source.id;
    const packQuantity = source.packQuantity ?? source.quantity;
    const packUnit = source.packUnit ?? source.unit;
    if (typeof spinId !== 'string' || typeof packQuantity !== 'number' || typeof packUnit !== 'string') return [];
    return [
      {
        spinId,
        productName:
          typeof source.productName === 'string'
            ? source.productName
            : typeof source.name === 'string'
              ? source.name
              : spinId,
        packQuantity,
        packUnit,
        price: typeof source.price === 'number' ? source.price : null,
      },
    ];
  });
}

async function basket(recipeId: number): Promise<IngredientBasket | null> {
  const saved = (await db.select().from(ingredientBaskets).where(eq(ingredientBaskets.recipeId, recipeId)).limit(1))[0];
  if (!saved) {
    return null;
  }
  return {
    recipeId,
    addressId: saved.addressId,
    addressDisplay: saved.addressDisplay,
    targetServings: saved.targetServings,
    sourceServings: saved.sourceServings,
    lines: JSON.parse(saved.linesJson) as BasketLine[],
    estimatedTotal: saved.estimatedTotal,
    capturedAt: saved.capturedAt,
  };
}

async function requireBasket(recipeId: number): Promise<IngredientBasket> {
  const current = await basket(recipeId);
  if (!current) {
    throw new Error('Generate an ingredient basket before changing or reviewing it');
  }
  return current;
}

export async function generateBasket(
  recipeId: number,
  input: { addressId: string; targetServings: number; includeOptionalIds: number[]; includePantryIds: number[] }
): Promise<IngredientBasket> {
  const recipe = (await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1))[0];
  if (!recipe) throw new Error('Recipe not found');
  const address = await ensureAddressSelected(input.addressId, 'im');
  const sourceIngredients = await db.select().from(ingredients).where(eq(ingredients.recipeId, recipeId));
  const multiplier = input.targetServings / (recipe.servings ?? input.targetServings);
  const lines = await Promise.all(
    sourceIngredients.map(async (ingredient): Promise<BasketLine> => {
      const include =
        (!ingredient.optional || input.includeOptionalIds.includes(ingredient.id)) &&
        (!ingredient.pantryDefault || input.includePantryIds.includes(ingredient.id));
      const base = {
        ingredientId: ingredient.id,
        originalText: ingredient.originalText,
        name: ingredient.name,
        requiredAmount: ingredient.amount ? ingredient.amount * multiplier : null,
        requiredUnit: ingredient.unit,
        qualitative: ingredient.qualitative,
        included: include,
        optional: ingredient.optional,
        pantryDefault: ingredient.pantryDefault,
      };
      if (!include)
        return {
          ...base,
          status: 'excluded',
          alternatives: [],
          purchasedAmount: null,
          excessAmount: null,
          confidence: null,
          note: null,
        };
      if (!ingredient.amount || !ingredient.unit || ingredient.qualitative)
        return {
          ...base,
          status: 'manual',
          alternatives: [],
          purchasedAmount: null,
          excessAmount: null,
          confidence: null,
          note: 'Choose a product and quantity manually.',
        };
      const found = products(
        await callSwiggyTool('im', 'search_products', { addressId: input.addressId, query: ingredient.name })
      );
      const choice = chooseBestPack(ingredient.amount * multiplier, ingredient.unit, found);
      if (!choice)
        return {
          ...base,
          status: 'unresolved',
          alternatives: [],
          purchasedAmount: null,
          excessAmount: null,
          confidence: 0,
          note: 'No equivalent unit-compatible product found.',
        };
      const alternative = (pack: Pack, quantity: number) => ({
        spinId: pack.spinId,
        productName: pack.productName,
        packQuantity: pack.packQuantity,
        packUnit: pack.packUnit,
        price: pack.price,
        quantity,
      });
      return {
        ...base,
        status: 'proposed',
        proposed: alternative(choice.pack, choice.quantity),
        alternatives: found
          .filter((pack) => pack.spinId !== choice.pack.spinId)
          .slice(0, 2)
          .map((pack) => alternative(pack, Math.max(1, Math.ceil(choice.purchasedAmount / pack.packQuantity)))),
        purchasedAmount: choice.purchasedAmount,
        excessAmount: choice.excessAmount,
        confidence: 1,
        note: null,
      };
    })
  );
  const result: IngredientBasket = {
    recipeId,
    addressId: input.addressId,
    addressDisplay: address.displayAddress ?? address.label,
    targetServings: input.targetServings,
    sourceServings: recipe.servings,
    lines,
    estimatedTotal: lines.reduce((sum, line) => sum + (line.proposed?.price ?? 0) * (line.proposed?.quantity ?? 0), 0),
    capturedAt: new Date().toISOString(),
  };
  await db
    .insert(ingredientBaskets)
    .values({
      recipeId,
      addressId: result.addressId,
      addressDisplay: result.addressDisplay ?? null,
      targetServings: result.targetServings,
      sourceServings: result.sourceServings ?? null,
      linesJson: JSON.stringify(lines),
      estimatedTotal: result.estimatedTotal ?? null,
      capturedAt: result.capturedAt,
    })
    .onConflictDoUpdate({
      target: ingredientBaskets.recipeId,
      set: {
        addressId: result.addressId,
        addressDisplay: result.addressDisplay ?? null,
        targetServings: result.targetServings,
        sourceServings: result.sourceServings ?? null,
        linesJson: JSON.stringify(lines),
        estimatedTotal: result.estimatedTotal ?? null,
        capturedAt: result.capturedAt,
        updatedAt: new Date().toISOString(),
      },
    });
  return result;
}

export const getIngredientBasket = basket;

export async function updateBasketLine(
  recipeId: number,
  ingredientKey: string,
  update: { included?: boolean; spinId?: string; quantity?: number }
): Promise<IngredientBasket> {
  const current = await requireBasket(recipeId);
  const lines = current.lines.map((line) => {
    if (String(line.ingredientId) !== ingredientKey) {
      return line;
    }
    const options = [line.proposed, ...line.alternatives].filter(
      (option): option is NonNullable<typeof line.proposed> => Boolean(option)
    );
    const selected = update.spinId ? options.find((option) => option.spinId === update.spinId) : line.proposed;
    if (update.spinId && !selected) {
      throw new Error('Selected product is not part of this basket line');
    }
    return {
      ...line,
      included: update.included ?? line.included,
      status: update.included === false ? 'excluded' : selected ? 'proposed' : line.status,
      proposed: selected && update.quantity ? { ...selected, quantity: update.quantity } : selected,
    };
  });
  await db
    .update(ingredientBaskets)
    .set({ linesJson: JSON.stringify(lines), updatedAt: new Date().toISOString() })
    .where(eq(ingredientBaskets.recipeId, recipeId));
  return { ...current, lines };
}

export async function prepareInstamartCartReview(recipeId: number) {
  const current = await requireBasket(recipeId);
  const liveCart = await callSwiggyTool('im', 'get_cart', {});
  const cartItems =
    liveCart && typeof liveCart === 'object' && Array.isArray((liveCart as { items?: unknown }).items)
      ? (liveCart as { items: unknown[] }).items
      : [];
  const quantities = new Map<string, number>();
  for (const item of cartItems) {
    if (item && typeof item === 'object') {
      const raw = item as Record<string, unknown>;
      const spinId = raw.spinId ?? raw.spin_id;
      if (typeof spinId === 'string' && typeof raw.quantity === 'number') {
        quantities.set(spinId, raw.quantity);
      }
    }
  }
  for (const line of current.lines) {
    if (line.included && line.proposed) {
      quantities.set(line.proposed.spinId, (quantities.get(line.proposed.spinId) ?? 0) + line.proposed.quantity);
    }
  }
  const proposedPayload = {
    selectedAddressId: current.addressId,
    items: Array.from(quantities, ([spinId, quantity]) => ({ spinId, quantity })),
  };
  const payloadHash = await sha256(proposedPayload);
  const id = randomUrlSafe(24);
  await db.insert(cartReviews).values({
    id,
    kind: 'instamart',
    recipeId,
    addressId: current.addressId,
    addressDisplay: current.addressDisplay ?? null,
    payloadHash,
    liveCartSnapshotJson: JSON.stringify(liveCart),
    proposedPayloadJson: JSON.stringify(proposedPayload),
    warningsJson: JSON.stringify(
      cartItems.length > 0
        ? ['Your existing Instamart cart will be merged, then replaced with the combined items.']
        : []
    ),
  });
  return {
    id,
    kind: 'instamart' as const,
    recipeId,
    addressId: current.addressId,
    addressDisplay: current.addressDisplay,
    payloadHash,
    liveCartSnapshot: liveCart,
    proposedPayload,
    warnings:
      cartItems.length > 0
        ? ['Your existing Instamart cart will be merged, then replaced with the combined items.']
        : [],
    createdAt: new Date().toISOString(),
  };
}

export async function confirmInstamartCartReview(reviewId: string, payloadHash: string): Promise<unknown> {
  const [review] = await db
    .update(cartReviews)
    .set({ consumedAt: new Date().toISOString() })
    .where(
      and(
        eq(cartReviews.id, reviewId),
        eq(cartReviews.kind, 'instamart'),
        eq(cartReviews.payloadHash, payloadHash),
        isNull(cartReviews.consumedAt)
      )
    )
    .returning();
  if (!review) {
    throw new Error('Cart review is invalid, changed, or already consumed');
  }
  await callSwiggyTool('im', 'update_cart', JSON.parse(review.proposedPayloadJson) as Record<string, unknown>);
  return callSwiggyTool('im', 'get_cart', {});
}

import { z } from 'zod';

export const quantityValueSchema = z.object({
  amount: z.number().positive().optional(),
  amountMax: z.number().positive().optional(),
  unit: z.string().trim().min(1).max(32).optional(),
  qualitative: z.string().trim().min(1).max(120).optional(),
});

export const ingredientSchema = z.object({
  id: z.number().int().positive().optional(),
  originalText: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(200),
  quantity: quantityValueSchema.optional(),
  preparation: z.string().trim().max(200).optional(),
  optional: z.boolean().default(false),
  pantryDefault: z.boolean().default(false),
  group: z.string().trim().max(120).optional(),
  position: z.number().int().nonnegative().default(0),
});

export const instructionSchema = z.object({
  id: z.number().int().positive().optional(),
  text: z.string().trim().min(1).max(4000),
  position: z.number().int().nonnegative().default(0),
});

export const recipeImageSchema = z.object({
  objectKey: z.string().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  contentType: z.string().nullable().optional(),
  warning: z.string().nullable().optional(),
});

export const recipeSourceSchema = z.object({
  sourceUrl: z.string().url().nullable().optional(),
  canonicalUrl: z.string().url().nullable().optional(),
  cleanedText: z.string().nullable().optional(),
  contentFingerprint: z.string().nullable().optional(),
  jsonLdPresent: z.boolean().default(false),
});

export const recipeSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional().nullable(),
  yieldText: z.string().trim().max(120).optional().nullable(),
  servings: z.number().positive().optional().nullable(),
  prepTimeMinutes: z.number().int().nonnegative().optional().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().optional().nullable(),
  totalTimeMinutes: z.number().int().nonnegative().optional().nullable(),
  cuisine: z.string().trim().max(120).optional().nullable(),
  dishName: z.string().trim().max(200).optional().nullable(),
  searchAliases: z.array(z.string().trim().min(1).max(120)).default([]),
  tags: z.array(z.string().trim().min(1).max(60)).default([]),
  favorite: z.boolean().default(false),
  notes: z.string().trim().max(8000).optional().nullable(),
  ingredients: z.array(ingredientSchema).default([]),
  instructions: z.array(instructionSchema).default([]),
  image: recipeImageSchema.optional(),
  source: recipeSourceSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const recipeWriteSchema = recipeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  favorite: true,
});

export const recipeUpdateSchema = recipeWriteSchema.partial().extend({
  favorite: z.boolean().optional(),
});

export const recipeListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  tag: z.string().trim().max(60).optional(),
  favorite: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const structuredRecipeLlmSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).nullable(),
  yieldText: z.string().trim().max(120).nullable(),
  servings: z.number().positive().nullable(),
  prepTimeMinutes: z.number().int().nonnegative().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().nullable(),
  totalTimeMinutes: z.number().int().nonnegative().nullable(),
  cuisine: z.string().trim().max(120).nullable(),
  dishName: z.string().trim().max(200).nullable(),
  searchAliases: z.array(z.string().trim().min(1).max(120)).max(12),
  tags: z.array(z.string().trim().min(1).max(60)).max(20),
  notes: z.string().trim().max(8000).nullable(),
  // Plain string: OpenAI Structured Outputs rejects JSON Schema format "uri" from z.string().url().
  imageUrl: z.string().nullable(),
  ingredients: z
    .array(
      z.object({
        originalText: z.string().trim().min(1).max(500),
        name: z.string().trim().min(1).max(200),
        amount: z.number().positive().nullable(),
        amountMax: z.number().positive().nullable(),
        unit: z.string().trim().max(32).nullable(),
        qualitative: z.string().trim().max(120).nullable(),
        preparation: z.string().trim().max(200).nullable(),
        optional: z.boolean(),
        pantryDefault: z.boolean(),
        group: z.string().trim().max(120).nullable(),
      })
    )
    .min(1),
  instructions: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(4000),
      })
    )
    .min(1),
  inferredFields: z.array(z.enum(['tags', 'searchAliases', 'dishName', 'cuisine'])).default([]),
});

export const importSourceTypeSchema = z.enum(['url', 'text']);

export const createImportJobSchema = z.discriminatedUnion('sourceType', [
  z.object({
    sourceType: z.literal('url'),
    sourceUrl: z.string().url(),
  }),
  z.object({
    sourceType: z.literal('text'),
    sourceText: z.string().trim().min(20).max(100_000),
  }),
]);

export const importJobStatusSchema = z.enum([
  'queued',
  'fetching',
  'extracting',
  'structuring',
  'copying_image',
  'completed',
  'failed',
  'duplicate',
]);

export const importJobSchema = z.object({
  id: z.number().int().positive(),
  sourceType: importSourceTypeSchema,
  sourceUrl: z.string().nullable(),
  status: importJobStatusSchema,
  stageMessage: z.string().nullable(),
  error: z.string().nullable(),
  recipeId: z.number().int().positive().nullable(),
  duplicateOfRecipeId: z.number().int().positive().nullable(),
  imageWarning: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const swiggyAddressSchema = z.object({
  addressId: z.string().min(1).max(64),
  label: z.string().nullable().optional(),
  displayAddress: z.string().nullable().optional(),
});

export const dishOfferSchema = z.object({
  id: z.string(),
  menuItemId: z.string(),
  itemName: z.string(),
  restaurantId: z.string(),
  restaurantName: z.string(),
  price: z.number().nonnegative(),
  rating: z.number().nonnegative().nullable().optional(),
  ratingCount: z.number().nonnegative().nullable().optional(),
  etaMinutes: z.number().nonnegative().nullable().optional(),
  distanceKm: z.number().nonnegative().nullable().optional(),
  dietaryMarker: z.string().nullable().optional(),
  availabilityStatus: z.string().nullable().optional(),
  score: z.number().optional(),
  capturedAt: z.string(),
  variants: z.unknown().optional(),
  addons: z.unknown().optional(),
  raw: z.unknown().optional(),
});

export const foodProposalSchema = z.object({
  recipeId: z.number().int().positive(),
  addressId: z.string(),
  addressDisplay: z.string().nullable().optional(),
  offers: z.array(dishOfferSchema).max(5),
  selectedOfferId: z.string().nullable().optional(),
  selectedCustomization: z.unknown().optional(),
  capturedAt: z.string(),
});

export const basketAlternativeSchema = z.object({
  spinId: z.string(),
  productName: z.string(),
  brand: z.string().nullable().optional(),
  packLabel: z.string().nullable().optional(),
  packQuantity: z.number().positive().nullable().optional(),
  packUnit: z.string().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  quantity: z.number().int().positive(),
});

export const basketLineSchema = z.object({
  ingredientId: z.number().int().positive().nullable().optional(),
  originalText: z.string(),
  name: z.string(),
  requiredAmount: z.number().positive().nullable().optional(),
  requiredUnit: z.string().nullable().optional(),
  qualitative: z.string().nullable().optional(),
  included: z.boolean(),
  optional: z.boolean(),
  pantryDefault: z.boolean(),
  status: z.enum(['proposed', 'manual', 'excluded', 'unavailable', 'unresolved']),
  proposed: basketAlternativeSchema.nullable().optional(),
  alternatives: z.array(basketAlternativeSchema).max(2).default([]),
  purchasedAmount: z.number().nonnegative().nullable().optional(),
  excessAmount: z.number().nonnegative().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  note: z.string().nullable().optional(),
});

export const ingredientBasketSchema = z.object({
  recipeId: z.number().int().positive(),
  addressId: z.string(),
  addressDisplay: z.string().nullable().optional(),
  targetServings: z.number().positive(),
  sourceServings: z.number().positive().nullable().optional(),
  lines: z.array(basketLineSchema),
  estimatedTotal: z.number().nonnegative().nullable().optional(),
  capturedAt: z.string(),
});

export const cartReviewSchema = z.object({
  id: z.string(),
  kind: z.enum(['food', 'instamart']),
  recipeId: z.number().int().positive(),
  addressId: z.string(),
  addressDisplay: z.string().nullable().optional(),
  payloadHash: z.string(),
  liveCartSnapshot: z.unknown(),
  proposedPayload: z.unknown(),
  warnings: z.array(z.string()).default([]),
  expiresAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const confirmCartReviewSchema = z.object({
  reviewId: z.string().min(1),
  payloadHash: z.string().min(1),
});

export const generateFoodOffersSchema = z.object({
  addressId: z.string().min(1).max(64),
});

export const selectFoodOfferSchema = z.object({
  offerId: z.string().min(1),
  customization: z.unknown().optional(),
});

export const generateBasketSchema = z.object({
  addressId: z.string().min(1).max(64),
  targetServings: z.number().positive(),
  includeOptionalIds: z.array(z.number().int().positive()).default([]),
  includePantryIds: z.array(z.number().int().positive()).default([]),
});

export const updateBasketLineSchema = z.object({
  ingredientKey: z.string().min(1),
  included: z.boolean().optional(),
  spinId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
});

export const preferredAddressSchema = z.object({
  addressId: z.string().min(1).max(64),
  label: z.string().nullable().optional(),
  displayAddress: z.string().nullable().optional(),
});

import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
};

export const recipes = sqliteTable(
  'recipes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    yieldText: text('yield_text'),
    servings: real('servings'),
    prepTimeMinutes: integer('prep_time_minutes'),
    cookTimeMinutes: integer('cook_time_minutes'),
    totalTimeMinutes: integer('total_time_minutes'),
    cuisine: text('cuisine'),
    dishName: text('dish_name'),
    searchAliasesJson: text('search_aliases_json').notNull().default('[]'),
    notes: text('notes'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    sourceUrl: text('source_url'),
    canonicalUrl: text('canonical_url'),
    cleanedText: text('cleaned_text'),
    contentFingerprint: text('content_fingerprint'),
    jsonLdPresent: integer('json_ld_present', { mode: 'boolean' }).notNull().default(false),
    imageObjectKey: text('image_object_key'),
    imageSourceUrl: text('image_source_url'),
    imageContentType: text('image_content_type'),
    imageWarning: text('image_warning'),
    inferredFieldsJson: text('inferred_fields_json').notNull().default('[]'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('recipes_canonical_url_uidx').on(table.canonicalUrl),
    uniqueIndex('recipes_content_fingerprint_uidx').on(table.contentFingerprint),
  ]
);

export const ingredients = sqliteTable('ingredients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  originalText: text('original_text').notNull(),
  name: text('name').notNull(),
  amount: real('amount'),
  amountMax: real('amount_max'),
  unit: text('unit'),
  qualitative: text('qualitative'),
  preparation: text('preparation'),
  optional: integer('optional', { mode: 'boolean' }).notNull().default(false),
  pantryDefault: integer('pantry_default', { mode: 'boolean' }).notNull().default(false),
  groupLabel: text('group_label'),
  position: integer('position').notNull().default(0),
});

export const instructions = sqliteTable('instructions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  position: integer('position').notNull().default(0),
});

export const tags = sqliteTable(
  'tags',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
  },
  (table) => [uniqueIndex('tags_name_uidx').on(table.name)]
);

export const recipeTags = sqliteTable(
  'recipe_tags',
  {
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    tagId: integer('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('recipe_tags_uidx').on(table.recipeId, table.tagId)]
);

export const importJobs = sqliteTable('import_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceType: text('source_type').notNull(),
  sourceUrl: text('source_url'),
  sourceText: text('source_text'),
  status: text('status').notNull().default('queued'),
  stageMessage: text('stage_message'),
  error: text('error'),
  recipeId: integer('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  duplicateOfRecipeId: integer('duplicate_of_recipe_id').references(() => recipes.id, {
    onDelete: 'set null',
  }),
  imageWarning: text('image_warning'),
  attemptCount: integer('attempt_count').notNull().default(0),
  lockedAt: text('locked_at'),
  completedAt: text('completed_at'),
  ...timestamps,
});

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  valueJson: text('value_json').notNull(),
  ...timestamps,
});

export const swiggyOAuthClients = sqliteTable('swiggy_oauth_clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret'),
  redirectUri: text('redirect_uri').notNull(),
  metadataJson: text('metadata_json'),
  ...timestamps,
});

export const swiggyOAuthStates = sqliteTable('swiggy_oauth_states', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  state: text('state').notNull().unique(),
  codeVerifier: text('code_verifier').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const swiggyTokens = sqliteTable('swiggy_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accessToken: text('access_token').notNull(),
  tokenType: text('token_type').notNull().default('Bearer'),
  scope: text('scope'),
  expiresAt: text('expires_at').notNull(),
  ...timestamps,
});

export const foodProposals = sqliteTable(
  'food_proposals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    addressId: text('address_id').notNull(),
    addressDisplay: text('address_display'),
    offersJson: text('offers_json').notNull().default('[]'),
    selectedOfferId: text('selected_offer_id'),
    selectedCustomizationJson: text('selected_customization_json'),
    capturedAt: text('captured_at').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('food_proposals_recipe_uidx').on(table.recipeId)]
);

export const ingredientBaskets = sqliteTable(
  'ingredient_baskets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    addressId: text('address_id').notNull(),
    addressDisplay: text('address_display'),
    targetServings: real('target_servings').notNull(),
    sourceServings: real('source_servings'),
    linesJson: text('lines_json').notNull().default('[]'),
    estimatedTotal: real('estimated_total'),
    capturedAt: text('captured_at').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('ingredient_baskets_recipe_uidx').on(table.recipeId)]
);

export const cartReviews = sqliteTable('cart_reviews', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  addressId: text('address_id').notNull(),
  addressDisplay: text('address_display'),
  payloadHash: text('payload_hash').notNull(),
  liveCartSnapshotJson: text('live_cart_snapshot_json').notNull(),
  proposedPayloadJson: text('proposed_payload_json').notNull(),
  warningsJson: text('warnings_json').notNull().default('[]'),
  consumedAt: text('consumed_at'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

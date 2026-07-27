import type { Recipe, RecipeSummary, StructuredRecipeLlm } from '@shared/types';
import { db } from '@server/db';
import { ingredients, instructions, recipeTags, recipes, tags } from '@server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

function nowIso(): string {
  return new Date().toISOString();
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function getTagsForRecipe(recipeId: number): string[] {
  return db
    .select({ name: tags.name })
    .from(recipeTags)
    .innerJoin(tags, eq(tags.id, recipeTags.tagId))
    .where(eq(recipeTags.recipeId, recipeId))
    .all()
    .map((row) => row.name);
}

function refreshFts(recipeId: number): void {
  const recipe = db.select().from(recipes).where(eq(recipes.id, recipeId)).get();
  if (!recipe) {
    return;
  }
  const ingredientRows = db.select().from(ingredients).where(eq(ingredients.recipeId, recipeId)).all();
  const tagNames = getTagsForRecipe(recipeId);
  const ingredientText = ingredientRows.map((row) => row.name).join(' ');
  const tagText = tagNames.join(' ');

  db.run(
    sql`INSERT INTO recipes_fts(recipes_fts, rowid, title, ingredients, tags) VALUES('delete', ${recipeId}, ${recipe.title}, '', '')`
  );
  db.run(
    sql`INSERT INTO recipes_fts(rowid, title, ingredients, tags) VALUES (${recipeId}, ${recipe.title}, ${ingredientText}, ${tagText})`
  );
}

function ensureTags(names: string[]): number[] {
  const ids: number[] = [];
  for (const name of names.map((entry) => entry.trim().toLowerCase()).filter(Boolean)) {
    const existing = db.select().from(tags).where(eq(tags.name, name)).get();
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const created = db.insert(tags).values({ name }).returning().get();
    if (created) {
      ids.push(created.id);
    }
  }
  return ids;
}

export function mapRecipe(recipeId: number): Recipe | null {
  const recipe = db.select().from(recipes).where(eq(recipes.id, recipeId)).get();
  if (!recipe) {
    return null;
  }
  const ingredientRows = db
    .select()
    .from(ingredients)
    .where(eq(ingredients.recipeId, recipeId))
    .orderBy(ingredients.position)
    .all();
  const instructionRows = db
    .select()
    .from(instructions)
    .where(eq(instructions.recipeId, recipeId))
    .orderBy(instructions.position)
    .all();
  const tagNames = getTagsForRecipe(recipeId);

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    yieldText: recipe.yieldText,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    totalTimeMinutes: recipe.totalTimeMinutes,
    cuisine: recipe.cuisine,
    dishName: recipe.dishName,
    searchAliases: parseJsonArray(recipe.searchAliasesJson),
    tags: tagNames,
    favorite: recipe.favorite,
    notes: recipe.notes,
    ingredients: ingredientRows.map((row) => ({
      id: row.id,
      originalText: row.originalText,
      name: row.name,
      quantity:
        row.amount || row.amountMax || row.unit || row.qualitative
          ? {
              amount: row.amount ?? undefined,
              amountMax: row.amountMax ?? undefined,
              unit: row.unit ?? undefined,
              qualitative: row.qualitative ?? undefined,
            }
          : undefined,
      preparation: row.preparation ?? undefined,
      optional: row.optional,
      pantryDefault: row.pantryDefault,
      group: row.groupLabel ?? undefined,
      position: row.position,
    })),
    instructions: instructionRows.map((row) => ({
      id: row.id,
      text: row.text,
      position: row.position,
    })),
    image: {
      objectKey: recipe.imageObjectKey,
      sourceUrl: recipe.imageSourceUrl,
      contentType: recipe.imageContentType,
      warning: recipe.imageWarning,
    },
    source: {
      sourceUrl: recipe.sourceUrl,
      canonicalUrl: recipe.canonicalUrl,
      cleanedText: recipe.cleanedText,
      contentFingerprint: recipe.contentFingerprint,
      jsonLdPresent: recipe.jsonLdPresent,
    },
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
  };
}

export async function listRecipes(params: { q?: string; tag?: string; favorite?: boolean }): Promise<RecipeSummary[]> {
  let ids: number[] | null = null;

  if (params.q?.trim()) {
    const fts = db.all<{ id: number }>(
      sql`SELECT rowid AS id FROM recipes_fts WHERE recipes_fts MATCH ${params.q.trim()} ORDER BY rank`
    );
    ids = fts.map((row) => row.id);
    if (ids.length === 0) {
      return [];
    }
  }

  const rows = db.select().from(recipes).orderBy(desc(recipes.updatedAt)).all();
  const filtered: RecipeSummary[] = [];
  for (const row of rows) {
    if (ids && !ids.includes(row.id)) {
      continue;
    }
    if (params.favorite !== undefined && row.favorite !== params.favorite) {
      continue;
    }
    const tagNames = getTagsForRecipe(row.id);
    if (params.tag && !tagNames.includes(params.tag.toLowerCase())) {
      continue;
    }
    filtered.push({
      id: row.id,
      title: row.title,
      description: row.description,
      dishName: row.dishName,
      favorite: row.favorite,
      tags: tagNames,
      imageObjectKey: row.imageObjectKey,
      imageWarning: row.imageWarning,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
  return filtered;
}

export async function getRecipe(id: number): Promise<Recipe | null> {
  return mapRecipe(id);
}

export async function findByCanonicalUrl(canonicalUrl: string): Promise<Recipe | null> {
  const row = db.select().from(recipes).where(eq(recipes.canonicalUrl, canonicalUrl)).get();
  return row ? mapRecipe(row.id) : null;
}

export async function findByFingerprint(fingerprint: string): Promise<Recipe | null> {
  const row = db.select().from(recipes).where(eq(recipes.contentFingerprint, fingerprint)).get();
  return row ? mapRecipe(row.id) : null;
}

export type RecipeWriteInput = {
  title: string;
  description?: string | null;
  yieldText?: string | null;
  servings?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  totalTimeMinutes?: number | null;
  cuisine?: string | null;
  dishName?: string | null;
  searchAliases?: string[];
  tags?: string[];
  notes?: string | null;
  favorite?: boolean;
  ingredients: Array<{
    originalText: string;
    name: string;
    amount?: number | null;
    amountMax?: number | null;
    unit?: string | null;
    qualitative?: string | null;
    preparation?: string | null;
    optional?: boolean;
    pantryDefault?: boolean;
    group?: string | null;
  }>;
  instructions: Array<{ text: string }>;
  sourceUrl?: string | null;
  canonicalUrl?: string | null;
  cleanedText?: string | null;
  contentFingerprint?: string | null;
  jsonLdPresent?: boolean;
  imageObjectKey?: string | null;
  imageSourceUrl?: string | null;
  imageContentType?: string | null;
  imageWarning?: string | null;
  inferredFields?: string[];
};

export function structuredToWriteInput(
  structured: StructuredRecipeLlm,
  extras: Partial<RecipeWriteInput> = {}
): RecipeWriteInput {
  return {
    title: structured.title,
    description: structured.description,
    yieldText: structured.yieldText,
    servings: structured.servings,
    prepTimeMinutes: structured.prepTimeMinutes,
    cookTimeMinutes: structured.cookTimeMinutes,
    totalTimeMinutes: structured.totalTimeMinutes,
    cuisine: structured.cuisine,
    dishName: structured.dishName,
    searchAliases: structured.searchAliases,
    tags: structured.tags,
    notes: structured.notes,
    ingredients: structured.ingredients.map((ingredient) => ({
      originalText: ingredient.originalText,
      name: ingredient.name,
      amount: ingredient.amount,
      amountMax: ingredient.amountMax,
      unit: ingredient.unit,
      qualitative: ingredient.qualitative,
      preparation: ingredient.preparation,
      optional: ingredient.optional,
      pantryDefault: ingredient.pantryDefault,
      group: ingredient.group,
    })),
    instructions: structured.instructions,
    inferredFields: structured.inferredFields,
    ...extras,
  };
}

export async function createRecipe(input: RecipeWriteInput): Promise<Recipe> {
  const recipe = db
    .insert(recipes)
    .values({
      title: input.title,
      description: input.description ?? null,
      yieldText: input.yieldText ?? null,
      servings: input.servings ?? null,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      cookTimeMinutes: input.cookTimeMinutes ?? null,
      totalTimeMinutes: input.totalTimeMinutes ?? null,
      cuisine: input.cuisine ?? null,
      dishName: input.dishName ?? null,
      searchAliasesJson: JSON.stringify(input.searchAliases ?? []),
      notes: input.notes ?? null,
      favorite: input.favorite ?? false,
      sourceUrl: input.sourceUrl ?? null,
      canonicalUrl: input.canonicalUrl ?? null,
      cleanedText: input.cleanedText ?? null,
      contentFingerprint: input.contentFingerprint ?? null,
      jsonLdPresent: input.jsonLdPresent ?? false,
      imageObjectKey: input.imageObjectKey ?? null,
      imageSourceUrl: input.imageSourceUrl ?? null,
      imageContentType: input.imageContentType ?? null,
      imageWarning: input.imageWarning ?? null,
      inferredFieldsJson: JSON.stringify(input.inferredFields ?? []),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    .returning()
    .get();

  if (!recipe) {
    throw new Error('Failed to create recipe');
  }

  if (input.ingredients.length > 0) {
    db.insert(ingredients)
      .values(
        input.ingredients.map((ingredient, index) => ({
          recipeId: recipe.id,
          originalText: ingredient.originalText,
          name: ingredient.name,
          amount: ingredient.amount ?? null,
          amountMax: ingredient.amountMax ?? null,
          unit: ingredient.unit ?? null,
          qualitative: ingredient.qualitative ?? null,
          preparation: ingredient.preparation ?? null,
          optional: ingredient.optional ?? false,
          pantryDefault: ingredient.pantryDefault ?? false,
          groupLabel: ingredient.group ?? null,
          position: index,
        }))
      )
      .run();
  }

  if (input.instructions.length > 0) {
    db.insert(instructions)
      .values(
        input.instructions.map((instruction, index) => ({
          recipeId: recipe.id,
          text: instruction.text,
          position: index,
        }))
      )
      .run();
  }

  const tagIds = ensureTags(input.tags ?? []);
  if (tagIds.length > 0) {
    db.insert(recipeTags)
      .values(tagIds.map((tagId) => ({ recipeId: recipe.id, tagId })))
      .run();
  }

  refreshFts(recipe.id);
  const mapped = mapRecipe(recipe.id);
  if (!mapped) {
    throw new Error('Failed to load created recipe');
  }
  return mapped;
}

export async function updateRecipe(
  id: number,
  input: Partial<RecipeWriteInput> & { favorite?: boolean }
): Promise<Recipe> {
  const existing = mapRecipe(id);
  if (!existing) {
    throw new Error('Recipe not found');
  }

  db.update(recipes)
    .set({
      title: input.title ?? existing.title,
      description: input.description === undefined ? (existing.description ?? null) : input.description,
      yieldText: input.yieldText === undefined ? (existing.yieldText ?? null) : input.yieldText,
      servings: input.servings === undefined ? (existing.servings ?? null) : input.servings,
      prepTimeMinutes: input.prepTimeMinutes === undefined ? (existing.prepTimeMinutes ?? null) : input.prepTimeMinutes,
      cookTimeMinutes: input.cookTimeMinutes === undefined ? (existing.cookTimeMinutes ?? null) : input.cookTimeMinutes,
      totalTimeMinutes:
        input.totalTimeMinutes === undefined ? (existing.totalTimeMinutes ?? null) : input.totalTimeMinutes,
      cuisine: input.cuisine === undefined ? (existing.cuisine ?? null) : input.cuisine,
      dishName: input.dishName === undefined ? (existing.dishName ?? null) : input.dishName,
      searchAliasesJson: JSON.stringify(input.searchAliases ?? existing.searchAliases),
      notes: input.notes === undefined ? (existing.notes ?? null) : input.notes,
      favorite: input.favorite ?? existing.favorite,
      imageObjectKey: input.imageObjectKey === undefined ? (existing.image?.objectKey ?? null) : input.imageObjectKey,
      imageSourceUrl: input.imageSourceUrl === undefined ? (existing.image?.sourceUrl ?? null) : input.imageSourceUrl,
      imageContentType:
        input.imageContentType === undefined ? (existing.image?.contentType ?? null) : input.imageContentType,
      imageWarning: input.imageWarning === undefined ? (existing.image?.warning ?? null) : input.imageWarning,
      updatedAt: nowIso(),
    })
    .where(eq(recipes.id, id))
    .run();

  if (input.ingredients) {
    db.delete(ingredients).where(eq(ingredients.recipeId, id)).run();
    if (input.ingredients.length > 0) {
      db.insert(ingredients)
        .values(
          input.ingredients.map((ingredient, index) => ({
            recipeId: id,
            originalText: ingredient.originalText,
            name: ingredient.name,
            amount: ingredient.amount ?? null,
            amountMax: ingredient.amountMax ?? null,
            unit: ingredient.unit ?? null,
            qualitative: ingredient.qualitative ?? null,
            preparation: ingredient.preparation ?? null,
            optional: ingredient.optional ?? false,
            pantryDefault: ingredient.pantryDefault ?? false,
            groupLabel: ingredient.group ?? null,
            position: index,
          }))
        )
        .run();
    }
  }

  if (input.instructions) {
    db.delete(instructions).where(eq(instructions.recipeId, id)).run();
    if (input.instructions.length > 0) {
      db.insert(instructions)
        .values(
          input.instructions.map((instruction, index) => ({
            recipeId: id,
            text: instruction.text,
            position: index,
          }))
        )
        .run();
    }
  }

  if (input.tags) {
    db.delete(recipeTags).where(eq(recipeTags.recipeId, id)).run();
    const tagIds = ensureTags(input.tags);
    if (tagIds.length > 0) {
      db.insert(recipeTags)
        .values(tagIds.map((tagId) => ({ recipeId: id, tagId })))
        .run();
    }
  }

  refreshFts(id);
  const mapped = mapRecipe(id);
  if (!mapped) {
    throw new Error('Recipe not found after update');
  }
  return mapped;
}

export async function deleteRecipe(id: number): Promise<void> {
  const existing = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!existing) {
    throw new Error('Recipe not found');
  }
  db.run(
    sql`INSERT INTO recipes_fts(recipes_fts, rowid, title, ingredients, tags) VALUES('delete', ${id}, ${existing.title}, '', '')`
  );
  db.delete(recipes).where(eq(recipes.id, id)).run();
}

export async function toggleFavorite(id: number): Promise<Recipe> {
  const existing = mapRecipe(id);
  if (!existing) {
    throw new Error('Recipe not found');
  }
  return updateRecipe(id, { favorite: !existing.favorite });
}

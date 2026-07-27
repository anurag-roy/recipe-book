import type { Recipe, RecipeSummary } from '@shared/types';
import { api } from '@client/lib/api';
import { queryOptions } from '@tanstack/react-query';

export type RecipeListParams = {
  q?: string;
  tag?: string;
  favorite?: boolean;
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const recipesQueryOptions = (params: RecipeListParams = {}) =>
  queryOptions({
    queryKey: ['recipes', params],
    queryFn: async () => {
      const response = await api.recipes.$get({
        query: {
          q: params.q,
          tag: params.tag,
          favorite: params.favorite === undefined ? undefined : params.favorite ? 'true' : 'false',
        },
      });
      return parseJson<RecipeSummary[]>(response);
    },
  });

export const recipeQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const response = await api.recipes[':id'].$get({ param: { id: String(id) } });
      return parseJson<Recipe>(response);
    },
  });

export async function createRecipe(body: unknown) {
  const response = await api.recipes.$post({ json: body as never });
  return parseJson<Recipe>(response);
}

export async function updateRecipe(id: number, body: unknown) {
  const response = await api.recipes[':id'].$patch({
    param: { id: String(id) },
    json: body as never,
  });
  return parseJson<Recipe>(response);
}

export async function deleteRecipe(id: number) {
  const response = await api.recipes[':id'].$delete({ param: { id: String(id) } });
  return parseJson<{ id: number }>(response);
}

export async function toggleFavorite(id: number) {
  const response = await api.recipes[':id'].favorite.$post({ param: { id: String(id) } });
  return parseJson<Recipe>(response);
}

export function recipeImageUrl(objectKey: string | null | undefined): string | null {
  if (!objectKey) {
    return null;
  }
  return `/api/images/${encodeURIComponent(objectKey)}`;
}

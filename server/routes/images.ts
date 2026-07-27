import { sha256Hex } from '@server/lib/hash';
import { deleteObject, getObject, imageObjectKey, putObject } from '@server/lib/object-storage';
import { getRecipe, updateRecipe } from '@server/services/recipes/repository';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

function parseId(value: string): number {
  const id = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HTTPException(400, { message: 'Invalid recipe id' });
  }
  return id;
}

export const imagesRoute = new Hono()
  .get('/:key{.+}', async (c) => {
    const key = decodeURIComponent(c.req.param('key'));
    if (!key || key.includes('..')) {
      throw new HTTPException(400, { message: 'Invalid object key' });
    }
    try {
      const object = await getObject(key);
      return new Response(Buffer.from(object.data), {
        headers: {
          'content-type': object.contentType ?? 'application/octet-stream',
          'cache-control': 'private, max-age=3600',
        },
      });
    } catch {
      throw new HTTPException(404, { message: 'Image not found' });
    }
  })
  .post('/recipes/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const recipe = await getRecipe(id);
    if (!recipe) {
      throw new HTTPException(404, { message: 'Recipe not found' });
    }

    const contentType = (c.req.header('content-type') ?? 'application/octet-stream').split(';')[0]?.trim() ?? '';
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(contentType)) {
      throw new HTTPException(400, { message: 'Unsupported image type' });
    }

    const buffer = new Uint8Array(await c.req.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
      throw new HTTPException(400, { message: 'Image must be between 1 byte and 5MB' });
    }

    const objectKey = imageObjectKey(sha256Hex(buffer), contentType);
    await putObject(objectKey, buffer, contentType);
    if (recipe.image?.objectKey && recipe.image.objectKey !== objectKey) {
      await deleteObject(recipe.image.objectKey).catch(() => undefined);
    }

    const updated = await updateRecipe(id, {
      imageObjectKey: objectKey,
      imageContentType: contentType,
      imageWarning: null,
    });
    return c.json(updated);
  })
  .delete('/recipes/:id', async (c) => {
    const id = parseId(c.req.param('id'));
    const recipe = await getRecipe(id);
    if (!recipe) {
      throw new HTTPException(404, { message: 'Recipe not found' });
    }
    if (recipe.image?.objectKey) {
      await deleteObject(recipe.image.objectKey).catch(() => undefined);
    }
    const updated = await updateRecipe(id, {
      imageObjectKey: null,
      imageSourceUrl: null,
      imageContentType: null,
      imageWarning: null,
    });
    return c.json(updated);
  });

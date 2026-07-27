import { routeValidator } from '@server/lib/middlewares/validator';
import { createImportJob, getImportJob, listImportJobs, retryImportJob } from '@server/services/imports/worker';
import { createImportJobSchema } from '@shared/schemas';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

function parseId(value: string): number {
  const id = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HTTPException(400, { message: 'Invalid import job id' });
  }
  return id;
}

export const importsRoute = new Hono()
  .get('/', async (c) => c.json(await listImportJobs()))
  .post('/', routeValidator('json', createImportJobSchema), async (c) => {
    const body = c.req.valid('json');
    const job = await createImportJob(
      body.sourceType === 'url'
        ? { sourceType: 'url', sourceUrl: body.sourceUrl }
        : { sourceType: 'text', sourceText: body.sourceText }
    );
    return c.json(job, 201);
  })
  .get('/:id', async (c) => {
    const job = await getImportJob(parseId(c.req.param('id')));
    if (!job) {
      throw new HTTPException(404, { message: 'Import job not found' });
    }
    return c.json(job);
  })
  .post('/:id/retry', async (c) => {
    try {
      return c.json(await retryImportJob(parseId(c.req.param('id'))));
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : 'Retry failed',
        cause: error,
      });
    }
  });

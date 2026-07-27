import app from '@server/app';
import { env } from '@server/lib/env';
import { logger } from '@server/lib/logger';
import { startImportWorker } from '@server/services/imports/worker';

const server = Bun.serve({
  fetch: app.fetch,
  port: env.PORT,
});

startImportWorker();

logger.info(`Server starting on http://localhost:${server.port}`);

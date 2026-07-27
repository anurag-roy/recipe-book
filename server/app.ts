import { logger } from '@server/lib/logger';
import { httpLogger } from '@server/lib/middlewares/http-logger';
import { imagesRoute } from '@server/routes/images';
import { importsRoute } from '@server/routes/imports';
import { recipesRoute } from '@server/routes/recipes';
import { settingsRoute } from '@server/routes/settings';
import { swiggyRoute } from '@server/routes/swiggy';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { HTTPException } from 'hono/http-exception';

const app = new Hono();

app.use('*', httpLogger());

const apiRoutes = app
  .basePath('/api')
  .route('/recipes', recipesRoute)
  .route('/imports', importsRoute)
  .route('/images', imagesRoute)
  .route('/swiggy', swiggyRoute)
  .route('/settings', settingsRoute);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.cause instanceof Error) {
      err.message = err.message + ': ' + err.cause.message;
    }
    return err.getResponse();
  } else if (err instanceof Error) {
    logger.error(err.message);
  } else {
    logger.error(err);
  }
  return c.json({ message: 'Internal server error. Please try again later.' }, 500);
});

app.get('*', serveStatic({ root: './client/dist' }));
app.get('*', serveStatic({ path: './client/dist/index.html' }));

export type ApiRoutes = typeof apiRoutes;
export default app;

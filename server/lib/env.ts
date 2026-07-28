import { logger } from '@server/lib/logger';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('.data/database.db'),
  DEMO_MODE: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((value) => value === 'true' || value === '1'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.4-nano'),
  OPENAI_TRACING: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_ACCESS_KEY_ID: z.string().default('minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().default('minioadmin'),
  S3_BUCKET: z.string().default('food-journal'),
  S3_REGION: z.string().default('us-east-1'),
  SWIGGY_MCP_FOOD_URL: z.string().default('https://mcp.swiggy.com/food'),
  SWIGGY_MCP_INSTAMART_URL: z.string().default('https://mcp.swiggy.com/im'),
  SWIGGY_OAUTH_AUTHORIZE_URL: z.string().default('https://mcp.swiggy.com/auth/authorize'),
  SWIGGY_OAUTH_TOKEN_URL: z.string().default('https://mcp.swiggy.com/auth/token'),
  SWIGGY_OAUTH_REGISTER_URL: z.string().default('https://mcp.swiggy.com/auth/register'),
  SWIGGY_OAUTH_LOGOUT_URL: z.string().default('https://mcp.swiggy.com/auth/logout'),
  SWIGGY_OAUTH_REDIRECT_URI: z.string().default('http://localhost:3000/api/swiggy/callback'),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  PUBLIC_URL_FETCH_TIMEOUT_MS: z.coerce.number().default(15_000),
  PUBLIC_URL_FETCH_MAX_BYTES: z.coerce.number().default(2_000_000),
  PUBLIC_URL_FETCH_MAX_REDIRECTS: z.coerce.number().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error(
    'Missing or invalid environment variables:',
    parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
  );
  process.exit(1);
}

export const env = parsed.data;

export function resolveDatabasePath(databaseUrl: string): string {
  return databaseUrl.startsWith('file:') ? databaseUrl.slice('file:'.length) : databaseUrl;
}

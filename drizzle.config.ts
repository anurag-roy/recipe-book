import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL ?? '.data/database.db';
const url = databaseUrl.startsWith('file:') ? databaseUrl.slice('file:'.length) : databaseUrl;

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url,
  },
  verbose: true,
  strict: true,
});

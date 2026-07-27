import { resolveDatabasePath, env } from '@server/lib/env';
import { logger } from '@server/lib/logger';
import { Database } from 'bun:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const databasePath = resolveDatabasePath(env.DATABASE_URL);
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath, { create: true });
sqlite.exec('PRAGMA foreign_keys = ON');
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __sql_migrations (
    id TEXT PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const migrationsDir = join(import.meta.dir, '../../drizzle');
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const applied = new Set(
  sqlite
    .query<{ id: string }, []>('SELECT id FROM __sql_migrations')
    .all()
    .map((row) => row.id)
);

for (const file of files) {
  if (applied.has(file)) {
    continue;
  }

  const sql = readFileSync(join(migrationsDir, file), 'utf8');
  const statements = sql
    .split('--> statement-breakpoint')
    .map((part) => part.trim())
    .filter(Boolean);

  const apply = sqlite.transaction(() => {
    for (const statement of statements) {
      sqlite.exec(statement);
    }
    sqlite.query('INSERT INTO __sql_migrations (id) VALUES (?)').run(file);
  });

  apply();
  logger.info(`Applied migration ${file}`);
}

logger.info('Migrations complete');
sqlite.close();

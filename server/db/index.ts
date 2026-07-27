import { resolveDatabasePath, env } from '@server/lib/env';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const databasePath = resolveDatabasePath(env.DATABASE_URL);
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath, { create: true });
sqlite.exec('PRAGMA busy_timeout = 5000');
sqlite.exec('PRAGMA journal_mode = WAL');
sqlite.exec('PRAGMA foreign_keys = ON');

export const db = drizzle({ client: sqlite });
export const closeDb = () => sqlite.close();

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import * as schema from './schema.js';

export function createDb(url = process.env.DATABASE_URL ?? 'users.db') {
  const db = drizzle({ client: new Database(url), schema });
  migrate(db, { migrationsFolder: path.join(import.meta.dirname, '../../drizzle') });
  return db;
}

export type Db = ReturnType<typeof createDb>;

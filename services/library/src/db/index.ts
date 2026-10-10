import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import * as schema from './schema.js';

export function createDb(url = process.env.DATABASE_URL ?? 'library.db') {
  const client = new Database(url);
  client.pragma('foreign_keys = ON');
  const db = drizzle({ client, schema });
  migrate(db, { migrationsFolder: path.join(import.meta.dirname, '../../drizzle') });
  return db;
}

export type Db = ReturnType<typeof createDb>;

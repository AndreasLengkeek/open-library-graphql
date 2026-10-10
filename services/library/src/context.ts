import type { Db } from './db/index.js';

// The signed-in User, or null when anonymous. Set from the Authorization header in 03.2.
export type Viewer = { id: string };

export type Context = {
  db: Db;
  viewer: Viewer | null;
};

import type { IncomingMessage } from 'http';
import { viewerFromAuthHeader, type Viewer } from '@olg/auth';
import type { Db } from './db/index.js';

export type { Viewer };

export type Context = {
  db: Db;
  viewer: Viewer | null;
};

export function createContext(db: Db) {
  return async ({ req }: { req: Pick<IncomingMessage, 'headers'> }): Promise<Context> => {
    const viewer = await viewerFromAuthHeader(req.headers.authorization);
    return {
      db,
      viewer,
    };
  };
}

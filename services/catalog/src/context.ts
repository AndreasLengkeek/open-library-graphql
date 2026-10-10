import type { IncomingMessage } from 'http';
import { viewerFromAuthHeader, type Viewer } from '@olg/auth';
import { createOpenLibraryClient, type OpenLibraryClient } from './datasources/openLibrary.js';

export type { Viewer };

export type Context = {
  openLibrary: OpenLibraryClient;
  viewer: Viewer | null;
};

export function createContext(openLibrary: () => OpenLibraryClient = createOpenLibraryClient) {
  return async ({ req }: { req: Pick<IncomingMessage, 'headers'> }): Promise<Context> => {
    const viewer = await viewerFromAuthHeader(req.headers.authorization);
    return { openLibrary: openLibrary(), viewer };
  };
}

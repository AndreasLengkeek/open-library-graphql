import { startStandaloneServer } from '@apollo/server/standalone';
import { createServer } from './server.js';
import { createContext } from './context.js';
import { createOpenLibraryClient, createRequestCounter } from './datasources/openLibrary.js';
import { createDebugServer } from './debugServer.js';

/** Where `scripts/measure.ts` reads the Open Library request count. Bound to localhost only. */
const DEBUG_PORT = 4012;

async function startApolloServer() {
  const server = createServer();
  const openLibraryRequests = createRequestCounter();
  const { url } = await startStandaloneServer(server, {
    context: createContext(() => createOpenLibraryClient({ counter: openLibraryRequests })),
    listen: {
      port: 4002,
    },
  });
  createDebugServer(openLibraryRequests).listen(DEBUG_PORT, '127.0.0.1');
  console.log(`
      🚀  Server is running
      📭  Query at ${url}
      🔢  Open Library request count at http://127.0.0.1:${DEBUG_PORT}/open-library-requests
    `);
}
startApolloServer();

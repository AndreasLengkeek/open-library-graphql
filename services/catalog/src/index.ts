import { startStandaloneServer } from '@apollo/server/standalone';
import { createServer } from './server.js';
import type { Context } from './context.js';
import { createOpenLibraryClient } from './datasources/openLibrary.js';

async function startApolloServer() {
  const server = createServer();
  const { url } = await startStandaloneServer(server, {
    context: async (): Promise<Context> => ({ openLibrary: createOpenLibraryClient() }),
    listen: {
      port: 4002,
    },
  });
  console.log(`
      🚀  Server is running
      📭  Query at ${url}
    `);
}
startApolloServer();

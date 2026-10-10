import { startStandaloneServer } from '@apollo/server/standalone';
import { createDb } from './db/index.js';
import { createServer } from './server.js';
import type { Context } from './context.js';

async function startApolloServer() {
  const db = createDb();
  const server = createServer();
  const { url } = await startStandaloneServer(server, {
    context: async (): Promise<Context> => {
      return {
        db,
        // TODO 03.2: build the Viewer from the Authorization header.
        viewer: null,
      };
    },
    listen: {
      port: 4003,
    },
  });
  console.log(`
      🚀  Server is running
      📭  Query at ${url}
    `);
}
startApolloServer();

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
      };
    },
    listen: {
      port: 4001,
    },
  });
  console.log(`
      🚀  Server is running
      📭  Query at ${url}
    `);
}
startApolloServer();

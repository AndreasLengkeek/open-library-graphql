import { startStandaloneServer } from '@apollo/server/standalone';
import { createDb } from './db/index.js';
import { createServer } from './server.js';
import { createContext } from './context.js';

async function startApolloServer() {
  const db = createDb();
  const server = createServer();
  const { url } = await startStandaloneServer(server, {
    context: createContext(db),
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

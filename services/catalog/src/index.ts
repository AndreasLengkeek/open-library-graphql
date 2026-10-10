import { startStandaloneServer } from '@apollo/server/standalone';
import { createServer } from './server.js';
import { createContext } from './context.js';

async function startApolloServer() {
  const server = createServer();
  const { url } = await startStandaloneServer(server, {
    context: createContext(),
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

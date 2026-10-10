import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { readFileSync } from 'fs';
import path from 'path';
import { gql } from 'graphql-tag';
import { resolvers } from './resolvers.js';
import type { Context } from './context.js';

const typeDefs = gql(
  readFileSync(path.resolve(import.meta.dirname, '../schema.graphql'), {
    encoding: 'utf-8',
  }),
);

export function createServer() {
  return new ApolloServer<Context>({
    schema: buildSubgraphSchema([
      {
        typeDefs,
        resolvers,
      },
    ]),
  });
}

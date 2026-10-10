import { GraphQLError } from 'graphql';
import { isWorkId } from './ids.js';
import { toBook } from './mappers.js';
import type { Resolvers } from './types.generated.js';

export const resolvers: Resolvers = {
  Query: {
    book: async (_, { id }, { openLibrary }) => {
      if (!isWorkId(id)) {
        throw new GraphQLError(`"${id}" is not in an Open Library Work key format.`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const doc = await openLibrary.getWork(id);
      return doc && toBook(doc);
    },
    searchBooks: async (_, { query, first }, { openLibrary }) => {
      const docs = await openLibrary.searchWorks(query, first);
      return docs.map(toBook);
    },
  },
  Book: {
    // Deliberately naive: one Open Library request per reference. 04.2 batches these.
    __resolveReference: async ({ id }, { openLibrary }) => {
      if (!isWorkId(id)) return null;
      const doc = await openLibrary.getWork(id);
      return doc && toBook(doc);
    },
  },
};

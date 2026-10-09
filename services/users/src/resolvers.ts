import { eq } from 'drizzle-orm';
import { users } from './db/schema.js';
import type { Context } from './context.js';

type Resolvers = {
  Query: {
    me: () => unknown;
    user: (parent: unknown, params: { username: string }, context: Context) => unknown;
    users: (parent: unknown, params: unknown, context: Context) => unknown;
  };
  User: {
    __resolveReference(a: any, context: Context): unknown;
  };
};

export const resolvers: Resolvers = {
  Query: {
    // temp return of null
    me: () => {
      return null;
    },
    user: (_, { username }, { db }) => {
      console.log('querying', username);
      return db.select().from(users).where(eq(users.username, username)).get() ?? null;
    },
    users: (_, __, { db }) => {
      return db.select().from(users).all();
    },
  },
  User: {
    __resolveReference: (representation, { db }) => {
      console.log('Retreiving use reference', representation);
      const { id } = representation;
      return db.select().from(users).where(eq(users.id, id)).get() ?? null;
    },
  },
};

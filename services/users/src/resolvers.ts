import { eq } from 'drizzle-orm';
import { users } from './db/schema.js';
import type { Resolvers } from './types.generated.js';

export const resolvers: Resolvers = {
  Query: {
    // temp return of null
    me: () => {
      return null;
    },
    user: (_, { username }, { db }) => {
      return db.select().from(users).where(eq(users.username, username)).get() ?? null;
    },
    users: (_, __, { db }) => {
      return db.select().from(users).all();
    },
  },
  User: {
    __resolveReference: (representation, { db }) => {
      const { id } = representation;
      return db.select().from(users).where(eq(users.id, id)).get() ?? null;
    },
  },
};

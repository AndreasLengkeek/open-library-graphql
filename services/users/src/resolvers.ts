import { eq } from 'drizzle-orm';
import { users } from './db/schema.js';
import type { Resolvers } from './types.generated.js';
import { signToken } from '@olg/auth';
import { GraphQLError } from 'graphql';

export const resolvers: Resolvers = {
  Query: {
    me: (_, __, { db, viewer }) => {
      if (!viewer) return null;

      const user = db.select().from(users).where(eq(users.id, viewer.id)).get();
      return user ?? null;
    },
    user: (_, { username }, { db }) => {
      return db.select().from(users).where(eq(users.username, username)).get() ?? null;
    },
    users: (_, __, { db }) => {
      return db.select().from(users).all();
    },
  },
  Mutation: {
    signUp: async (_, { username, displayName }, { db }) => {
      const exists = await db.select().from(users).where(eq(users.username, username)).get();
      if (exists)
        throw new GraphQLError(`"${username}" already exists.`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });

      const [user] = await db
        .insert(users)
        .values({ username, displayName: displayName ?? username })
        .returning();

      const token = await signToken({ sub: user.id, username });
      return { token, user };
    },
    logIn: async (_, { username }, { db }) => {
      const user = await db.select().from(users).where(eq(users.username, username)).get();
      if (!user)
        throw new GraphQLError(`Incorrect login details for "${username}".`, {
          extensions: { code: 'BAD_USER_INPUT' },
        });

      const token = await signToken({ sub: user.id, username });
      return { token, user };
    },
  },
  User: {
    __resolveReference: (representation, { db }) => {
      const { id } = representation;
      return db.select().from(users).where(eq(users.id, id)).get() ?? null;
    },
  },
};

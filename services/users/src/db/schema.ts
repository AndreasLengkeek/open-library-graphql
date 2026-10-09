import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text('username').notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
});

export type UserRow = typeof users.$inferSelect;

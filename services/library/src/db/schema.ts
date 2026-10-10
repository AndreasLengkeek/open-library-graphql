import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const now = () => new Date().toISOString();

export const readingStatus = sqliteTable(
  'reading_status',
  {
    userId: text('user_id').notNull(),
    bookId: text('book_id').notNull(),
    status: text('status', { enum: ['WANT_TO_READ', 'READING', 'READ'] }).notNull(),
    updatedAt: text('updated_at').notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.bookId] }),
    check('reading_status_enum', sql`${table.status} IN ('WANT_TO_READ', 'READING', 'READ')`),
  ],
);

export const shelves = sqliteTable(
  'shelves',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(now),
  },
  (table) => [uniqueIndex('shelf_user_name').on(table.userId, table.name)],
);

export const shelfBook = sqliteTable(
  'shelf_book',
  {
    shelfId: text('shelf_id')
      .notNull()
      .references(() => shelves.id, { onDelete: 'cascade' }),
    bookId: text('book_id').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(now),
  },
  (table) => [primaryKey({ columns: [table.shelfId, table.bookId] })],
);

export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').notNull(),
    bookId: text('book_id').notNull(),
    text: text('text'),
    rating: integer('rating').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(now),
    updatedAt: text('updated_at').notNull().$defaultFn(now).$onUpdateFn(now),
  },
  (table) => [
    uniqueIndex('review_user_book').on(table.userId, table.bookId),
    index('review_book_id').on(table.bookId),
    check('review_rating', sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

export type ReadingStatusRow = typeof readingStatus.$inferSelect;
export type ShelfRow = typeof shelves.$inferSelect;
export type ShelfBookRow = typeof shelfBook.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;

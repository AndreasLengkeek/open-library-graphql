import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { readingStatus, reviews, shelfBook, shelves } from './db/schema.js';
import type { Resolvers } from './types.generated.js';
import { STATUS_NAMES, STATUS_ORDER, statusShelfId } from './ids.js';

export const resolvers: Resolvers = {
  Mutation: {
    // mutations coming later
    // addToShelf: (parent, params, context) => {},
    // createShelf: (parent, params, context) => {},
    // deleteShelf: (parent, params, context) => {},
    // removeFromShelf: (parent, params, context) => {},
    // renameShelf: (parent, params, context) => {},
    // deleteReview: (parent, params, context) => {},
    // updateReview: (parent, params, context) => {},
    // writeReview: (parent, params, context) => {},
    // setReadingStatus: (parent, params, context) => {},
  },
  Book: {
    __resolveReference: ({ id }) => ({ id }),
    averageRating: ({ id }, _, { db }) => {
      return (
        db
          .select({ avg: sql<number | null>`avg(${reviews.rating})` })
          .from(reviews)
          .where(eq(reviews.bookId, id))
          .get()?.avg ?? null
      );
    },
    reviews: ({ id }, _, { db }) => {
      return db.select().from(reviews).where(eq(reviews.bookId, id)).all();
    },
    viewerReadingStatus: ({ id }, _, { db, viewer }) => {
      if (!viewer) return null;
      return (
        db
          .select({ status: readingStatus.status })
          .from(readingStatus)
          .where(and(eq(readingStatus.userId, viewer.id), eq(readingStatus.bookId, id)))
          .get()?.status ?? null
      );
    },
  },
  User: {
    __resolveReference: ({ id }) => ({ id }),
    shelves: ({ id }, _, { db }) => {
      return [
        ...STATUS_ORDER.map((status) => ({
          kind: 'status' as const,
          userId: id,
          status,
        })),
        ...db
          .select()
          .from(shelves)
          .where(eq(shelves.userId, id))
          .orderBy(asc(shelves.createdAt), asc(shelves.id))
          .all()
          .map((row) => ({ ...row, kind: 'custom' as const })),
      ];
    },
    reviews: ({ id }, _, { db }) => {
      return db.select().from(reviews).where(eq(reviews.userId, id)).all();
    },
  },
  Shelf: {
    __resolveType: (s) => (s.kind === 'status' ? 'StatusShelf' : 'CustomShelf'),
  },
  StatusShelf: {
    id: ({ userId, status }) => statusShelfId(userId, status),
    name: ({ status }) => STATUS_NAMES[status],
    readingStatus: ({ status }) => status,
    user: ({ userId }) => ({ id: userId }),
    books: ({ userId, status }, _, { db }) => {
      return db
        .select({ id: readingStatus.bookId })
        .from(readingStatus)
        .where(and(eq(readingStatus.userId, userId), eq(readingStatus.status, status)))
        .orderBy(desc(readingStatus.updatedAt), asc(readingStatus.bookId))
        .all();
    },
  },
  CustomShelf: {
    id: ({ id }) => id,
    books: ({ id }, _, { db }) => {
      return db
        .select()
        .from(shelfBook)
        .where(eq(shelfBook.shelfId, id))
        .orderBy(desc(shelfBook.createdAt), asc(shelfBook.bookId))
        .all()
        .map((b) => ({ id: b.bookId, __typename: 'Book' }));
    },
    user: ({ userId }) => ({ id: userId }),
  },
  Review: {
    book: ({ bookId }) => ({ id: bookId }),
    user: ({ userId }) => ({ id: userId }),
  },
};

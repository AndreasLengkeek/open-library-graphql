import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDb, type Db } from './db/index.js';
import { createServer } from './server.js';
import type { Viewer } from './context.js';
import {
  readingStatus,
  reviews,
  shelfBook,
  shelves,
  type ReadingStatusRow,
  type ReviewRow,
  type ShelfBookRow,
  type ShelfRow,
} from './db/schema.js';

const server = createServer();

let db: Db;

beforeEach(() => {
  db = createDb(':memory:');
});

async function execute(query: string, variables?: Record<string, unknown>, viewer: Viewer | null = null) {
  const response = await server.executeOperation({ query, variables }, { contextValue: { db, viewer } });
  if (response.body.kind !== 'single') throw new Error('Expected a single result');
  return response.body.singleResult;
}

const entities = (reps: object[], selection: string, viewer: Viewer | null = null) =>
  execute(`query ($reps: [_Any!]!) { _entities(representations: $reps) { ${selection} } }`, { reps }, viewer);

const user = (id: string) => ({ __typename: 'User', id });
const book = (id: string) => ({ __typename: 'Book', id });

function insertShelf(values: Partial<ShelfRow> = {}): ShelfRow {
  return db
    .insert(shelves)
    .values({ name: 'Favourites', userId: 'u1', ...values })
    .returning()
    .get();
}
function insertShelfBook(values: Partial<ShelfBookRow> = {}): ShelfBookRow {
  return db
    .insert(shelfBook)
    .values({ bookId: 'b1', shelfId: 's1', ...values })
    .returning()
    .get();
}
function insertReadingStatus(values: Partial<ReadingStatusRow> = {}): ReadingStatusRow {
  return db
    .insert(readingStatus)
    .values({ bookId: 'b1', userId: 'u1', status: 'WANT_TO_READ', ...values })
    .returning()
    .get();
}
function insertReview(values: Partial<ReviewRow> = {}): ReviewRow {
  return db
    .insert(reviews)
    .values({ bookId: 'b1', userId: 'u1', rating: 4, ...values })
    .returning()
    .get();
}

// Fixed timestamps so ordering tests don't depend on insert speed.
const at = (day: number) => `2026-01-${String(day).padStart(2, '0')}T00:00:00.000Z`;

describe('User reference', () => {
  it('resolves any User id, even one with no rows', async () => {
    const result = await entities([user('u1')], '... on User { id }');

    expect(result.errors).toBeUndefined();
    expect(result.data?._entities).toEqual([{ id: 'u1' }]);
  });

  it('resolves several references in one call, in order', async () => {
    const result = await entities([user('u1'), user('u2'), user('u3')], '... on User { id }');

    expect(result.errors).toBeUndefined();
    expect(result.data?._entities).toEqual([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]);
  });
});

describe('User.shelves', () => {
  it('returns three empty Status Shelves for a User with no rows', async () => {
    const result = await entities([user('u1')], '... on User { shelves { __typename name books { id } } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.shelves).toEqual([
      { __typename: 'StatusShelf', name: 'Want to read', books: [] },
      { __typename: 'StatusShelf', name: 'Reading', books: [] },
      { __typename: 'StatusShelf', name: 'Read', books: [] },
    ]);
  });

  it('gives each Status Shelf a stable id, its Reading Status and its User', async () => {
    const result = await entities(
      [user('u1')],
      '... on User { shelves { id user { id } ... on StatusShelf { readingStatus } } }',
    );

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.shelves).toEqual([
      {
        id: 'status:u1:WANT_TO_READ',
        user: { id: 'u1' },
        readingStatus: 'WANT_TO_READ',
      },
      { id: 'status:u1:READING', user: { id: 'u1' }, readingStatus: 'READING' },
      { id: 'status:u1:READ', user: { id: 'u1' }, readingStatus: 'READ' },
    ]);
  });

  it('lists Custom Shelves after the Status Shelves, oldest created first', async () => {
    const u1 = user('u1');
    const s1 = insertShelf({
      name: 'Favourites',
      userId: u1.id,
      createdAt: at(2),
    });
    const s2 = insertShelf({
      name: 'Bad books',
      userId: u1.id,
      createdAt: at(1),
    });
    const result = await entities([u1], '... on User { shelves { __typename id } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.shelves).toEqual([
      { __typename: 'StatusShelf', id: 'status:u1:WANT_TO_READ' },
      { __typename: 'StatusShelf', id: 'status:u1:READING' },
      { __typename: 'StatusShelf', id: 'status:u1:READ' },
      { __typename: 'CustomShelf', id: s2.id },
      { __typename: 'CustomShelf', id: s1.id },
    ]);
  });

  it("doesn't include another User's Shelves or Reading Statuses", async () => {
    const u1 = user('u1');
    const s1 = insertShelf({
      name: 'User 1 list',
      userId: u1.id,
      createdAt: at(1),
    });
    const s2 = insertShelf({
      name: 'User 2 list',
      userId: user('u2').id,
      createdAt: at(2),
    });
    insertShelfBook({ shelfId: s2.id, bookId: 'OL1W' });
    insertReadingStatus({
      userId: user('u2').id,
      bookId: 'OL1W',
      status: 'READING',
    });
    const result = await entities([u1], '... on User { shelves { id name books { id } } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.shelves).toEqual([
      { id: 'status:u1:WANT_TO_READ', name: 'Want to read', books: [] },
      { id: 'status:u1:READING', name: 'Reading', books: [] },
      { id: 'status:u1:READ', name: 'Read', books: [] },
      { id: s1.id, name: 'User 1 list', books: [] },
    ]);
  });
});

describe('Shelf.books', () => {
  it("lists a Custom Shelf's Books newest added first", async () => {
    const u1 = user('u1');
    const s1 = insertShelf({
      name: 'User 1 list',
      userId: u1.id,
      createdAt: at(1),
    });
    // Inserted out of order, so the test proves sorting rather than insertion order.
    insertShelfBook({ shelfId: s1.id, bookId: 'OL1W', createdAt: at(1) });
    insertShelfBook({ shelfId: s1.id, bookId: 'OL3W', createdAt: at(3) });
    insertShelfBook({ shelfId: s1.id, bookId: 'OL2W', createdAt: at(2) });

    const result = await entities([u1], '... on User { shelves { ... on CustomShelf { books { id } } } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.shelves[3].books).toEqual([{ id: 'OL3W' }, { id: 'OL2W' }, { id: 'OL1W' }]);
  });

  it('puts each Book on the Status Shelf for its Reading Status, newest first', async () => {
    const u1 = user('u1');
    insertReadingStatus({
      userId: u1.id,
      bookId: 'OL1W',
      status: 'READ',
      updatedAt: at(1),
    });
    insertReadingStatus({
      userId: u1.id,
      bookId: 'OL3W',
      status: 'READING',
      updatedAt: at(3),
    });
    insertReadingStatus({
      userId: u1.id,
      bookId: 'OL2W',
      status: 'READ',
      updatedAt: at(2),
    });

    const result = await entities([u1], '... on User { shelves { name books { id } } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.shelves).toEqual([
      { name: 'Want to read', books: [] },
      { name: 'Reading', books: [{ id: 'OL3W' }] },
      { name: 'Read', books: [{ id: 'OL2W' }, { id: 'OL1W' }] },
    ]);
  });

  it('breaks ties on the same timestamp by Book id', async () => {
    const u1 = user('u1');
    const s1 = insertShelf({
      name: 'User 1 list',
      userId: u1.id,
      createdAt: at(1),
    });
    insertShelfBook({ shelfId: s1.id, bookId: 'OL2W', createdAt: at(1) });
    insertShelfBook({ shelfId: s1.id, bookId: 'OL1W', createdAt: at(1) });
    insertReadingStatus({
      userId: u1.id,
      bookId: 'OL2W',
      status: 'READ',
      updatedAt: at(1),
    });
    insertReadingStatus({
      userId: u1.id,
      bookId: 'OL1W',
      status: 'READ',
      updatedAt: at(1),
    });

    const result = await entities([u1], '... on User { shelves { name books { id } } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.shelves).toEqual([
      { name: 'Want to read', books: [] },
      { name: 'Reading', books: [] },
      { name: 'Read', books: [{ id: 'OL1W' }, { id: 'OL2W' }] },
      { name: 'User 1 list', books: [{ id: 'OL1W' }, { id: 'OL2W' }] },
    ]);
  });

  it('shows a Book on two Custom Shelves and its Status Shelf', async () => {
    const u1 = user('u1');
    const s1 = insertShelf({
      name: 'Favourites',
      userId: u1.id,
      createdAt: at(1),
    });
    const s2 = insertShelf({ name: 'Sci-fi', userId: u1.id, createdAt: at(2) });
    insertShelfBook({ shelfId: s1.id, bookId: 'OL1W' });
    insertShelfBook({ shelfId: s2.id, bookId: 'OL1W' });
    insertReadingStatus({ userId: u1.id, bookId: 'OL1W', status: 'READ' });

    const result = await entities([u1], '... on User { shelves { name books { id } } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.shelves).toEqual([
      { name: 'Want to read', books: [] },
      { name: 'Reading', books: [] },
      { name: 'Read', books: [{ id: 'OL1W' }] },
      { name: 'Favourites', books: [{ id: 'OL1W' }] },
      { name: 'Sci-fi', books: [{ id: 'OL1W' }] },
    ]);
  });
});

describe('Book.averageRating', () => {
  it('is the mean of the Ratings, as a number', async () => {
    insertReview({ userId: 'u1', bookId: 'OL1W', rating: 4 });
    insertReview({ userId: 'u2', bookId: 'OL1W', rating: 5 });

    const result = await entities([book('OL1W')], '... on Book { averageRating }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.averageRating).toBe(4.5);
  });

  it('is null when the Book has no Reviews', async () => {
    const result = await entities([book('OL1W')], '... on Book { averageRating }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.averageRating).toBeNull();
  });

  it("ignores other Books' Reviews", async () => {
    insertReview({ userId: 'u1', bookId: 'OL1W', rating: 2 });
    insertReview({ userId: 'u1', bookId: 'OL2W', rating: 5 });

    const result = await entities([book('OL1W')], '... on Book { averageRating }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.averageRating).toBe(2);
  });
});

describe('Book.reviews', () => {
  it("returns the Book's Reviews with references to their User and Book", async () => {
    const review = insertReview({
      userId: 'u1',
      bookId: 'OL1W',
      rating: 5,
      text: 'Loved it',
    });
    insertReview({ userId: 'u1', bookId: 'OL2W' });

    const result = await entities([book('OL1W')], '... on Book { reviews { id rating text user { id } book { id } } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.reviews).toEqual([
      {
        id: review.id,
        rating: 5,
        text: 'Loved it',
        user: { id: 'u1' },
        book: { id: 'OL1W' },
      },
    ]);
  });

  it('returns null text for a Rating-only Review', async () => {
    insertReview({ userId: 'u1', bookId: 'OL1W', rating: 3 });

    const result = await entities([book('OL1W')], '... on Book { reviews { rating text } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.reviews).toEqual([{ rating: 3, text: null }]);
  });

  it('is empty when the Book has no Reviews', async () => {
    insertReview({ userId: 'u1', bookId: 'OL2W' });

    const result = await entities([book('OL1W')], '... on Book { reviews { id } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.reviews).toEqual([]);
  });
});

describe('User.reviews', () => {
  it("returns only that User's Reviews", async () => {
    const mine = insertReview({ userId: 'u1', bookId: 'OL1W' });
    insertReview({ userId: 'u2', bookId: 'OL1W' });

    const result = await entities([user('u1')], '... on User { reviews { id user { id } book { id } } }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.reviews).toEqual([{ id: mine.id, user: { id: 'u1' }, book: { id: 'OL1W' } }]);
  });
});

describe('Book.viewerReadingStatus', () => {
  it('is null without a Viewer', async () => {
    insertReadingStatus({ userId: 'u1', bookId: 'OL1W', status: 'READING' });

    const result = await entities([book('OL1W')], '... on Book { viewerReadingStatus }');

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.viewerReadingStatus).toBeNull();
  });

  it("is the Viewer's Reading Status for the Book", async () => {
    insertReadingStatus({ userId: 'u1', bookId: 'OL1W', status: 'READING' });

    const result = await entities([book('OL1W')], '... on Book { viewerReadingStatus }', { id: 'u1' });

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.viewerReadingStatus).toBe('READING');
  });

  it("ignores another User's Reading Status for the Book", async () => {
    insertReadingStatus({ userId: 'u2', bookId: 'OL1W', status: 'READ' });

    const result = await entities([book('OL1W')], '... on Book { viewerReadingStatus }', { id: 'u1' });

    expect(result.errors).toBeUndefined();
    const [entity] = (result.data as any)._entities;
    expect(entity.viewerReadingStatus).toBeNull();
  });
});

describe('database constraints', () => {
  it('allows one Review per User per Book', () => {
    insertReview({ userId: 'u1', bookId: 'OL1W' });

    expect(() => insertReview({ userId: 'u1', bookId: 'OL1W' })).toThrow();
    expect(() => insertReview({ userId: 'u2', bookId: 'OL1W' })).not.toThrow();
  });

  it.each([0, 6])('rejects a Rating outside 1 to 5 (%i)', (rating) => {
    expect(() => insertReview({ rating })).toThrow();
  });

  it('rejects an unknown Reading Status', () => {
    expect(() => insertReadingStatus({ status: 'DNF' as ReadingStatusRow['status'] })).toThrow();
  });

  it('allows one Reading Status per User per Book', () => {
    insertReadingStatus({ userId: 'u1', bookId: 'OL1W', status: 'READING' });

    expect(() => insertReadingStatus({ userId: 'u1', bookId: 'OL1W', status: 'READ' })).toThrow();
  });

  it('makes Custom Shelf names unique per User', () => {
    insertShelf({ userId: 'u1', name: 'Favourites' });

    expect(() => insertShelf({ userId: 'u1', name: 'Favourites' })).toThrow();
    expect(() => insertShelf({ userId: 'u2', name: 'Favourites' })).not.toThrow();
  });

  it('allows a Book on a Shelf only once', () => {
    const shelf = insertShelf();
    insertShelfBook({ shelfId: shelf.id, bookId: 'OL1W' });

    expect(() => insertShelfBook({ shelfId: shelf.id, bookId: 'OL1W' })).toThrow();
  });

  it("deletes a Shelf's entries with the Shelf", () => {
    const shelf = insertShelf();
    insertShelfBook({ shelfId: shelf.id, bookId: 'OL1W' });

    db.delete(shelves).where(eq(shelves.id, shelf.id)).run();

    expect(db.select().from(shelfBook).all()).toEqual([]);
  });
});

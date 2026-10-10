import { beforeEach, describe, expect, it } from 'vitest';
import { createDb as createUsersDb, type Db as UsersDb } from '../services/users/src/db/index.js';
import { users } from '../services/users/src/db/schema.js';
import { createDb as createLibraryDb, type Db as LibraryDb } from '../services/library/src/db/index.js';
import { readingStatus, reviews, shelfBook, shelves } from '../services/library/src/db/schema.js';
import { SEED_BOOKS, UNKNOWN_BOOK_ID } from './books.js';
import { seed } from './seed.js';

let usersDb: UsersDb;
let libraryDb: LibraryDb;

beforeEach(() => {
  usersDb = createUsersDb(':memory:');
  libraryDb = createLibraryDb(':memory:');
});

const snapshot = () => ({
  users: usersDb.select().from(users).all(),
  readingStatus: libraryDb.select().from(readingStatus).all(),
  shelves: libraryDb.select().from(shelves).all(),
  shelfBook: libraryDb.select().from(shelfBook).all(),
  reviews: libraryDb.select().from(reviews).all(),
});

describe('seed', () => {
  it('leaves the same data when run twice', () => {
    seed(usersDb, libraryDb);
    const first = snapshot();

    seed(usersDb, libraryDb);

    expect(snapshot()).toEqual(first);
    expect(first.users).toHaveLength(3);
  });

  it('removes data that was there before', () => {
    usersDb.insert(users).values({ username: 'stray', displayName: 'Stray' }).run();
    libraryDb.insert(shelves).values({ id: 'stray-shelf', userId: 'stray', name: 'Stray' }).run();
    libraryDb.insert(shelfBook).values({ shelfId: 'stray-shelf', bookId: 'OL1W' }).run();
    libraryDb.insert(readingStatus).values({ userId: 'stray', bookId: 'OL1W', status: 'READ' }).run();
    libraryDb.insert(reviews).values({ userId: 'stray', bookId: 'OL1W', rating: 1 }).run();

    seed(usersDb, libraryDb);

    const after = snapshot();
    expect(after.users.map((u) => u.username).sort()).toEqual(['andreas', 'kai', 'sam']);
    expect(after.shelves.map((s) => s.name)).not.toContain('Stray');
    expect(after.shelfBook.map((sb) => sb.bookId)).not.toContain('OL1W');
    expect(after.readingStatus.map((rs) => rs.userId)).not.toContain('stray');
    expect(after.reviews.map((r) => r.userId)).not.toContain('stray');
  });
});

describe("andreas's seeded library", () => {
  beforeEach(() => seed(usersDb, libraryDb));

  const andreasId = () => usersDb.select().from(users).all().find((u) => u.username === 'andreas')!.id;
  const shelfBookIds = (name: string) => {
    const { shelves: all, shelfBook: rows } = snapshot();
    const shelf = all.find((s) => s.userId === andreasId() && s.name === name)!;
    return rows.filter((row) => row.shelfId === shelf.id).map((row) => row.bookId);
  };

  it('has every seed Book on a Status Shelf, using all three statuses', () => {
    const statuses = snapshot().readingStatus.filter((rs) => rs.userId === andreasId());

    expect(statuses.map((rs) => rs.bookId).sort()).toEqual(SEED_BOOKS.map((b) => b.id).sort());
    expect(new Set(statuses.map((rs) => rs.status))).toEqual(new Set(['WANT_TO_READ', 'READING', 'READ']));
  });

  it('has a Favourites Custom Shelf holding 5 of the seed Books', () => {
    const ids = shelfBookIds('Favourites');

    expect(ids).toHaveLength(5);
    expect(SEED_BOOKS.map((b) => b.id)).toEqual(expect.arrayContaining(ids));
  });

  it('has the unknown Book on a Custom Shelf', () => {
    const shelved = snapshot()
      .shelves.filter((s) => s.userId === andreasId())
      .flatMap((s) => shelfBookIds(s.name));

    expect(shelved).toContain(UNKNOWN_BOOK_ID);
  });
});

describe('seeded Reviews', () => {
  it('include Books reviewed by more than one User', () => {
    seed(usersDb, libraryDb);

    const reviewersByBook = Map.groupBy(snapshot().reviews, (r) => r.bookId);
    const shared = [...reviewersByBook.values()].filter((rs) => new Set(rs.map((r) => r.userId)).size > 1);
    expect(shared.length).toBeGreaterThan(0);
  });
});

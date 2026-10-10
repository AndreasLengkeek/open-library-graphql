import type { Db as UsersDb } from '../services/users/src/db/index.js';
import { users } from '../services/users/src/db/schema.js';
import type { Db as LibraryDb } from '../services/library/src/db/index.js';
import { readingStatus, reviews, shelfBook, shelves } from '../services/library/src/db/schema.js';
import { UNKNOWN_BOOK_ID, type SeedBookId } from './books.js';

// Fixed ids and timestamps, so every run writes exactly the same rows.
const fixedId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const ANDREAS = fixedId(1);
const SAM = fixedId(2);
const KAI = fixedId(3);

const FAVOURITES = fixedId(101);
const BORROWED = fixedId(102);

/** The `n`th minute after a fixed start, so rows keep a stable order. */
const at = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString();

const USERS = [
  { id: ANDREAS, username: 'andreas', displayName: 'Andreas', bio: 'Fantasy, sci-fi and the odd programming classic.' },
  { id: SAM, username: 'sam', displayName: 'Sam', bio: null },
  { id: KAI, username: 'kai', displayName: 'Kai', bio: 'Mostly reading on the train.' },
];

type Status = (typeof readingStatus.$inferInsert)['status'];

/** Every Book in `SEED_BOOKS`, spread across andreas's three Status Shelves. */
const ANDREAS_STATUSES: Record<SeedBookId, Status> = {
  OL27482W: 'READ',
  OL27513W: 'READ',
  OL27495W: 'WANT_TO_READ',
  OL453936W: 'READ',
  OL453735W: 'READING',
  OL453657W: 'READ',
  OL679360W: 'READING',
  OL679333W: 'WANT_TO_READ',
  OL81599W: 'WANT_TO_READ',
  OL278022W: 'READ',
  OL6030812W: 'READING',
  OL3267304W: 'READ',
  OL5748544W: 'READING',
  OL4617640W: 'WANT_TO_READ',
  OL15331302W: 'WANT_TO_READ',
  OL893414W: 'READ',
  OL1168083W: 'WANT_TO_READ',
  OL64365W: 'WANT_TO_READ',
  OL66554W: 'READ',
  OL3140822W: 'WANT_TO_READ',
};

const OTHER_STATUSES: { userId: string; bookId: SeedBookId; status: Status }[] = [
  { userId: SAM, bookId: 'OL27482W', status: 'READ' },
  { userId: SAM, bookId: 'OL893414W', status: 'READ' },
  { userId: SAM, bookId: 'OL6030812W', status: 'READ' },
  { userId: KAI, bookId: 'OL27482W', status: 'READ' },
  { userId: KAI, bookId: 'OL453936W', status: 'READ' },
  { userId: KAI, bookId: 'OL278022W', status: 'READ' },
  { userId: KAI, bookId: 'OL893414W', status: 'READING' },
];

const SHELVES = [
  { id: FAVOURITES, userId: ANDREAS, name: 'Favourites' },
  { id: BORROWED, userId: ANDREAS, name: 'Borrowed' },
];

const SHELF_BOOKS: { shelfId: string; bookId: string }[] = [
  ...(['OL27482W', 'OL453936W', 'OL893414W', 'OL3267304W', 'OL66554W'] satisfies SeedBookId[]).map((bookId) => ({
    shelfId: FAVOURITES,
    bookId,
  })),
  { shelfId: BORROWED, bookId: 'OL679333W' },
  { shelfId: BORROWED, bookId: UNKNOWN_BOOK_ID },
];

// Several Users reviewing the same Books.
const REVIEWS: { userId: string; bookId: SeedBookId; rating: number; text: string | null }[] = [
  { userId: ANDREAS, bookId: 'OL27482W', rating: 5, text: 'The one that started it all.' },
  { userId: ANDREAS, bookId: 'OL453936W', rating: 4, text: 'Funnier every time.' },
  { userId: ANDREAS, bookId: 'OL893414W', rating: 5, text: null },
  { userId: SAM, bookId: 'OL27482W', rating: 4, text: 'A lovely, cosy adventure.' },
  { userId: SAM, bookId: 'OL893414W', rating: 3, text: 'Slow first half, worth it in the end.' },
  { userId: SAM, bookId: 'OL6030812W', rating: 4, text: null },
  { userId: KAI, bookId: 'OL27482W', rating: 5, text: null },
  { userId: KAI, bookId: 'OL453936W', rating: 5, text: 'Read it on one long train ride.' },
  { userId: KAI, bookId: 'OL278022W', rating: 2, text: 'Fun stories, shaky conclusions.' },
];

/** Replace everything in both databases with the seed dataset. */
export function seed(usersDb: UsersDb, libraryDb: LibraryDb) {
  usersDb.transaction((tx) => {
    tx.delete(users).run();
    tx.insert(users).values(USERS).run();
  });

  libraryDb.transaction((tx) => {
    tx.delete(shelfBook).run();
    tx.delete(shelves).run();
    tx.delete(reviews).run();
    tx.delete(readingStatus).run();

    const statuses = [
      ...Object.entries(ANDREAS_STATUSES).map(([bookId, status]) => ({ userId: ANDREAS, bookId, status })),
      ...OTHER_STATUSES,
    ];
    tx.insert(readingStatus)
      .values(statuses.map((row, i) => ({ ...row, updatedAt: at(i) })))
      .run();
    tx.insert(shelves)
      .values(SHELVES.map((row, i) => ({ ...row, createdAt: at(i) })))
      .run();
    tx.insert(shelfBook)
      .values(SHELF_BOOKS.map((row, i) => ({ ...row, createdAt: at(i) })))
      .run();
    tx.insert(reviews)
      .values(
        REVIEWS.map((row, i) => ({
          ...row,
          id: fixedId(201 + i),
          createdAt: at(i),
          updatedAt: at(i),
        })),
      )
      .run();
  });
}

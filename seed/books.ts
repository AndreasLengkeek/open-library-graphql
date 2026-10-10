/**
 * The real Open Library Works the seed puts on andreas's Shelves. 04.1 measures against these.
 *
 * Chosen so Author de-duplication has something to show: several Books have co-authors, and
 * Tolkien, Pratchett and Gaiman each appear on more than one Book.
 */
export const SEED_BOOKS = [
  { id: 'OL27482W', title: 'The Hobbit' }, // Tolkien
  { id: 'OL27513W', title: 'The Fellowship of the Ring' }, // Tolkien
  { id: 'OL27495W', title: 'The Silmarillion' }, // J.R.R. & Christopher Tolkien
  { id: 'OL453936W', title: 'Good Omens' }, // Pratchett & Gaiman
  { id: 'OL453735W', title: 'Guards! Guards!' }, // Pratchett
  { id: 'OL453657W', title: 'The Colour of Magic' }, // Pratchett
  { id: 'OL679360W', title: 'American Gods' }, // Gaiman
  { id: 'OL679333W', title: 'Neverwhere' }, // Gaiman
  { id: 'OL81599W', title: 'The Talisman' }, // King & Straub
  { id: 'OL278022W', title: 'Freakonomics' }, // Levitt & Dubner
  { id: 'OL6030812W', title: 'Design Patterns' }, // Gamma, Helm, Johnson & Vlissides
  { id: 'OL3267304W', title: 'Structure and Interpretation of Computer Programs' }, // Abelson & Sussman
  { id: 'OL5748544W', title: 'The Pragmatic Programmer' }, // Hunt & Thomas
  { id: 'OL4617640W', title: 'The C Programming Language' }, // Kernighan & Ritchie
  { id: 'OL15331302W', title: "The Mote in God's Eye" }, // Niven & Pournelle
  { id: 'OL893414W', title: 'Dune' },
  { id: 'OL1168083W', title: 'Nineteen Eighty-Four' },
  { id: 'OL64365W', title: 'Brave New World' },
  { id: 'OL66554W', title: 'Pride and Prejudice' },
  { id: 'OL3140822W', title: 'To Kill a Mockingbird' },
] as const;

export type SeedBookId = (typeof SEED_BOOKS)[number]['id'];

/** Well-formed but unknown to Open Library: the null-Book scenario in 03.4. */
export const UNKNOWN_BOOK_ID = 'OL999999999W';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { authorReturns, OPEN_LIBRARY_URL, openLibraryServer, searchReturns } from '../test/openLibraryServer.js';
import { createOpenLibraryClient, type OpenLibraryClient } from './datasources/openLibrary.js';
import { createServer } from './server.js';

const server = createServer();

let openLibrary: OpenLibraryClient;

beforeAll(() => openLibraryServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  openLibrary = createOpenLibraryClient({ baseUrl: OPEN_LIBRARY_URL, userAgent: 'olg-test' });
});
afterEach(() => openLibraryServer.resetHandlers());
afterAll(() => openLibraryServer.close());

async function execute(query: string, variables?: Record<string, unknown>) {
  const response = await server.executeOperation({ query, variables }, { contextValue: { openLibrary } });
  if (response.body.kind !== 'single') throw new Error('Expected a single result');
  return response.body.singleResult;
}

describe('searchBooks', () => {
  const query = /* GraphQL */ `
    query Search($query: String!, $first: Int!) {
      searchBooks(query: $query, first: $first) {
        id
        title
        firstPublishYear
        coverUrl
        authors {
          id
          name
        }
      }
    }
  `;

  it('returns Books with their Authors', async () => {
    const result = await execute(query, { query: 'dune', first: 5 });

    expect(result.errors).toBeUndefined();
    const { searchBooks } = result.data as { searchBooks: unknown[] };
    expect(searchBooks).toHaveLength(5);
    expect(searchBooks[0]).toEqual({
      id: 'OL893414W',
      title: 'Dune',
      firstPublishYear: 1965,
      coverUrl: 'https://covers.openlibrary.org/b/id/11481354-M.jpg',
      authors: [{ id: 'OL79034A', name: 'Frank Herbert' }],
    });
  });

  it('makes one Open Library request', async () => {
    await execute(query, { query: 'dune', first: 5 });

    expect(openLibrary.requestCount).toBe(1);
  });

  describe('asking for authors { bio }', () => {
    const bioQuery = /* GraphQL */ `
      query Search($query: String!, $first: Int!) {
        searchBooks(query: $query, first: $first) {
          authors {
            bio
          }
        }
      }
    `;

    it('makes 1 + (number of distinct Authors) requests', async () => {
      // 5 "dragons" results by 5 different Authors.
      const result = await execute(bioQuery, { query: 'dragons', first: 5 });

      expect(result.errors).toBeUndefined();
      const { searchBooks } = result.data as { searchBooks: unknown[] };
      expect(searchBooks).toHaveLength(5);
      expect(openLibrary.requestCount).toBe(1 + 5);
    });

    it('fetches a shared Author once per Book, not once per request', async () => {
      // All 5 "dune" results are by Frank Herbert. Without de-duplication (04.3), that's still 5 lookups.
      const result = await execute(bioQuery, { query: 'dune', first: 5 });

      expect(result.errors).toBeUndefined();
      expect(openLibrary.requestCount).toBe(1 + 5);
    });
  });
});

describe('book(id)', () => {
  const query = /* GraphQL */ `
    query Book($id: ID!) {
      book(id: $id) {
        id
        title
        description
        subjects
        isbns
        firstPublishYear
        coverUrl
        authors {
          id
          name
        }
      }
    }
  `;

  it('returns the Book with that Work key', async () => {
    const result = await execute(query, { id: 'OL893414W' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      book: {
        id: 'OL893414W',
        title: 'Dune',
        authors: [{ name: 'Frank Herbert' }],
        description: expect.stringMatching(/^Set on the desert planet Arrakis/),
      },
    });
  });

  it('returns null without an error for a well-formed key Open Library does not know', async () => {
    const result = await execute(query, { id: 'OL999999999W' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ book: null });
  });

  it.each(['nope', 'OL893414A', 'OL1W OR title:*', '/works/OL893414W'])(
    'rejects the malformed key %j with BAD_USER_INPUT without calling Open Library',
    async (id) => {
      const result = await execute(query, { id });

      expect(result.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT');
      expect(result.data).toEqual({ book: null });
      expect(openLibrary.requestCount).toBe(0);
    },
  );

  it('fills missing optional fields with null or empty lists', async () => {
    openLibraryServer.use(searchReturns([{ key: '/works/OL1W', title: 'Bare' }]));

    const result = await execute(query, { id: 'OL1W' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      book: {
        id: 'OL1W',
        title: 'Bare',
        description: null,
        subjects: [],
        isbns: [],
        firstPublishYear: null,
        coverUrl: null,
        authors: [],
      },
    });
  });

  it('pairs Author keys with names by position and drops Authors without a name', async () => {
    openLibraryServer.use(
      searchReturns([
        {
          key: '/works/OL1W',
          title: 'Good Omens',
          author_key: ['OL1A', 'OL2A', 'OL3A'],
          author_name: ['Terry Pratchett', 'Neil Gaiman'],
        },
      ]),
    );

    const result = await execute(query, { id: 'OL1W' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      book: {
        authors: [
          { id: 'OL1A', name: 'Terry Pratchett' },
          { id: 'OL2A', name: 'Neil Gaiman' },
        ],
      },
    });
  });
});

describe('book(id) with author', () => {
  const query = /* GraphQL */ `
    query Book($id: ID!) {
      book(id: $id) {
        id
        title
        description
        authors {
          name
          bio
          birthDate
          books {
            title
          }
        }
      }
    }
  `;

  it('returns the Book with author key', async () => {
    const result = await execute(query, { id: 'OL893414W' });

    expect(result.errors).toBeUndefined();
    expect(result.data).toMatchObject({
      book: {
        id: 'OL893414W',
        title: 'Dune',
        authors: [
          {
            name: 'Frank Herbert',
            birthDate: '8 October 1920',
            bio: expect.stringMatching(/best known for his 1965 novel Dune and its five sequels/),
            books: expect.arrayContaining([{ title: 'Dune' }]),
          },
        ],
      },
    });
  });

  it('unwraps a bio Open Library returns as { type, value }', async () => {
    openLibraryServer.use(
      authorReturns({
        key: '/authors/OL79034A',
        name: 'Frank Herbert',
        bio: { type: '/type/text', value: 'American science fiction author.' },
      }),
    );

    const result = await execute(
      /* GraphQL */ `
        query Book($id: ID!) {
          book(id: $id) {
            authors {
              bio
            }
          }
        }
      `,
      { id: 'OL893414W' },
    );

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ book: { authors: [{ bio: 'American science fiction author.' }] } });
  });
});

describe('_entities', () => {
  // The query the router sends when another subgraph references a Book by id.
  const query = /* GraphQL */ `
    query Entities($representations: [_Any!]!) {
      _entities(representations: $representations) {
        ... on Book {
          id
          title
        }
      }
    }
  `;

  it('resolves a Book reference to the full Book', async () => {
    const result = await execute(query, {
      representations: [{ __typename: 'Book', id: 'OL893414W' }],
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ _entities: [{ id: 'OL893414W', title: 'Dune' }] });
  });

  it('makes one Open Library request per reference', async () => {
    await execute(query, {
      representations: [
        { __typename: 'Book', id: 'OL893414W' },
        { __typename: 'Book', id: 'OL999999999W' },
      ],
    });

    expect(openLibrary.requestCount).toBe(2);
  });

  it('returns null for a reference to an unknown or malformed key', async () => {
    const result = await execute(query, {
      representations: [
        { __typename: 'Book', id: 'OL999999999W' },
        { __typename: 'Book', id: 'nope' },
      ],
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({ _entities: [null, null] });
  });
});

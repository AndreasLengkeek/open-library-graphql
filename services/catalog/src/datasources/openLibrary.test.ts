import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { OPEN_LIBRARY_URL, openLibraryServer, searchReturns } from '../../test/openLibraryServer.js';
import { createOpenLibraryClient } from './openLibrary.js';

beforeAll(() => openLibraryServer.listen({ onUnhandledFrame: 'error' }));
afterEach(() => openLibraryServer.resetHandlers());
afterAll(() => openLibraryServer.close());

const createClient = () => createOpenLibraryClient({ baseUrl: OPEN_LIBRARY_URL, userAgent: 'olg-test' });

/** Record the requests Open Library receives, answering each with no docs. */
function captureRequests() {
  const requests: Request[] = [];
  openLibraryServer.use(
    http.get(`${OPEN_LIBRARY_URL}/search.json`, ({ request }) => {
      requests.push(request);
      return HttpResponse.json({ docs: [] });
    }),
  );
  return requests;
}

describe('searchWorks', () => {
  it('returns the search documents', async () => {
    const docs = await createClient().searchWorks('dune', 5);

    expect(docs).toHaveLength(5);
    expect(docs[0]).toMatchObject({ key: '/works/OL893414W', title: 'Dune', author_name: ['Frank Herbert'] });
  });

  it('sends the User-Agent and asks only for the fields it maps', async () => {
    const requests = captureRequests();

    await createClient().searchWorks('dune', 5);

    expect(requests[0].headers.get('User-Agent')).toBe('olg-test');
    expect(new URL(requests[0].url).searchParams.get('fields')).toBe(
      'key,title,author_key,author_name,first_publish_year,cover_i,isbn,subject,description',
    );
  });

  it('encodes the query so reserved characters stay part of it', async () => {
    const requests = captureRequests();

    await createClient().searchWorks('war & peace', 5);

    const params = new URL(requests[0].url).searchParams;
    expect(params.get('q')).toBe('war & peace');
    expect(params.get('limit')).toBe('5');
  });

  it.each([
    [500, '50'],
    [0, '1'],
    [-3, '1'],
  ])('clamps a limit of %i to %s', async (limit, sent) => {
    const requests = captureRequests();

    await createClient().searchWorks('dune', limit);

    expect(new URL(requests[0].url).searchParams.get('limit')).toBe(sent);
  });

  it('throws when Open Library responds with an error status', async () => {
    openLibraryServer.use(http.get(`${OPEN_LIBRARY_URL}/search.json`, () => new HttpResponse(null, { status: 503 })));

    await expect(createClient().searchWorks('dune', 5)).rejects.toThrow(/Open Library 503/);
  });
});

describe('getWork', () => {
  it('returns the document for a known Work', async () => {
    const doc = await createClient().getWork('OL893414W');

    expect(doc).toMatchObject({ key: '/works/OL893414W', title: 'Dune' });
  });

  it('returns null for a Work Open Library does not know', async () => {
    expect(await createClient().getWork('OL999999999W')).toBeNull();
  });

  it('returns the first document when the search matches several', async () => {
    openLibraryServer.use(
      searchReturns([
        { key: '/works/OL1W', title: 'First' },
        { key: '/works/OL2W', title: 'Second' },
      ]),
    );

    expect(await createClient().getWork('OL1W')).toMatchObject({ title: 'First' });
  });
});

describe('requestCount', () => {
  it('counts the requests each client makes, separately from other clients', async () => {
    const client = createClient();
    const other = createClient();

    await client.searchWorks('dune', 5);
    await client.getWork('OL893414W');
    await other.getWork('OL893414W');

    expect(client.requestCount).toBe(2);
    expect(other.requestCount).toBe(1);
  });
});

import { readFileSync } from 'fs';
import path from 'path';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const OPEN_LIBRARY_URL = 'https://openlibrary.test';

const fixture = (name: string) =>
  JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'fixtures', name), 'utf-8'));

// Fixtures keyed by the `q` parameter they were recorded with.
const searchFixtures: Record<string, string> = {
  dune: 'search-dune.json',
  dragons: 'search-dragons.json',
  'author_key:OL26320A': 'search-author-OL26320A.json',
  'author_key:OL79034A': 'search-author-OL79034A.json',
  'author_key:OL00000A': 'search-author-OL00000A.json',
  'key:/works/OL893414W': 'work-OL893414W.json',
  'key:/works/OL999999999W': 'work-OL999999999W.json',
};

const authorFixtures: Record<string, string> = {
  OL26320A: 'authors-OL26320A.json',
  OL79034A: 'authors-OL79034A.json',
  OL18053A: 'authors-OL18053A.json',
  OL2032671A: 'authors-OL2032671A.json',
  OL19981A: 'authors-OL19981A.json',
  OL19880A: 'authors-OL19880A.json',
  OL234664A: 'authors-OL234664A.json',
};

export const searchHandler = http.get(`${OPEN_LIBRARY_URL}/search.json`, ({ request }) => {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const name = searchFixtures[q];
  if (!name) return HttpResponse.json({ error: `No fixture for q=${q}` }, { status: 500 });
  return HttpResponse.json(fixture(name));
});

export const authorsHandler = http.get(`${OPEN_LIBRARY_URL}/authors/:id.json`, ({ params }) => {
  const { id } = params;
  const name = authorFixtures[id as string];
  if (!name) return HttpResponse.json({ error: `notfound`, key: `/authors/${id}` }, { status: 404 });
  return HttpResponse.json(fixture(name));
});

/** Serve these docs from search.json for the rest of the test. */
export const searchReturns = (docs: unknown[]) =>
  http.get(`${OPEN_LIBRARY_URL}/search.json`, () => HttpResponse.json({ docs }));

/** Serve this record from every authors/<id>.json for the rest of the test. */
export const authorReturns = (record: Record<string, unknown>) =>
  http.get(`${OPEN_LIBRARY_URL}/authors/:id.json`, () => HttpResponse.json(record));

export const openLibraryServer = setupServer(searchHandler, authorsHandler);

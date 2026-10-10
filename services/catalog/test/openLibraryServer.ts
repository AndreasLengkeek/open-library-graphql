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
  'key:/works/OL893414W': 'work-OL893414W.json',
  'key:/works/OL999999999W': 'work-OL999999999W.json',
};

export const searchHandler = http.get(`${OPEN_LIBRARY_URL}/search.json`, ({ request }) => {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const name = searchFixtures[q];
  if (!name) return HttpResponse.json({ error: `No fixture for q=${q}` }, { status: 500 });
  return HttpResponse.json(fixture(name));
});

/** Serve these docs from search.json for the rest of the test. */
export const searchReturns = (docs: unknown[]) =>
  http.get(`${OPEN_LIBRARY_URL}/search.json`, () => HttpResponse.json({ docs }));

export const openLibraryServer = setupServer(searchHandler);

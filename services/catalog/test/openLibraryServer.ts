import { readFileSync } from 'fs';
import path from 'path';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { authorFixtures, searchFixtures } from './fixtures.js';

export const OPEN_LIBRARY_URL = 'https://openlibrary.test';

const fixture = (name: string) =>
  JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'fixtures', name), 'utf-8'));

/** The fixture recorded for this request, if any. */
function fixtureFor(request: Request) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== OPEN_LIBRARY_URL) return undefined;
  if (url.pathname === '/search.json') return searchFixtures[url.searchParams.get('q') ?? ''];
  const author = url.pathname.match(/^\/authors\/(\w+)\.json$/);
  return author ? authorFixtures[author[1]] : undefined;
}

/**
 * Serves the recorded fixtures and fails every other request with a 501.
 */
export const fixturesHandler = http.all('*', ({ request }) => {
  const name = fixtureFor(request);
  if (!name) return HttpResponse.json({ error: `No fixture for ${request.method} ${request.url}` }, { status: 501 });
  const body = fixture(name);

  return HttpResponse.json(body, { status: 'error' in body ? 404 : 200 });
});

/** override the return for search.json for the rest of the test. */
export const searchReturns = (docs: unknown[]) =>
  http.get(`${OPEN_LIBRARY_URL}/search.json`, () => HttpResponse.json({ docs }));

/** override the return for authors/<id>.json for the rest of the test. */
export const authorReturns = (record: Record<string, unknown>) =>
  http.get(`${OPEN_LIBRARY_URL}/authors/:id.json`, () => HttpResponse.json(record));

export const openLibraryServer = setupServer(fixturesHandler);

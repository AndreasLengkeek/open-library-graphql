/**
 * Fetch every response in `fixtures.ts` from the real Open Library and save it under `fixtures/`.
 * Usage: `pnpm fixtures:record [outDir]`
 */
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { DEFAULT_BASE_URL, DEFAULT_USER_AGENT, FIELDS } from '../src/datasources/openLibrary.js';
import { authorFixtures, SEARCH_LIMIT, searchFixtures } from './fixtures.js';

const outDir = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, 'fixtures'));

const searchUrl = (q: string) => {
  const url = new URL('/search.json', DEFAULT_BASE_URL);
  url.search = new URLSearchParams({ q, limit: String(SEARCH_LIMIT), fields: FIELDS }).toString();
  return url;
};

const requests = [
  ...Object.entries(searchFixtures).map(([q, name]) => ({ name, url: searchUrl(q), notFoundOk: false })),
  // `authorFixtures` includes an unknown Author on purpose, so its 404 is part of the recording.
  ...Object.entries(authorFixtures).map(([id, name]) => ({
    name,
    url: new URL(`/authors/${id}.json`, DEFAULT_BASE_URL),
    notFoundOk: true,
  })),
];

// Fetch everything before writing anything, so a failure can't leave a half-updated set.
// One at a time, to stay well inside Open Library's rate limit.
const recorded: { name: string; body: unknown }[] = [];
for (const { name, url, notFoundOk } of requests) {
  const res = await fetch(url, { headers: { 'User-Agent': DEFAULT_USER_AGENT } });
  if (!res.ok && !(notFoundOk && res.status === 404)) throw new Error(`Open Library ${res.status} for ${url}`);
  recorded.push({ name, body: await res.json() });
  console.log(`${res.status} ${name}`);
}

mkdirSync(outDir, { recursive: true });
for (const { name, body } of recorded) {
  writeFileSync(path.join(outDir, name), JSON.stringify(body, null, 2) + '\n');
}

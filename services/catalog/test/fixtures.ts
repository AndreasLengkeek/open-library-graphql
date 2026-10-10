/**
 * The Open Library responses the tests replay. `pnpm fixtures:record` fetches exactly these,
 * and `openLibraryServer` serves exactly these: any other request fails the test.
 */

/** Every search fixture was recorded with this limit. */
export const SEARCH_LIMIT = 5;

/** `search.json` fixtures, keyed by their `q` parameter. */
export const searchFixtures: Record<string, string> = {
  dune: 'search-dune.json',
  dragons: 'search-dragons.json',
  'author_key:OL26320A': 'search-author-OL26320A.json',
  'author_key:OL79034A': 'search-author-OL79034A.json',
  'author_key:OL00000A': 'search-author-OL00000A.json',
  'key:/works/OL893414W': 'work-OL893414W.json',
  'key:/works/OL999999999W': 'work-OL999999999W.json',
};

/** `authors/<id>.json` fixtures, keyed by Author id. */
export const authorFixtures: Record<string, string> = {
  OL26320A: 'authors-OL26320A.json',
  OL79034A: 'authors-OL79034A.json',
  OL18053A: 'authors-OL18053A.json',
  OL2032671A: 'authors-OL2032671A.json',
  OL19981A: 'authors-OL19981A.json',
  OL19880A: 'authors-OL19880A.json',
  OL234664A: 'authors-OL234664A.json',
  OL00000A: 'authors-OL00000A.json', // 404
};

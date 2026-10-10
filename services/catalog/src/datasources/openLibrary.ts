/** A Work as `search.json` returns it, limited to `FIELDS` */
export type SearchDoc = {
  key: string;
  title: string;
  author_key?: string[];
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  subject?: string[];
  description?: string;
};

const FIELDS = 'key,title,author_key,author_name,first_publish_year,cover_i,isbn,subject,description';
const MAX_LIMIT = 50;

type Options = {
  baseUrl?: string;
  userAgent?: string;
  timeoutMs?: number;
};

/**
 * A thin client over the Open Library HTTP API. Each client counts its own requests.
 */
export function createOpenLibraryClient({
  baseUrl = 'https://openlibrary.org',
  userAgent = process.env.OPEN_LIBRARY_USER_AGENT ?? 'reading-tracker-dev andreas.lengkeek@gmail.com',
  timeoutMs = 5000,
}: Options = {}) {
  let requestCount = 0;

  async function search(params: Record<string, string>): Promise<SearchDoc[]> {
    const url = new URL('/search.json', baseUrl);
    url.search = new URLSearchParams({ ...params, fields: FIELDS }).toString();

    requestCount++;
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Open Library ${res.status} for ${url}`);

    const body = (await res.json()) as { docs: SearchDoc[] };
    return body.docs;
  }

  return {
    get requestCount() {
      return requestCount;
    },

    /** Free-text search. `limit` is clamped to 1–50. */
    searchWorks: (query: string, limit: number) =>
      search({ q: query, limit: String(Math.min(Math.max(limit, 1), MAX_LIMIT)) }),

    /** One Work by its key eg: `OL45804W`. */
    getWork: async (workId: string) => (await search({ q: `key:/works/${workId}`, limit: '1' }))[0] ?? null,
  };
}

export type OpenLibraryClient = ReturnType<typeof createOpenLibraryClient>;

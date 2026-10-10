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

export type AuthorRecord = {
  key: string;
  name: string;
  bio?: string | { type: string; value: string };
  birth_date?: string;
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
  userAgent = process.env.OPEN_LIBRARY_USER_AGENT ?? 'reading-tracker-dev (andreas.lengkeek@gmail.com)',
  timeoutMs = 5000,
}: Options = {}) {
  let requestCount = 0;

  async function request<T>(url: URL) {
    requestCount++;
    const res = await fetch(url, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Open Library ${res.status} for ${url}`);
    return (await res.json()) as T;
  }

  async function search(params: Record<string, string>): Promise<SearchDoc[]> {
    const url = new URL('/search.json', baseUrl);
    url.search = new URLSearchParams({ ...params, fields: FIELDS }).toString();

    return (await request<{ docs: SearchDoc[] }>(url)).docs;
  }

  async function getAuthor(id: string): Promise<AuthorRecord | null> {
    const url = new URL(`/authors/${id}.json`, baseUrl);

    return await request<AuthorRecord>(url);
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

    /** Get an author */
    getAuthor: async (authorId: string) => await getAuthor(authorId),

    /** Get an authors books */
    getAuthorsBooks: async (authorId: string, limit: number) =>
      await search({ q: `author_key:${authorId}`, limit: String(Math.min(Math.max(limit, 1), MAX_LIMIT)) }),
  };
}

export type OpenLibraryClient = ReturnType<typeof createOpenLibraryClient>;

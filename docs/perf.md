# Performance

## 02.4 catalog: Author request counts

Open Library requests for one `searchBooks(first: 5)` operation, counted by the catalog's Open Library client against msw fixtures (`services/catalog/src/index.test.ts`). No batching, de-duplication or caching.

| Selection           | Results                   | Distinct Authors | Requests                 |
| ------------------- | ------------------------- | ---------------- | ------------------------ |
| `{ title }`         | 5 (`dune`)                | 1                | **1**                    |
| `{ authors { bio } }` | 5 (`dragons`)           | 5                | **6** (1 + 5)            |
| `{ authors { bio } }` | 5 (`dune`)              | 1                | **6** (1 + 5, not 1 + 1) |

**04.3 baseline: 6.** Each Book's Author is fetched separately, so a shared Author costs one request per Book. DataLoader in 04.3 should bring the `dune` row down to 2. The `dragons` row should stay at 6, because there's nothing to de-duplicate.

Also note: asking for `bio` and `birthDate` together fetches `/authors/<id>.json` twice per Author, because each field resolver makes its own request.

## Baseline

Measured by `pnpm measure` (`scripts/measure.ts`) against `pnpm dev` (local `rover dev`, not GraphOS) with the real Open Library. It logs in as `andreas` and runs each operation 5 times after one discarded warm-up run. Before each run it resets the catalog's Open Library request counter (`DELETE http://127.0.0.1:4012/open-library-requests`), and reads it after. Latency is wall-clock at the client, through the router. p95 is nearest-rank, so with 5 runs it is the slowest run. There is no caching or batching anywhere: no DataLoader, and no router entity cache or APQ.

**Results: pending.** On 2026-10-11 openlibrary.org refused connections from this machine, with brief windows where it answered but every catalog request still hit the 5 s timeout. `pnpm measure` exits non-zero when any run has GraphQL errors, and those runs aren't a baseline, so there is no table yet. Rerun `pnpm seed && pnpm dev`, then `pnpm measure`, and paste its table here.

| Operation | Open Library requests | Median | p95 |
| --- | --- | --- | --- |
| 1. `MyShelves` | 21 (see below) | — | — |
| 2. `MyShelves` + `authors { bio }` | — | — | — |
| 3. `BookDetail` (`OL893414W`) | — | — | — |

### Why scenario 1 makes 21 requests

The router's plan for `MyShelves` (`Apollo-Expose-Query-Plan: true`) is a `Sequence` of three fetches:

1. `Fetch(users)`: `me { id displayName }`.
2. `Flatten(me)` → `Fetch(library)`: `_entities` for the User, returning `shelves { name books { id } }`.
3. `Flatten(me.shelves.@.books.@)` → `Fetch(catalog)`: **one** `_entities` request carrying a representation for every Book on every Shelf, asking for `title authors { name }`.

So the catalog is called once per operation, but `Book.__resolveReference` runs once per representation, and each run makes its own `search.json?q=key:/works/<id>` request. andreas has 27 Book entries across the Shelves (20 on Status Shelves, 5 on Favourites, 2 on Borrowed). Favourites' 5 Books and Borrowed's Neverwhere are already on Status Shelves, and the router de-duplicates identical representations, which leaves 21 distinct Books: the 20 seed Books plus the unknown `OL999999999W`. That's 21 requests, the N+1 shape of a naive federated reference resolver (here 0 + N, because the list itself comes from library). `authors { name }` costs nothing extra, because names come from the search document. 04.2 should bring this to 1 request with `key:(/works/A OR /works/B …)`.

The 21 was observed on every run, including the failed ones, because each reference makes exactly one attempt whether it succeeds or not. Scenario 2's count depends on successful Book fetches (each Author's `bio` is fetched only after its Book resolves), so it isn't recorded.

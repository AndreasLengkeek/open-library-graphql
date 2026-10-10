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

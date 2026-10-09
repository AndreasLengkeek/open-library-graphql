# S2 Cursor pagination for Reviews

## Goal
`Book.reviews` and `User.reviews` are paginated with Relay-style cursor connections.

## Notes
- `reviews(first: Int, after: String): ReviewConnection!` with `edges { cursor node }` and `pageInfo { hasNextPage endCursor }`. Add `totalCount` if you want it.
- Cursors are opaque (for example base64 of `createdAt|id`) and stable when new Reviews are inserted.
- Order: newest first, with `id` as a tie-breaker.
- This is a **breaking change** to an existing field. Plan how to evolve it: a new field, `@deprecated` on the old one, and a schema check showing the impact.

## Acceptance criteria
- [ ] Paging through 25 seeded Reviews 10 at a time returns every Review exactly once, even if a new Review is written between pages.
- [ ] The old field is deprecated rather than removed, and the schema check in CI shows a warning, not a failure.

## Concepts practised
Relay connections · cursor design · evolving a schema without breaking clients

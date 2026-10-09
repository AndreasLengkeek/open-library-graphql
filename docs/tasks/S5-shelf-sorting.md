# S5 Shelf sorting

## Goal
A Shelf's Books can be sorted by title, Author name or date added, in either direction.

## Notes
- `books(orderBy: ShelfBookOrder)`, where the order is an input type or enum with a field and a direction.
- **The federation twist:** `library` only knows `bookId` and `addedAt`. Title and Author name live in `catalog`. Where can sorting by title happen? Options include: denormalising the title into `library` when the Book is added (what happens when it goes stale?), using `@requires` to pull `title` into a `library` field, or sorting on the client. Weigh them and pick one.
- If S2 is done, think about how sorting interacts with cursors.

## Acceptance criteria
- [ ] All three sort orders work through the router for a seeded Shelf.
- [ ] The chosen approach and its trade-off are documented. Write an ADR if you denormalise.

## Concepts practised
`@requires` / `@external` · denormalisation across subgraphs · the limits of cross-subgraph sorting

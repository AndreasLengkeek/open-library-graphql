# S1 Split `reviews` out of `library` with progressive `@override`

## Goal
Move Reviews (`Review`, `Book.reviews`, `Book.averageRating`, `User.reviews`, and the review mutations) into a new `reviews` subgraph, shifting traffic over gradually with **progressive override**, with no downtime and no breaking schema change.

## Notes
- The new subgraph runs on port 4004 with its own `reviews.db`. Migrate the rows from `library.db` with a one-off script.
- In `reviews`, mark each moved field `@override(from: "library", label: "percent(10)")`, then raise it to 50 and then 100. Both subgraphs serve the field during the move.
- Progressive override needs Federation 2.7+ and router support. **Check its availability on the GraphOS Free plan** before you start. If it isn't available, do a plain `@override(from: "library")` cut-over and note the difference.
- While both subgraphs serve the field, writes must reach both databases, or the move must be read-only. Decide how, and record the choice in an ADR.
- Finish by removing the fields from `library`, then removing `@override`.

## Acceptance criteria
- [ ] At each percentage, `BookDetail` returns the same data, and the query plans show traffic split between the two subgraphs.
- [ ] `rover subgraph check` passes at every step: there's no breaking change for clients.
- [ ] An ADR explains the migration strategy.

## Concepts practised
`@override` · progressive override labels · splitting a subgraph · zero-downtime ownership migration

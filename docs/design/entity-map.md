# Entity map

How the domain is split across the `users`, `catalog` and `library` subgraphs. See [task 01.1](../tasks/01.1-entity-map.md).

## Types

| Type           | Entity? | Key fields | Owner   | Contributing subgraphs and fields                                                                                                                             | Reference-only (`resolvable: false`) | Notes                                                                                                                                                             |
| -------------- | ------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Book           | Yes     | `id`       | catalog | **catalog:** `id`, `title`, `description`, `subjects`, `isbns`, `firstPublishYear`, `coverUrl`, `authors`<br>**library:** `averageRating`, `reviews`          | None                                 | `id` is the Work key without `/works/` ([ADR 0001](../adr/0001-book-is-an-open-library-work.md)). library contributes fields, so its `Book` must stay resolvable. |
| Author         | No      | n/a        | catalog | **catalog:** `id`, `name`, `bio`, `birthDate`, `books`                                                                                                        | n/a                                  | Has an `id` (Open Library Author key), but only catalog uses it, so it's a plain object type. Promote it to an entity if another subgraph ever needs it.          |
| ISBN           | No      | n/a        | catalog | Not a type: `Book.isbns: [String!]!`                                                                                                                          | n/a                                  | Editions aren't modelled.                                                                                                                                         |
| User           | Yes     | `id`       | users   | **users:** `id`, `username`, `displayName`, `bio`<br>**library:** `shelves`, `reviews`                                                                        | None                                 | One key is enough: `user(username:)` lives in users, which returns the `id` the router passes to library.                                                         |
| Viewer         | No      | n/a        | n/a     | Not a type. `context.viewer` in every subgraph; exposed as `Query.me: User` in users.                                                                         | n/a                                  |                                                                                                                                                                   |
| Follow         | No      | n/a        | n/a     | Not modelled yet.                                                                                                                                             | n/a                                  | Deferred to [S3](../tasks/S3-follow-subscription.md).                                                                                                             |
| Shelf          | No      | n/a        | library | `interface Shelf`. **library:** `id`, `name`, `books`, `user`                                                                                                 | n/a                                  | Only library creates or reads Shelves, so it's not an entity. `books: [Book]!` is ordered by date added, newest first. Clients tell the two kinds apart by `__typename`, so there's no `kind` field. |
| Custom Shelf   | No      | n/a        | library | `type CustomShelf implements Shelf`. No extra fields.                                                                                                         | n/a                                  | `id` is a database id. The only kind the shelf mutations return.                                                                                                  |
| Status Shelf   | No      | n/a        | library | `type StatusShelf implements Shelf`. **library:** adds `readingStatus: ReadingStatus!`                                                                        | n/a                                  | Derived from Reading Statuses ([ADR 0002](../adr/0002-reading-status-is-not-a-shelf.md)). `id` is synthetic, see below. `name` is fixed by the status.            |
| Reading Status | No      | n/a        | library | `enum ReadingStatus { WANT_TO_READ READING READ }`. **library** also adds `Book.viewerReadingStatus: ReadingStatus`. | n/a                                  | Enum, not an object type.                                                                                                                                         |
| Review         | No      | n/a        | library | **library:** `id`, `rating`, `text`, `book`, `user`                                                                                                           | n/a                                  | Only library stores Reviews. `book` and `user` are entity references.                                                                                             |
| Rating         | No      | n/a        | library | Not a type: `Review.rating: Int!` (1–5, validated in the resolver).                                                                                           | n/a                                  |                                                                                                                                                                   |

Supporting types: `type AuthPayload { token: String!, user: User! }` (users); `type ReadingStatusChange { bookId: ID!, status: ReadingStatus, book: Book, from: StatusShelf, to: StatusShelf }` (library). `setReadingStatus` returns the Status Shelves the Book left and joined so a client can update its cache without refetching, and it stays non-null when Open Library doesn't know the Book, so the client can tell the change was saved.

Shelf is an interface rather than one type with a `kind` discriminator so that the schema says what each kind can do. `readingStatus` exists only on `StatusShelf`, so it can't be null on one kind and set on the other. The shelf mutations return `CustomShelf!`, so a client can see from the types alone that a Status Shelf is never renamed, deleted or edited directly. Status Shelves change only through `setReadingStatus`. `User.shelves: [Shelf!]!` returns both kinds: the three Status Shelves first (Want to read, Reading, Read), then Custom Shelves, oldest created first. A Custom Shelf may share a name with a Status Shelf; `__typename` tells them apart.

No type in this design needs `resolvable: false`. library is the only subgraph that refers to entities owned by another subgraph, and it contributes fields to both of them (Book and User), so its definitions stay resolvable.

## Root fields

| Capability     | Operation | Root field         | Owning subgraph | Returns                                      |
| -------------- | --------- | ------------------ | --------------- | -------------------------------------------- |
| Search         | Query     | `searchBooks`      | catalog         | `[Book!]!`                                   |
| BookDetail     | Query     | `book`             | catalog         | `Book` (null if unknown)                     |
| MyShelves      | Query     | `me`               | users           | `User` (UNAUTHENTICATED error if signed out) |
| Profile        | Query     | `user`             | users           | `User`                                       |
| Sign up        | Mutation  | `signUp`           | users           | `AuthPayload!`                               |
| Log in         | Mutation  | `logIn`            | users           | `AuthPayload!`                               |
| Update profile | Mutation  | `updateProfile`    | users           | `User!`                                      |
| Reading Status | Mutation  | `setReadingStatus` | library         | `ReadingStatusChange!`                       |
| Custom Shelves | Mutation  | `createShelf`      | library         | `CustomShelf!`                               |
|                | Mutation  | `renameShelf`      | library         | `CustomShelf!`                               |
|                | Mutation  | `deleteShelf`      | library         | `ID!` (deleted id)                           |
|                | Mutation  | `addToShelf`       | library         | `CustomShelf!`                               |
|                | Mutation  | `removeFromShelf`  | library         | `CustomShelf!`                               |
| Reviews        | Mutation  | `writeReview`      | library         | `Review!`                                    |
|                | Mutation  | `updateReview`     | library         | `Review!`                                    |
|                | Mutation  | `deleteReview`     | library         | `ID!` (deleted id)                           |

## Questions

**How is `Book.reviews` resolved when library only stores `bookId`?**
catalog resolves `book(id:)` and returns the Book with its `id`. The router sends `_entities([{ __typename: "Book", id }])` to library, which looks up Reviews by `bookId` and returns each `Review.user` as a `{ id }` stub. If `displayName` is requested, the router then calls `_entities` on users with those User ids.

**`me { shelves { books { title } } }`: which subgraphs, in order?**

1. users resolves `me` from `context.viewer` and returns the User `id`.
2. library resolves `User.shelves` through `_entities` and returns each Shelf's `books` as `{ id }` stubs.
3. catalog resolves `title` through `_entities` on those Book ids (batched).

**How is a Book that Open Library doesn't know about represented?**
catalog's `Book` reference resolver returns `null`. Every place that refers to a Book from library is therefore nullable: `Shelf.books: [Book]!` and `Review.book: Book`. One unknown id then nulls a single list item or field, not the whole query. `Query.book` is nullable for the same reason.

**What is a Status Shelf's `id`, and is it stable?**
It's derived, not stored: `status:<userId>:<STATUS>`, for example `status:42:READING`. It's stable because it depends only on the User and the status. The interface fixes the return types but not the inputs: a `status:` id is still a valid `ID`. So `renameShelf`, `deleteShelf`, `addToShelf` and `removeFromShelf` all reject ids with the `status:` prefix with `BAD_USER_INPUT`, through one shared shelf-id parser rather than four separate checks.

**Is `Review.user` an entity reference? Who resolves `displayName`?**
Yes. library returns `{ __typename: "User", id: review.userId }` and users resolves `displayName` through its `User` reference resolver. `Review.user` is nullable: there are no foreign keys across subgraphs, and with `User!` one unresolvable User would null every Review, then `Book.reviews`, then the whole `Query.book`, including the catalog data. `Shelf.user` stays `User!` because a Shelf is only reached through its User.

## Design review (01.4)

Findings from the [01.4 review](../tasks/01.4-design-review.md), each fixed or accepted with a reason.

| # | Finding | Outcome |
| - | ------- | ------- |
| 1 | `Review.user: User!` meant one unresolvable User nulled the whole `Query.book` (through `[Review!]!`), including the catalog data. | **Fixed:** `Review.user: User`. `Shelf.user` stays `User!` because a Shelf is only reached through its User. |
| 2 | `setReadingStatus` returned `Book`, so the client couldn't update its cached Status Shelves, and `null` hid whether the change was saved for an unknown Book. | **Fixed:** returns `ReadingStatusChange!` with `bookId`, `status`, `book`, `from` and `to`. |
| 3 | `deleteReview` and `deleteShelf` return a bare `ID!`, so the client refetches `averageRating` or evicts the Shelf itself. | **Accepted:** one simple rule for every delete; a refetch is cheap. |
| 4 | `updateReview` and `updateProfile` didn't say whether an explicit `null` means "unchanged" or "clear". | **Fixed:** omitted means unchanged, `null` clears `text` and `bio`, and `null` for `rating` or `displayName` is `BAD_USER_INPUT`. Documented on the arguments. |
| 5 | A Custom Shelf could be named "Read", the same as a Status Shelf. | **Accepted:** `__typename` tells them apart. Recorded in the glossary. |
| 6 | The order of `User.shelves` wasn't specified. | **Fixed:** Status Shelves first (Want to read, Reading, Read), then Custom Shelves oldest first. Documented on the field. |
| 7 | S1: progressive `@override` needs `Review` to be an entity so the router can switch subgraphs partway through a Review. | **Deferred to S1:** adding `@key(fields: "id")` doesn't change the client-facing schema, and nothing needs to look up a Review by id yet. It's the first step of S1. |
| 8 | Minor: the `viewerReadingStatus` description wording; `Book.authors` can be empty although SPEC says "one or more"; `searchBooks(first:)` has no maximum; `viewerReadingStatus` makes Book responses depend on the Viewer. | **Accepted as is:** Open Library has Works with no authors; no full-response caching is planned (04.4 caches below the resolvers). |

Predicted query plans (to verify in [03.4](../tasks/03.4-query-plan.md)):

- **MyShelves:** users (`me`, `displayName`) → library (`_entities` User: `shelves`, Book ids) → catalog (`_entities` Book: `title`, `authors { name }`). Three sequential fetches, one per subgraph. SPEC's `kind` is `__typename` in this design.
- **BookDetail:** catalog (`book`, including `authors { books { title } }`) → library (`_entities` Book: `averageRating`, `reviews`) → users (`_entities` User: `displayName`). Three sequential fetches; the cost sits inside catalog, where `Author.books` makes one Open Library call per Author (04.3).

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
| Reading Status | No      | n/a        | library | `enum ReadingStatus { WANT_TO_READ READING READ }`. **library** also adds `Book.viewerReadingStatus: ReadingStatus`, the return field for `setReadingStatus`. | n/a                                  | Enum, not an object type.                                                                                                                                         |
| Review         | No      | n/a        | library | **library:** `id`, `rating`, `text`, `book`, `user`                                                                                                           | n/a                                  | Only library stores Reviews. `book` and `user` are entity references.                                                                                             |
| Rating         | No      | n/a        | library | Not a type: `Review.rating: Int!` (1–5, validated in the resolver).                                                                                           | n/a                                  |                                                                                                                                                                   |

Supporting types: `type AuthPayload { token: String!, user: User! }` (users).

Shelf is an interface rather than one type with a `kind` discriminator so that the schema says what each kind can do. `readingStatus` exists only on `StatusShelf`, so it can't be null on one kind and set on the other. The shelf mutations return `CustomShelf!`, so a client can see from the types alone that a Status Shelf is never renamed, deleted or edited directly. Status Shelves change only through `setReadingStatus`. `User.shelves: [Shelf!]!` returns both kinds.

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
| Reading Status | Mutation  | `setReadingStatus` | library         | `Book` (null if unknown)                     |
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
Yes. library returns `{ __typename: "User", id: review.userId }` and users resolves `displayName` through its `User` reference resolver.

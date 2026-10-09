# Reading Tracker Supergraph — Spec

A practice project for **federated GraphQL with Apollo and TypeScript**. People track the Books they're reading, organise them into Shelves and write Reviews. Book data comes live from the free [Open Library API](https://openlibrary.org/developers/api), so there's no catalogue to seed.

Work through it one task at a time. Each task file in [`docs/tasks/`](docs/tasks/) has a **Goal**, **Acceptance criteria** and **Concepts practised**, and every task ends with the repo in a working state. Tick the boxes below as you go.

- Domain language: [`GLOSSARY.md`](GLOSSARY.md). Use these terms in code, schemas and commit messages.
- Decisions: [`docs/adr/`](docs/adr/).

## Ground rules

1. **You design the SDL.** This spec describes the domain, the capabilities (the operations a client must be able to run) and the constraints. It deliberately does **not** say which types are entities, which subgraph owns each `@key`, or which subgraph contributes which fields. That's the milestone 1 exercise.
2. **Design changes go back through review.** If a later task shows that your schema design was wrong, change it, re-compose, and note why in the task's PR or commit.
3. **Subgraphs never call each other.** Anything that crosses a subgraph boundary goes through the router.
4. **Tests never call Open Library.** Use the msw fixtures. Only manual runs and the milestone 4 measurement use the real API.

## Architecture

```
                    ┌─────────────────────────┐
  client ─────────▶ │   Apollo Router :4000   │  (rover dev locally; Docker image in M6)
                    └──┬──────────┬────────┬──┘
                       │          │        │      Authorization header forwarded (M3+)
              ┌────────▼───┐ ┌────▼─────┐ ┌▼───────────┐
              │ users:4001 │ │ catalog  │ │ library    │
              │            │ │   :4002  │ │   :4003    │
              └─────┬──────┘ └────┬─────┘ └─────┬──────┘
                    │             │             │
               users.db     Open Library    library.db
               (SQLite)      REST API        (SQLite)
```

| Subgraph  | Responsibility                                                       | Data                     |
| --------- | -------------------------------------------------------------------- | ------------------------ |
| `users`   | Users, sign-up and log-in (stub JWT issuer)                          | `users.db`               |
| `catalog` | Books and Authors, search                                            | Open Library (read-only) |
| `library` | Reading Statuses, Shelves, Reviews: a User's relationship with Books | `library.db`             |

## Stack

| Concern         | Choice                                                                            |
| --------------- | --------------------------------------------------------------------------------- |
| Runtime         | Node 26, TypeScript, `tsx` for development                                        |
| Monorepo        | pnpm workspaces: `services/{users,catalog,library}`, `router/`                    |
| Subgraphs       | Apollo Server 5 (`@apollo/server`) + `@apollo/subgraph`, Federation 2             |
| Router          | Apollo Router, via `rover dev` (local) and the router Docker image (M6)           |
| Persistence     | Drizzle ORM + `better-sqlite3`, one database file per subgraph                    |
| Types           | GraphQL Code Generator (`typescript`, `typescript-resolvers`, `federation: true`) |
| Tests           | Vitest, `server.executeOperation`, msw for Open Library                           |
| Batching        | `dataloader`                                                                      |
| Registry and CI | Apollo GraphOS (Free plan, `@staging` variant), GitHub Actions                    |

## Capabilities

A client must be able to run operations like the ones below once the relevant milestone is done. Field and argument names are a **suggestion**. Rename them in your design if you have a reason, but keep the capability.

### Reading (M2–M3)

```graphql
# Find Books to shelve
query Search {
  searchBooks(query: "dune", first: 10) {
    id
    title
    firstPublishYear
    coverUrl
    authors {
      name
    }
  }
}

# One Book with everything about it
query BookDetail {
  book(id: "OL893414W") {
    title
    description
    subjects
    isbns
    authors {
      name
      bio
      birthDate
      books {
        title
      }
    }
    averageRating
    reviews {
      rating
      text
      user {
        displayName
      }
    }
  }
}

# The milestone 3 target: touches all three subgraphs
query MyShelves {
  me {
    displayName
    shelves {
      name
      kind
      books {
        title
        authors {
          name
        }
      }
    }
  }
}

# Anyone's public Shelves and Reviews
query Profile {
  user(username: "andreas") {
    displayName
    bio
    shelves {
      name
    }
    reviews {
      rating
      book {
        title
      }
    }
  }
}
```

### Writing (M3 and M5)

```graphql
mutation { signUp(username: "andreas", displayName: "Andreas") { token user { id } } }
mutation { logIn(username: "andreas") { token } }                          # stub: no password
mutation { updateProfile(displayName: "A.", bio: "Reads sci-fi") { id } }

mutation { setReadingStatus(bookId: "OL893414W", status: READING) { ... } }  # status: null clears it
mutation { createShelf(name: "Favourites") { id } }
mutation { renameShelf(id: "...", name: "Faves") { id name } }
mutation { deleteShelf(id: "...") }
mutation { addToShelf(shelfId: "...", bookId: "OL893414W") { ... } }
mutation { removeFromShelf(shelfId: "...", bookId: "OL893414W") { ... } }

mutation { writeReview(bookId: "OL893414W", rating: 5, text: "Spice.") { id } }
mutation { updateReview(id: "...", rating: 4) { id rating } }
mutation { deleteReview(id: "...") }
```

## Domain rules

These are the constraints your schema and resolvers must enforce. Definitions are in the glossary.

**Books and Authors**

- A Book is identified by its Open Library Work key, without the `/works/` prefix (for example `OL45804W`). See [ADR 0001](docs/adr/0001-book-is-an-open-library-work.md).
- A Book has one or more Authors. Editions aren't modelled; a Book only lists its ISBNs.
- A Book id that is well-formed (`/^OL\d+W$/`) but unknown to Open Library resolves to `null`. It must not fail the whole query.

**Reading Status and Shelves** (see [ADR 0002](docs/adr/0002-reading-status-is-not-a-shelf.md))

- A User has at most one Reading Status per Book: `WANT_TO_READ`, `READING` or `READ`.
- Every User has three Status Shelves, derived from their Reading Statuses. They can't be renamed, deleted, or targeted by `addToShelf`.
- Custom Shelf names are unique per User. A Book appears at most once on each Custom Shelf but can be on any number of them, whether or not it has a Reading Status.
- Books on a Shelf are ordered by the date they were added, newest first.
- Deleting a Custom Shelf removes its entries only. Reading Statuses and Reviews are untouched.
- All Shelves are public.

**Reviews**

- A Review always has a Rating (whole number 1–5) and optionally text.
- A User has at most one Review per Book. `writeReview` fails if one already exists.
- Reviews are independent of Reading Status: you can review a Book you haven't shelved, and reviewing doesn't change its status.
- `averageRating` is the mean Rating across all Reviews of that Book in _this app_, or `null` when there are none.

**Users and auth**

- `logIn` is a **development stub (NOT SECURE)**: it takes a username and returns a JWT with no password check.
- The JWT is HS256-signed with a shared secret (`JWT_SECRET`); `sub` is the User id.
- Every subgraph verifies the token itself and builds `context.viewer`. Subgraphs don't trust any unverified user header.
- Mutations act only on things the Viewer owns. Acting on someone else's Shelf, Review or profile returns `FORBIDDEN`. Calling a Viewer-only operation without a valid token returns `UNAUTHENTICATED`.

## Conventions

| Thing        | Convention                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Ports        | router `4000`, users `4001`, catalog `4002`, library `4003`                                              |
| Env vars     | `JWT_SECRET`, `OPEN_LIBRARY_USER_AGENT`, `DATABASE_URL` (per subgraph), `APOLLO_KEY`, `APOLLO_GRAPH_REF` |
| Open Library | Always send `User-Agent: reading-tracker-dev (<your email>)`. No caching until task 04.4.                |
| Error codes  | `extensions.code`: `UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`, `NOT_FOUND`                         |
| Schemas      | `services/<name>/schema.graphql`, the source of truth for codegen and `rover`                            |

## Completing a task

1. **Branch:** `git switch -c task/<id>-<slug>` (for example `task/02.3-catalog-books`).
2. **Tick the acceptance criteria** in the task file as you verify each one. Don't tick anything you haven't actually run.
3. **Run the gate.** Every check that exists so far must pass:
   `pnpm typecheck && pnpm test`, plus `pnpm compose` (from 01.3) and `pnpm codegen:check` (from 02.2).
4. **Review (optional):** run `/code-review` against `main` and point it at the task file as the spec.
5. **Tick the task in [Milestones](#milestones)** below, in the same commit as the work.
6. **Commit and merge:** use the message `<id>: <title>` (for example `02.3: catalog subgraph — search and Books`). From 06.3 onwards, open a PR so CI runs before you merge.

A milestone is complete when all its tasks are ticked and its headline outcome works from a clean checkout.

## Milestones

### 00 — Setup

- [x] [00.1 Repo scaffold](docs/tasks/00.1-repo-scaffold.md)

### 01 — Design before code ⭐ the most valuable checkpoint

- [ ] [01.1 Entity map on paper](docs/tasks/01.1-entity-map.md)
- [ ] [01.2 Write the subgraph schemas](docs/tasks/01.2-write-subgraph-schemas.md)
- [ ] [01.3 Compose offline](docs/tasks/01.3-compose-offline.md)
- [ ] [01.4 Design review with Claude](docs/tasks/01.4-design-review.md)

### 02 — Running locally

- [ ] [02.1 users subgraph](docs/tasks/02.1-users-subgraph.md)
- [ ] [02.2 Codegen for resolver types](docs/tasks/02.2-codegen.md)
- [ ] [02.3 catalog subgraph: search and Books](docs/tasks/02.3-catalog-books.md)
- [ ] [02.4 catalog: expensive fields](docs/tasks/02.4-catalog-expensive-fields.md)
- [ ] [02.5 library subgraph: read side](docs/tasks/02.5-library-read-side.md)
- [ ] [02.6 Seed data and test fixtures](docs/tasks/02.6-seed-and-fixtures.md)
- [ ] [02.7 Compose with rover dev](docs/tasks/02.7-rover-dev.md)

### 03 — Cross-subgraph queries and authentication

- [ ] [03.1 Stub sign-up and log-in](docs/tasks/03.1-stub-login.md)
- [ ] [03.2 Forward and verify the token](docs/tasks/03.2-forward-and-verify-token.md)
- [ ] [03.3 The `me` query end to end](docs/tasks/03.3-me-end-to-end.md)
- [ ] [03.4 Read the query plan](docs/tasks/03.4-query-plan.md)

### 04 — Performance

- [ ] [04.1 Baseline measurement](docs/tasks/04.1-baseline-measurement.md)
- [ ] [04.2 DataLoader for Books](docs/tasks/04.2-dataloader-books.md)
- [ ] [04.3 DataLoader for Authors](docs/tasks/04.3-dataloader-authors.md)
- [ ] [04.4 TTL cache and results](docs/tasks/04.4-ttl-cache.md)

### 05 — Mutations and authorization

- [ ] [05.1 Error conventions](docs/tasks/05.1-error-conventions.md)
- [ ] [05.2 setReadingStatus](docs/tasks/05.2-set-reading-status.md)
- [ ] [05.3 Custom Shelf mutations](docs/tasks/05.3-custom-shelf-mutations.md)
- [ ] [05.4 Review mutations](docs/tasks/05.4-review-mutations.md)
- [ ] [05.5 updateProfile](docs/tasks/05.5-update-profile.md)

### 06 — Production-shaped

- [ ] [06.1 Docker Compose](docs/tasks/06.1-docker-compose.md)
- [ ] [06.2 Publish to GraphOS staging](docs/tasks/06.2-graphos-staging.md)
- [ ] [06.3 CI workflow](docs/tasks/06.3-ci-workflow.md)

### Stretch

- [ ] [S1 Split reviews out of library with progressive `@override`](docs/tasks/S1-split-reviews-override.md)
- [ ] [S2 Cursor pagination for Reviews](docs/tasks/S2-review-pagination.md)
- [ ] [S3 Follows and the "finished a Book" subscription](docs/tasks/S3-follow-subscription.md)
- [ ] [S4 React front end with Apollo Client](docs/tasks/S4-react-frontend.md)
- [ ] [S5 Shelf sorting](docs/tasks/S5-shelf-sorting.md)
- [ ] [S6 JWT validation in the router with `@authenticated`](docs/tasks/S6-router-authentication.md)

## Out of scope

- Real authentication (passwords, OAuth, sessions). `logIn` is a stub.
- Editions as first-class things; re-reads and reading history; private Shelves; account deletion.
- Writing anything back to Open Library.
- Comparing Hive or Cosmo with GraphOS.

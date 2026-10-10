# An invalid token fails the whole request instead of making it anonymous

Each subgraph builds `context.viewer` from the `Authorization` header with `viewerFromAuthHeader` in `@olg/auth`. With no header, the request is anonymous and `viewer` is `null`. With a header whose token doesn't verify (malformed, signed with another secret, or expired), the context function throws `UNAUTHENTICATED` with HTTP 401, so the request fails before any resolver runs.

We chose this over treating a bad token as anonymous because silent downgrades hide bugs. A client with an expired token would otherwise get `me: null` and viewer-dependent fields like `viewerReadingStatus` as `null`, which looks like "signed out" or "no status" rather than "your token is bad". Failing loudly tells the client to log in again. Because every subgraph verifies the same way, the router sees the same failure whichever subgraph a query reaches.

The cost is that a public query such as `searchBooks` also fails while the client is sending a stale token. Clients should drop the token and retry, or sign in again, when they get `UNAUTHENTICATED`.

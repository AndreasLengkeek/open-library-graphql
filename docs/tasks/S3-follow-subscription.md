# S3 Follows and the "finished a Book" subscription

## Goal
Users can follow each other, and receive a real-time event when someone they follow finishes a Book (Reading Status changes to `READ`).

## The design question (your call; review it with Claude like 01.4)
The event starts in `library` (`setReadingStatus`), but a subscription field lives in exactly one subgraph, and that subgraph must filter events by "does this Viewer follow the person who finished the Book?". Subgraphs don't call each other. Options to weigh:
- **(a) Follow lives in `library`.** `library` becomes "a User's relationships": Shelves, Reading Statuses, Reviews and Follows. The subscription lives there too. The router resolves `user { displayName }` and `book { title }` in the payload from the other subgraphs.
- **(b) Follow lives in `users`, connected by an event bus.** `library` publishes finish events to Redis pub/sub (an extra Compose service). `users` hosts the subscription and filters by Follows. This is more realistic event-driven architecture, but it adds infrastructure and failure modes.
Record your choice in an ADR.

## Notes
- Mutations: `follow(username)`, `unfollow(username)`. Fields: `followers` and `following` on User. A User can't follow themselves; following twice does nothing.
- Router: enable subscriptions in `router.yaml` (`subscription.enabled: true`, plus passthrough mode over WebSocket to the subgraph). The subgraph needs a `graphql-ws` server next to Apollo Server.
- Subscriptions are available on GraphOS Free with self-hosted routers (rate limits apply).
- Add "Follow" scenarios to the seed.

## Acceptance criteria
- [ ] With two Sandbox tabs, `sam` subscribed and `andreas` marking a Book `READ` → `sam` receives an event with `andreas`'s display name and the Book's title, resolved across subgraphs.
- [ ] A User who doesn't follow `andreas` receives nothing.
- [ ] The ADR records which option you chose and why.

## Concepts practised
Federated subscriptions · router subscription config · event ownership across subgraphs · `graphql-ws`

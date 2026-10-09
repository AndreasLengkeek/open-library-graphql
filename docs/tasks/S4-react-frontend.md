# S4 React front end with Apollo Client

## Goal
A small React app (Vite + TypeScript + Apollo Client) that talks to the router: log in, search Books, manage Shelves and write Reviews.

## Notes
- `apps/web` in the workspace. Use GraphQL Code Generator's `client` preset for typed operations.
- Authentication: store the stub token in memory or `localStorage`, and attach it with an Apollo Link.
- Normalised cache: make sure mutation results update the Shelves view without a refetch. That's where your 05.x return types are put to the test. Check `typePolicies` keys for Status Shelves.
- Pages: Log in · Search → Book detail (Reviews, average Rating, "add to Shelf" / "set status") · My Shelves · Someone's profile.
- If S3 is done: show a toast when a followed User finishes a Book.

## Acceptance criteria
- [ ] Every capability in SPEC.md can be used from the UI.
- [ ] Changing a Book's Reading Status moves it between Status Shelves on screen without a network refetch.

## Concepts practised
Apollo Client · normalised caching and cache keys · typed client operations · how schema design affects the client

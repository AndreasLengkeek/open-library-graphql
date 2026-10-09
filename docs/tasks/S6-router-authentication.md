# S6 JWT validation in the router with `@authenticated`

## Goal
The router validates the JWT itself and rejects unauthenticated access to protected fields before calling any subgraph. The subgraphs still check ownership.

## Notes
- Router `authentication.router.jwt` with a local JWKS file. For HS256, the JWKS key has `kty: "oct"` and the secret base64url-encoded in `k`.
- Mark Viewer-only fields and mutations with `@authenticated` in the subgraph schemas (import it in `@link`).
- **Check plan availability first.** Router authentication and authorization directives have historically been restricted to Enterprise plans. Confirm what GraphOS Free allows under `rover dev` and a self-hosted router before starting.
- Discuss: once the router authenticates, should subgraphs still verify the token? (Defence in depth: what if a subgraph is reachable directly?) Record the decision in an ADR.

## Acceptance criteria
- [ ] Without a token, a mutation is rejected by the router, and the query plan or logs show no subgraph call.
- [ ] Ownership (`FORBIDDEN`) is still enforced in the subgraphs.
- [ ] An ADR on where authentication happens.

## Concepts practised
Router-level JWT authentication · `@authenticated` · splitting responsibility between router and subgraphs

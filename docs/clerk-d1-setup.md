# Clerk + D1 development integration

Current state: Clerk sign-up tested in browser. /api/me implements JWT signature and claim verification but **is not live-verified**. The customer migration is prepared but **not applied**.

## Cloudflare Pages Preview variables
Configure these under Workers & Pages → my-little-project-website → Settings → Variables and Secrets → Preview:
- `CLERK_ISSUER`: exact Clerk development issuer, e.g. `https://crucial-condor-8475.clerk.accounts.dev` (confirm in Clerk dashboard).
- `CLERK_JWKS_URL`: the Clerk development instance's published JWKS endpoint, typically `https://crucial-condor-8475.clerk.accounts.dev/.well-known/jwks.json`. Verify from Clerk.
- `CLERK_ALLOWED_ORIGINS`: comma-separated **exact** preview origins that Clerk will use in the token `azp` claim. A new immutable preview hash has a different origin; use the branch preview alias if available.
- `DB`: D1 binding to `mlp-workshop-dev` in **Preview** (separate from Production).

No Clerk secret key is required for the public JWKS verification route. Never add `sk_test_...` to source code or the browser.

## API smoke test (after deployment and configuration)
1. GET /api/me without a token → 401.
2. GET /api/me with malformed bearer token → 401.
3. Obtain a fresh session token via Clerk SDK `Clerk.session.getToken()`, call /api/me with `Authorization: Bearer <token>` → 200 with verified Clerk subject, provided `azp` matches configured origin.
4. Expired or invalid-signature token → 401.
5. Wrong issuer, wrong origin or missing configuration → reject.
6. Verify no personal email, purchases or entitlement records are returned.

Important: `/api/me` is not yet used by the frontend. The endpoint does not issue sessions, write D1, or grant access to projects. Session revocation before JWT expiry is not checked. Keep TTL short and add revocation/session status checks if needed for sensitive operations.

## D1
Review `migrations/0002_customer_entitlements.sql`, then apply **only to development D1** with Cloudflare D1 console or Wrangler. Do not apply to production until authenticated ownership and payment flows have been tested.

## Next steps
- Configure Preview variables and verify /api/me with an actual Clerk token.
- Add a frontend authenticated session check.
- Add a protected, read-only entitlements endpoint querying D1 by **verified** Clerk subject.
- Add trusted Stripe webhook purchase provisioning later.

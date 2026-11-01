# My Workshop — passwordless sign-in implementation plan

Status: design decision agreed; authentication is NOT implemented.

## User journey
1. Customer enters email address on My Workshop sign-in.
2. Managed authentication provider sends a short-lived, single-use email code.
3. Provider verifies the code and issues a secure session.
4. Cloudflare Pages Functions verify that session server-side on every protected request.
5. D1 records map the verified provider subject (not a client-supplied email) to a customer.
6. Only purchased/assigned project revisions and their authorised resources appear in My Workshop.

## Security requirements
- Use a managed passwordless authentication provider with email OTP support; select provider and configure keys before coding live authentication.
- No OTP generation, storage or delivery in D1 or client-side JavaScript.
- Verify token signature, issuer, audience and expiry on the server, using provider-supported verification/JWKS.
- Store provider secrets only as Cloudflare encrypted secrets; never commit credentials.
- Rate limit sign-in requests and verification attempts; use generic responses to prevent email enumeration.
- Use Secure, HttpOnly, SameSite cookies where session integration supports them; protect state-changing routes against CSRF.
- Enforce ownership and entitlement in each protected API request. Never trust email, user ID, project ID or entitlement supplied by the browser.
- Keep /api/catalogue public and read-only. Keep /api/me returning 401 until real verification is wired.
- Use separate development and production identity configurations and D1 databases.
- Validate logout, expired sessions, revoked access, account recovery and accessibility before production.

## Next engineering tasks
1. Choose and connect managed email-OTP provider.
2. Implement sign-in and verification screens (no fake success).
3. Implement verified session middleware and /api/me.
4. Add customer and entitlement D1 migrations, with strict per-user lookups.
5. Show a signed-in Project Garage; preserve the public prototype catalogue.
6. Test unauthenticated and cross-account requests, then review deployment.

Do not publish a customer login until steps 1–4 and security testing are complete.

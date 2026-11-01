# My Workshop — Phase 2 foundation

Development branch only. No live customer accounts or payments are enabled.

## Included
- D1 schema for projects, hardware revisions, compatible parts, resources, customers, purchases, entitlements and build progress.
- Seed catalogue with clearly labelled prototype/concept records.
- Read-only public catalogue endpoint at /api/catalogue; it never returns private storage keys or customer records.
- Existing static Workshop/Garage/Print Library pages remain usable as previews without a D1 database.

## Setup (Cloudflare Pages)
1. Create a **development** D1 database in Cloudflare.
2. In the Pages project preview environment, add a D1 binding named **DB** to that database.
3. Run schema.sql and then seed.sql against the development database (Cloudflare dashboard SQL console or Wrangler).
4. Redeploy the preview branch and visit /api/catalogue.
5. Do not attach the production database or enable payments until authorization and webhook tests pass.

## Required before customer launch
- Choose a managed identity provider. Verify session tokens server-side; never trust client-provided user IDs.
- Add protected API routes that derive customer identity exclusively from the verified session.
- Grant/revoke entitlements only via authenticated administration or verified, idempotent Stripe webhooks.
- Authorize each resource download server-side and return short-lived signed R2 links; no public direct URLs for owner-only files.
- Verify project ownership for progress reads/writes, use CSRF protections where cookie-based auth is used, add rate limiting and audit logging.
- Test refunds, chargebacks, gift purchases, account recovery, privacy deletion, backups and UK GDPR obligations.
- Review licensing, print-file safety, and revision compatibility before publishing parts.

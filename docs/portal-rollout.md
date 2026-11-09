# Private admin and creator workspace rollout

The public storefront stays available without D1. The root Cloudflare Pages middleware and `_routes.json` run on `/admin/` and `/studio/`, validating Clerk's `__session` cookie and a D1 staff role before serving their static shells. Every private API validates a fresh bearer token and role again. No role can be granted from the website.

## Production setup

1. In Cloudflare, create a custom API token limited to the relevant account with **Pages Write** and **D1 Write**. Set a short expiry. Save it directly as the GitHub Actions repository secret `CLOUDFLARE_API_TOKEN`; never put it in source, workflow inputs, logs or chat. Find the account ID in Cloudflare; it is a non-secret workflow input.
2. A push of the workflow or setup script to `main` automatically runs **Configure My Little Project portal** in read-only `inspect` mode. You can also run it manually. It attempts to discover the Cloudflare account by matching the exact repository-backed Pages project; enter the account ID manually only if discovery is unavailable. The inspection reads project metadata and D1 database names/IDs. Check that Preview uses `mlp-workshop-dev`.
3. Run it again with mode `apply` and the same account ID. It creates or reuses `mlp-shop-production` (new databases use EU jurisdiction), applies `database/003_portal_workspace.sql`, binds `DB` in **Production** only, sets `fail_open=false` in both Production and Preview as Cloudflare requires, retries the current production deployment and checks `/api/shop`. It refuses to replace an unexpected production database. Its starter products remain hidden internal drafts; it creates no orders or payments.
4. Use the production Clerk instance for `mylittleproject.co.uk`. The development `pk_test_` instance stays on Preview. To set the four Production Pages variables, rerun `apply` with the optional production `pk_live_` publishable key and exact HTTPS issuer origin. The workflow derives the JWKS URL and allowed shop origin. These inputs are public client configuration, but they are stored in GitHub's workflow run metadata. No Clerk secret key belongs in source or the browser.
5. Sign in at `/account/`. Verify the production Clerk user ID directly in Clerk, then grant a `creator` role in `staff_access` from a trusted D1 operator console after identity checks. The development user ID is not automatically a production user. Keep `admin` ungranted until a supported strong second-factor design has been implemented and tested.
6. Verify anonymous redirects, wrong-role 403, recent MFA requirement on admin writes, creator ownership, and public `/api/shop` response. Check that a public preview item is clearly labelled in development. Revoke the temporary Cloudflare token when setup and verification are complete.

The manual workflow never grants a staff role or enables checkout. It makes no changes in `inspect` mode. Its `apply` mode sends a narrow Pages PATCH for the production D1 binding, optional Clerk variables and fail-closed settings, then checks that existing production variable names and Preview's D1 binding and variables were preserved. Stop and inspect Cloudflare if any of those checks fail.

## Verified state on 9 November 2026

- Production uses the dedicated EU `mlp-shop-production` D1 database with the portal migration and three hidden starter drafts. Preview remains bound to `mlp-workshop-dev`. Both Pages environments have `fail_open=false`.
- The public `/api/shop` endpoint returned `{ "products": [], "available": true }` after the deployment propagated. The admin route redirected anonymous access to `/account/`.
- Production `/api/auth-config` returns `sign_in_not_configured` because the production publishable key and development issuer are mixed. No production Clerk account or staff role has been verified or granted. Admin and Creator Studio cannot be used yet.
- The Cloudflare API token remains in the GitHub Actions repository secret until the Clerk setup and final checks are complete.

## Clerk production domain verified; Pages issuer correction pending

- The production `pk_live_` publishable key supplied by the owner decodes to `clerk.mylittleproject.co.uk`. It is public configuration; no Clerk secret key has been supplied or stored.
- The owner completed Clerk domain verification on 9 November. The production JWKS endpoint `https://clerk.mylittleproject.co.uk/.well-known/jwks.json` returned an RSA signing key. The owner added the production publishable key to Cloudflare Pages Production, and a fresh deployment picked it up.
- The first deployment then exposed `https://crucial-condor-8475.clerk.accounts.dev` as `frontendApiOrigin`, revealing that `CLERK_ISSUER` still held the development value. The public auth-config endpoint now checks that the publishable key domain, issuer and JWKS URL agree, and fails closed on this mixture. Its current response is `sign_in_not_configured`. The one-time API apply marker was removed from `main`.
- GitHub Actions runs started at 18:02–18:25 UTC failed before creating jobs, with GitHub's “Internal server error” annotation. An echo-only job and checkout-only job succeeded; jobs referencing either `secrets.CLOUDFLARE_API_TOKEN` or the built-in `secrets.GITHUB_TOKEN` failed before start. This is a GitHub Actions secret-context failure, not a Clerk DNS failure. Do not enter the Cloudflare token as a workflow input or commit it to source.
- In Cloudflare Pages **Production** Variables and Secrets, set `CLERK_ISSUER=https://clerk.mylittleproject.co.uk`, `CLERK_JWKS_URL=https://clerk.mylittleproject.co.uk/.well-known/jwks.json`, and `CLERK_ALLOWED_ORIGINS=https://mylittleproject.co.uk`. Keep `CLERK_PUBLISHABLE_KEY` at the saved production `pk_live_` value. Redeploy, then verify `/api/auth-config` returns the production origin and test a new production account at `/account/`.
- Clerk's free production plan does not provide the second factor used by the current Admin Desk gate. Keep admin access ungranted while a separate strong admin authentication route is designed and verified. Creator/customer email sign-in can be tested once Clerk's production domain is ready.

Example creator role grant, with values deliberately left as placeholders:

```sql
INSERT INTO staff_access(clerk_user_id,role,enabled,granted_by)
VALUES ('user_VERIFIED_IN_CLERK','creator',1,'trusted_operator');
```

## Current boundaries

- Product/category editing, marketing planning, creator draft projects and build-note records are implemented. Public `preview` visibility exposes curated product text, with no buy button or checkout.
- Creator approval is internal. It does not publish to a marketplace, transfer rights, calculate royalties or accept files. MailerLite campaigns are planned here, not sent.
- The original My Workshop demo remains on its feature preview branch until its customer login and database are migrated separately. Do not merge that entire branch into `main` as it contains older public pages and development credentials.
- Before real orders or private customer data, add payment/webhook provisioning, fulfilment workflows, resource upload scanning and ownership, retention/deletion handling, and a full privacy/security review.

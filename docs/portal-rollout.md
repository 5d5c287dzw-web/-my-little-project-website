# Private admin and creator workspace rollout

The public storefront stays available without D1. The root Cloudflare Pages middleware and `_routes.json` run on `/admin/` and `/studio/`, validating Clerk's `__session` cookie and a D1 staff role before serving their static shells. Every private API validates a fresh bearer token and role again. No role can be granted from the website.

## Production setup

1. In Cloudflare, create a custom API token limited to the relevant account with **Pages Write** and **D1 Write**. Set a short expiry. Save it directly as the GitHub Actions repository secret `CLOUDFLARE_API_TOKEN`; never put it in source, workflow inputs, logs or chat. Find the account ID in Cloudflare; it is a non-secret workflow input.
2. In GitHub Actions, run **Configure My Little Project portal** on `main` with mode `inspect` and the account ID. This reads only project metadata and D1 database names/IDs. Check that the project is the expected GitHub-backed Pages site and Preview uses `mlp-workshop-dev`.
3. Run it again with mode `apply` and the same account ID. It creates or reuses `mlp-shop-production` (new databases use EU jurisdiction), applies `database/003_portal_workspace.sql`, binds `DB` in **Production** only, sets `fail_open=false`, retries the current production deployment and checks `/api/shop`. It refuses to replace an unexpected production database. Its starter products remain hidden internal drafts; it creates no orders or payments.
4. Create or select a production Clerk instance for `mylittleproject.co.uk`. Configure its sign-in methods and an enforced second factor for the administrator. The development `pk_test_` instance stays on Preview. To set the four Production Pages variables, rerun `apply` with the optional production `pk_live_` publishable key and exact HTTPS issuer origin. The workflow derives the JWKS URL and allowed shop origin. These inputs are public client configuration, but they are stored in GitHub's workflow run metadata. No Clerk secret key belongs in source or the browser.
5. Sign in at `/account/`. Verify the production Clerk user ID directly in Clerk, then grant `admin` or `creator` in `staff_access` from a trusted D1 operator console. Set `enabled=1` only after identity checks. The role is deliberately one per account; the development user ID is not automatically a production administrator.
6. Verify anonymous redirects, wrong-role 403, recent MFA requirement on admin writes, creator ownership, and public `/api/shop` response. Check that a public preview item is clearly labelled in development. Revoke the temporary Cloudflare token when setup and verification are complete.

The manual workflow never grants a staff role or enables checkout. It makes no changes in `inspect` mode. Its `apply` mode sends a narrow Pages PATCH for the production D1 binding, optional Clerk variables and fail-closed setting, then checks that existing production variable names and the Preview D1 binding were preserved. Stop and inspect Cloudflare if any of those checks fail.

Example role grant, with values deliberately left as placeholders:

```sql
INSERT INTO staff_access(clerk_user_id,role,enabled,granted_by)
VALUES ('user_VERIFIED_IN_CLERK','admin',1,'trusted_operator');
```

## Current boundaries

- Product/category editing, marketing planning, creator draft projects and build-note records are implemented. Public `preview` visibility exposes curated product text, with no buy button or checkout.
- Creator approval is internal. It does not publish to a marketplace, transfer rights, calculate royalties or accept files. MailerLite campaigns are planned here, not sent.
- The original My Workshop demo remains on its feature preview branch until its customer login and database are migrated separately. Do not merge that entire branch into `main` as it contains older public pages and development credentials.
- Before real orders or private customer data, add payment/webhook provisioning, fulfilment workflows, resource upload scanning and ownership, retention/deletion handling, and a full privacy/security review.

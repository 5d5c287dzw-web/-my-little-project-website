# Private admin and creator workspace rollout

The public storefront stays available without D1. The root Cloudflare Pages middleware and `_routes.json` run on `/admin/` and `/studio/`, validating Clerk's `__session` cookie and a D1 staff role before serving their static shells. Every private API validates a fresh bearer token and role again. No role can be granted from the website.

## Production setup

1. Create a dedicated production D1 database. Bind it to the `my-little-project-website` Pages project as `DB` in **Production**. Keep the existing `mlp-workshop-dev` preview database separate.
2. Review and apply `database/003_portal_workspace.sql` to that production database. Its three starter products are hidden internal drafts; it creates no orders or payments.
3. Create or select a production Clerk instance for `mylittleproject.co.uk`. Configure its sign-in methods and an enforced second factor for the administrator. The development `pk_test_` instance should stay on Preview.
4. Set Production Pages variables: `CLERK_PUBLISHABLE_KEY` (`pk_live_…`), `CLERK_ISSUER` (exact HTTPS Clerk issuer origin), `CLERK_JWKS_URL` (matching issuer JWKS URL), and `CLERK_ALLOWED_ORIGINS` (`https://mylittleproject.co.uk`). The publishable key is public; no Clerk secret key belongs in source or the browser.
5. Sign in at `/account/`. Verify the Clerk user ID in the Clerk dashboard, then grant `admin` or `creator` in `staff_access` from a trusted D1 operator console. Set `enabled=1` only after identity checks. The role is deliberately one per account.
6. Verify anonymous redirects, wrong-role 403, missing D1 503, recent MFA requirement on admin writes, creator ownership, and public `/api/shop` response. Check that a public preview item is clearly labelled in development.
7. Set Pages Functions failure mode to **fail closed** before storing real customer or creator files. The static page shells hold no private data, and the APIs independently verify every request, but an exhausted Functions quota in fail-open mode could bypass the page redirect.

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

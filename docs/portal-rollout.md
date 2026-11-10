# Private admin and creator workspace rollout

The public storefront stays available without D1. The root Cloudflare Pages middleware and `_routes.json` run on `/admin/` and `/studio/`, validating Clerk's `__session` cookie and a D1 staff role before serving their static shells. Every private API validates a fresh bearer token and role again. No role can be granted from the website.

## Production setup

1. In Cloudflare, create a custom API token limited to the relevant account with **Pages Write** and **D1 Write**. Set a short expiry. Save it directly as the GitHub Actions repository secret `CLOUDFLARE_API_TOKEN`; never put it in source, workflow inputs, logs or chat. Find the account ID in Cloudflare; it is a non-secret workflow input.
2. A push of the workflow or setup script to `main` automatically runs **Configure My Little Project portal** in read-only `inspect` mode. You can also run it manually. It attempts to discover the Cloudflare account by matching the exact repository-backed Pages project; enter the account ID manually only if discovery is unavailable. The inspection reads project metadata and D1 database names/IDs. Check that Preview uses `mlp-workshop-dev`.
3. Run it again with mode `apply` and the same account ID. It creates or reuses `mlp-shop-production` (new databases use EU jurisdiction), applies `database/003_portal_workspace.sql`, binds `DB` in **Production** only, sets `fail_open=false` in both Production and Preview as Cloudflare requires, retries the current production deployment and checks `/api/shop`. It refuses to replace an unexpected production database. Its starter products remain hidden internal drafts; it creates no orders or payments.
4. Use the production Clerk instance for `mylittleproject.co.uk`. The development `pk_test_` instance stays on Preview. To set the four Production Pages variables, rerun `apply` with the optional production `pk_live_` publishable key and exact HTTPS issuer origin. The workflow derives the JWKS URL and allowed shop origin. These inputs are public client configuration, but they are stored in GitHub's workflow run metadata. No Clerk secret key belongs in source or the browser.
5. Sign in at `/account/`. Verify the production Clerk user ID directly in Clerk. The owner's account is an admin candidate. Configure the independent Cloudflare Access check in [admin-access-setup.md](admin-access-setup.md) before granting its `admin` role. Grant a separate, verified creator account the `creator` role from a trusted D1 operator console. The development user ID is not automatically a production user.
6. Verify anonymous redirects, wrong-role 403, Access-protected admin reads and writes, creator ownership, and public `/api/shop` response. Check that a public preview item is clearly labelled in development. Revoke the temporary Cloudflare token when setup and verification are complete.

The manual workflow never grants a staff role or enables checkout. It makes no changes in `inspect` mode. Its `apply` mode sends a narrow Pages PATCH for the production D1 binding, optional Clerk variables and fail-closed settings, then checks that existing production variable names and Preview's D1 binding and variables were preserved. Stop and inspect Cloudflare if any of those checks fail.

## Verified state on 9 November 2026

- Production uses the dedicated EU `mlp-shop-production` D1 database with the portal migration and three hidden starter drafts. Preview remains bound to `mlp-workshop-dev`. Both Pages environments have `fail_open=false`.
- The public `/api/shop` endpoint returned `{ "products": [], "available": true }` after the deployment propagated. The admin route redirected anonymous access to `/account/`.
- Production `/api/auth-config` returns the `pk_live_` key and `https://clerk.mylittleproject.co.uk` as the frontend origin. The live `/account/` page renders Clerk's email sign-in form with sign-up on `accounts.mylittleproject.co.uk`. The owner signed in to a production account; its session reached the protected middleware, and both private routes denied access without a staff role.
- The Cloudflare API token remains in the GitHub Actions repository secret until the Clerk setup and final checks are complete.

## Clerk production domain and Pages configuration verified

- The production `pk_live_` publishable key supplied by the owner decodes to `clerk.mylittleproject.co.uk`. It is public configuration; no Clerk secret key has been supplied or stored.
- The owner completed Clerk domain verification on 9 November. The production JWKS endpoint `https://clerk.mylittleproject.co.uk/.well-known/jwks.json` returned an RSA signing key. The owner added the production publishable key to Cloudflare Pages Production, and a fresh deployment picked it up.
- The first deployment then exposed `https://crucial-condor-8475.clerk.accounts.dev` as `frontendApiOrigin`, revealing that `CLERK_ISSUER` still held the development value. The public auth-config endpoint now checks that the publishable key domain, issuer and JWKS URL agree, and fails closed on this mixture. The one-time API apply marker was removed from `main`.
- GitHub Actions runs started at 18:02–18:25 UTC failed before creating jobs, with GitHub's “Internal server error” annotation. An echo-only job and checkout-only job succeeded; jobs referencing either `secrets.CLOUDFLARE_API_TOKEN` or the built-in `secrets.GITHUB_TOKEN` failed before start. This is a GitHub Actions secret-context failure, not a Clerk DNS failure. Do not enter the Cloudflare token as a workflow input or commit it to source.
- The owner saved `CLERK_ISSUER=https://clerk.mylittleproject.co.uk`, `CLERK_JWKS_URL=https://clerk.mylittleproject.co.uk/.well-known/jwks.json`, and `CLERK_ALLOWED_ORIGINS=https://mylittleproject.co.uk` in Pages Production. A new GitHub-backed deployment picked up the settings: `/api/auth-config` returned the production issuer and key, `/account/` rendered the email sign-in form, and `/api/shop` still returned `{"products":[],"available":true}`.
- The first production account signed in successfully. `/studio/` and `/admin/` displayed “This account is not approved for this workspace,” confirming that the signed-in session did not bypass D1 role checks. No staff role has been granted. Treat this owner account as an admin candidate until its strong second-factor route is settled; use a distinct creator identity for Creator Studio testing under the current one-role-per-account schema.
- Clerk's free production plan does not provide production MFA. The earlier Clerk `fva` admin gate was replaced with the separate Cloudflare Access proof described below; the production Access policy and variables have not yet been configured or verified.

## Account and Admin Desk update on 9 November 2026

- The owner signed into the live `/account/` page. The production `/api/account-status` verified that Clerk session against the D1 staff table and displayed the account ID only to the signed-in visitor. No workspace role is assigned, so the account offers only the shop link. The new script URL was versioned after the first deployment retained an older cached script.
- The code now supports a separate Cloudflare Access application proof for every Admin Desk page and API request. The signed Access token is checked against the configured team, audience and single owner email. Admin remains unavailable until the Access application enforces independent MFA, the Pages variables are set, and the owner's D1 role is granted. See [admin-access-setup.md](admin-access-setup.md).

Example creator role grant, with values deliberately left as placeholders:

```sql
INSERT INTO staff_access(clerk_user_id,role,enabled,granted_by)
VALUES ('user_VERIFIED_IN_CLERK','creator',1,'trusted_operator');
```

## Live owner verification and workspace update on 10 November 2026

- The owner's screenshot shows `/admin/` rendering the protected Admin Desk with three product records, three active categories, no campaign plans and no creator submissions. This confirms that the production Clerk session, Cloudflare Access gate and D1 role now allow the owner through. The prior 9 November setup notes above record the earlier state; do not run that setup again merely to grant the owner access.
- The Admin Desk now shows catalogue progress toward 30 records, kit-stage and price counts, undecided supplier approaches, product filters, and a downloadable Markdown launch snapshot for weekly reviews. The snapshot distinguishes workspace entries from independent proof and explicitly records that checkout is unavailable. Its recent activity is the latest 20 audit events, not a certified change history since a previous export.
- Creator Studio now shows a submission checklist. A request for changes requires the creator to edit the project or a build note before resubmitting; the server enforces this transition, even when the UI is bypassed. A distinct creator role/account is still needed for a live creator pilot.

## My Workshop owner preview

- `/workshop/` and every descendant page are served only after a production Clerk session maps to an enabled `admin` row in the production `staff_access` table. Anonymous visitors go to `/account/`; other signed-in accounts receive 403. This owner preview check is separate from the stronger Cloudflare Access proof required for Admin Desk reads and writes. The preview exposes no admin records or privileges.
- The rebuilt pages include the Workshop overview, Project Garage, 3D Print Library, the RC Buggy project and its five draft stage outlines. They use the current production account. No development Clerk key, customer purchase, entitlement or file access is copied from the old feature branch.
- `/api/workshop` validates the Clerk session on every request and stores only the owner's demo stage markers in `workshop_preview_progress`. It creates that narrow table idempotently on the first authorised API request; the reviewed definition is in `database/004_workshop_preview.sql`. JSON mutations require the same-origin `Origin` header. Each read and write is scoped to the verified Clerk subject. No customer account or payment migration is implied.
- A signed-in owner can open the preview from the Account page or Admin Desk. The old feature-branch preview remains separate and its development progress is not imported into the production Clerk account.
- Check an anonymous `/workshop/` redirect, a signed-in non-admin 403, owner access and saving a draft stage. Check `/api/shop` still returns no purchasable products. If Pages' custom domain still returns the homepage for `/workshop/`, inspect the deployed `_routes.json` and the active production deployment.

## Product Git and video links

- Admin Desk product records now have optional HTTPS links for a Git repository, documentation in Git (for example, its `docs/` folder or README), and a YouTube video. Save them once on the product. The owner-only `/workshop/products/` library and each product detail page read the same record, and the RC Buggy journey shows its connected links. Flight Radar and every later product use the generic product detail page even before they have a build journey.
- The private `shop_product_links` table is created idempotently after an authorised Admin Desk or Workshop read. Its reviewed definition is in `database/005_product_links.sql`. The links are omitted from `/api/shop` and do not affect public product visibility, checkout, customer access, creator rights or file downloads.
- A Git link opens the source site; it does not copy repository content into D1 or grant Git permissions. Private repositories remain subject to their own access controls. A YouTube link opens on YouTube rather than embedding third-party playback on the Workshop page. Treat all links as owner-entered planning references until the linked docs, safety information and licensing have been reviewed for customers.
- GitHub-hosted resource links use GitHub's unmodified 16px Invertocat mark from `primer/octicons` (`icons/mark-github-16.svg`) as a secondary link cue, alongside the site's own primary branding. Links to other Git hosts use a neutral branch symbol. The mark is not used for the shop logo or any unlinked product; no GitHub affiliation or endorsement is claimed. Recheck GitHub's current brand guidance before expanding its use.

## Current boundaries

- Product/category editing, marketing planning, creator draft projects and build-note records are implemented. Public `preview` visibility exposes curated product text, with no buy button or checkout.
- Creator approval is internal. It does not publish to a marketplace, transfer rights, calculate royalties or accept files. MailerLite campaigns are planned here, not sent.
- The original My Workshop demo remains on its feature preview branch for reference. Do not merge that entire branch into `main` as it contains older public pages, development credentials and overlapping customer schemas. The new main-site Workshop is an owner-only demo, not a live customer portal.
- Before real orders or private customer data, add payment/webhook provisioning, fulfilment workflows, resource upload scanning and ownership, retention/deletion handling, and a full privacy/security review.

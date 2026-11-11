# My Little Project storefront

This is the public, pre-launch shop website served from the repository root by Cloudflare Pages. Its pages describe prototypes and ideas; it does not take orders or payments.

## Updating the site

- Edit `build_site.py` for the homepage, project listing, product pages, and About page. Run `python build_site.py` to regenerate those HTML files.
- Edit the private `workshop/` HTML directly. The old `scripts/build_workshop.py` generator has been retired because it would overwrite the Flight Radar journey with the former RC Buggy-only layout.
- Edit `assets/site.css`, `assets/site.js`, and the SVG concept illustrations for presentation and behaviour.
- The privacy-policy HTML is maintained separately. Review its wording before introducing checkout, analytics, customer accounts, or a change to how data is processed.
- The MailerLite embed uses account `2743003` and form `SNDM4W`; it is included on the marketing pages.

The `feature/my-workshop-phase-1-20261101` branch still contains an unfinished customer Workshop demo. It needs its own integration and security review before it is connected to the main site's customer accounts.

## Private workspaces

`/admin/` and `/studio/` are now implemented as role-gated development workspaces. Their APIs use Cloudflare D1 and verified Clerk sessions. The Admin Desk has a private bill of materials for each product, with sourcing evidence and a calculated, explicitly partial parts subtotal. The public shop still works if those services are not configured; the private routes fail closed. See `docs/portal-rollout.md` for production setup and the numbered `database/` migrations.

The manual GitHub Actions workflow `Configure My Little Project portal` can inspect and configure the Production D1 binding with a scoped Cloudflare API token stored as a repository secret. It does not grant admin access or enable checkout.

Run the focused security and data-flow checks with `node --test tests/portal.test.mjs` (Node 24 or newer).

# My Little Project storefront

This is the public, pre-launch shop website served from the repository root by Cloudflare Pages. Its pages describe prototypes and ideas; it does not take orders or payments.

## Updating the site

- Edit `build_site.py` for the homepage, project listing, product pages, and About page. Run `python build_site.py` to regenerate those HTML files.
- Edit `assets/site.css`, `assets/site.js`, and the SVG concept illustrations for presentation and behaviour.
- The privacy-policy HTML is maintained separately. Review its wording before introducing checkout, analytics, customer accounts, or a change to how data is processed.
- The MailerLite embed uses account `2743003` and form `SNDM4W`; it is included on the marketing pages.

The `feature/my-workshop-phase-1-20261101` branch still contains an unfinished customer Workshop demo. It needs its own integration and security review before it is connected to the main site's customer accounts.

## Private workspaces

`/admin/` and `/studio/` are now implemented as role-gated development workspaces. Their APIs use Cloudflare D1 and verified Clerk sessions. The public shop still works if those services are not configured; the private routes fail closed. See `docs/portal-rollout.md` for the separate production setup and `database/003_portal_workspace.sql` migration.

Run the focused security and data-flow checks with `node --test tests/portal.test.mjs` (Node 24 or newer).

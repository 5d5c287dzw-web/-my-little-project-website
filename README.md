# My Little Project storefront

This is the public, pre-launch shop website served from the repository root by Cloudflare Pages. Its pages describe prototypes and ideas; it does not take orders or payments.

## Updating the site

- Edit `build_site.py` for the homepage, project listing, product pages, and About page. Run `python build_site.py` to regenerate those HTML files.
- Edit `assets/site.css`, `assets/site.js`, and the SVG concept illustrations for presentation and behaviour.
- The privacy-policy HTML is maintained separately. Review its wording before introducing checkout, analytics, customer accounts, or a change to how data is processed.
- The MailerLite embed uses account `2743003` and form `SNDM4W`; it is included on the marketing pages.

The `feature/my-workshop-phase-1-20261101` branch contains the unfinished Workshop and admin work. It needs its own integration and security review before those features are made public.

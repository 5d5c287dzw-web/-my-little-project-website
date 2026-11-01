# Staff access security rollout (development only)

## Implemented
- Clerk JWT signature, issuer, expiry and origin verification in `functions/api/me.js`.
- Explicit D1 staff roles, disabled by default; no public role-grant endpoint.
- Admin and Creator Studio interfaces hidden until corresponding role check succeeds.
- Shared `requireStaff(request, env, role)` for future private APIs.
- No live order/customer/supplier data exposed in these dashboards.

## Required before any private data
1. Review and apply `database/staff-access-proposal.sql` to **preview D1 only**.
2. Verify Clerk development user ID directly in Clerk dashboard. Enable and verify MFA/passkey policy in Clerk; **current API does not enforce MFA**.
3. Manually grant a single verified admin via trusted D1 operator console. Never expose a grant endpoint.
4. Ensure Cloudflare Pages preview has isolated D1 binding and Clerk environment config. Confirm production does not share preview DB.
5. Test anonymous 401, customer 403, creator 403 on admin, admin 403 on creator, missing DB 503, invalid token 401.
6. Before real data: protect every sensitive API on the server; enforce creator ownership; add audit writes and security alerts, CSRF/origin checks for mutations, step-up auth for refunds/roles, and rate limiting.
7. Review content security policy and Clerk script integration; do not put secrets in frontend.

## Important limitation
The static HTML is publicly fetchable; only the interface display is gated in JavaScript. This is **not** page-level protection. Keep admin HTML free of private data. Server-side role checks are mandatory for all future data/API routes.

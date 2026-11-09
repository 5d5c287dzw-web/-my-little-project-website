# Admin Desk security setup

The Admin Desk requires **both** the production Clerk session with a D1 `admin` role and a separately signed Cloudflare Access application token. Every admin page request and admin API request verifies the Access token signature, issuer, audience, expiry and the single allowed owner email. Missing configuration or a missing token fails closed. Creator Studio needs only its own Clerk `creator` role.

Clerk's free production plan cannot provide the MFA assurance used in the earlier admin gate. Cloudflare Access can enforce an independent authenticator (TOTP, security key or biometrics) at the application or policy level. The application JWT does not itself prove which authenticator was used, so the **Access policy must require independent MFA**. Use an authenticator separate from the email inbox used for Clerk sign-in.

## Configure Cloudflare Access

1. Create or open a Cloudflare Zero Trust organization. Enable an independent MFA method under **Access controls → Access settings**. Enroll an authenticator in the organization's App Launcher. Require independent MFA for the Admin Desk application or its Allow policy. Keep the policy limited to the owner's exact email address; do not use a broad domain allow rule. Use a short application session and require MFA at each Access login. Do not turn on an IdP MFA exception unless that IdP's assurance has been checked.
2. Create a **self-hosted** Access application for `mylittleproject.co.uk` with protected public hostname/path entries for `/admin`, `/admin/*`, `/api/admin-access`, `/api/admin/*`. Add all entries to the same application when supported. If the dashboard creates separate applications, use the same strict owner policy and MFA rule on both, then list both audience tags in the environment variable below.
3. Copy the Zero Trust team domain and the application Audience (AUD) tag from the Access dashboard. Set these **Production** Cloudflare Pages variables on `my-little-project-website`, then retry/deploy Production:

   - `ADMIN_ACCESS_TEAM_DOMAIN=https://<team>.cloudflareaccess.com` (exact origin without trailing slash)
   - `ADMIN_ACCESS_AUD=<aud>` (or comma-separated audience tags if separate Access applications protect the page and APIs)
   - `ADMIN_ACCESS_EMAIL=<owner's exact Access email address>`

   These are configuration values, not credentials. Keep them out of the public client configuration endpoint. The Access signing keys are fetched from the team's `/cdn-cgi/access/certs` endpoint by `kid` at verification time; no private signing key is stored in Pages.
4. Verify the signed-in production Clerk account's user ID from the account page against Clerk's dashboard. Grant that ID the `admin` role from a trusted D1 console only after Access policy and variables are confirmed. This operation should not be performed through the shop website. Under the current schema each user has one staff role; use a separate Clerk account for Creator Studio testing.

```sql
INSERT INTO staff_access(clerk_user_id,role,enabled,granted_by)
VALUES ('user_VERIFIED_IN_PRODUCTION_CLERK','admin',1,'trusted_operator');
```

## Verify before using Admin Desk

- Anonymous `/admin/` and `/api/admin/workspace` do not expose private data. A Clerk session with no admin role is denied.
- An admin Clerk session without a valid Access application assertion is denied for both reads and writes; a token for another audience or email, a service token, an expired token, and a bad signature are denied.
- After independent MFA and Access sign-in, `/admin/` loads and the Admin API works. Confirm the same session cannot use Creator Studio without a creator role.
- Check the Access configuration covers all four path entries, including the no-trailing-slash variants, and that the `*.pages.dev` host still fails closed at the application gate if it is not protected by Access.
- Review the Access policy and authenticator enrollment in the dashboard. The app verifies the signed application token but cannot infer MFA from its claims. Do not grant the admin role if independent MFA is not enforced by Access.

Sources: [Cloudflare independent MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/independent-mfa/), [application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/), [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Clerk production MFA plan](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options).

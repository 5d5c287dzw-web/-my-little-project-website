# Admin security acceptance checks — development preview

Do not treat a visible dashboard as proof of all security requirements.

## API checks
- GET /api/admin/overview without Authorization must return 401, no business data.
- GET /api/admin/overview with malformed/expired Clerk JWT must return 401.
- Valid ordinary customer JWT must return 403.
- Valid creator JWT without admin role must return 403.
- Valid enabled admin JWT returns 200 with dataLive:false.
- Disable staff_access.enabled for a test account; its next authorized request must return 403.
- Missing D1 binding or missing staff_access table must fail closed (503).
- Confirm response Cache-Control:no-store and Vary:Authorization.
- Confirm preview DB is isolated from production, and no public role-grant endpoint exists.

## MFA and session controls — not yet verified
Enabling MFA in Clerk is not the same as enforcing MFA for every admin request.
The backend currently validates Clerk JWT and role; it does not verify MFA assurance level.
Before exposing private business data, choose and implement a Clerk-supported server-verified
step-up/second-factor policy, then test a password-only session is rejected.
Also test sign-out, session revocation and fresh token issuance. Short JWT lifetimes
do not guarantee immediate revocation.

## Audit
The proposed staff_audit_events schema is not applied. No audit event writes exist yet.
Keep real customer/supplier/order data disconnected until checks pass.

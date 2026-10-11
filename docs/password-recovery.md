# Password recovery

Open /forgot-password to request a reset email. Submit your email and open the latest link in the same browser. The request stores the PKCE verifier in that browser; /auth/callback exchanges the returned code and opens /setup-password.

For an operator-generated recovery link, use /auth/recovery?token_hash=HASH. Generate HASH with Supabase Auth Admin generateLink({ type: "recovery", email }) and use properties.hashed_token. Do not send users through the provider's action_link for this route. Opening the page does not consume the token; the user must press Continue to reset password. The server verifies a recovery token, writes session cookies and redirects to /setup-password.

An expired or used link cannot be recovered. Generate a new link after the deployment is ready. GenerateLink does not send email. Treat the generated URL as a credential: never commit it, log it, or include it in public documentation. No service-role key belongs in the browser.

The Supabase redirect allow list must include the deployed app and the local development app. This change does not alter email-confirmation settings, user roles, the signed-in guard or password-login actions.

Email delivery depends on the project's configured mail service and rate limits. The reset-request form sends email only when the user submits it. The operator link is an alternative that requires the operator's authenticated Supabase access.

## Validation — 11 October 2026

Lint and production build passed. A browser test with a temporary account in the configured Supabase project confirmed that opening the operator link leaves it unused, and pressing Continue establishes the session and opens /setup-password. An unauthenticated request for /setup-password redirects to /login.

A separate Auth API check rejected the wrong token purpose and reuse (otp_expired), accepted a valid recovery token, changed the temporary user's password and signed in with that new password. Both temporary accounts were deleted. This does not establish email delivery or the real user's completion; those still require a fresh link and the user's own password entry.

Architecture check: no new tables, roles or module grants; no changes to module guards, the password-login actions, Supabase clients or core migrations. Recovery verifies only the recovery token type through the existing authenticated client. No administrative key is included in application code.

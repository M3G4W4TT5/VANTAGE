# 0008 — Authentication, ownership and session lifecycle

Status: accepted by the project owner on 2026-09-22; implementation pending. Authentication and baseline authorization are mandatory in the prototype, with an early real integration slice and complete verification before acceptance.

## Decision

Use **Keycloak** as the open-source reference identity provider, through standard **OpenID Connect**. Run it in the reference Compose deployment with its own database and database user; it may share the PostgreSQL server. VANTAGE must not query Keycloak's tables. Pin a compatible stable image when integrating and document actual provisioning, health, backup and recovery commands then.

Use ASP.NET Core's confidential OIDC authorization-code flow with PKCE and a backend-managed session. The browser receives a protected session cookie; access/refresh tokens remain on the backend. Protect state-changing requests against CSRF, restrict redirects, and use appropriate cookie/HTTPS settings. Authorize REST operations, SignalR connection/subscription/resume and background demand at the platform boundary. UI visibility alone is never access control.

The verified prototype sign-in method is **password plus an authenticator app (TOTP)**. Keycloak owns passwords, MFA enrollment and credential recovery. Verify enrollment and operator recovery; do not build parallel VANTAGE credential forms/storage. Passkeys are deferred until after the prototype. Future corporate SSO/federation uses the same OIDC boundary and requires no per-app login implementation; corporate directory integration is not an acceptance dependency.

Provision one authorized operator explicitly. Use a stable VANTAGE user ID mapped to the provider's issuer and subject; email is not an identity key. User-created work carries ownership. VANTAGE controls permission to system operations, connections, datasets and saved work; successful provider login or global connection availability does not itself grant that permission. No public signup, team sharing UI or advanced role editor is required.

## Session and recording rules

One VANTAGE session covers Home, NEXUS, Settings and apps. On explicit sign-out, session expiry or access revocation, deny further operations and close the affected live subscriptions and recording demand. Enforce termination on the backend using bounded session/access checks; do not rely on tab-close handlers, UI state or an already-open SignalR connection. Document and test the expiry/revocation bound during implementation.

Recording remains an explicitly started, bounded source/dataset/AOI operation tied to the initiating authenticated session. Closing a pane or NEXUS does not itself stop an authorized recording while that session remains valid. Signing out stops that session's recording; previously retained data remains under normal retention rules. Signing back in does not automatically restart recording. A lost network/browser connection cannot permit indefinite recording: it remains bounded by the session and recording limits. After a backend restart, reconcile incomplete recordings as stopped/interrupted; do not restart them automatically.

Cancellation of one consumer releases only its demand; independently authorized consumers remain usable. Pause/Replay and layer visibility are presentation controls, not substitutes for Stop recording or sign-out. Access revocation also removes affected demand even if the user's broader session remains valid.

Unattended collection, passive server recording, broader retention/history-provider strategy and global/per-connector polling controls are post-prototype design work. Provider-supported historical queries and the existing bounded Record/Replay requirement remain in scope.

## Migration, recovery and implementation order

Establish user/session contracts, ownership columns, resource authorization and platform service boundaries before extending shared persistence. Assign existing single-operator work to an explicitly configured initial owner in a versioned migration; never grant it to whichever account signs in first. Preserve source provenance separately from the responsible user.

Prove a small real password/TOTP sign-in → protected API/live subscription → sign-out flow early, before treating the boundary as settled. Complete Home/NEXUS/composed ATLAS and remaining features against those contracts. Verify the complete enrollment/recovery, expiry/revocation, failure and clean-install paths late, but before prototype completion. Development identities or fixtures cannot substitute for the real-provider acceptance checks.

Ordinary VANTAGE backups contain user IDs, ownership and non-secret configuration, but no source credentials, session tokens or identity-provider credential database. Document separate protected Keycloak recovery and source-secret reprovisioning. Restore the same issuer/subject mapping or use an explicit verified owner-remapping procedure; never silently reassign ownership. An unavailable identity provider must not create anonymous access. Offline data use still requires a valid authorized session or locally available reference provider.

## Reference basis

Checked during the 2026-09-22 design discussion: [ASP.NET Core OIDC web authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-oidc-web-authentication?view=aspnetcore-10.0), [resource-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resource-based?view=aspnetcore-10.0), [Keycloak authentication administration](https://www.keycloak.org/docs/latest/server_admin/index.html#_authentication), [container deployment](https://www.keycloak.org/server/containers) and [database configuration](https://www.keycloak.org/server/db). These support the integration choices; they are not evidence of completed VANTAGE authentication or security verification.

# 0001 - Prototype technology stack

Status: accepted by the project owner on 2026-09-21; extended on 2026-09-22 for the approved ecosystem and identity foundation. The original Radix UI component choice is superseded by [decision 0002 — Blueprint](0002-blueprint-ui.md); the remaining original technology choices stay in effect.

## Decision

Use the approved stack listed in [AGENTS.md](../../AGENTS.md): React/TypeScript/Vite for the interface, ASP.NET Core on .NET 10 LTS for the backend, PostgreSQL/PostGIS for persistence and CesiumJS for ATLAS visualization.

The current component library, React compatibility and theming rules are defined in [decision 0002](0002-blueprint-ui.md).

Keep one repository and the modular monolith required by [PROTOTYPE_SPEC.md](../../PROTOTYPE_SPEC.md). The React shell hosts registered apps and shared workspace/context services. ASP.NET Core serves the compiled frontend and API from one origin; Vite serves frontend development. Docker Compose supplies the reproducible container deployment.

Add **Keycloak** as the reference open-source identity service in Compose, using a separate database/user and standard OpenID Connect. ASP.NET Core uses confidential authorization-code flow with PKCE, backend-held tokens and a backend-managed cookie session. Verify password plus authenticator-app TOTP; passkeys and corporate directory integration are deferred. Establish identity/ownership and a small real sign-in slice early; complete recovery/session/failure verification within the prototype. See [decision 0008](0008-authentication-and-session-lifecycle.md).

Connection instances use relational metadata plus schema-validated JSONB settings, versioned JSON templates/interchange and backend credential references. NEXUS supplies their management UI; the platform owns collection and shared data. ATLAS consumes these contracts through composed layers. Decisions [0006](0006-vantage-shell-and-composed-atlas.md) and [0007](0007-configurable-connections.md) define those boundaries without introducing microservices or a plugin marketplace.

[DESIGN.md](../../DESIGN.md) continues to govern the interface; [VANTAGE_ECOSYSTEM.md](../../VANTAGE_ECOSYSTEM.md) distinguishes this confirmed foundation from exploratory future apps. ATLAS is the only required analytical app, alongside included NEXUS and Settings system tools. These extensions are implementation requirements, not a claim that the new services exist yet.

## Rationale

- The initial UI choice used React, Radix and custom CSS for direct visual control. Decision 0002 replaces Radix with themed Blueprint components while preserving the VANTAGE design tokens.
- ASP.NET Core supplies a consistent foundation for APIs, collector lifecycles and SignalR communication.
- PostgreSQL/PostGIS fits relational application data, timestamped observations and spatial queries; Npgsql/NetTopologySuite connects spatial operations to the backend.
- CesiumJS supports the required flat-map/globe and time-dependent visualization workflows.
- REST/OpenAPI with a generated TypeScript client supports a C# backend without manually duplicating REST client definitions.
- Standard OIDC separates provider-managed credentials/MFA from VANTAGE-owned resource authorization and leaves a compatible-provider substitution path. One session serves the shell, system tools and apps.

## Consequences

- Maintain C# and TypeScript toolchains. Pin compatible stable versions during scaffolding and document actual commands in the README.
- Keep contracts language-neutral. NSwag covers REST; SignalR messages and stored/exported records retain their own versioned schemas.
- Store files behind a local persistent storage interface. Keep metadata and user configuration in PostgreSQL. Implement the required AI interface and labelled mock; optional live AI adapters remain server-side and use user credentials.
- Hosted workers need explicit persistence for restart-surviving jobs. SignalR needs application-level sequencing and reconnect recovery.
- Session-bound prototype recording stops on sign-out, expiry or access revocation and does not automatically restart after login/backend restart. This is distinct from future unattended collection. Ordinary VANTAGE backups exclude secrets; document separate protected identity recovery and source-secret reprovisioning.
- Verify Cesium/provider format compatibility. A vector-tile source is not automatically usable as a Cesium imagery layer; use a suitable adapter or a verified equivalent free source under the specification's source-substitution rules.
- No required paid service is introduced. The 2026-09-22 specification explicitly adds the system surfaces, configurable connections and identity scope; other future-app technologies/workflows remain open.

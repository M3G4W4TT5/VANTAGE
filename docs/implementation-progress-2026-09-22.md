# Implementation progress — 2026-09-22

## Current checkpoint

**Implementation-plan steps 1–3 are implemented and verified. Stop for owner review before step 4.** The operator's private password change/authenticator enrollment remains outstanding; the real-provider checks used a disposable account. This is not full prototype or AC-01–21 acceptance.

Initial checkout: clean `main` at `c37ebb5`. Read AGENTS, implementation plan, specification, design, ecosystem, decisions 0001–0008 and the change record. Existing assets and preparatory work were preserved. No commit or push performed.

## 1. Baseline and preservation — complete

- Baseline passed: clean backend build, 6/6 xUnit, 6/6 Vitest, frontend type/lint and 8/8 browser workflows.
- Stopped only the application before backup. Protected baseline: `artifacts/private-backups/20260922T130929Z/`, ignored, directory 0700/files 0600. Custom-format dump, schema, SHA-256 manifest and complete row fingerprints are present. Identity credentials are excluded.
- Baseline counts: 2 workspaces; 1,562 current aircraft; 64 current earthquakes; 1 earthquake feed; 12,094 observations.
- Restored and migrated an isolated real PostgreSQL/PostGIS database. All original table/field fingerprints matched, then the temporary database was removed. Applied the ownership migration to the existing operator database only after that check; all five fingerprints still matched immediately afterward.
- Final cleanup check: both original workspaces still match every baseline field, and only the configured operator remains in `platform.users`. Live observation collection can subsequently update current projections under the existing revision/retention policy.
- The `vantage_database` volume was never recreated.

Backup commands are in [README](../README.md#contracts-and-migrations). `scripts/backup-local.py` quiesces the Compose app and leaves it stopped; stop any native API separately. `scripts/verify-backup-migration.py BACKUP_DIRECTORY` restores into a randomly named isolated database, checks original columns/content before and after migration, then removes only that database. Verification passed for the original legacy backup, new post-ownership manifests, older post-ownership manifests and rejection of incorrect column metadata.

Manual restore into an **unused isolated database**, never over live data:

```sh
sudo docker exec vantage-db-1 createdb -U vantage RESTORE_DATABASE
sudo docker exec -i vantage-db-1 pg_restore -U vantage -d RESTORE_DATABASE --no-owner --no-privileges --exit-on-error < artifacts/private-backups/20260922T130929Z/vantage.dump
```

Validate it before changing any application connection. Identity recovery is separate; see [identity operations](identity-operations.md#protected-identity-backup).

## 2. Platform ownership and identity foundation — complete

- EF migration `20260922131212_PlatformOwnership` moves `current_aircraft`, `current_earthquakes` and `earthquake_feeds` from `atlas` to `platform`, retaining stored identities/provenance and domain revision rules.
- `platform.users` provides stable internal identity, unique issuer/subject mapping, enabled/data-access permissions and access revision. Workspaces have restrictive owner foreign keys and server-assigned ownership; every workspace operation filters the current owner.
- Migration requires the explicitly configured initial operator before DDL/backfill. Missing configuration fails atomically; later remapping fails. Login never assigns legacy work. Initial IDs are generated once in ignored local configuration and preserved on rerun.
- Domain controllers and shared access belong to the platform. A test-only independent consumer reads shared data with ATLAS unregistered; saved app state remains recoverable. Frontend import checks enforce platform/app independence.
- Registration now supplies app/system-tool kind, branding, navigation and workspace requirements. The existing ATLAS shell uses this metadata. No Home, NEXUS, connection registry or ATLAS state-v2 migration was added.

## 3. Real authentication and session lifecycle — complete

- Keycloak 26.7.4 is pinned by digest, with its own restricted database/login on the retained PostgreSQL server. The app uses restricted `vantage_app`; migration/provisioning/backup jobs retain the administrator connection. Actual checks deny runtime connection to Keycloak and identity-mapping updates.
- Confidential OIDC authorization code + S256 PKCE uses backend-held tokens and an HttpOnly reference cookie backed by an in-memory ticket store. ASP.NET uses Keycloak's advertised pushed authorization requests (PAR). Only the refresh token needed for session validation/revocation is retained, in backend memory. Restart invalidates sessions.
- Password and authenticator-app TOTP are required in the provider browser flow. Local email is optional, with profile validation retained. The standard `basic` and `profile` scopes preserve subject information. Bootstrap generation preserves existing secrets; a disposable fresh realm import verified the optional-email/password/TOTP configuration.
- Validated issuer/subject are retained in platform claims because the OIDC handler removes standard protocol claims later in its pipeline. A regression exercises that exact claim-action sequence and verifies the monitor reaches the provider.
- REST, evidence and SignalR connection/subscription/resume require authorization. Unsafe cookie requests require CSRF; unsafe and live requests reject foreign or null origins. Public sign-in assets remain accessible. `same-origin` referrer policy permits the native protected sign-out form while suppressing cross-origin referrers.
- Sessions have a fixed 30-minute maximum and a 64-session local cap. Backend checks run at most every 15 seconds, with a 3-second combined timeout and 1-second scheduler. Conservative cleanup bound: **25 seconds**. Provider failure fails closed. Diagnostics contain only status/boolean/exception classifications, not tokens or response bodies.
- `ISessionLifetime` leases cancel affected live/background demand on sign-out, expiry, revocation and access loss. Losing data permission ends data leases; regranting does not restart old work. This is a tested lifecycle contract for later recording, not a recording feature.
- Frontend session boundaries abort old requests, clear observation caches/subscriptions and scope workspace selection to the owner. Late responses cannot restore a prior session's state. Backend cancellation does not depend on browser cleanup.

## Verification results

| Check | Result |
| --- | --- |
| `dotnet build Vantage.slnx --no-restore` | Passed; zero warnings/errors |
| `node scripts/test-backend.mjs` | **22/22 passed, zero skipped**, isolated real PostgreSQL/PostGIS |
| `dotnet ef migrations has-pending-model-changes --project backend/Vantage.Api` | No pending changes |
| `npm --prefix frontend run typecheck` / `lint` | Passed |
| `npm --prefix frontend run test` | **18/18 passed**, 6 files |
| `npm --prefix frontend run api:generate` | OpenAPI and NSwag client regenerated successfully |
| Compose app image build | Passed, including frontend production build and backend publish; existing large-chunk warning remains |
| Authenticated Playwright regressions | **8/8 passed** in 2 minutes; real session, deterministic domain/socket fixtures and tile interception |
| Documentation and privacy checks | Local links, shell snippet syntax and diff whitespace passed; generated secrets absent from tracked/unignored source artifacts |

Backend coverage includes ownership, atomic/preserving migrations, ATLAS independence, domain/spatial/revision rules, real cookie/CSRF middleware, protected WebSockets, shared cancellation, expiry, disabled/revised access, provider failure/timeout, restart and session limits. Fixture-based provider checks do not substitute for the separate live run.

**Real Keycloak verification passed:** anonymous UI gating and REST/evidence/live denial; password plus TOTP enrollment; a fresh password sign-in requiring TOTP; invalid-code rejection; protected REST/live access; missing-CSRF rejection; native sign-out rejecting a copied cookie; healthy session/socket survival across two scheduled provider checks; and actual provider revocation closing the protected socket in **14,951 ms**, within 25 seconds. Earlier incomplete runs exposed static routing, native-form origin and OIDC claim-processing defects; these were fixed before the passing final run. No authentication screenshots, videos or traces were captured. The test account, its workspaces and ephemeral cookie files were removed afterward.

Safe evidence is in ignored `artifacts/milestone-auth-review/`: `live-result.json`, `test-results/` and `playwright-report/`. Domain images cover dark/light maps, tables, inspectors and portalled controls, plus narrow/reduced-motion workflows. Five selected screenshots were inspected against DESIGN: no material visual regression found. Full branding, both themes, portalled controls, readable account/sign-out controls at narrow width and shared earthquake inspection remained consistent. These still images do not establish full accessibility or performance acceptance.

## Changed paths

- Backend: `Platform/Identity/`, `Platform/Observations/` controllers/hub, `Platform/Workspaces/WorkspacesController.cs`, health, Program composition, persistence/model/migration, session/workspace DTOs, package/lock files.
- Contracts: `contracts/schemas/v1/records.schema.json`, generated OpenAPI and `frontend/src/api/generated/client.ts`.
- Frontend: `platform/session/`, registry/contracts/shell/workspaces/observation channels, main composition, guarded earthquake evidence client, ESLint boundaries and Vite auth proxies.
- Operations: `infra/compose.yaml`, `.env.example`, Keycloak template/ignore rules, `.dockerignore`, initialization/provisioning/backup/verification scripts, README and this record plus identity operations.
- Tests: backend identity/ownership/authentication suites and adapted domain tests; frontend session/workspace/registration tests, authenticated Playwright fixture/config and `frontend/scripts/test-auth-live.mjs`.

## Runtime and exact next action

Final rebuilt application is running at **http://127.0.0.1:5080**; health reports application/storage ready. PostgreSQL is healthy on loopback 54329; Keycloak is healthy at **http://localhost:8180**. The application was restarted after test cleanup, clearing all test sessions/demand. No recording exists or restarts. Prior unrelated stopped test containers were preserved.

Node commands need the pinned mise runtime; on this machine prepend `/home/megawatts/.local/share/mise/installs/node/24.20.0/bin` to PATH. Docker commands require sudo. Actual native/container setup, migration and regeneration commands are in README; credentials are never command-line arguments.

**Next action: owner review.** Follow [private operator enrollment](identity-operations.md#initial-operator-enrollment): obtain the temporary password from the protected local file in a trusted editor, sign in as `operator`, change the password and enroll the owner's authenticator. The provider currently reports `UPDATE_PASSWORD` and `CONFIGURE_TOTP` pending for that configured operator. Do not send the password, QR code, seed or codes into this task.

Physical-device enrollment, full account/identity recovery, a complete clean-install recovery exercise, remote HTTPS deployment and measured full-prototype performance remain unverified. Deterministic expiry/provider-failure checks passed; the live run specifically verified stable sessions, sign-out and administrative revocation. Home is step 4 and requires the next authorization; NEXUS, composed ATLAS, GeoJSON and broader prototype acceptance remain later work.

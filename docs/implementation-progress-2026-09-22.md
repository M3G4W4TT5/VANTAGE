# Implementation progress — 2026-09-22

## Current checkpoint

**Implementation-plan steps 1–4 are implemented. Stop for owner review before step 5.** Step 4 adds Home, deliberate workspace launch, functional Settings and personal theme persistence. This is not full prototype or AC-01–21 acceptance.

Initial checkout: clean `main` at `c37ebb5`. Read AGENTS, implementation plan, specification, design, ecosystem, decisions 0001–0008 and the change record. Existing assets and preparatory work were preserved. No commit or push performed.

## Owner-reported identity handoff

The owner reports completing the operator password change and authenticator-app TOTP enrollment, verifying fresh login/logout and invalid-password/OTP errors, establishing a permanent Keycloak recovery administrator, retiring the bootstrap administrator, and making protected identity backups. These are owner-reported facts, separate from the disposable-account checks recorded below and from step-4 checks. No recovery-administrator credential was read, copied into a test file or used in this step. The existing customized Keycloak sign-in theme and application workspaces were preserved.

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

## 4. Home, navigation, workspaces and preferences — review checkpoint

- Authentication now lands on VANTAGE Home without opening or creating a workspace. Home has Workspaces, Apps, System and Account areas. ATLAS launch chooses an existing or new workspace; the header returns Home while retaining the current draft. Settings is a registered system tool that opens without an ATLAS workspace. NEXUS is not advertised before its step-6 interface exists.
- Home exposes create, open, rename, duplicate and delete for owned workspaces. Reload restores the saved revision. Switching away from unsaved work offers Save or Discard; reopening the same workspace from Home resumes its draft. The backend's owner checks and revision conflicts remain in force. Missing or incompatible app panes retain their saved state and show an unavailable explanation.
- Personal theme has its own owner-scoped `platform.personal_preferences` row, revision-checked API and immediate Save, independently of workspace Save. The additive migration reads the most recently updated v1 workspace's valid theme, defaulting to dark when unavailable, and leaves all v1 workspace JSON intact for later state migration. Settings also shows authenticated application/storage status and links to the provider-managed account page.
- Fresh protected application backup: ignored `artifacts/private-backups/20260922T215325Z/` (directory 0700/files 0600). Before migration it contained 1 workspace, 1 platform user, 1,862 current aircraft, 77 current earthquakes, 1 earthquake feed and 15,942 observations. The isolated PostgreSQL/PostGIS restore and migration check passed with every original row and field preserved. The migration `20260922215442_PersonalPreferences` was then applied to the operator database. Post-migration user and workspace row fingerprints exactly matched the fresh backup; the workspace count remains 1. The database volume and identity database were not recreated.
- The restricted runtime role was granted only the new preferences table operations; provisioning verified it can read that table and still cannot access the Keycloak database or mutate platform identity mappings. OpenAPI and the NSwag client were regenerated from the new REST contract. ATLAS state v2 and configurable connections were not started.

## Step 4 verification results

Review follow-up (2026-09-23): fixed sign-out getting stuck on VANTAGE's spinner. The form now uses native POST/navigation without clearing the React session before the browser leaves. This also lets an unsaved-work unload prompt be canceled while retaining the draft. A credential-free browser regression passed against the rebuilt app: canceling the prompt sent no logout POST; accepting it completed a delayed POST and returned to the sign-in screen. This fixture does not replace a fresh real-operator logout check.

| Check | Result |
| --- | --- |
| `dotnet build Vantage.slnx --no-restore` | Passed with no warnings or errors |
| `node scripts/test-backend.mjs` | **23/23 passed, zero skipped** against isolated PostgreSQL/PostGIS databases; includes preference backfill, owner separation, default, update, conflict, invalid theme and restart |
| `npm --prefix frontend run typecheck` and `lint` | Passed |
| `npm --prefix frontend run test` | **25/25 passed, zero skipped** on the final integrated rerun |
| Compose app rebuild (including `npm run build` in the image) | Passed; the built frontend and backend are in the local app for review |
| `npm --prefix frontend run api:generate` | Regenerated OpenAPI and the NSwag TypeScript client for the preferences API |
| `python3 scripts/backup-local.py` and `python3 scripts/verify-backup-migration.py artifacts/private-backups/20260922T215325Z` | Fresh protected application backup and isolated restore/migration verification passed; original rows and fields preserved |
| `vantage-browser ./node_modules/.bin/playwright test tests/browser/home-fixture.spec.ts --reporter=list` | **1/1 passed** against the rebuilt production app at 5080; fixture-only Home/Settings/ATLAS launch, keyboard, 1440×900 desktop and narrow/reduced-motion checks, and both-theme workflow |
| Built app `/api/v1/health` | `status: ready`, `storage: ready` after rebuild |

Desktop screenshots at 1440×900 were inspected for dark Home, light Settings and the light ATLAS list view; the primary desktop layouts showed no material visual issue or horizontal overflow. The ATLAS screenshot uses an intentionally unavailable fixture live feed, so it verifies layout and empty/error presentation, not live connector data. Dark Home and light Settings were also inspected at 390px with no material issue. The browser check confirmed keyboard focus and no horizontal overflow at both widths. Five fixture screenshots are in ignored `artifacts/step-4-browser-review/`. It used fixture session/data responses, so it did not verify a live Keycloak sign-in or persistent API writes. The prior real Keycloak checks below used a disposable account. Step-4 authenticated browser and live-provider checks were skipped because their setup still requires the now-retired bootstrap administrator; no recovery-administrator credentials were put in tests. Manual operator sign-in/failure checks are owner-reported above, not agent-verified step-4 results.

## Steps 1–3 verification results (prior checkpoint)

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

Step 4:

- Backend/contracts: `Platform/Preferences/`, persistence model and `20260922215442_PersonalPreferences`, workspace/preference DTOs, restricted runtime-role provisioning, OpenAPI and generated TypeScript client.
- Frontend: Home, Settings, shell navigation, registration and workspace draft handling, personal theme loading/saving, and associated CSS Modules.
- Tests/docs: preference integration and frontend unit tests, fixture Home browser check, navigation helpers, README, identity-operations notes and this record.

Steps 1–3 (prior checkpoint):

- Backend: `Platform/Identity/`, `Platform/Observations/` controllers/hub, `Platform/Workspaces/WorkspacesController.cs`, health, Program composition, persistence/model/migration, session/workspace DTOs, package/lock files.
- Contracts: `contracts/schemas/v1/records.schema.json`, generated OpenAPI and `frontend/src/api/generated/client.ts`.
- Frontend: `platform/session/`, registry/contracts/shell/workspaces/observation channels, main composition, guarded earthquake evidence client, ESLint boundaries and Vite auth proxies.
- Operations: `infra/compose.yaml`, `.env.example`, Keycloak template/ignore rules, `.dockerignore`, initialization/provisioning/backup/verification scripts, README and this record plus identity operations.
- Tests: backend identity/ownership/authentication suites and adapted domain tests; frontend session/workspace/registration tests, authenticated Playwright fixture/config and `frontend/scripts/test-auth-live.mjs`.

## Runtime and exact next action

The rebuilt application is running for review at **http://127.0.0.1:5080**; `/api/v1/health` reports application and storage ready. The local PostgreSQL and Keycloak services retain their existing data and configuration. Rebuilding the app invalidates its in-memory sessions, so review requires a fresh operator sign-in. No recording feature exists or restarts. Node commands need the pinned mise runtime (`/home/megawatts/.local/share/mise/installs/node/24.20.0/bin` on this machine); Docker commands require sudo. Actual setup, migration and regeneration commands remain in README.

**Next action: owner review of step 4.** Inspect Home, opening and creating ATLAS workspaces, returning Home with a draft, Settings without a workspace and personal theme in both modes. Stop before step 5. The owner has already completed private operator enrollment and recovery-administrator handoff; no temporary password or new credential enrollment is requested here.

Step-4 build, backend/frontend suites and fixture browser/visual checks passed. Authenticated browser and live-provider checks were skipped because the retired bootstrap account is still required by their setup; the owner's fresh sign-in/logout and invalid-credential checks are reported above. Complete clean-install identity recovery, remote HTTPS deployment and measured full-prototype performance remain unverified. The prior live run verified session/sign-out/revocation behaviour with a disposable account. NEXUS, configurable connections, composed ATLAS, GeoJSON and broader AC-01–21 acceptance remain later work.

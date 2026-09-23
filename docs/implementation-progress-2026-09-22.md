# Implementation progress — 2026-09-22

## Current checkpoint

**Implementation-plan steps 1–8 and the owner's subsequent ATLAS interface revisions are implemented. Stop for owner review before step 9.** Layers, Sources and List use compact outliner-style rows, with context menus and map visibility at group and record level. Layers hide/show now preserves the Cesium viewer and, after first activation, the live snapshot for immediate re-show. GeoJSON and the full AC-01–21 acceptance remain outstanding.

Step 8 began with the owner's uncommitted steps 5–7 intact. The customized sign-in theme, existing workspace, observations, provenance, connection definitions and saved v1 JSON were retained. No reset, commit or push was performed. The existing workspace remains stored as v1 until its owner explicitly saves the converted v2 view. The original step-8 implementation needed no EF migration; the later approved personal region/timezone change did, so a new protected backup and isolated PostGIS migration verification were completed before the live change.

Step 7 began with the owner's uncommitted step-5/6 checkout intact. The customized sign-in theme, existing workspace, observations, provenance, connections and saved v1 JSON were retained. No reset, commit or push was performed. The single existing workspace remains stored as v1 until its owner explicitly saves the converted v2 state.

Step 6 began with the owner's uncommitted step-5 checkout intact, including the customized sign-in theme, saved workspace and local database. No reset, commit or push was performed. No database model or migration changed in step 6; existing PostgreSQL and Keycloak volumes were retained.

Step 5 began from the owner's clean, committed/pushed step-4 checkout at `bb6c85f` (`added home abstraction`). The customized sign-in theme, existing workspace and step-4 logout fix were preserved. Step-5 work remains local and uncommitted; no push was performed.

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

## 5. Configurable platform connections — review checkpoint

- Registered ADSB.lol aircraft and USGS earthquake connector types with version-1 settings schemas, bundled version-1 templates, dataset capabilities/coverage/attribution/limits and explicit supported operations. The database is the active authority: `platform.connections` stores identity, owner, scope, enabled state and revision relationally, with validated JSONB settings; `platform.datasets` keeps stable dataset references. Migrated cadence is preserved, while new connections use provider defaults and ordinary edit does not expose deferred polling controls. Global availability never grants another user's access; workspace-only availability requires the owned workspace on data requests.
- EF migration `20260922232255_ConfigurableConnections` captured the existing enabled/cadence values once as `legacy-aircraft` and `legacy-earthquakes`. It backfilled connection IDs on current aircraft/earthquake/feed rows and acquisition links on the existing observation rows. Original observation IDs, source IDs, normalized/raw provenance, saved workspace JSON and user identity were not rewritten. Future starts and template changes do not reseed deleted or edited defaults.
- The protected `/api/v1/connections` contract supports list, create from type/template, edit, duplicate, impact, datasets, explicit test/preview, disable, soft remove and versioned JSON import/export. Settings, owner/workspace scope and revision are validated before Save; stale or invalid edits keep the working row. Imports validate the portable schema and reject unknown fields; unresolved credential references remain setup-required. Exports omit connection IDs, secret references and values. Current connectors need no credential; the encrypted backend secret store and separate recovery boundary are ready for credential-bearing connectors.
- Aircraft and earthquake collection now key authorized demand by connection/revision and query or catalog scope. Equivalent pane subscribers share one upstream operation; distinct connections retain independent current projections. Provider starts are rate bounded across preview and collector work. Disable/remove/revision changes cancel affected demand while unrelated demand stays open. Deleting a workspace also cancels its scoped connections and revokes their data/evidence access; retained rows remain available for recovery through an authorized scope change. Availability, import, restart and signed-in Home alone start no collection. New connection-aware REST/SignalR operations coexist with the default v1 ATLAS calls; NEXUS UI and ATLAS state v2 were not built.
- Fresh pre-migration protected backup: ignored `artifacts/private-backups/20260922T231323Z/` (directory 0700, files 0600), captured while only the application was stopped. It contained 1 workspace, 1 user, 1,608 current aircraft, 77 current earthquakes, 1 feed and 10,863 observations. Its isolated PostgreSQL/PostGIS restore and final step-5 migration check passed, including two seed rows, dataset links and complete known-source delivery backfill. After applying the migration locally, all **seven original table fingerprints** matched the backup exactly. The live database then contained 2 connections, 2 datasets and 10,863 delivery links. The database volume and Keycloak database were retained.
- Ordinary future application backups now exclude encrypted connection-secret table data while retaining non-secret definitions/references. The connection encryption key was added to ignored, protected local configuration without reading or changing recovery-administrator credentials. The restricted runtime role can access only the new application/secret tables it needs and still cannot read the Keycloak database or modify identity mappings.

### Step 5 verification results

| Check | Result |
| --- | --- |
| `dotnet build Vantage.slnx --no-restore` | Passed with zero warnings/errors |
| `node scripts/test-backend.mjs` | **29/29 passed, zero skipped** against isolated PostgreSQL/PostGIS databases; covers migration persistence, scope/access and workspace deletion revocation, lifecycle, invalid/stale edits, duplicate/import/export, secret encryption, acquisition lineage, shared demand/cancellation, explicit preview and no collection from availability |
| `dotnet ef migrations has-pending-model-changes --project backend/Vantage.Api --startup-project backend/Vantage.Api --context VantageDbContext` | No pending model changes |
| `npm --prefix frontend run api:generate` | OpenAPI and NSwag TypeScript client regenerated |
| `npm --prefix frontend run typecheck`, `lint`, `test` | Passed; **25/25** Vitest tests |
| `python3 scripts/verify-backup-migration.py artifacts/private-backups/20260922T231323Z` | Final isolated restore/migration passed; all original rows/fields, seeded defaults and delivery linkage checked before the operator migration |
| Local migration, fingerprint comparison and runtime-role provisioning | Passed; original seven table fingerprints unchanged; Keycloak DB and identity-mapping mutation denied to runtime role |
| Compose `up -d --build app` | Passed, including production frontend/backend build; existing large-chunk warning remains |
| Built app `/api/v1/health`; anonymous `/api/v1/connections` | Ready storage; anonymous request rejected with 401 |
| Credential-free Home browser fixture | **1/1 passed** against rebuilt app; existing Home/Settings/ATLAS destination behaviour retained |
| Post-rebuild database/service check | App, PostgreSQL and Keycloak running; 1 workspace, 10,863 observations, 1,608 current aircraft and 77 current earthquakes, unchanged from pre-migration backup; 2 connections, 2 datasets, 10,863 delivery links |

The new API's successful preview and lifecycle checks used deterministic fixture providers. No authenticated live-operator browser or external-provider smoke test was run in this step: the old scripts still require the retired bootstrap administrator, and no recovery-administrator credential was placed in tests. The owner's prior password/TOTP and recovery handoff remains separately recorded above. Current adapters have fixed endpoints and need no source credential; credential-dependent adapter resolution and its live recovery path remain unverified. Full NEXUS, composed ATLAS, DS-29 GeoJSON, clean-install recovery and measured prototype performance remain later checkpoints.

## 6. NEXUS — Data Manager — review checkpoint

- Registered NEXUS as a branded system destination in Home and navigation, accessible without a workspace. The existing ATLAS views still use their migrated default connections; Settings has no connection form. Opening NEXUS only reads connection definitions, owned workspaces, schemas, impact and local status. It does not subscribe to observations or start a provider request. Closing it releases only its view state and cannot cancel another consumer's demand.
- The interface lists connections and their datasets and supports Add from a versioned bundled template or installed connector type, schema-driven Edit with explicit connection Save, Duplicate, explicit Test/preview, Disable, Remove, and version-1 JSON Import/Export. Test/preview returns a small normalized sample and saves no observations. The backend now also tests an unsaved new draft. Create/Duplicate advertise their actual HTTP 201 responses in OpenAPI, which allows the generated client to complete both workflows.
- Each connection shows dataset coverage, capabilities, operations, attribution, provider cadence and limits, availability scope, current and proposed workspace reach, and the consequences of a shared edit. Reach is labelled as potential availability under the owner's workspace authorization, not a grant or a confirmed ATLAS layer dependency. Provider cadence remains metadata, with no operator polling control.
- A read-only status endpoint reports current local provider/connection health, active shared operations and consumer count, latest cached retrieval and cached record count independently. With no active demand it reports health as `not_checked`; it does not infer provider health from cached data. The interface marks cache freshness against the dataset threshold separately. Disabled, removed, unavailable and setup-required states are explicit.
- Invalid settings/name/scope, schema-loading failures, stale revisions, failed Saves, provider failure/rate limits, denied/expired sessions, loading and empty lists, and imported unresolved credentials have visible handling. A failed edit keeps its local draft and the server keeps the active revision. Switching connections or importing while editing asks before discarding a draft. Credential controls appear only for connector types that declare bearer authentication; they are write only, cleared after submission and absent from export. The two installed connectors currently declare no credential mode.
- Supplied light/dark NEXUS wordmarks, shared tokens, Blueprint controls, visible focus, responsive layout and reduced-motion handling were used. The fixture browser check exercises keyboard focus and horizontal overflow at desktop and narrow widths. Current connector settings schemas expose only fixed `pollSeconds`, so schema-driven rendering shows that value read only; new configurable provider fields require a later connector schema.
- No EF model or migration changed. A model-diff check found no pending migration, so the conditional backup/isolated migration procedure was not triggered. The existing application and identity databases, connection rows, observations, workspace, branding and uncommitted step-5 files were retained. The generated OpenAPI and TypeScript client were updated together.

### Step 6 verification results

| Check | Result |
| --- | --- |
| `node scripts/test-backend.mjs` | **31/31 passed, zero skipped** against isolated real PostgreSQL/PostGIS; added status/no-demand, unavailable-provider and draft-preview coverage |
| `dotnet ef migrations has-pending-model-changes --project backend/Vantage.Api --startup-project backend/Vantage.Api --context VantageDbContext` | No pending model changes; no migration applied in step 6 |
| `npm --prefix frontend run typecheck`, `lint`, `test` | Passed; **27/27** Vitest tests |
| `npm --prefix frontend run api:generate` | Regenerated OpenAPI and NSwag TypeScript client for status, draft preview, sample rows and 201 responses |
| Compose `up -d --build app` | Passed, including production frontend and backend builds; existing Vite large-chunk warning remains |
| Pinned Playwright container: `home-fixture.spec.ts` and `nexus-fixture.spec.ts` | **2/2 passed** against the final rebuilt app, with fixture session/data, lifecycle controls, stale/invalid drafts, unsaved Home/search/import guards, no collection on NEXUS open, keyboard focus, both themes, narrow width and reduced motion |
| Visual review of fixture screenshots | Dark and light 1440px desktop and light 390px narrow NEXUS layouts inspected; no material visual issue or horizontal overflow found. Screenshots are in ignored `artifacts/step-6-browser-review/` |
| Built app `/api/v1/health`; anonymous `/api/v1/connections` | Application/storage `ready`; unauthenticated connection list rejected with 401 |
| Post-rebuild read-only PostgreSQL counts | Same as pre-rebuild: 1 workspace, 9,242 observations, 1,459 current aircraft, 92 current earthquakes, 2 connections and 2 datasets |

The browser workflow uses deterministic fixture authentication and source responses. It checks UI behavior, not real operator sign-in, persistent live API writes or provider availability. No recovery-administrator credential was placed in fixtures. The old live-authentication scripts still depend on the retired bootstrap administrator, so a new real-operator browser or external-provider smoke check was not run here. These checks do not establish full accessibility or AC-01–21 acceptance.

## 7. Composed ATLAS pane state and contributors — review checkpoint

- ATLAS state v2 has one pane camera plus the existing pane area/time context and multiple aircraft or earthquake layer instances. Each instance keeps its own connection/dataset reference, filters, aircraft query, appearance and last selection. Entity/observation IDs remain source records; layer IDs and map appearance IDs are separate. The shared Cesium map, results table and inspector components render domain contributors. Aircraft position-time and earthquake source-revision ordering, precision, depth and provenance contracts remain in their domain paths. Ordinary live batches do not enter saved workspace JSON or the user-context bus.
- The narrow step-7 controls allow a reviewer to focus, show/use, copy, remove or add an available dataset layer, adjust independent filters/appearance and select per-layer results. NEXUS remains the place to manage connections. Equivalent authorized appearances share a connection/workspace/query channel and one upstream demand; unused layers do not paint even if another appearance shares that channel. Removing a layer or closing a pane releases its subscription. A failed marker contributor or controls/inspector presenter leaves other layer instances available.
- A valid v1 pane converts on read using the previously active domain's camera, selection and participation. The formerly inactive domain's camera, selection and settings remain recoverable; context area/time and existing workspace IDs remain intact. Legacy demo mode is recorded in recovery metadata and starts neither live layer. The original v1 JSON remains stored until explicit Save, and conversion alone does not request observations. Invalid v1 or v2 JSON returns a recovery explanation while preserving its exact stored original. There is no EF model change or database schema migration in this step.
- The local pre-change database was inspected with 1 workspace, 5,904 observations/deliveries, 800 current aircraft, 111 current earthquakes, 2 connections and 2 datasets. A fresh protected application-data backup was captured at ignored `artifacts/private-backups/20260923T104009Z/` (directory 0700, files 0600) while the app was stopped. `python3 scripts/verify-backup-migration.py artifacts/private-backups/20260923T104009Z` passed an isolated PostgreSQL/PostGIS restore and checked all original rows and fields. The Keycloak database and local sign-in theme were not changed.

### Step 7 verification results

| Check | Result |
| --- | --- |
| `dotnet build Vantage.slnx --no-restore` | Passed, zero warnings/errors |
| `node scripts/test-backend.mjs` | **32/32 passed, zero skipped** against isolated PostgreSQL/PostGIS; includes v1 read conversion, two independent panes, active camera/participation, inactive recovery, invalid-original preservation, explicit Save and restart |
| `dotnet ef migrations has-pending-model-changes --project backend/Vantage.Api --startup-project backend/Vantage.Api --context VantageDbContext` | No pending model changes; no live database migration was applied |
| `npm --prefix frontend run api:generate` | Regenerated OpenAPI and NSwag client; step-7 workspace state is in the versioned JSON Schema, with no new REST DTO |
| `npm --prefix frontend run typecheck`, `lint`, `test` | Passed; **29/29** Vitest tests, including shared channel/appearance identity, independent filters and failing contributor |
| Protected backup and isolated restore | Passed before editing the live application data; original rows/fields retained |
| Compose `up -d --build app` | Passed for production frontend/backend at `http://127.0.0.1:5080`; the existing Cesium/Blueprint large-chunk warning remains |
| Pinned Playwright container: Home, NEXUS and ATLAS fixtures | **3/3 passed** against the rebuilt app; composed map/results/inspection, independent filters/selection, one start for duplicate demand, fixture Save/reload, unlinked pane state, pane close, both themes, narrow/reduced-motion and keyboard/list workflows |
| Fixture screenshots and layout | Dark 1440px composed map and light 390px inspector reviewed; no horizontal overflow at narrow width. Ignored screenshots are in `artifacts/step-7-browser-review/` |
| Compose app-only restart; health and read-only database counts | Application/storage ready after restart; pre/post counts exactly matched: 1 workspace, 5,904 observations/deliveries, 800 current aircraft, 111 current earthquakes, 2 connections, 2 datasets |
| `git diff --check` | Passed; no reset, commit or push |

The browser fixture supplies synthetic authentication, aircraft and earthquake batches; it verifies UI composition, not current provider availability or a real operator session. Backend migration/restart checks use a separate real PostgreSQL/PostGIS database, not the owner's workspace. The retired-bootstrap live-auth scripts were not run, and no recovery-administrator credential entered tests or logs. The complete step-8 Layers / Sources / Tools interface, grouped explorer, GeoJSON, clean-install recovery, full accessibility audit, live-provider smoke and measured performance acceptance remain outside this checkpoint.

## 8. Unified ATLAS interface — review checkpoint

- Added keyboard-navigable **Layers / Sources / Tools** tabs. Layers groups the implemented domains by category, then by layer, with independent Focus, Show, Use, Results inclusion and drawing-order controls. Shared Filters, Appearance, Legend, Coverage & time and Actions sections replace separate domain toolbars. The visible-layer legend combines current aircraft and earthquake symbols. Sources searches supported datasets, adds a dataset as a new layer appearance and opens that connection in NEXUS; connection editing remains in NEXUS. Tools exposes the existing place search and basemap controls only.
- Added category → layer → record exploration and mixed/aircraft/earthquake tables. Result scope is explicit: focused, selected, all participating layers or current map view. The full queried-area List includes cached records without map coordinates. Counts distinguish unique cached records from layer appearances and mappable appearances; upstream truncation, failed presenters and cache-only totals are labelled. Rows are rotated across participating layers in 300-row pages so a dense layer cannot fill the first page. The map similarly allocates a bounded per-layer symbol budget and reports when symbols are limited. These are presentation limits, not measured prototype performance targets.
- Shared inspection keeps the selected layer and record separate from focused controls. Changing focus updates the aircraft query outline without recreating the map canvas. Cesium overlap picking presents the distinct layer appearances as keyboard-accessible choices while ignoring duplicate badge hits. Drawing-order changes update marker stacking. Selection and provenance remain stable across table/list/map, layer reordering and pane changes. One contributor's failed snapshot or presentation is contained and the other layer stays usable. The pane's shared result dock and live UTC/time bar show Timeline, Media, recording and replay as unavailable for current capabilities. Saved non-live time context is retained and explicitly labelled when current live-cache results are shown.
- The additive v2 state fields (`sidebarTab`, `resultTable`, `resultLayerIds`) and `map-area` result scope are optional in the versioned JSON Schema; existing v2 and read-time v1→v2 workspaces remain valid. Backend validation rejects selected-scope references to absent layers. No EF model changed, no migration was created or applied, and opening or restoring a workspace does not start extra collection. Closing a layer or pane releases its own demand; equivalent active appearances continue sharing one authorized upstream request.

### Step 8 verification results

| Check | Result |
| --- | --- |
| `npm --prefix frontend run api:generate` | Passed; regenerated OpenAPI and NSwag client after the compatible versioned state-schema change |
| `dotnet build Vantage.slnx --no-restore` | Passed, zero warnings/errors |
| `node scripts/test-backend.mjs` | **33/33 passed, zero skipped** against isolated PostgreSQL/PostGIS; includes selected result-layer reference validation and prior v1→v2/restart coverage |
| `dotnet ef migrations has-pending-model-changes --project backend/Vantage.Api --startup-project backend/Vantage.Api --context VantageDbContext` | No pending model changes; no live database migration applied |
| `npm --prefix frontend run typecheck`, `lint`, `test` | Passed; **33/33** Vitest tests, including fair dense-layer rows/marker quotas, failing-layer isolation, overlapping picks and antimeridian map scope |
| Pinned Playwright container against the production app: Home, NEXUS and ATLAS fixtures | **3/3 passed**; combined mixed/domain list and map workflows, keyboard tabs/record selection/panel resize, selected/map result scopes, unknown-location rows, NEXUS handoff, shared demand, drawing order, pane independence, Save/reload and pane close. After the final focus change and rebuild, the ATLAS fixture passed again **1/1**, asserting the Cesium canvas and selected record remain in place on focus. |
| Browser layout and accessibility checks | Dark map/Sources and narrow light ATLAS screenshots reviewed; 390px horizontal-overflow check passed. Keyboard tab navigation, list selection and resizing, both themes and reduced-motion mode passed in fixtures. This is a targeted workflow check, not a full accessibility audit. Ignored screenshots: `artifacts/step-8-browser-review/` |
| Compose `up -d --build app`, then app-only `restart app` | Production frontend/backend rebuild and restart passed at `http://127.0.0.1:5080`; `/` returned 200 and `/api/v1/health` reported application/storage ready. The existing Cesium/Blueprint large-chunk warning remains. PostgreSQL and Keycloak containers stayed running and healthy. |
| Read-only live database pre/post rebuild and restart | Counts unchanged: 1 workspace, 2 connections, 2 datasets, 1 feed, 911 current aircraft, 117 current earthquakes and 6,887 observations/delivery links. Workspace revision 6 and first-pane stored state version 1 remained unchanged; complete workspace, connection and dataset row fingerprints matched before and after. |
| `git diff --check` and documentation links/content | Passed after the step-8 record update; no reset, commit or push |

Browser authentication and provider batches were synthetic fixtures. The saved live workspace was inspected read-only, not opened or saved by the agent, and no live provider smoke test or fresh operator Keycloak sign-in was run. Old authentication scripts require the retired bootstrap administrator; no recovery-administrator credential was used in tests or logs. Complete accessibility and measured-performance acceptance remain later gates.

### Owner-approved step-8 interface follow-up — 2026-09-23

- **Compact Layers and List:** replaced boxed layer entries and the separate record explorer with contiguous category → group → record rows. Layers has category/group eyes and one exclusive Focus choice. List always includes every visible group, regardless of Focus, with foldable sections and honest per-group cached-appearance counts. Wide List uses a semantic source/summary/time table; narrow map/list splits keep 27px record rows and a per-record map eye visible while inspection retains the full facts and provenance. Group/category visibility hides map and List together; a record eye only removes that map appearance. Legacy v2 `visible`/`participating` values remain a restoration guard until the owner explicitly shows a dormant group.
- **Group editing and source boundary:** a double click or group menu opens Save/Discard tabs for compatible datasets, Filters, Appearance, Coverage & time, Actions and available previous-view recovery. Groups may use multiple compatible configured datasets, be copied/reordered or deleted. The compact Sources tab reports connection/local-health status and opens its NEXUS detail; it no longer adds layers or manages collection. NEXUS remains responsible for connections. Hover-delayed and keyboard-accessible legends appear outside the sidebar without blocking controls.
- **Map, List and messages:** Map and List are independent toggles with a drag/keyboard separator. The map has square Zoom in/Zoom out/Tools buttons, text-only **2D / 3D** and Basemap below; Tools holds place search and an explicit unavailable area action when no aircraft group has focus. The bottom bar expands only a timeline placeholder. Source warnings and presentation failures move into a toolbar inbox with an unread indicator. Redundant result scope/table selectors, map/status captions, always-visible legend, result dock and footer rows were removed. Only current capabilities are actionable.
- **Personal display settings:** added Default map region and IANA display timezone to owner-scoped personal preferences. Region presets centre newly created ATLAS workspaces; existing saved cameras are unchanged. Displayed times use the selected zone while stored source/provenance timestamps remain UTC. Migration `20260923140926_DisplayRegionAndTimeZone` adds two columns with `northern-europe` and `UTC` defaults. OpenAPI and the generated TypeScript client were regenerated; the versioned ATLAS state contract gained grouped layers, independent map/list state and per-record map visibility without rewriting stored v1 state.
- **Preservation:** fresh protected application backup `artifacts/private-backups/20260923T144128Z/` contained 1 workspace, 1 user, 2 connections, 2 datasets, 1 feed, 1,506 current aircraft, 120 current earthquakes and 42,526 observations/delivery links. Its isolated PostgreSQL/PostGIS restore applied the new migration and matched every original row/field. After the live migration, final rebuild and app-only restart, fingerprints of all original columns across all 10 backed-up tables still matched exactly; workspace state remains stored as v1 at revision 6. The database and Keycloak volumes, customized sign-in theme and existing connection definitions were retained. No reset, commit or push occurred.

| Follow-up check | Actual result |
| --- | --- |
| `node scripts/test-backend.mjs` | **34/34 passed**, zero skipped, against isolated PostgreSQL/PostGIS; covers region/timezone validation, new-workspace camera, grouped state and prior migration/restart paths |
| `dotnet ef migrations has-pending-model-changes --project backend/Vantage.Api --startup-project backend/Vantage.Api --context VantageDbContext` | No pending model changes |
| `npm --prefix frontend run api:generate` | OpenAPI and NSwag client regenerated for personal display preferences |
| Frontend typecheck, lint, Vitest and production build | Passed; **34/34** Vitest tests. The established Cesium/Blueprint large-chunk warning remains; no measured performance claim is made |
| Fresh protected backup and isolated restore/migration | Passed; every original row and field preserved across all 10 application tables before live migration |
| Pinned Playwright container against rebuilt `http://127.0.0.1:5080` | **3/3 passed** with credential-free Home, NEXUS and ATLAS fixtures; includes two sources in one group, category/group/record visibility, exclusive Focus, keyboard list/resize/legend, Save/Discard and reload, rate-limited inbox, both themes, reduced motion and narrow overflow check |
| Dark/light visual review | Compact Layers/Source rows and simultaneous map/list/inspector reviewed at 1440px; record eyes remain visible in narrow splits. Ignored screenshots: `artifacts/step-8-ui-followup-browser-review/` |
| Compose rebuild, app-only restart, health and data preservation | `/` returned 200 and `/api/v1/health` reported application/storage ready after restart; all original-column fingerprints matched the backup, migration applied once, workspace still v1/revision 6 |
| `git diff --check` | Passed; no reset, commit or push |

Browser fixtures use synthetic authentication and observations. Real operator sign-in and live provider availability were not rechecked because the old scripts require the retired bootstrap administrator; no recovery-administrator credential was read or used. This targeted keyboard/visual check is not a full accessibility audit. Timeline, media, recording, replay, GeoJSON and later custom cross-app record groups remain outside this approved follow-up.

### Owner's ATLAS control revision — 2026-09-23

- **Compact controls:** removed the Layers group-focus radio and group ellipsis. Group right click or Shift+F10 opens **Filters**, **Actions**, **Settings**, **Delete group** in that order; deletion requires a separate confirmation. Filters and Actions have their own Save/Discard dialogs. Settings keeps Sources, Appearance, Coverage & time and available Previous view tabs in a wider dialog with no horizontal tab scroll. The Layers add control is icon-only. Sources is a name/status list with no ellipses; source right click or Shift+F10 offers **Configure in NEXUS**. Legend hover opens after 500ms; keyboard focus remains immediate.
- **Map and List:** selecting a record on map or List establishes its layer for the aircraft area action; there is no separate group-focus control. The List group eye hides all current and future map appearances for that group, while record eyes can show chosen appearances. An optional group-hidden default and per-record shown exceptions in ATLAS state v2 avoid the 2,000-hidden-ID limit when a group is dense. The older individual hidden-ID state remains readable. Groups with no shown record exceptions do not consume marker quota. The compact **Terrain** button has the width of the **2D / 3D** pair and the height of each button; its menu closes on a second click, outside click, Escape or choice.
- **Contracts and preservation:** only optional ATLAS workspace JSON fields changed; no EF migration or REST DTO changed, so no live database migration or OpenAPI/client regeneration was needed. No workspace Save, reset, commit or push was performed. The existing workspace remains stored as v1/revision 6; the app still converts it on read without starting dormant collection. Previous connection definitions, customized sign-in theme and saved preferences were left in place.

| Revision check | Actual result |
| --- | --- |
| `node scripts/test-backend.mjs` | **34/34 passed**, zero skipped, using isolated PostgreSQL/PostGIS and current workspace schema |
| Frontend typecheck, lint, Vitest and production build | Passed; **34/34** Vitest tests, including group-default and per-record map visibility. The established large-chunk build warning remains |
| Pinned ATLAS fixture against Vite preview | **1/1 passed**, including group/source right click, keyboard menu, separate dialogs, widened Settings width, 500ms legend, Terrain dismissal, group/record map eyes, selection-driven area action and Save/reload |
| Pinned Home, NEXUS and ATLAS fixtures against rebuilt app | **3/3 passed** with synthetic authentication and observations; both themes, reduced motion and narrow layout remain covered |
| Visual review | Dark ATLAS map/list, Sources context menu and widened group Settings checked from ignored screenshots in `artifacts/step-8-owner-revision-review/` |
| Compose rebuild and app-only restart | App and existing PostgreSQL/Keycloak services retained; `/` returned 200 and `/api/v1/health` returned application/storage ready after restart |
| Read-only data comparison | Workspace, connections, datasets and user original-column fingerprints matched the protected backup. The workspace remained v1/revision 6. Live observations advanced from 42,526 to 47,935: 41,481 backed-up rows remain unchanged; 1,045 older aircraft rows are absent and **all** are beyond the 24-hour retention window; 6,454 newer rows arrived. No retained observation lacks a delivery link. Current projections and personal preferences changed since the backup, so their old fingerprints are not claimed unchanged |
| `git diff --check` | Passed; no reset, commit or push |

The browser checks use fixtures, not real operator authentication or external-provider smoke. This is a targeted keyboard and visual check, not a full accessibility or measured performance audit. Step 9 GeoJSON and later media/recording/replay/imagery/annotation work were not started.

### Layers visibility and map lifecycle correction — 2026-09-23

- **Cause:** the Layers eye changes this pane's `visible` and `participating` flags, so a hidden group releases its pane subscription. `PointMap` also tied the Cesium viewer lifecycle to the subscription callback; when the set of channels changed, it destroyed and recreated the viewer and basemap. The List record eye changes only marker visibility and never changes demand.
- **Fix:** channel listener changes now resubscribe and redraw the existing Cesium viewer. Hiding a group still removes it from this pane's Map and List and releases only that pane's demand; the configured NEXUS connection, stored observations and other panes remain untouched. If no consumer requests a connection/query, the coordinator does not poll it. Equivalent active demands continue to share one upstream operation. No database, REST or saved-state contract changed.
- **Checks:** frontend typecheck, lint, 34/34 Vitest tests and production build passed. The pinned ATLAS browser fixture passed 1/1 with an explicit same-canvas assertion across Layers hide/show and List record-eye hide/show. Home, NEXUS and ATLAS fixtures passed 3/3 against the rebuilt app using synthetic authentication/data. After an app-only restart, `/` returned HTTP 200 and `/api/v1/health` reported application/storage ready. A read-only database query found one workspace at revision 6 with workspace/pane schema version 1, still awaiting explicit Save. No reset, commit or push was performed. Real operator sign-in and external-provider availability were not rechecked.

The pane-demand release behavior described in this historical correction was superseded by the owner's immediate re-show request below. The Cesium viewer lifecycle fix remains in place.

### Immediate Layers re-show correction — 2026-09-23

- **Cause and fix:** the Layers group/category eye still released its pane channel on hide. A subsequent show recreated the browser channel and waited for the backend's cached snapshot and possible provider cycle; the List record eye never did that. The group/category eye now keeps `participating` and the channel alive when hiding an already active group, while changing `visible` for Map/List presentation. Re-show reads the current in-memory snapshot. The editor preserves that participation when saving a hidden group. Hidden channel batches no longer trigger map or List repaints.
- **Boundaries:** a migrated inactive v1 layer remains `participating: false` and starts no demand during read-time restoration; its first explicit Show activates it and may require an initial data load. Closing the pane, deleting the group, session termination and NEXUS connection disable still release affected demand. Equivalent active appearances continue to share upstream work. Hidden active groups do use provider/network resources, so this is a deliberate instant re-show tradeoff within the existing bounded coordinators. No schema, database migration, REST contract or OpenAPI/client change was required.
- **Checks:** frontend typecheck, lint, 34/34 Vitest tests and production build passed. The ATLAS fixture passed 1/1 and the full Home/NEXUS/ATLAS fixture set passed 3/3 against the rebuilt app. The ATLAS check waited beyond the old 200ms channel-release grace, then confirmed both aircraft and earthquakes returned from their existing snapshots within one second, without another stream start; the selected earthquake inspector and Cesium canvas stayed stable. These are synthetic data/authentication checks, not a live-provider latency measurement. After an app-only restart, `/` returned HTTP 200 and `/api/v1/health` reported application/storage ready. A read-only query confirmed one saved workspace at revision 6 with workspace/pane schema version 1. No Save, reset, commit or push was performed.

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

Step-8 owner follow-up:

- Backend/contracts: additive personal preference region/timezone DTO, validation, defaults and EF migration; new-workspace camera preset; compatible grouped ATLAS state validation and versioned schema; regenerated OpenAPI/NSwag client.
- Frontend/design: compact category/group/record outliners, group editor, independent Map/List splitter, per-record map eyes, legend tooltip, condensed source status/NEXUS handoff, map tool/basemap placement, message inbox, timeline placeholder, personal display settings and matching `DESIGN.md` density override.
- Tests/docs: preference/workspace integration tests, result/group unit tests, revised Home/ATLAS browser fixtures, targeted README usage and this follow-up record. The live workspace was inspected read-only and not saved.

Step 8:

- Contracts/backend: compatible optional ATLAS state-v2 result/sidebar fields and `map-area` scope in `contracts/schemas/v1/records.schema.json`; selected result-layer reference validation and a real-database workspace test. OpenAPI/client artifacts regenerated; no EF migration.
- Frontend: unified ATLAS sidebar, current-capability dock/time structure, dataset-to-layer/NEXUS navigation, shared controls and legends, scoped grouped explorer and mixed/domain tables; bounded/fair result and marker composition, Cesium overlap choices/map bounds/drawing order, keyboard-accessible aircraft coordinate search, shared inspector and theme/responsive styles.
- Tests/docs: composition/marker unit tests, expanded fixture ATLAS workflow, targeted README usage and this progress record. The inspected live application data was not edited.

Step 7:

- Backend/contracts: version-2 ATLAS state and retained v1 schema, read-time migrator, workspace validation/template/controller integration, explicit invalid-original recovery. No EF migration.
- Frontend: composed ATLAS view and aircraft/earthquake contributors over shared map/results/inspector; layer-demand keys, independent appearance IDs, minimal review controls, per-pane duplication/close and subscription cleanup. Existing NEXUS stays a system tool.
- Tests/docs: real-database workspace conversion/restart coverage, marker/channel contributor tests, fixture browser composition workflow, README and this record. Protected backup/isolated restore evidence is above.

Step 6:

- Backend/contracts: read-only per-connection status and explicit unsaved-draft preview, normalized sample rows, local demand snapshots, accurate Create/Duplicate HTTP 201 OpenAPI responses, regenerated OpenAPI/NSwag TypeScript client. No persistence-model or migration change.
- Frontend: registered NEXUS system destination and supplied theme-aware branding; connection draft/schema helpers, NEXUS view and CSS Module, Home/navigation entry, unsaved-draft navigation guard, fixture browser flow and unit tests. Settings and current ATLAS configuration were not changed for NEXUS.
- Docs: README commands/current checkpoint and this progress record.

Step 5:

- Backend/contracts: `Platform/Connections/`, connection DTOs, connector settings/template/export schemas and templates, `20260922232255_ConfigurableConnections`, observation delivery/current projection linkage, connection-aware REST/SignalR and demand coordination, generated OpenAPI/TypeScript client.
- Operations: one-time legacy source migration values, restricted grants, protected encryption key setup, secret-free backup exclusion and isolated verification assertions.
- Tests/docs: connection integration tests, adjusted ownership preservation assertion, README and this record. The only frontend source change adapts earthquake version retrieval to the regenerated optional workspace-scope argument.

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

The revised step-8 ATLAS interface is running for review at **http://127.0.0.1:5080**; `/api/v1/health` reports application and storage ready after an app-only restart. PostgreSQL and Keycloak retain their data and configuration. Workspace, connection, dataset and user fingerprints match the protected backup, and the workspace is still stored as v1/revision 6. Live observation projections changed under active collection and retention; 41,481 backed-up observations remain unchanged, 1,045 older aircraft observations passed the configured 24-hour retention window, and 6,454 new observations arrived. Opening the workspace returns a converted v2 view; Save deliberately persists the conversion. Rebuilding or restarting invalidates in-memory sessions, so review requires a fresh operator sign-in. No recording feature exists or restarts. Actual setup, migration and regeneration commands remain in README.

**Next action: owner review of the revised step-8 ATLAS UI.** Sign in, open the existing workspace, inspect compact Layers, Sources and List, try group/source right-click menus, Settings/Filters/Actions dialogs, List group/record map eyes and the Terrain menu. Save only if you intend to persist the converted v2 workspace and any edits. Stop before step 9 GeoJSON. The owner has already completed private operator enrollment and recovery-administrator handoff; no temporary password or new credential enrollment is requested here.

A fresh real-operator browser sign-in and external-provider smoke check were not run because the old scripts still require the retired bootstrap administrator; the owner's earlier identity checks and prior disposable-account real Keycloak run are recorded separately. Complete clean-install identity recovery, remote HTTPS deployment, GeoJSON, full accessibility and measured full-prototype performance remain unverified.

# AGENTS.md

Instructions for Codex and other coding agents working in this repository.

## Read first

- [PROTOTYPE_SPEC.md](PROTOTYPE_SPEC.md): required behaviour, app/data contracts, build sequence and acceptance criteria.
- [DESIGN.md](DESIGN.md): visual tokens, layout, interactions and accessibility; screenshots are in `design/reference/`.
- [VANTAGE_ECOSYSTEM.md](VANTAGE_ECOSYSTEM.md): confirmed ecosystem ownership and exploratory future directions; future apps are not committed scope.
- [Approved stack decision](docs/decisions/0001-prototype-stack.md) and [Blueprint UI decision](docs/decisions/0002-blueprint-ui.md): rationale and implementation consequences; decision 0002 supersedes the original Radix choice.
- [Replaceable source adapters](docs/decisions/0003-replaceable-source-adapters.md): mandatory provider boundaries for every source type.
- [Cesium basemap decision](docs/decisions/0004-cesium-basemap.md): free raster substitution and offline place-index boundary.
- [Shared point/revision decision](docs/decisions/0005-shared-points-and-earthquake-revisions.md): preserved component ownership and domain revision rules; its exclusive views are superseded by decision 0006.
- [Shell and composed ATLAS](docs/decisions/0006-vantage-shell-and-composed-atlas.md), [configurable connections](docs/decisions/0007-configurable-connections.md) and [authentication/session lifecycle](docs/decisions/0008-authentication-and-session-lifecycle.md): approved 2026-09-22 boundaries, migrations and implementation sequence.

Build the VANTAGE shell/data platform, NEXUS, Settings, required authentication and complete ATLAS prototype defined in the specification. ATLAS is the only shipping analytical app. Build stages do not reduce completion scope. The specification governs behaviour and acceptance; DESIGN.md governs appearance and accessibility; this file governs implementation workflow and the approved stack. Future-app ideas remain exploratory.

## Approved stack

| Area | Choice |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite |
| Components and styling | Palantir Blueprint, CSS Modules for application layout/custom components, and shared CSS-variable design tokens |
| Icons and loading indicators | [Tabler Icons](https://github.com/tabler/tabler-icons), [SVG Spinners](https://github.com/n3r4zzurr0/svg-spinners) and custom SVG assets |
| Map / globe | CesiumJS with compatible free/public data sources |
| Backend | C# + ASP.NET Core on .NET 10 LTS |
| Identity | Keycloak reference provider via standard OIDC; ASP.NET Core confidential code + PKCE and backend-managed cookie session; password + authenticator-app TOTP |
| HTTP API | REST + JSON + OpenAPI; NSwag-generated TypeScript client |
| Live updates | SignalR with its TypeScript client |
| Database | PostgreSQL + PostGIS |
| Persistence | Entity Framework Core + Npgsql + NetTopologySuite |
| Background processing | .NET BackgroundService / Worker Services |
| Binary storage | Local persistent storage behind a storage interface |
| Testing | xUnit for backend; Vitest for frontend; Playwright for browser workflows |
| Tooling | npm, NuGet and .NET CLI |
| Deployment | Docker Compose with Linux containers |

Use compatible stable versions and pin them during scaffolding. Keep SDK/tool versions, package manifests and lockfiles reproducible. Do not silently replace approved technologies or add required paid services.

Use the verified Blueprint package set and React compatibility rules in [decision 0002](docs/decisions/0002-blueprint-ui.md). Pin each package independently, use `PopoverNext`/`Overlay2`, and avoid deprecated legacy `Popover`/`Overlay` and a parallel Radix control library.

## Architecture and contracts

- Keep frontend, backend, contracts and documentation in one repository. Use a modular monolith with explicit platform, ATLAS and connector boundaries, enforced by typed contracts and import/architecture checks. Apps must not require another app's runtime, services or tables. Shared records/current projections, collection and evidence belong to the platform; ATLAS owns presentation. App removal preserves shared data and recoverable saved state.
- Every source must use a replaceable adapter from its first implementation, including APIs, streams, imagery/tiles, media, catalogs and imports. Shared services and domain views depend on capability contracts, not concrete providers. Equivalent providers must be replaceable without rewriting those consumers; new formats or capabilities may require new adapters or explicit contract evolution.
- Keep provider protocol/authentication, endpoint interpretation, response parsing, normalization and identity rules inside adapters. Expose attribution, provenance, coverage, limits, validated configuration requirements and supported operations through metadata/contracts; do not hard-code a provider into shared storage, schemas or UI. Preserve original source identity on stored observations when connections change.
- Use small interfaces appropriate to the source capability; introduce them as their sources are implemented. Preserve the established aircraft/earthquake adapter boundaries and support multiple configured instances before expanding the provider catalogue, following decisions 0003/0007.
- The React shell owns Home, registration/branding/navigation, workspaces and shared context/session. Register ATLAS as an app and NEXUS/Settings as system tools; keep ATLAS-specific branching out of the shell. Home/system tools work without a workspace. Show only implemented destinations.
- NEXUS manages connections; ATLAS selects datasets and configures layers. Store connection identity/scope/revision relationally and validated settings in JSONB; publish versioned JSON templates/import/export. Seed defaults once and preserve operator edits/deletions. Separate source origin, connector, connection, dataset and layer identity; share equivalent authorized demand without treating layer IDs as ingestion identity.
- Keep personal preferences, system/connection settings and explicitly saved workspace/app state separate. One ATLAS pane owns one camera/area/time and multiple independent layer instances. Category grouping, layer focus, record selection, result scope and drawing order are distinct.
- Reuse host services and components. Preserve independent pane state, opt-in linking, lifecycle cleanup and error containment.
- Keep credentials and coordinated ingestion on the backend. Public tiles and permitted media may load directly in the browser using approved source configuration. Collectors need cancellation, bounded work, shared demand and graceful shutdown. Persist work that must survive restarts; a hosted service alone is not a durable queue.
- Publish versioned JSON Schemas and explicit API DTOs. Validate external input at runtime. Regenerate the NSwag client after REST changes; never hand-edit generated code. SignalR payloads need separate versioned contracts and validation.
- Separate user-context events from observation batches. Batch map updates outside ordinary React component state; release subscriptions and media when panes close.
- Implement sequence checks and snapshot/resume recovery. SignalR connectivity does not supply application-level history or source-data guarantees.
- Use relational/spatial columns for common queryable fields and validated JSONB for source-specific properties. Use EF migrations and parameterized SQL where needed; test spatial operations against PostgreSQL/PostGIS.
- ASP.NET Core serves the built frontend and API from one origin. Development uses Vite with an API/SignalR proxy. Default to local-only access as specified.
- Establish stable issuer/subject-linked user identity, ownership and platform authorization early, with a small real Keycloak sign-in/protected API/live subscription/sign-out slice. Enforce REST, SignalR subscribe/resume, evidence and background access; never rely on UI visibility. Keep tokens on the backend, protect cookie-authenticated mutations against CSRF, and delegate credentials/MFA/recovery to Keycloak. Full real-provider acceptance is mandatory; passkeys and corporate directory integration are deferred.
- Stop affected recording and live demand on sign-out, session expiry or revocation using bounded backend checks. Retained data follows policy; signing in or restarting the backend does not restart recording. Closing panes/NEXUS only releases their own demand. Unattended recording and operator polling controls are deferred; use bounded provider defaults.
- Version migrations for ownership, current domain tables, connection configuration and ATLAS state v2. Preserve IDs/provenance, original invalid state and the active view's camera/settings without enabling extra collection. Assign legacy work to the configured initial owner, never the first login. Separate protected identity/secret recovery from ordinary secret-free data backups.

## Shared component ownership

- `platform/maps` owns Cesium viewer/camera lifecycle, basemaps, point-marker rendering, picking and selection. `PointMarker` carries a record reference, WGS84 surface position, optional explicit ellipsoid altitude, symbol, size, colour, rotation and an optional missing-information badge. Domain presenters supply these definitions and own overlays/follow rules; never use depth as altitude.
- `platform/ui` owns themed Tabler SVGs, configurable result tables, collapsible map results, drag/keyboard panel resizing, inspector framing/field rows, UTC formatting and provenance sections. Domain views supply columns, facts and actions; both aircraft and earthquakes use these components.
- `platform/data` owns validated observation transport/cache mechanics. Domain revision policies stay explicit: aircraft position time, earthquakes source revision time. Observation changes never enter workspace state or the user-context bus.
- UI and platform modules consume source capability contracts via `SourceServices`. Concrete provider imports belong only to `connectors` and the `main.tsx` composition root. ESLint enforces that direction and the existing Blueprint restrictions. Backend wiring remains in `Program.cs`; ATLAS/controllers and observation services consume adapter interfaces.

## Design and data rules

- Follow `DESIGN.md`: preserve its colours, typography, thin rules, square controls and open map canvas. Adapt Blueprint through a shared theme layer, including portalled overlays; centralize tokens and reuse components across apps.
- Tabler Icons and SVG Spinners are approved, non-exclusive UI asset sources; Blueprint's built-in icons and feedback are also allowed. Custom icons, diagrams, spinners and other SVGs are allowed when they better fit the product; keep their styling consistent, accessible and compatible with reduced-motion preferences.
- Preserve keyboard navigation, visible focus, reduced motion and table/list alternatives to maps. Include loading, empty, partial, stale, offline and setup-required states.
- Preserve provenance, source/retrieval times, units and location precision. Distinguish observed, reported, predicted, inferred and demo values. Unknowns stay unknown; gaps remain gaps.
- Follow the specification's WGS84 coordinate order, UTC timestamps and explicit altitude references. Handle antimeridian queries and preserve conflicting observations.
- Verify current provider endpoints, terms, quotas, attribution and format compatibility before integration. CesiumJS does not supply a data subscription; baseline operation must require no paid mapping service.
- Core operation requires no paid credentials; free-key sources may need setup. Implement the required AI capability interface, labelled deterministic mock adapter and disabled/unconfigured states. Live AI integrations are optional, use operator credentials and require explicit user-started requests.
- Keep secrets out of browser bundles, logs, fixtures and exports. Treat source content/imports as untrusted data; validate outbound destinations, sanitize displayed content and sandbox approved embeds.

## Implementation workflow

- Inspect the repository and preserve existing changes before editing. Keep work focused on the requested task and relevant requirements.
- The repository includes working aircraft/earthquake slices; the newer specification also contains unimplemented requirements. Inspect current code and README commands rather than treating a decision record as proof of shipped behaviour.
- When scaffolding, add a README with actual prerequisite, restore, migration, run, client-generation and test commands. Maintain it as the layout evolves; do not invent paths or scripts.
- Follow the specification's build sequence. Record material architecture changes in short decision records; keep future-app choices open.
- Prefer small, explicit abstractions grounded in current requirements. Keep documentation concise and update it when behaviour or contracts change.

## Verification and handoff

- Run relevant build, type, lint and test checks for changed code using actual repository commands. Documentation-only edits need link/content checks rather than application tests.
- Use xUnit for backend logic/contracts and integration tests with real PostgreSQL/PostGIS; Vitest for frontend logic; Playwright for key workflows and visual/accessibility checks.
- During shell scaffolding, verify the themed Blueprint sidebar, inspector, results table and overlays against DESIGN.md in both themes before repeating those patterns across apps. Record actual results; component-library defaults do not establish accessibility or performance compliance.
- Cover failure, cancellation, stale/out-of-order data, reconnect and workspace restoration where affected. Use deterministic fixtures for repeatable tests.
- Record live connector smoke checks separately from fixture-based tests. Never present mock/demo success as a verified live integration.
- Before prototype completion, verify AC-01 through AC-21, including real authentication/session termination, NEXUS/multiple connections, composed layers, notes/clips, migrations, evidence lineage, saved queries, radius search and clean-install recovery. Measure the unchanged performance targets on documented hardware; do not claim unmeasured performance.
- Report what changed, what was verified and remaining limitations. State explicitly when a check could not run.

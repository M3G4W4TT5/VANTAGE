# 0006 — VANTAGE shell, shared data and composed ATLAS

Status: accepted by the project owner on 2026-09-22; implementation pending. Incorporates the [consolidated change record](../atlas-workspace-change-record-2026-09-22.md). Supersedes only the exclusive domain views and separate domain cameras in [decision 0005](0005-shared-points-and-earthquake-revisions.md); its shared components, source isolation and revision rules remain in force.

## Decision

Keep one React frontend, one ASP.NET Core application and PostgreSQL/PostGIS in the approved modular monolith. Enforce platform, analytical-app and connector boundaries through typed contracts, import restrictions and architecture checks. Separate deployment is not required for app independence.

VANTAGE owns Home, registration, navigation, workspaces, shared context and sessions. Home separates Workspaces, Apps, System and Account. ATLAS is the only prototype analytical app. **NEXUS — Data Manager** and Settings are system destinations, accessible without a workspace. App registration supplies branding/navigation metadata and distinguishes apps from system tools; the shell must not branch on ATLAS's identity. Launching an app selects or creates its destination workspace.

The platform owns connections, datasets, observations, current projections, queries and evidence resolution. ATLAS owns geographic presentation and its working state. Apps consume platform contracts and cannot require another app's tables, services or runtime. Optional cross-app actions disappear gracefully when their destination is unavailable. Closing or unregistering ATLAS preserves platform data and recoverable saved state; closing NEXUS does not stop work needed by authorized consumers.

Keep personal preferences, system/connection configuration and workspace/app state separate. Theme is a personal preference. Workspaces remain explicitly saved project contexts with durable IDs, revision checks and independent panes; no extra Project → Workspace hierarchy is required. Connection changes have their own Save operation in NEXUS.

## ATLAS composition

- ATLAS pane-state version 2 has one camera, area and time context plus multiple layer instances. Each instance references a dataset and retains its own filters, presentation, visibility and participation. Category grouping is navigation, not storage ownership or drawing order.
- Domain contributors provide capability-appropriate rendering, filters, legends, result columns, inspector facts and actions. Reuse shared map/marker lifecycle, result components, inspector framing and transport/cache mechanics; do not replace meaningful domain contracts with untyped universal records.
- Keep layer focus, record selection and result scope independent. The left hierarchy is category → layer; the results explorer is category → layer → record, with mixed or domain tables and a list-only mode.
- Stable entity/observation references identify data; layer-instance/rendering keys identify appearances. Multiple presentations of one record neither duplicate ingestion nor constitute independent evidence.
- Visibility affects map rendering. Participation affects pane queries/subscriptions. Explicit recording has its own demand and the session lifecycle in [decision 0008](0008-authentication-and-session-lifecycle.md). Camera movement does not implicitly execute every provider search.

## Migration and consequences

Move existing aircraft/earthquake current-state tables from ATLAS ownership to the platform using explicit EF migrations. Preserve source IDs, entity/observation IDs, payload provenance, source-isolated retention and the distinct aircraft position-time versus earthquake source-revision policies. Moving ownership does not require merging domain tables.

Version workspace and app-state migrations. Convert the previously active domain's camera into the shared pane camera and retain its visible/participating view. Preserve the other domain's filters, selection references and recoverable prior camera settings without starting extra collection; unsupported state is retained with an explanation. Preserve the original document if conversion fails, and never silently reset saved work.

Map existing single-operator work to the explicitly provisioned initial owner defined in decision 0008. Migrate provider configuration to connection instances under [decision 0007](0007-configurable-connections.md). Migration must not seed deleted defaults again or rewrite observation identities.

Acceptance covers mixed aircraft/earthquake layers, independent filters, record selection across layers, shared demand, failure isolation, migration and an ATLAS-unregistered test harness. The harness proves platform independence without adding another shipping analytical app. Required connector breadth, media playback, accessibility and performance targets remain governed by [the specification](../../PROTOTYPE_SPEC.md).

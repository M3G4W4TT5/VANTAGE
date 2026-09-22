# VANTAGE ecosystem and ATLAS — consolidated change record

Date: 2026-09-22

**Status: approved design and implementation decisions; incorporated into the authoritative documentation on 2026-09-22. Application implementation is pending.** The project owner confirmed the hierarchy, connections/GeoJSON, ecosystem, identity and technical plan, then explicitly authorized the coordinated documentation update. This record preserves that consolidated rationale and decision history.

The resulting requirements now live in [PROTOTYPE_SPEC.md](../PROTOTYPE_SPEC.md), [DESIGN.md](../DESIGN.md), [VANTAGE_ECOSYSTEM.md](../VANTAGE_ECOSYSTEM.md) and decisions [0006](decisions/0006-vantage-shell-and-composed-atlas.md), [0007](decisions/0007-configurable-connections.md) and [0008](decisions/0008-authentication-and-session-lifecycle.md). Use those documents for implementation; use this record for the discussion and approvals. Documentation approval does not authorize application implementation or claim that these capabilities already exist.

## 1. Purpose and confirmed scope

VANTAGE is the operating environment and shared data platform. ATLAS is its first analytical app; NEXUS and Settings are integral system tools. Additional analytical apps follow the ATLAS prototype, but platform ownership and app independence govern the prototype from the start.

Move ATLAS from separate domain screens to a workspace in which multiple kinds of information can be explored together. Each ATLAS pane owns a camera, area and time context; configured layers contribute their data, rendering, filters, legends and applicable actions.

Connect discovery, inspection, comparison, annotation and saved evidence through consistent interactions. Preserve VANTAGE's single-operator deployment, approved stack, source-adapter boundaries, provenance rules and complete prototype scope except where a later explicit specification change says otherwise.

**Media clarification:** the owner clarified that deferring video means deferring Gotham-style video intelligence and analysis. Camera, radio and TV discovery, map representation, ordinary stream playback and periodically refreshed still images remain in the prototype. Detection/tracking overlays, geographic registration of video and advanced video analysis are deferred. Do not remove ordinary video playback or its existing acceptance requirements when updating the specification.

The confirmed interface arrangement is:

- A category/layer hierarchy in the left panel.
- A grouped record explorer and domain-appropriate tables in the results area.
- A full-workspace results mode for list-only operation.
- Contextual layer controls separate from the selected-record inspector.
- A task-dependent Results / Timeline / Media dock.

### VANTAGE shell, Home and system tools

The normal completed-prototype entry flow is **Sign in → VANTAGE Home → Open/create a workspace → Use apps**. Home is the ecosystem entry point and remains accessible from anywhere.

| Home area | Confirmed responsibility |
| --- | --- |
| Workspaces | Recent and pinned workspaces, with Open, Create and Duplicate actions |
| Apps | Installed analytical apps; ATLAS is the only prototype app in this group |
| System | NEXUS — Data Manager and system-wide Settings; future VANTAGE utilities join this group when implemented |
| Account | Current identity, account preferences and sign out; credential/account recovery actions belong to the identity provider |

Use **NEXUS — Data Manager** as the system tool's name and descriptive label. NEXUS is the global interface to VANTAGE's data services, separate from the analytical app launcher. Its prototype scope is the approved connection manager, dataset discovery and connection health; broader data administration can follow later.

NEXUS is the interface for managing connection configuration; the platform owns its persistence and operation. Settings presents system-wide configuration and common preferences. Apps own their particular controls and working state. Account management delegates identity-sensitive operations to the identity provider. Provide clear navigation between these surfaces without duplicate configuration forms or separate settings copies in every app.

System tools are accessible without opening ATLAS or a workspace. Workspace-scoped operations identify the chosen workspace explicitly. Opening an analytical app makes its destination workspace clear. Do not show speculative app or system-tool placeholders.

### Shared data platform and independent apps

| Part | Ownership |
| --- | --- |
| VANTAGE shell | Registration, launcher, navigation, workspaces, common commands, settings and shared session/context services |
| VANTAGE data platform | Connections, collection, datasets, entity/observation access, queries, storage and evidence/provenance resolution |
| Analytical apps | Specialized workflows, presentation, domain tools and app-specific working state |

Apps depend on VANTAGE's service contracts and have no required app-to-app dependencies. Vehicle observations are VANTAGE data that ATLAS presents geographically; a future tracking app would use the same platform data and supply its own workflow. That example does not add a tracking app to prototype scope.

Reusable capabilities must have platform ownership and lifetime. A facade over an ATLAS-owned service that still requires ATLAS to run would not satisfy independence. Shared identities and observations remain distinct from an app's layer styling, watchlist settings or other specialized state; avoid forcing every future workflow into one universal data model.

Cross-app actions such as Show in ATLAS are optional and offered only when supported. Their absence must not break another app's core workflow. Selection, area and time sharing remain explicit. An app failure is contained so the shell and other consumers stay usable.

Closing or removing ATLAS, or closing NEXUS, does not remove shared connections, observations or evidence. Collection follows remaining consumer demand and explicit permitted recording, not the lifetime of a management interface. Removing an app and deleting its retained work are separate operations; saved layouts with an unavailable app remain recoverable. Build independence within the approved modular monolith; separate deployments or a plugin marketplace are not required.

### Workspaces as project contexts

Keep **Workspace** as the name for a project or working context, such as Baltic maritime research. A workspace belongs to VANTAGE and can contain several apps and panes, their selected datasets and working state, and references to saved work. It is more than an ATLAS map configuration.

Retain explicit Save, durable identities and the existing create, rename, duplicate, restore and delete behaviour. Shared data is referenced rather than copied into each workspace. Do not introduce a separate Project → Workspace hierarchy yet. Workspace grouping or a project name alone does not establish security isolation; access follows VANTAGE's authorization rules.

### Authentication and access: required prototype foundation

Authentication and baseline authorization are required for prototype completion, including the normal single-operator entry flow. They are not deferred ecosystem features. Establish identity/access boundaries and a small real provider integration before expanding shared services; complete broader enrollment/recovery/session verification later within the prototype.

Use an external open-source identity provider through **OpenID Connect**. **Keycloak is the approved reference provider for prototype validation**; keep the application boundary standard so a compatible provider can be substituted. Do not build VANTAGE's own password store, MFA system or account-recovery mechanism.

The verified prototype method is **password plus an authenticator app (TOTP)**, with provider-managed enrollment/recovery. Passkeys follow the prototype. Organizational SSO is a supported extension path through the identity provider, rather than a separate login design inside each app. Prototype completion does not require access to a corporate directory or introduce enterprise collaboration and permission administration.

One VANTAGE session covers Home, NEXUS, Settings and the installed apps. The identity provider establishes who the user is and manages credentials; VANTAGE remains responsible for authorization over its data, workspaces and system operations. A successful login does not automatically make every workspace or connection available to that user. Global connection availability never bypasses access checks.

Establish stable internal user identity mapped to provider issuer + subject, ownership of user-created work, and shared access rules early. Enforce those rules at the platform service boundary, including data subscriptions and background work, rather than relying on hidden UI controls. Preserve the distinction between the user responsible for an action and the original source of an observation. Assign legacy work to an explicitly configured initial owner, never whoever signs in first.

Prove a small real sign-in/protected API/live subscription/sign-out slice early; complete enrollment/recovery, expiry, revocation and failure handling before acceptance. Fixtures or a development identity do not satisfy this gate. Authentication applies locally as well as remotely; preserve loopback defaults and HTTPS for remote access. Recording stops on sign-out, expiry or revoked access, retained data follows its policy, and signing back in does not restart recording. An open app or management screen is not its authority to run.

## 2. Concepts and boundaries

| Concept | Meaning | Example |
| --- | --- | --- |
| Source origin | The provider or publisher identified in data provenance, distinct from the connection used to obtain it | USGS as the origin of an earthquake record |
| Connector type | Installed code that understands a protocol/format and its data semantics; declares configuration and capability contracts | An aircraft API connector; a GeoJSON feed connector |
| Connection template | A bundled, reusable starting configuration for a connector | Default aircraft or USGS earthquake connection settings |
| Connection | A saved, editable instance with a stable ID, connector type, configuration revision, availability scope and backend credential reference where needed | An operator's configured aircraft feed |
| Dataset | A particular product or collection available through a connection | A worldwide past-day earthquake feed |
| Layer | A configured view of data, with filters, presentation, visibility and participation state | All earthquakes; a second layer showing magnitude 5+ |
| Record | An individual inspectable item with stable references | An earthquake event and its supporting observation version |
| Category | An organizational group in the interface | Events & alerts |

One connection may expose multiple datasets. A dataset can support multiple layer instances. Equivalent upstream demand and cached data should be shared; adding a second filtered presentation must not automatically duplicate collection or stored observations. Different endpoints or credentials must not be assumed equivalent. A connection's editable name is not the identity of the original source or its records.

Categories organize discovery. Capabilities determine behaviour, including whether a layer can supply tracks, time queries, raster sampling, playback or particular filters. Motion is not a category invariant: stationary aircraft remain aircraft, and events can have changing positions or footprints.

Most current “source-specific” controls are domain-specific. Magnitude belongs to earthquake data regardless of provider. Access settings belong to the connection; provider constraints and supported operations come from the connector's metadata/contracts. Keep provider differences explicit without placing provider parsing or endpoint logic in shared UI.

Categories are not storage ownership, entity identity, relationships or rendering order. Grouping items together establishes no evidential relationship between them.

### Editable connections: confirmed prototype addition

Code defines what VANTAGE understands; saved configuration defines which sources the operator uses. Introduce editable connections alongside the shared layer model, before expanding the provider catalogue. Preserve the replaceable-adapter boundary: new protocols or substantially different data semantics can still require a coded adapter or explicit contract evolution.

**Storage and portability.** Use versioned JSON definitions/schemas for bundled templates and connection import/export. Store active connections in the existing database, with stable IDs and configuration revisions; do not create competing active file and database configurations. Credentials remain on the backend, referenced by connection configuration and excluded from exports. Imported connections that need credentials show setup-required until configured.

**Interface responsibilities.**

| Surface | Responsibility |
| --- | --- |
| NEXUS → Connections | Add, edit, duplicate, test, disable, remove, import and export connections; inspect health and affected workspaces/apps |
| ATLAS → Sources | Browse available datasets, coverage, capabilities and connection status; add a dataset as a layer; provide a shortcut to the relevant connection in NEXUS |
| ATLAS → Layers | Configure workspace filters, appearance, legends, visibility and participation |

NEXUS supersedes the earlier Settings → Connections placement. Settings may link to NEXUS but does not provide a second connection manager. Selecting a dataset in ATLAS adds it to that workspace; it does not globally enable or disable the connection.

Connection forms expose the fields supported by the chosen connector, with validation and provider constraints. Configuration cannot grant unsupported operations or override enforced limits. The basic flow is choose a template or connector → configure → test and preview → save → choose a dataset → add a layer. Testing is an explicit request and checks interpretation, coverage and capabilities as well as connectivity; HTTP success alone is insufficient.

**Availability and workspace use.** Default to VANTAGE-wide availability across apps and support an explicit workspace-only scope. Each workspace chooses which datasets it uses. Availability alone does not start collection; actual subscriptions, explicit operations and permitted recording determine demand. Scope organizes availability, while authorization controls access. Neither global availability nor a workspace label creates implicit sharing or security isolation.

Layer filters and presentation remain local to the workspace. Editing a shared endpoint or access configuration affects all its consumers, so show the affected workspaces before applying the change. Duplicate a connection when a workspace needs different connection settings; avoid hidden inheritance or overrides. Two differently filtered earthquake layers should share one dataset/connection, while a different endpoint or account can use a separate connection. Multiple connections of the same type can coexist and be chosen or compared through their layers.

**Bundled defaults.** Ship standard aircraft and earthquake templates and seed the initial connection instances once. Operator edits and deletions survive restarts and upgrades. Keep templates available through an explicit Add from template action; applying updated defaults or restoring a deleted default is deliberate. Removing a connection does not remove its connector implementation. Preserve original provenance when switching providers; do not silently substitute another connection on failure.

**Configurable GeoJSON feed.** Alongside migrating aircraft and earthquake adapters, include one bounded HTTP-polling GeoJSON FeatureCollection connector. Support a configurable endpoint, supported backend authentication and declarative stable-ID/label/time mappings. Return validated generic points/lines/polygons and their multi-geometries, retaining null geometry off-map; unsupported formats remain explicit. Specialized semantics require a compatible domain contract. The connector must demonstrate adding a compatible feed through NEXUS without code changes. The later polling decision supersedes editable refresh settings: use bounded provider-appropriate defaults, with operator-wide and per-connection rate controls deferred. See decision 0007 for the approved limits and mapping rules.

**Predictable lifecycle.** Validate configuration changes before activation and retain the working configuration if validation fails. Disabling a connection stops its collection for all consumers and marks its datasets as unavailable for fresh updates; already collected data retains its actual age and provenance. Removing a connection makes dependent layers explicitly unavailable and does not silently delete saved evidence. Retained content remains subject to its existing retention rules. Renaming, changing credentials or switching endpoints must not rewrite previous source identity or observation provenance. Keep connection health, active demand and cached-data age distinct.

The first connection-and-layer milestone should demonstrate two independently configurable connections of the same type, multiple layers sharing one dataset, and a user-added compatible feed through these common controls and the early access boundary. This is a requirement for the later implementation plan, not a claim that the functionality is already present.

## 3. Navigation categories

The agreed starting taxonomy is:

| Category | Examples and boundary |
| --- | --- |
| Vehicles & satellites | Aircraft, vessels, public-transit vehicles and satellites |
| Events & alerts | Earthquakes, hazard reports, weather warnings, road incidents and launches |
| Places & infrastructure | Airports, ports, railways, energy infrastructure, telecom sites and camera locations |
| Environment & measurements | Weather, wind, air-quality measurements and other environmental observations |
| Imagery & overlays | Satellite/aerial imagery and thematic map products; demographic surfaces illustrate a possible later dataset |
| Feeds & reports | News items, bulletins and published records, including records without established geographic locations |
| My work | Saved areas, annotations and explicitly added query results or collections |

A layer has one default category and searchable tags. Cross-cutting subjects do not require duplicate dataset ownership: wind may belong to Environment while being rendered as an overlay; weather warnings belong to Events. A custom category editor is not established as a prototype requirement.

“Feed” also describes delivery. Aircraft updates remain under aircraft even when delivered through a feed. Feeds & reports is the content-browsing group, not a parent for every network source.

Category examples do not silently add connector requirements. In particular, no demographic provider has been selected or added to the prototype. Unimplemented capabilities should not appear as working layers or speculative applications.

## 4. Left panel and layer controls

Replace the current Filters-only concept with three entry points:

| Entry point | Responsibility |
| --- | --- |
| Layers | Workspace composition: category/layer hierarchy, visibility, presentation and active filters |
| Sources | Available datasets, connection status, supported operations, coverage and limits; add layers and access connection setup |
| Tools | User-started work such as drawing an area, measuring, radius search and solar calculations |

NEXUS → Connections owns reusable connection configuration as described in section 2. ATLAS source discovery and layer controls use that configuration rather than keeping separate copies. A configuration action opens the corresponding NEXUS surface.

Layer rows show a name, symbol or scale cue, map visibility, active-filter indicator and significant source/status problems. Groups expand/collapse and support a mixed visibility state. Source problems remain discoverable beside affected layers even when Sources is closed.

Focusing a layer opens consistently arranged controls below the hierarchy:

| Section | Shared presentation | Domain-specific content |
| --- | --- | --- |
| Filters | Labels, typed inputs, active criteria and clear/reset behaviour | Altitude and ground state; magnitude and depth; vessel type |
| Appearance | Applicable visibility, opacity, label and symbol controls | Magnitude sizing, tracks, raster colour scales |
| Legend | Consistent placement and explanation | Symbols, magnitude ranges, pollutant units or imagery scale |
| Coverage & time | Extent, temporal support and limitations | Bounded aircraft collection, worldwide feed, dated acquisitions |
| Actions | Consistent action placement, governed by capabilities | Follow, inspect acquisition, open stream, compare |

Standardize the structure, not the meaning of fields. Preserve units, unknowns and domain distinctions. Earthquakes use magnitude and the source-supplied magnitude type rather than a universal Richter label. Unsupported operations are absent or explain why they are unavailable.

Keep layer focus independent of record selection. Adjusting an aircraft layer must not discard an inspected earthquake, move the camera or silently change the results scope. Selecting a map/result record identifies its layer and opens its inspector; opening layer controls remains a distinct operation.

Provide a compact symbol/scale cue in each layer row and an expandable combined legend for visible layers. Users should be able to interpret the mixed map without selecting every layer individually.

## 5. Results and the hierarchy arrangement

The left hierarchy represents workspace composition. Individual records belong in the results explorer, avoiding thousands of frequently changing records inside the layer-configuration tree.

Results support two coordinated presentations:

| Presentation | Behaviour |
| --- | --- |
| Grouped explorer | Category → layer → records, with compact summaries appropriate to each record type |
| Table | Common columns across mixed records, or domain columns when the result scope selects one domain |

An illustrative explorer is:

```text
Vehicles & satellites
  Aircraft
    Selected aircraft · position time and key movement facts
  Vessels
    Selected vessel · position time and navigation facts
Events & alerts
  Earthquakes
    Selected event · magnitude and occurrence time
Imagery & overlays
  Satellite imagery
    Selected acquisition · date and product information
```

Expand records on demand and virtualize/page large results. Search reveals matching items without requiring users to manually expand every group. Preserve keyboard focus and selected-record identity during updates.

The mixed table uses shared columns such as name, type, summary, relevant time, source and data status. A domain table supplies meaningful columns such as aircraft altitude or earthquake magnitude. Avoid a wide union of unrelated fields. Time labels distinguish position time, event occurrence, acquisition and other relevant roles; source/retrieval times remain inspectable.

Results explicitly identify their scope: all participating layers, selected layers, or the current map area. Layer-control focus does not silently change that scope. Map-area filtering must remain distinguishable from upstream query coverage. Records with unknown locations remain accessible with an explicit off-map state.

Counts distinguish matching, mappable/visible, available and truncated results and identify the counting unit. Multiple appearances of the same stable record are not additional entities or independent evidence. Per-layer appearances and unique-record totals must not be confused; source records are only merged under the established identity rules.

Raster layers expose product/acquisition records rather than treating each pixel as a result. Location inspection can return a sampled value where supported, with its units, time and provenance.

Map and results select the same record. Selection opens the inspector; Zoom to is a separate action. The results area can occupy the main workspace for list-only use.

## 6. Shared context, filtering and data demand

Each ATLAS pane owns one camera and time context plus per-layer configuration. Independent panes remain independent unless selection, area or time linking is explicitly enabled.

### Filters and spatial scope

- Retain a shared area/time context and separately stored layer filters.
- Common filters apply only where their semantics are supported. A magnitude filter affects earthquakes, not aircraft.
- Show whether an action filters available data or initiates a provider query.
- An area may locally filter a worldwide feed, define a bounded aircraft request or provide criteria for an explicit catalog search. Return the effective scope and limitations for each layer.
- Camera panning and layer-control focus do not implicitly initiate every provider search. Saved-query restoration continues to require an explicit Run for execution.
- Opening saved work must not silently start paid requests, provider lookups or recording. This preserves the existing distinction between configured live subscriptions and user-started lookup operations.

### Visibility, participation and recording

Treat these as separate concepts:

| State/action | Meaning |
| --- | --- |
| Map visibility | Show/hide this layer's rendering; an eye control affects visibility |
| Participation/update demand | Whether this pane continues using/requesting the layer's data; an explicit pause/disable action can release this pane's demand |
| Recording | Explicit permitted retention, independent of an open layer but bound to its initiating authenticated session/access |

Hiding a rendering does not necessarily stop collection: results, another pane or recording may still need the data. Make continued collection visible. Removing/disabling a layer releases the demand it owns without disrupting other consumers. Preserve the distinction between source health, cached-data age, active demand and recording.

Disabling a connection in NEXUS stops collection through that connection for every consumer, including recording, and shows the affected workspaces/apps. This is distinct from releasing one layer's demand. Making a connection available globally does not itself create collection demand or grant access to it.

Stop affected recording and live subscriptions on sign-out, session expiry or access revocation through bounded backend enforcement. Retained data remains under its retention policy. Login does not restart recording; incomplete recording after backend restart is stopped/interrupted and requires explicit restart. Closing a pane/NEXUS only releases its own demand; separately started recording may continue while its initiating session/access is valid. Browser/network loss cannot grant indefinite collection.

Unattended server recording, long-term collection/storage and historical-provider strategy, global polling frequencies and per-connection overrides are post-prototype work. Preserve bounded Record/Replay and provider-supported history in the existing scope.

Exact control labels and the presentation of retained cached results after disabling a layer can be refined in the remaining design discussion. The separation above is confirmed.

### Time

Keep Live / Pause / Replay and UTC visible in a compact bar. Expand the timeline into tracks for acquisitions, validity intervals, retained coverage, predictions and gaps. Provide previous/next available observation or acquisition where supported.

Each layer interprets the pane cursor according to its temporal capability. A position, an event interval, an acquisition and forecast validity do not have interchangeable time semantics. Current-only data cannot silently answer a historical query.

Where the operator deliberately keeps older imagery visible at a later cursor, label its actual acquisition time/precision and age relative to the cursor. This is contextual display, not a claim that imagery exists at the requested historical instant. Preserve the existing prohibition on silently substituting a current mosaic for missing history.

Pause freezes the displayed cursor while session-authorized collection can continue. Retained replay does not reconstruct everything known at a past date. Local predictions remain labelled as calculated results.

## 7. Map, inspector and dock behaviour

One pane coordinates points, lines, polygons, raster imagery and other supported presentations on one map. Domain presenters supply their own semantics and styles through shared rendering capabilities. Do not force non-point data into the existing point-marker contract.

Keep rendering identifiers distinct from record/evidence identity so one record can appear in multiple configured layers without overwriting another representation. Picking overlapping items offers a small chooser. Preserve the originating layer alongside the selected record/version without making that layer part of the record's permanent identity.

Category order organizes navigation. Drawing order is controlled separately where meaningful, especially raster/overlay ordering and opacity. Reordering categories must not unexpectedly cover selectable objects with opaque imagery. Selection remains identifiable across renderings and results.

The inspector keeps record identity, evidence class, relevant time, key facts and applicable actions clear. As content grows, organize details into Overview, Sources, History and Notes, with a wider record view for lengthy inspection. A generic relationship/Links surface waits for a defined relationship workflow.

The dock provides Results / Timeline / Media. Results contains its explorer/table choices. Open the view needed for the current task instead of expanding every dock simultaneously; preserve deliberate user arrangements. Ordinary media keeps explicit play, mute and stop controls and existing concurrency limits.

Retain VANTAGE's exact palette, full branding lockup, 2D/3D terminology, prominent canvas, compact rules, resizable panels and list alternatives. Avoid copying dense icon-only rails, military classification decoration or unreadably small reference controls. No new visual theme is approved by this record.

## 8. Image annotations, evidence clips and saved work

### Image-region annotations

Add notes anchored to a region of an exact image/acquisition/version. The interaction is enter annotation mode → draw/select a region → enter text → save, with visible Cancel/Escape and keyboard/numeric alternatives.

Retain the image-coordinate region and coordinate-system definition. Add geographic geometry only where supported by the image's georeferencing. Preserve original pixels; annotations are separate user-created data. Provide an accessible notes list and separate annotation revisions from source corrections.

An updated image does not silently retarget an earlier note. Expired or unavailable supporting content remains explicit. This is a still-image/imagery workflow; it does not introduce video-frame tracking or advanced media analysis.

### Reusable evidence clips

An evidence clip packages a title, stable supporting references, selected observation/acquisition, area, time, relevant layer/display settings and optional note so the user can reopen that context. It builds on saved views, collections and evidence references; it does not require another app.

Keep Save reference and Save permitted snapshot distinct. A thumbnail or camera position does not preserve supporting content. Show reference-only, retained and unavailable states. Reopening fixed evidence must not silently replace it with the latest source version. Clips can refer to separately preserved snapshots where permitted.

Clips provide a future bridge to findings and cited briefings, but full report/slide authoring remains deferred. A later issued brief will need fixed versions rather than automatically changing conclusions.

### Saved-work library and search

Provide a shared searchable library for implemented workspaces, queries, areas, collections, snapshots and evidence clips. Show type, useful metadata, preview and availability, with clear Open/Inspect/Open alongside actions where supported. Non-geographic work remains discoverable without invented map pins.

Extend search beyond the current saved-workspace experience through the established registries and service contracts. Open actions preserve relevant context and respect independent panes. Opening a saved query restores its criteria; execution remains explicit. Adding its results as a layer follows an explicit run.

Use consistent evidence actions across map, results and inspection: Save reference, Save permitted snapshot, Add note, Add to collection and Open alongside where supported.

## 9. Inspectable AI results

Adopt the model-information pattern as part of the existing optional capability boundary. Keep AI disabled/unconfigured states and the labelled deterministic mock; live providers remain optional.

For a supported capability, expose its input references, provider/model, exact version when available, processing settings, generation time, usage when supplied and review status. If an exact resolved version is unavailable, say so rather than treating a mutable alias as reproducible. A score needs its method, scope and meaning; it is not a universal truth measure.

Derived output stays separate from source observations and operator notes. Reviewing or rejecting it must not silently change source facts. Transcription, translation, entity extraction and imagery/video detection are separate possible capabilities, not automatic consequences of adding summarization. Their live implementations are not added to prototype scope by this agreement.

## 10. Architecture impact and reuse

| Area | Required direction when implementation is authorized |
| --- | --- |
| VANTAGE shell and Home | Own ecosystem entry, distinct Workspaces / Apps / System / Account areas, app registration and common navigation; NEXUS and Settings remain usable without ATLAS |
| Shared data ownership | Platform services own collection, entities, observations, queries and evidence; analytical apps consume contracts and must not require another app's implementation or tables |
| Authentication and authorization | Establish identity, ownership and access enforcement early, including a real OIDC/password/TOTP integration slice; complete recovery/session/failure verification during the prototype, with Keycloak as the reference provider |
| ATLAS pane state | Replace the growing collection of mutually exclusive domain-screen fields with one pane context and configured layer instances |
| Domain integration | Domains contribute data access, rendering definitions, filters, summaries, columns, facts and actions instead of recreating the full screen |
| Shared map services | Own viewer/camera lifecycle, supported geometry/rendering primitives, picking and selection; retain domain-specific follow/overlay semantics |
| Shared UI | Own hierarchy framing, standardized layer controls, result explorer/tables, dock, inspector framing and evidence previews |
| Source services/adapters | Register installed connector types and support multiple saved connection instances; preserve capability interfaces and provider isolation; expose configuration, dataset and operation metadata without leaking secrets or provider parsing into views |
| NEXUS and connection management | Provide the system interface to platform-owned settings, templates, scope, credential references, testing and lifecycle; retain a working configuration until its replacement is validated; collection does not depend on NEXUS being open |
| Observation transport | Reuse validated caches, sequencing, resume/reset and domain-specific revision rules within the correct connection/dataset scope; keep observations out of workspace state and user-context events |
| Queries/subscriptions | Coordinate demand, cancellation, health and bounded work per connection/dataset; share equivalent demand across layers/panes and isolate failures without assuming different endpoints or credentials are equivalent |
| Identity and rendering | Separate layer-instance/rendering keys from entity, source record and immutable observation references |
| Persistence/contracts | Version connection definitions/templates and layer instances, filters, appearance, grouping, annotations and clips; persist editable connections in the existing database; validate imports and preserve reference semantics without exporting credentials |
| Workspaces and migration | Keep workspaces at shell level, able to hold independent app panes; preserve existing settings, define assignment to the initial authenticated owner, and map provider configuration to connection instances without overwriting later operator edits |
| Performance | Bound work per layer, virtualize results and batch map updates so one dense/slow layer cannot monopolize the workspace |
| Accessibility | Support keyboard hierarchy navigation, focus stability, labelled controls, list alternatives and numeric spatial/annotation inputs |

The current reusable map/marker, table, inspector and observation components remain valuable. Preserve source-isolated retention, source revision semantics and explicit workspace Save. No stack replacement, graph database, microservices or general pipeline builder is implied.

Establish VANTAGE/app ownership and the authentication/authorization foundation before expanding shared persistence and services. Introduce NEXUS-managed connection instances and compose aircraft and earthquakes in one ATLAS pane before expanding the provider catalogue or repeating the current complete-screen pattern. Migrate the existing adapters and demonstrate the bounded configurable GeoJSON connector through the same platform contracts.

The complete account/recovery/session verification can be a late milestone, but identity/access foundations and a small real integration precede Home/NEXUS/composed ATLAS. Preserve the full prototype completion target and defer additional analytical apps until after ATLAS.

## 11. Relationship to scope and authoritative documentation

| Item | Classification |
| --- | --- |
| VANTAGE Home and system navigation | Approved ecosystem entry with separate workspaces, analytical apps, system utilities and account access |
| NEXUS — Data Manager | Approved name and system placement for the connection manager; supersedes Settings → Connections and keeps configuration outside ATLAS |
| Independent apps and shared data ownership | Explicit platform rule: no required app-to-app dependencies; removing an app does not remove shared services or data |
| Workspaces as project contexts | Refinement of existing saved workspaces across apps; no additional Project hierarchy or implicit data/security isolation |
| Authentication and baseline authorization | Approved mandatory prototype requirement: early identity/access foundations and real password/TOTP slice; later complete recovery/session verification |
| Recording and polling policy | Approved session-bound Record/Replay; stop on sign-out/expiry/revocation with no automatic restart. Broader unattended collection/history strategy and polling-control UI deferred |
| Combined layers and shared pane context | Already required in principle; clarify behaviour and refactor the current single-domain implementation |
| Editable connections, templates and workspace availability | Approved prototype addition: in-app management, database persistence and versioned JSON portability, extending the existing replaceable-adapter boundary |
| Configurable GeoJSON feed connector | Approved bounded prototype addition proving that a compatible operator-supplied feed can be added without code changes |
| Layers / Sources / Tools and common layer sections | Approved presentation refinement |
| Grouped results with domain tables | Approved refinement of the map/list/results contract |
| Coverage-aware time tracks | Existing time requirement with more concrete presentation and stepping controls |
| Saved-work library | Concrete shared presentation for existing saved-object/search concepts plus clips |
| Image-region annotations | Approved extension beyond ordinary short notes and saved geographic areas |
| Evidence clips | Approved extension connecting saved views, references and permitted snapshots |
| Expanded source/history inspection | Refinement of existing lineage and evidence requirements |
| AI run details | Clarification of the existing optional-AI boundary, including deterministic mock verification |

The authorized coordinated update incorporates these decisions into:

- **PROTOTYPE_SPEC.md:** VANTAGE Home, NEXUS/Settings/app ownership, shared workspaces and app independence; mandatory authentication/authorization, reference identity-provider integration and early/late sequencing; connection concepts, management and scope; configurable GeoJSON support; ATLAS pane/query/selection contracts; annotations/clips; storage/export/backup and owner migration; AI details and acceptance scenarios.
- **DESIGN.md:** sign-in and Home flow; Workspaces / Apps / System / Account placement; NEXUS versus system Settings and app controls; ATLAS panel arrangement, hierarchy, dataset discovery, legends, results, dock, inspector, annotations and accessible interactions.
- **AGENTS.md and decision records:** platform ownership, independent app lifecycle, authentication/access boundaries, configured connections within decision 0003's adapter boundary, and composed ATLAS layers. Preserve the valid shared-component and revision rules in decision 0005 while explicitly superseding its exclusive-view/camera arrangement.
- **VANTAGE_ECOSYSTEM.md:** distinguish the confirmed VANTAGE shell/data platform/NEXUS model from exploratory future analytical apps; preserve optional cross-app cooperation and the included playback versus deferred advanced analysis boundary.
- **README and reference index:** distinguish approved requirements from shipped behaviour and record the additional references. Actual identity-provider setup/operation commands must be added alongside implementation; none are claimed to exist now.

The update preserves DS-01–28 and the existing performance targets, adds DS-29 for configurable GeoJSON and extends acceptance to AC-01–21. Application code, runtime schemas, migrations and deployment configuration are unchanged by this documentation work.

## 12. Deferred capabilities

The following remain outside the ATLAS-focused prototype:

- Chat, simultaneous team editing, enterprise collaboration and advanced permission administration, and military tasking. Required prototype authentication and baseline access enforcement are not deferred by this item.
- Gotham-style video intelligence: detection/tracking overlays, geographic registration, sensor fusion and advanced video analysis.
- Advanced audio examination, transcription/translation and automated media-entity extraction as live capabilities.
- Full slide/presentation authoring, reporting applications and issued-brief workflows.
- Visual ML pipeline construction, model-training orchestration and a general processing-graph editor.
- Satellite tasking or guaranteed sensor acquisition; orbital predictions alone do not supply these capabilities.
- A native desktop wrapper or additional analytical apps beyond ATLAS. NEXUS and Settings are included VANTAGE system tools; other speculative app/tool entries remain deferred.
- Passkeys and corporate directory integration; the required reference login is password plus authenticator-app TOTP.
- Unattended/passive server recording, broader long-term retention/history-provider architecture, global polling controls and per-connection frequency overrides. Use bounded provider-appropriate defaults during the prototype.

Ordinary audio/video streams, map discovery, still-image sources and playback remain included. Authentication is required even though enterprise collaboration remains deferred. Source/evidence lineage does not require a visual pipeline builder. Existing optional relationship/investigation directions retain their exploratory status.

## 13. Verification coverage

These topics are incorporated into the specification's AC-01–21. They are required future application checks, not executed verification or completion claims:

1. Display aircraft and earthquakes together; apply independent filters, select either type and keep the pane camera stable while focusing layer controls. Extend the same flow to implemented vessel/satellite and raster/polygon layers.
2. Exercise group visibility, hidden-but-participating layers, pause/disable, shared demand and explicit recording; removing one consumer must not stop another.
3. Show one record through two filtered layer instances without rendering collisions, duplicated ingestion, misleading totals or broken evidence references.
4. Verify mixed explorer/domain tables, scoped results, unknown locations, incomplete coverage, raster acquisition results, overlapping-item picking and keyboard focus under updates.
5. Test one layer failing or exceeding limits while other layers, saved work and the map remain usable.
6. Exercise common pane time with observations, event intervals, predictions, acquisition stepping and gaps. Show older pinned imagery honestly and reject unsupported historical queries.
7. Create/edit a region note, revise the image, expire its source content and reopen the note. Keep exact target identity, separate annotation history and accessible numeric/list operation.
8. Save a reference-only clip and a clip referencing a permitted snapshot; reopen, export/reimport and restore them from backup without silently replacing versions or claiming unretained assets are preserved.
9. Search and preview saved work; open in another pane without modifying unlinked context or executing saved provider queries.
10. Migrate existing workspaces, verify recoverable invalid state and preserve user settings. Test ordinary playback alongside combined layers and retain the existing media restrictions/concurrency behaviour.
11. Use the labelled deterministic AI adapter to verify run details, unknown version/score metadata, cancellation and separate derived output; AI-off operation makes no provider calls.
12. Check both themes, keyboard/list alternatives, zoom, reduced motion and the existing documented performance targets using representative mixed-layer fixtures. Record live connector checks separately.
13. Add, edit, duplicate and test two connections of the same type in NEXUS; use their datasets together and across workspaces. Verify VANTAGE-wide/workspace-only availability, independent configuration and status, enforced access, no collection from availability alone, and shared demand for multiple layers using one dataset.
14. Add a compatible GeoJSON feed entirely through NEXUS, map its identity/time fields and inspect the test preview before using it in ATLAS. Exercise invalid configuration, incompatible content and provider limits; failed validation must leave the working configuration intact.
15. Verify connection edits/deletions survive restarts and template upgrades, explicit Add from template works, and JSON import/export preserves portable settings without credentials. Imported credential-dependent definitions show setup-required. Preserve existing settings when migrating the current aircraft/earthquake connections.
16. Edit or disable a shared connection with affected workspaces visible, then remove it. Verify collection/recording stops for that connection, other connections remain usable, dependent layers report unavailability, and retained observations and saved evidence keep their original provenance and retention behaviour. Renaming or switching a connection must not retag old observations.
17. Reach VANTAGE Home after sign-in; distinguish Workspaces, Apps, System and Account. Open NEXUS and Settings without an ATLAS workspace; create/open/duplicate a workspace, launch ATLAS into the stated destination, and return Home. Verify explicit Save and restoration without copying shared data or duplicating connection settings.
18. Disable/unregister ATLAS in a test harness and verify that Home, NEXUS, platform data access and independently authorized consumers still work. Preserve shared evidence and recoverable saved app state; optional ATLAS actions become unavailable without breaking core workflows. Closing NEXUS must not stop permitted collection needed elsewhere. This does not require shipping another analytical app.
19. Exercise identity and access rules early against platform operations, saved work, live data and background work. Reject missing or unauthorized identities at the service boundary even when bypassing the UI. Verify assignment of existing single-operator work to the initial owner and preserve original observation provenance.
20. Complete real reference-provider password/TOTP enrollment/sign-in, shared session, sign-out, expiry/revocation and recovery/failure paths. Invalid sessions or provider failure never grant anonymous access. Verify Home/NEXUS/Settings/ATLAS and live access; fixture-only authentication is insufficient. Stop affected recording on sign-out/expiry/revocation, retain existing data under policy and require an explicit restart after login/backend restart. Corporate directory access is not required.

## 14. Approved technical plan and handoff

The owner approved the implementation direction and final sign-in/recording policies before authorizing this documentation update:

| Choice | Approved basis |
| --- | --- |
| Deployment and boundaries | Keep React + ASP.NET Core + PostgreSQL/PostGIS in the modular monolith. Enforce platform/app/connector direction through typed contracts and import/architecture checks; no app-to-app runtime dependency or required separate deployment |
| Home, registration and saved state | App/system-tool registration supplies branding/navigation. Home/system tools need no workspace; app launch chooses one. Separate personal preferences, system/connection configuration and explicitly saved workspace/app state |
| Data ownership | Platform owns domain records/current projections, collection, queries and evidence. Move current aircraft/earthquake tables to platform ownership without changing IDs/provenance or domain revision/retention semantics |
| Connections | Multiple instances replace single-active-provider selection. Relational identity/scope/revision plus validated JSONB settings; versioned JSON templates/import/export; schema-driven Blueprint forms; protected backend credential references; shared equivalent authorized demand |
| Composed ATLAS | State version 2 has one camera/area/time plus layer instances. Domain contributors provide rendering/controls/columns/facts/actions through shared components. Stable record identity differs from layer/rendering identity |
| Reference authentication | Keycloak in Compose with separate database/user; standard confidential OIDC code + PKCE; backend-held tokens and session cookie; CSRF and REST/SignalR authorization. Password + authenticator-app TOTP is the verified baseline; passkeys later |
| Ownership and recording | Explicitly provision one authorized operator; internal user ID maps issuer + subject. Enforce owner/resource access at platform boundaries. Recording stops on sign-out, expiry/revocation and requires an explicit restart; no polling-control UI or unattended collection in prototype |
| Migration and recovery | Version database/state conversions, preserve invalid originals and prior domain settings, retain the active camera without enabling extra collection, seed connections once and assign legacy work to the configured owner. Ordinary backups stay secret-free; identity/secret recovery is separate |

The implementation order is platform/identity foundation → early real authentication slice → Home/workspaces → NEXUS/connection migration → composed ATLAS/GeoJSON → remaining complete ATLAS scope → full authentication/recovery and acceptance. It is recorded normatively in PROTOTYPE_SPEC.md §12.

Implementation will still select exact schema fields, package/image pins, compact layouts and documented session-check bounds within these decisions. Those details do not reopen the approved scope. Unattended recording, advanced permissions and future-app design remain later discussions. This handoff completes the authorized documentation phase; application changes require the next implementation instruction.

## 15. Evidence and reference limits

The discussion follows inspection of all 14 PNGs and [the supplied feature text](<../design/reference/Gotham Europa Info/gotham_europa_notes.txt>), comparison with the repository documents/code and observation of the running aircraft interface. The text was verified against [Palantir's Europa page](https://www.palantir.com/platforms/gotham/europa/) on 2026-09-22.

| Supplied screenshot time | Pattern informing this record |
| --- | --- |
| 10:06:46 | A reusable map/reference card within conversation; chat itself is deferred |
| 10:07:00 | Searchable artifact library with metadata and preview |
| 10:08:06 and 10:08:11 | Layers/sources/tools, annotated map and related-clip shelf |
| 10:08:21 | Reuse of a map clip with return-to-source context; full slide authoring deferred |
| 10:09:05 | Inspectable processing lineage; not evidence of an entity-relationship graph |
| 10:10:00 | Explicit simulation inputs, spatial results and temporal coverage |
| 10:10:47, 10:11:12 and 10:11:36 | Region-note flow, detection filters, multi-source timeline and imagery-age cue |
| 10:12:36 | Grouped spatial tools and explicit annotation destination |
| 10:12:46 | Video intelligence overlays, retained only as a later reference |
| 10:14:15 | Inspectable model metadata; advanced audio workflow deferred |
| 10:14:37 | Browser delivery and explicit notional-data labelling |

Files remain unchanged in [Gotham Europa Info](<../design/reference/Gotham Europa Info/>). Screenshot dates are capture dates, not proof of release dates or current product behaviour. Some frames contain older or inconsistent demo dates. Stills do not establish actual synchronization, keyboard/accessibility behaviour, model accuracy, security enforcement or claimed processing scale. The proposals above are VANTAGE design decisions informed by those references, not claims of verified Gotham internals.

Unity's [hierarchy reference](https://docs.unity.com/en-us/engine/6000.3/manual/unity-editor/editor-windows-views-reference/hierarchy-window/hierarchy-reference) informed discussion of grouping, visibility and selection. The accepted ATLAS arrangement separates workspace layers from the large returned-record hierarchy. [USGS magnitude types](https://www.usgs.gov/programs/earthquake-hazards/magnitude-types) support preserving the supplied earthquake magnitude type.

The VANTAGE Home, NEXUS, independent-app and authentication choices are project design decisions. [Keycloak's official capabilities](https://www.keycloak.org/) and [administration guide](https://www.keycloak.org/docs/latest/server_admin/index.html#_authentication), checked during the 2026-09-22 discussion, support the reference-provider direction: open-source identity management, OpenID Connect, local accounts, MFA/passkeys and organizational federation. Documentation review is not a completed VANTAGE integration or security verification.

## 16. Decision history

| Date | Decision |
| --- | --- |
| 2026-09-22 | Europa review completed; user requested detailed discussion before specification changes |
| 2026-09-22 | Media clarification: retain ordinary camera/radio/TV streams and playback; defer advanced video intelligence/analysis |
| 2026-09-22 | User confirmed the proposed design, including layers left and grouped record results separately |
| 2026-09-22 | User requested this single consolidated change record first; further discussion and additions precede specification/ecosystem updates |
| 2026-09-22 | User approved editable connections for the prototype: coded connector types, bundled templates, database-backed instances with versioned JSON import/export, application-wide/workspace-only availability, Settings / Sources / Layers responsibilities, preserved provenance and evidence, and a bounded configurable GeoJSON feed connector. Record this before updating specifications or implementation. |
| 2026-09-22 | User confirmed VANTAGE as the shell and shared data platform, with independently usable analytical apps and no required app-to-app dependencies. Shared data and services survive app removal; cross-app actions remain optional. |
| 2026-09-22 | User approved VANTAGE Home with Workspaces / Apps / System / Account, NEXUS — Data Manager as a system utility separate from ATLAS, system-wide Settings and workspaces as project contexts. NEXUS supersedes the earlier Settings → Connections route. |
| 2026-09-22 | User explicitly required authentication during the prototype. Establish identity, ownership and baseline access enforcement early; complete real provider sign-in/session integration before acceptance, potentially as a late milestone. Use an external open-source provider through OpenID Connect, with Keycloak the preferred reference choice; advanced enterprise collaboration remains deferred. |
| 2026-09-22 | User approved the technical direction in section 14: modular boundaries, Home/workspaces, platform data ownership, configurable connections, composed ATLAS, Keycloak/OIDC, ownership and recoverable migrations. Prove a small real authentication slice early and complete the full account/session checks later. |
| 2026-09-22 | User selected password + authenticator-app MFA; passkeys follow. Recording stops on sign-out; the final approved policy also stops on expiry/revocation, retains data under policy and requires explicit restart. Broader passive recording/history strategy and global/per-connector polling controls are deferred. |
| 2026-09-22 | User explicitly authorized the coordinated documentation update. Specification, design, ecosystem, agent guidance, decisions, README status and reference index are reconciled; application code/configuration/schema implementation remains pending. |

# Gotham capabilities and implications for VANTAGE

Review date: 2026-09-21. Original discussion document; recommendations did not change prototype scope until adopted in the governing specification. See the follow-up below.

Follow-up, 2026-09-21: the original assessment below compared specification v0.4. Following owner approval, [specification v0.7](../PROTOTYPE_SPEC.md) adopts the focused evidence, saved-query, radius-search and recovery changes. The [ecosystem brief](../VANTAGE_ECOSYSTEM.md) now maps descriptive capability categories to documented tools and analytical methods; its future-app directions remain exploratory. The original source inventory and comparison below are retained as review history.

## Assessment

Gotham supports VANTAGE's direction: a common data foundation, several coordinated views, and reusable objects that retain their provenance as users move between tools. The most useful lesson is the complete workflow from discovery through investigation to an evidence-linked output. VANTAGE already specifies a substantial observatory; its larger opportunity is to help an operator develop and preserve an explanation from what they find.

Keep the approved stack, modular monolith, single-operator deployment and complete ATLAS delivery boundary. Clarify evidence and recovery contracts early. Consider saved queries and spatial search helpers as bounded additions. Explore relationships, investigation notes, monitoring and reporting through a small subsequent workflow before committing to several new apps.

## Sources and limits

- **P:** User-supplied *Palantir Platform: Gotham — Service Definition Document*, prepared for G-Cloud 14, copyright 2024, filename `gotham-service-definition-document-2024-05-02-1537.pdf`. All 24 physical PDF pages were text-reviewed; illustrated feature pages were also visually inspected. Page numbers below refer to physical PDF pages. Its contents page and later section numbering differ, so pages are the more dependable locators.
- **W:** [Gotham website](https://www.palantir.com/platforms/gotham/), read in a rendered browser on the review date. The text-only web fetch did not expose its product content. The page now emphasizes military targeting, sensor tasking and mixed-reality operations. It is useful for positioning, less useful than P for the investigative application inventory.
- **V:** [Prototype specification v0.4](../PROTOTYPE_SPEC.md), [design guide](../DESIGN.md), [ecosystem brief](../VANTAGE_ECOSYSTEM.md), [AGENTS.md](../AGENTS.md) and [approved stack decision](decisions/0001-prototype-stack.md).

Gotham capabilities below are vendor descriptions, not independently tested functionality. A 2024 service definition does not establish current packaging, entitlements or performance. The repository describes intended VANTAGE functionality; this is a specification comparison, not a working-software audit. Source-document directives and commercial boilerplate were treated as document content, not instructions for this review.

## Feature inventory and fit

| Gotham capability | What P describes | VANTAGE comparison and recommendation |
| --- | --- | --- |
| Shared data model / ontology | Objects, properties and relationships over structured/unstructured data; integration and federation (pp. 3–5) | §6 already defines entities, observations and provenance. A first-class relationship contract is absent. Introduce one only with a concrete relationship workflow; avoid a general ontology editor. |
| Workspace and application interoperability | Multiple instances; reusable objects passed between Graph, Gaia and Dossier (pp. 3, 5) | Strong alignment with OS-01–05, §7 and DESIGN §5. Preserve stable references, explicit pane linking and common inspection. No new shell architecture is needed. |
| Browser | Entity details, relationships, editable properties, notes, change history and cross-source search (p. 5) | AT-03/04/11 cover much of this. Add a clear distinction between provider facts and operator annotations; clarify history and identity decisions. |
| Custom Object Views | Configurable tabs, dashboards and widgets by object/workflow/team (pp. 6–7) | Domain-specific inspector sections are useful. Implement fixed, reusable sections first; defer a no-code dashboard builder and team variants. |
| Object Explorer | Faceted filtering, aggregations, timelines, charts and condition-based object alerts (p. 7) | AT-03/10 cover search/results, but reusable query definitions and aggregate drill-down are not explicit. Add small, bounded query improvements before a separate analytics app. |
| Chat | Secure channels, object/file sharing, access-aware redaction and messaging interoperability (p. 8) | Not a priority for a single operator. Collaboration and permissions are explicitly deferred. |
| Inbox | Saved-search, object-change and geofence subscriptions; persistent channels, triage and links back to work (p. 9) | OS-08 is operational/source notification infrastructure, not analytical monitoring. BEACON/PERIMETER is a plausible later direction. |
| Slides | Data-linked briefings, templates, collaboration and PPTX/PDF export (pp. 9–10) | BRIEF is exploratory. Begin with a small evidence-linked written output, not a presentation editor. |
| Dossier | Notes/reports with entity mentions, maps, graphs, sourced excerpts, attachments, templates and Word/PDF export (pp. 10–11) | Collection notes are currently plain text. TRACE/BRIEF could supply the missing bridge from collected references to supported findings. |
| Graph | Relationship canvas, annotations, property summaries, history, table view, search-around, temporal analysis and interactive HTML export (pp. 11–13) | NEXUS is exploratory and graph analysis is explicitly deferred. Start with evidence-backed relationship lists and one-hop expansion; assess a graph canvas afterwards. |
| Gaia | Geospatial exploration, event/time queries, radius/route/polygon searches, geotagging, heatmaps, custom layers and GIS formats (pp. 13–14) | ATLAS already covers much of the map/time foundation. Radius and route-corridor queries are useful gaps; arbitrary geotagging needs attributed uncertainty. Add formats only for demonstrated import needs. |
| Video | Live/archive review, annotations, entity tags, geospatial overlays, model detections with human review, frame/clip exports and aggregate detection analysis (pp. 14–15) | AT-07 provides playback, not a video-analysis suite. Consider permitted still-frame evidence capture and timecoded notes later; defer continuous video processing and AR. |
| APIs and extensibility | REST APIs, external applications/models and open-format export under shared security controls (pp. 4–5, 23) | Already central to §§4/7/9 and the stack decision. Strengthen portability of user work rather than add infrastructure. |
| Governance | Attribute-level restrictions, security-aware derived data, audit/history, SSO and other authentication options (pp. 4, 17–18) | Retain current local/remote-access boundary. Add explicit change history and export provenance; enterprise policy enforcement requires a separate project. |
| Service operations | Deployment help, training, support, incident/change/release management and maintenance (pp. 16–21) | Extract guided onboarding, source setup help and repeatable demonstration workflows. Do not copy enterprise service processes into the app. |
| Recovery and exit | High availability, backups, restore, extraction and removal (pp. 21–23) | Persistence, snapshots and workspace export are not a full backup. Add a tested recovery procedure for database plus binary storage and a clear deletion/backup policy. |

The current [website](https://www.palantir.com/platforms/gotham/) adds emphasis on AI-supported targeting, automated/manual sensor tasking and mixed-reality command centers. These are outside VANTAGE's public-source research purpose and do not justify changing ATLAS scope. The transferable principle is keeping context attached to a user-directed workflow.

## Changes worth considering now

These priorities concern specification decisions. They do not authorize implementation or reduce any current completion requirement.

### 1. Make provenance and identity decisions inspectable

**Highest architectural value; mostly clarification of existing requirements.** §6 already requires traceable merging, conflicting observations and correction lineage, but does not specify how an operator inspects the decision that connects two source records.

- Identify the supporting observation or source record for each displayed fact when an inspector combines several sources.
- Distinguish source updates, source corrections, operator annotations and derived assessments in history.
- Record the identity rule/version and supporting references used to associate records. Ambiguous matches remain candidates. If manual decisions are introduced, retain the decision and support reversal without deleting original records.
- Preserve an unresolved/expired reference visibly when its evidence is unavailable.

Example acceptance check: two feeds disagree about a vessel attribute. Both assertions remain inspectable; the UI explains any preferred display value. A later correction does not erase the origin of an earlier saved finding.

Do not introduce one numerical confidence score for everything. Source reliability, coordinate precision, identity uncertainty and confidence in a claim answer different questions.

### 2. Specify backup and restore

**High practical value; a real addition to operational requirements.** Back up persistent user work, database state, stored assets and the metadata that connects them. Document a consistent backup/restore procedure, secret handling, migration compatibility and which caches can be rebuilt. State what happens to deleted data in older backups; do not promise forensic erasure.

Example acceptance check: restore onto a clean installation and verify collections, notes, areas, workspace links and permitted snapshots. Report missing optional sources without losing user work. Snapshot retention budgets remain separate from backups.

### 3. Distinguish a saved query, a collection and a snapshot

**High usability value; bounded scope addition.** Saved views already preserve workspace filters, but a reusable named query has different semantics:

- A saved query stores criteria and runs again against currently available data.
- A collection preserves selected references.
- A snapshot preserves an explicit permitted version of selected data.

Store source scope, typed filters, geometry, time semantics and a query schema version. Make relative windows such as “last hour” explicit; do not silently turn a fixed historical query into a moving window. Provider lookups remain user-started. Rerunning a query should not create an ongoing monitor.

### 4. Add small spatial search helpers

**Useful ATLAS extension; moderate cost.** Offer “within radius of this point” before considering route corridors. Return the same bounded result contract as existing area searches, with visible distance units, filters and completeness. Test geodesic distance, antimeridian handling and uncertain locations.

Nearby observations do not establish a relationship, and a coarse regional location should not produce a precise proximity claim. Defer heatmaps until the UI can explain whether it is counting entities, observations, sensor detections or reporting density.

### 5. Clarify reference versus preserved evidence in the UI

**Builds on AT-11/12, not a new archive app.** Use explicit actions such as Save reference and Save permitted snapshot. Show whether content is retained, still external, expired or unavailable. Include source/retrieval time, transformations and acquisition precision when present.

For retained files, a content hash can help detect later alteration; it does not prove the original content was truthful. Preserve the existing rule that media playback does not imply permission to archive it.

## Best next workflow after ATLAS

Build one small path: **select observations → add an attributed relationship or note → save a finding → export a cited brief**. This is a proposal, not a committed release order or four new apps.

1. **Evidence-backed relationships.** Store endpoints, relationship type/direction, supporting references, applicable time, origin and review status. Separate a source-reported relationship from an operator hypothesis. Explain every edge. Use PostgreSQL tables and bounded queries initially; the current use case does not establish a need for a graph database.
2. **An investigation desk.** Extend a collection with a research question, findings, supporting/contradicting evidence and unresolved leads. A lean Markdown view with stable references is enough to test the value. Avoid a full case-management product.
3. **A reproducible brief.** Export a short summary, cited observations, selected map/view context and caveats. Live references may refresh; an issued brief should preserve the version used, where permitted, or clearly state that the source was not retained. Do not silently update a published conclusion when its source changes.

An illustrative public-source workflow: collect thermal-anomaly detections near transport infrastructure, compare available dated imagery, attach the actual observations to a note, and export a brief separating observed detections from a hypothesis about disruption. A nearby detection alone establishes neither damage nor causation. This tests ATLAS, provenance and explanation without requiring person tracking or new commercial sources.

Likely homes are NEXUS for relationships, TRACE for investigation work and BRIEF for outputs, but feature ownership should follow the tested workflow. Avoid populating the launcher with these names before tools exist.

## Useful later, with explicit prerequisites

| Candidate | Why useful | Prerequisites and boundary |
| --- | --- | --- |
| Saved-search/object/area monitoring | Reduces repeated manual checking | Durable rules and checkpoints, deduplication, restart recovery, retention and replay semantics. Show the triggering evidence, rule version and coverage. A feed gap must not be interpreted as an object leaving an area. Start with an in-app inbox. |
| Aggregate exploration | Helps inspect patterns beyond individual markers | Known counting grain, source coverage, duplicate handling, bounded aggregation and drill-down to underlying records. Keep charts beside the relevant results. |
| Document/excerpt evidence | Supports source-backed research and writing | Separate ingestion specification for extraction, page/excerpt locations, permitted storage and untrusted content. Do not turn RSS import into automatic full-text scraping. |
| Timecoded media notes and frame capture | Connects a visible event to analysis | Verified capture/export rights and available timestamps; retain original versus annotated output and label uncertain capture time. Continuous recording remains deferred. |
| Graph canvas | Makes some networks easier to explore | Useful relationship data first, bounded expansion, accessible table view, temporal filtering and explanation of each connection. Graph proximity must not imply strength of evidence. |
| AI-assisted analysis | Can draft summaries or suggest candidate links | Existing capability interface, explicit request, input citations and human review. Suggestions stay derived; no silent edits or autonomous investigations. |

## What to preserve or avoid

Preserve the distinction between observations, reports, predictions, inference and demo data. Gotham's unified-data language should not become a reason to collapse conflicting accounts into a supposedly authoritative truth. Keep unknowns visible and retain VANTAGE's stronger explicit treatment of gaps, temporal precision and data rights.

Preserve independent pane state and keyboard-accessible Open in actions. Drag-and-drop can complement those actions later. Use reusable domain inspector sections; there is no current justification for a general dashboard/widget authoring platform. The existing design guide already captures the useful visual principles, so no token or layout redesign is recommended from this review.

Defer enterprise collaboration, attribute-level permission engines, chat, classification domains, military tasking, mixed reality, distributed high availability, universal federation and large-scale video analytics. Do not copy the PDF's scale or latency claims into VANTAGE targets. Its recovery claims concern a described deployment configuration, not a benchmark for a local prototype.

## Proposed document changes if adopted

| Document | Focused change |
| --- | --- |
| PROTOTYPE_SPEC §§6–7 | Clarify fact-level provenance resolution, identity decision traceability and history; add a saved-query contract only if selected. |
| PROTOTYPE_SPEC §§8/10/11 | Add coordinated backup/restore, deletion semantics and a clean-install recovery check. Clarify saved evidence availability. |
| PROTOTYPE_SPEC AT-03/08/11 | Optionally add reusable searches and radius queries with explicit limits and acceptance scenarios. |
| DESIGN §§5–6 | Show source conflict, identity basis and reference/snapshot state in expanded inspection; add contextual query actions if adopted. |
| VANTAGE_ECOSYSTEM | Record the proposed relationship → finding → brief experiment and monitoring prerequisites, retaining exploratory status. |

At the time of the original review, no changes to those governing documents were made. The review itself added no dependencies or changes to the approved build sequence; subsequent adoption is noted above. Priorities and effort assessments are design judgments, not measured implementation estimates.

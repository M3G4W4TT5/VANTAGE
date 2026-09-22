# 0007 — Configurable connections and NEXUS

Status: accepted by the project owner on 2026-09-22; implementation pending. Extends [decision 0003](0003-replaceable-source-adapters.md) without weakening replaceable adapter boundaries.

## Decision

Code defines connector types and capability contracts; persisted configuration defines connection instances. Replace the single active-provider selection with a registry that supports multiple connections of each type. Keep source origin, connector type, template, connection, dataset and layer instance distinct. A connection name or configuration revision is not an observation's source identity.

Store connection ID, connector type, availability scope, enabled state and configuration revision as relational fields in PostgreSQL. Store connector-specific settings as validated JSONB. Publish versioned JSON Schemas for those settings, bundled templates and portable import/export. The database is the active configuration authority; files supply templates and explicit interchange, not a second live configuration store.

NEXUS owns Add, Edit, Duplicate, Test/preview, Disable, Remove, Import and Export. Use schema-driven Blueprint forms with specialized controls where a connector needs them. ATLAS Sources discovers datasets and adds layers; it links to NEXUS for connection changes. Settings does not duplicate this manager.

Global availability is the default; workspace-only availability references one explicit workspace. Both remain subject to server-side access checks. Availability alone starts no collection. Different endpoint/account settings require distinct instances, rather than hidden workspace overrides of shared configuration. Show affected consumers before applying a shared edit; use revision checks and retain the working revision on validation failure.

Credentials live in a protected backend secret store. Persist only credential references in connection configuration; omit secret values from normal APIs, portable definitions, logs, exports and ordinary backups. Imported definitions with unresolved credentials remain setup-required. Define separate operator-managed secret recovery; frontend forms can submit credentials but must not read them back as ordinary settings.

## Defaults, collection and lifecycle

- Bundle aircraft and earthquake templates and seed initial instances once. Edits and deletions survive restarts/upgrades. Add from template and applying revised defaults are deliberate actions.
- Coordinate demand by connection, dataset, equivalent query and authorized access context. Layers/panes share equivalent upstream work; different credentials or endpoints are not assumed equivalent. Layer IDs are presentation identity, not ingestion identity.
- Use bounded provider-appropriate refresh defaults, backoff and enforced limits. Expose actual cadence and freshness as metadata. Global polling controls and per-connection rate overrides are deferred until after the prototype.
- Disabling a connection cancels its subscriptions/recording and marks fresh data unavailable without retagging retained observations. Removal preserves permitted reference metadata and makes dependent layers explicitly unavailable. It never silently substitutes another provider or deletes independently retained evidence.
- Closing NEXUS has no effect on demand from other consumers. Recording is separately explicit and session-bound under [decision 0008](0008-authentication-and-session-lifecycle.md).

## Bounded GeoJSON connector

Include one configurable HTTP-polling GeoJSON connector (DS-29), in addition to migrating aircraft and earthquake adapters. Accept bounded [RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946) FeatureCollections, with declared support for Point/MultiPoint, LineString/MultiLineString and Polygon/MultiPolygon; retain null geometry as off-map. GeometryCollection and non-GeoJSON payloads may report unsupported. Validate WGS84 coordinates, payload/feature limits and time values at runtime.

Configuration selects an endpoint, supported backend authentication and declarative identity, label and time-field mappings. Require a stable feature ID or configured stable identifier for refresh reconciliation; reject duplicate/missing identifiers in test/validation rather than inventing stable identity. Missing source time remains unknown. Preserve mapped event/validity time separately from retrieval and revision/content identity. Declare snapshot/update semantics: disappearance from a result set does not prove an event ended or an entity ceased to exist.

Return generic features with provenance, property inspection and geometry-appropriate presentation. Mapping fields does not grant aircraft, earthquake, history or tracking semantics; those require compatible domain contracts. Do not allow executable expressions, arbitrary scripts or a general API transformation language. Test/preview must verify interpretation as well as HTTP connectivity. Validate destinations/redirects, redact authentication, and preserve the last valid result on malformed or incompatible responses.

Acceptance demonstrates two independent connections of one type, multiple layers sharing a dataset, persistence across template upgrades, portable secret-free definitions and an operator-added compatible GeoJSON feed without application code changes. A static file import alone does not satisfy DS-29.

# 0005 — Shared point presentation and earthquake revisions

Status: implementation of the four approved shared-component/earthquake stages. NASA imagery and combined-layer controls remain later review steps.

`PointMap` owns Cesium/camera/basemap lifecycle; `PointMarkers` batches normalized point definitions, picking and selection brackets. Both domain presenters use it. Aircraft owns ellipsoid height, heading, follow and its collection circle. Earthquakes supply surface epicentres and magnitude styles. The Web Mercator 2D projection and Northern Europe default remain unchanged. Shared Tabler SVGs come from exact-pinned `@tabler/icons` 3.47.0; no source content enters their markup.

One configurable results component uses identical columns for Blueprint and semantic tables. Inspector framing, field rows, UTC formatting and provenance disclosure are shared. Domains own facts/actions. `SourceServices` injects capability contracts; only the composition root and connectors import concrete frontend providers. ESLint enforces this alongside Blueprint restrictions. Ownership is recorded in `AGENTS.md`.

Both domains reuse bounded HTTP transport, validation, batch diffing, sequenced SignalR recovery and the frontend observation cache. Their revision rules stay explicit. Aircraft remains ordered by position time then message time. Earthquakes use source-update time, with first-accepted tie handling and immutable supersession links. Feed generation/retrieval and event occurrence are different clocks.

Earthquake collection is a single source-defined catalog demand, distinct from aircraft area queries. A generic collector hierarchy is unnecessary. The additive migration introduces current earthquake/feed tables and indexes plus `DataType` on shared observation rows, backfilling existing aircraft records without changing their JSON. Retention requires both data type and source ID; typed observation endpoints cannot deserialize the other domain. Exact observation references still resolve across provider replacement.

The live domain selector shows one view at a time. Camera and filters for earthquakes are separate from aircraft; selections are kept when switching. Existing optional pane-state fields remain compatible, and explicit Save remains the only workspace persistence action. No automatic world zoom or collection request follows place search.

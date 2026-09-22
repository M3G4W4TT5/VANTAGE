# Stage 2: aircraft vertical slice

Historical implementation/verification record. The 2026-09-22 [specification](../PROTOTYPE_SPEC.md#12-implementation-sequence-and-completion) supersedes this increment's next-step ordering with platform/identity foundations, Home, NEXUS and composed layers before further connector breadth. The delivered results below are unchanged.

The user's decisions are preserved: **explicit Save** for workspace changes and **Northern Europe** as the initial map view. Existing saved demo workspaces retain their state; choose **Live aircraft** to enter the new view. New workspaces open the live view at longitude 12 / latitude 58 with a 250 NM query.

## Delivered

- Cesium 2D/globe with a bundled coarse offline basemap, bounded collection circle, map picking, follow, text/age filters, shared results grid/list and an inspector with observation IDs, source/retrieval times, units, identity basis and property lineage. Unknown geometric altitude uses a surface symbol; barometric altitude is never silently used as ellipsoid height. Positions are not extrapolated.
- Backend-only ADSB.lol adapter, runtime input checks, bounded shared demand, cancellation, timeout/backoff and rate-limit handling. Source failures preserve available data and expose source health separately from transport state.
- Additive EF migration: immutable observation/raw JSONB storage, current aircraft projection and indexed PostGIS geography. Explicit REST DTOs, OpenAPI/NSwag regeneration, versioned aircraft-property and SignalR batch schemas.
- Shared frontend observation cache outside workspace/context state. Ordered batches reject duplicates, late positions, invalid data and sequence gaps; reconnect obtains a reset snapshot. Closing the final view releases demand. Selection, filters, camera and view mode remain behind Save; feed updates do not dirty the workspace.

The [source record](sources/adsb-lol.md) lists verified endpoints, operation permissions, attribution and actual resource limits. There is no paid credential requirement or system installation.

## Verification

- Native .NET build; real isolated PostgreSQL/PostGIS integration covering shared collection, normalization, immutable/idempotent observations, late arrivals, dateline queries and REST evidence retrieval. Separate adapter checks cover malformed responses, cancellation and Retry-After.
- Frontend lint/type/build and two focused Vitest scenarios: existing context/lifecycle behaviour and aircraft batch validation/order/reset recovery.
- Four Playwright workflows on the native development path, using the pinned 1.63.0 Noble container. The aircraft scenario uses a mocked SignalR wire stream and the real Cesium renderer: map picking, table/inspector selection, both themes, explicit Save, restoration and sequence-gap reset. Existing shell/keyboard/narrow-layout checks still pass.
- Separate live collector check: 110 aircraft, healthy source, zero rejected records, REST lookup matching a stored observation ID. This is not fixture evidence. The final production container also passed all four browser workflows (35.1 seconds). A separate live browser check showed a healthy source, 109 provider results / 139 available cached aircraft, working map/list/inspector selection and no JavaScript or console errors. OpenAPI/client regeneration left both artifacts unchanged. Screenshots and reports are retained locally in `artifacts/stage-2/`.

No full performance or accessibility certification is claimed. Cesium is lazy-loaded; its compressed map chunk is about 1.1 MB. Natural Earth is intentionally coarse, with no street detail. Browser software rendering does not measure this laptop's native GPU performance.

The approved follow-up adds replaceable capability adapters, detailed/free raster tiles and offline place lookup; see [the follow-up handoff](adapters-map-places.md) for current behaviour and verification. The results above describe the original aircraft slice.

## Remaining scope

The original DS-01–28 and working-environment requirements remain included. Follow the current specification's sequence for the approved ownership/authentication, connection and composition changes, then complete all DS-01–29, ATLAS workflows and AC-01–21. The [change record](atlas-workspace-change-record-2026-09-22.md) explains the additions; existing verification above does not certify them or the full performance targets.

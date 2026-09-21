# ADSB.lol / DS-02

Checked 2026-09-21 for this local prototype. Service access and data licensing are separate.

- Public API: `https://api.adsb.lol/v2/point/{lat}/{lon}/{radius}`. Its [published OpenAPI](https://api.adsb.lol/api/openapi.json) limits radius to 250 nautical miles. It states that production users should contact the operator and that key requirements may change. No numerical public request quota is published there.
- [Data documentation](https://www.adsb.lol/docs/open-data/api/) identifies ODbL 1.0. The [licence](https://opendatacommons.org/licenses/odbl/1-0/) permits using and adapting the database subject to its attribution and applicable share-alike/access obligations. Local query, display and caching are enabled. Recording, evidence exports and redistribution are not implemented in this stage; their manifests must preserve these obligations when added.
- Visible attribution: **ADSB.lol contributors · ODbL 1.0**. A provider address is the within-source identity key; it does not prove permanent airframe identity or justify cross-source merging.
- [readsb field documentation](https://github.com/wiedehopf/readsb/blob/dev/README-json.md) describes feet, knots, UTC-relative `seen`/`seen_pos`, barometric versus WGS84 ellipsoid altitude, non-ICAO addresses and MLAT fields. The public v2 API's `now` is milliseconds (verified against a real response), unlike readsb's seconds. Keep position time separate from last-message time. Other property ages remain unknown. Containment radius measures integrity, not guaranteed accuracy.

Operator defaults: 30-second minimum polling per area, at most four distinct active areas and 16 subscribers per area, one outbound request per eight seconds globally, 500 displayed records, 4 MiB response bound and a 15-second timeout. These are conservative application budgets, not provider entitlements. Equivalent rounded queries share work. HTTP 429 pauses all areas; Retry-After overrides shorter exponential backoff. The last subscriber leaving cancels obsolete work. No active area means no collection.

The backend keeps immutable normalized observations and their raw source records in a bounded cache. Identical observations are idempotent; late positions cannot replace newer ones. Current projections use PostGIS geography queries, including across the antimeridian. Query results include positions retrieved within 15 minutes; older positions are explicitly stale. Provider failures retain the last delivered result and its source time. Disappearance is not proof that an aircraft stopped existing.

Cache budget: 50,000 observations / 24 hours and 10,000 current projections. Pruning runs after successful ingestion; when idle or stopped, physical deletion waits for the next successful ingestion. The observation lookup refuses expired records, and current spatial queries apply their time window. This is not a recording archive or preserved evidence snapshot. Subscription history is not durable: reconnect and detected sequence gaps request an explicit reset snapshot.

## Live checks, separate from fixtures

- Direct public query at 18:54 UTC: HTTP 200, 121 aircraft around latitude 58 / longitude 12 / 250 NM; no key supplied.
- Application collector at approximately 19:16 UTC: healthy SignalR batch, 110 aircraft, zero rejected records; an emitted observation resolved through the REST API from PostgreSQL with the same immutable ID.

- Production browser at approximately 19:27 UTC: healthy source, 109 provider results and 139 available aircraft including older cached observations; map/list/inspector rendered with no JavaScript or console errors. The temporary verification workspace was removed.

- Adapter follow-up at 20:37 UTC: healthy collection in the rebuilt production app, 96 aircraft available, zero rejected records and no JavaScript errors in the separate live map check. The temporary workspace was removed.

These checks establish availability at those times, not continuous or complete coverage. Automated backend/browser checks use synthetic source-shaped data and never depend on this live service.

## Map used in this stage

CesiumJS 1.145.0 is pinned. Its bundled Natural Earth II imagery supplies the coarse offline basemap under [Natural Earth's public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/). No ion token, terrain subscription or external tile request is required. Static Cesium assets and notices are copied reproducibly from the locked package during development/build.

Detailed basemaps and the offline place index are now implemented through separate [DS-01 adapters](basemap-places.md). See the [Cesium basemap decision](../decisions/0004-cesium-basemap.md) for the verified free raster substitution.

The aircraft collector now consumes `IAircraftSource` and registered metadata. Its current projection is indexed and queried by original source ID; replacing the active adapter never relabels stored evidence. Provider parsing/identity rules remain in `Connectors/AdsbLol`. New observations carry their identity and conversion descriptions with their provenance; older cached records retain their existing rule/version identifiers.

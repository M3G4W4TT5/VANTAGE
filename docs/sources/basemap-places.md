# Basemap and places / DS-01

Checked 2026-09-21. No paid service, key or additional rendering library is required. Provider selection/construction belongs to `frontend/src/connectors`, behind `BasemapSource` and `PlaceSource`.

## Detailed map

- Endpoint: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, standard 256px Web Mercator raster tiles, zoom 0–19. Cesium handles their projection into the 2D map or globe.
- [Tile service policy](https://operations.osmfoundation.org/policies/tiles/) and [copyright/attribution](https://www.openstreetmap.org/copyright): visible © OpenStreetMap contributors, ordinary browser identification/referrer and HTTP caching. No numerical service quota or availability guarantee is granted. No bulk/offline downloading or provider credential is used.
- Interactive viewport tiles only. Workspace Save stores the camera and source choice, not a tile archive. Network/tile failure hides the online layer and exposes the bundled fallback plus explicit retry.
- [Decision 0004](../decisions/0004-cesium-basemap.md) records why this free raster source substitutes for the OpenFreeMap reference at this stage.

## Offline map and places

- Map: Natural Earth II tiles distributed with the pinned Cesium 1.145.0 package, copied by `prepare-cesium.mjs`. Coarse global context, no street detail.
- Place source: [Natural Earth v5.1.2 populated places](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_populated_places_simple.geojson), 7,342 records. [Dataset description](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/) and [public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/).
- Source SHA-256: `fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f`. `frontend/scripts/prepare-places.mjs` verifies it before replacing the bundled JSON. Routine restore/build never downloads this data.
- Keep original `ne_id`, spelling, supplied aliases, country label and WGS84 geometry coordinates. Source rank orders results; no population estimate is displayed. These are approximate cartographic place locations with unknown observation times, not street-address geocoding or current administrative/sovereignty assertions.
- Runtime validation applies to the complete bounded index. Search returns at most eight results, cancels obsolete work and folds accents/common Nordic letters for matching while preserving displayed spelling. The existing index remains in use until an explicit reviewed data refresh.

Live check at 20:37 UTC on 2026-09-21: 70 successful HTTP 200 tile responses in one initial Northern Europe view, rendered alongside live aircraft. No JavaScript errors. The bundled place index and failed-tile fallback were separately verified with intercepted tile responses.

Fixture and live verification results are recorded in [the implementation handoff](../adapters-map-places.md).

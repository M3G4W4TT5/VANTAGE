# Approved follow-up: adapters, basemap and places

The owner approved steps 1 and 2, with review before step 3. No additional connector family has been started.

## Delivered

**Aircraft adapters:** `IAircraftSource` supplies normalized records, metadata, bounds and collection policy. `AircraftSources` selects the registered implementation; the coordinator, REST/SignalR contracts, cache and UI no longer depend on ADSB.lol. The additive `AircraftSourceIsolation` migration backfills original source IDs and indexes source-specific current results. Existing evidence keeps its original IDs and provenance. New observations carry their adapter's identity and conversion descriptions. The prototype's 500-record response budget remains explicit and independent of provider limits.

**Map and places:** separate `BasemapSource` and `PlaceSource` contracts, registered in `frontend/src/connectors/sourceRegistration.ts`. OpenStreetMap provides detailed tiles; Natural Earth provides the explicit offline basemap and automatic failure fallback. The free raster substitution is documented in [decision 0004](decisions/0004-cesium-basemap.md). Natural Earth's checksum-pinned index supplies 7,342 cities/towns and supplied aliases. Search is local, with approximate locations and no address-lookup service.

Choosing a place moves the camera. **Search this area** explicitly moves aircraft collection. **Save** retains the camera and selected basemap; feed updates, temporary tile failure and marker selection's layout changes do not cause later automatic camera saves. Pointer movement is distinguished from a selection click. Failed imagery layers are released so they cannot hold the loading queue open.

## Verification

- Three backend checks pass, including real isolated PostgreSQL/PostGIS migration, persistence, dateline queries, a synthetic replacement aircraft adapter and source-cache isolation.
- Two existing Vitest checks pass; TypeScript, lint, native build and container publish pass. OpenAPI and NSwag client were regenerated.
- Both affected browser workflows pass against Vite: aircraft selection/list/evidence, manual Save and snapshot recovery; then place aliases, saved camera/source choice, tile failure and offline lookup. Existing shell workflows passed earlier in this run. Browser fixtures never request live aircraft or public tiles.
- Playwright uses the pinned 1.63.0 Noble image and explicit software WebGL. DOM/network traces and selected screenshots remain; continuous trace filmstrips are disabled. This does not measure native GPU performance.

All five browser workflows also pass against the production Compose app (about 80 seconds): both map/aircraft workflows, themed workspace restoration, narrow-layout/keyboard checks and failed-save recovery. Local reports and screenshots are in `artifacts/adapters-map-places/`. The existing two operator workspaces were preserved; temporary test workspaces were removed.

Separate live check at 20:37 UTC on 2026-09-21: healthy ADSB.lol collection, 96 cached aircraft available, and 70 successful HTTP 200 tile responses for one initial Northern Europe view. No JavaScript errors were reported. The map screenshot was visually checked; it contains actual source data, not browser fixtures. This establishes availability at that time only. No automated tile traversal or archive was made. Source terms/data preparation are recorded in [DS-01](sources/basemap-places.md); runnable commands and provider selection are in [README](../README.md).

2D projection correction (2026-09-21): Web Mercator replaces the default geographic projection, correcting the compressed north–south proportions over Denmark. Lint, TypeScript and the production container build pass; both existing map browser workflows pass in the pinned Playwright container (64 seconds). A separate single-view live check at 20:47 UTC returned 63 successful tile responses and no JavaScript errors. The rendered map was visually compared with the previous view; screenshots are in `artifacts/map-projection/`. Saved camera coordinates continue to restore correctly.

## Review

Open the local app at port 5080 and choose **Live aircraft** if an existing workspace opens in demo mode. Try **Find a place** with Copenhagen or Göteborg, then **Search this area**. Compare **OpenStreetMap · detailed** and **Natural Earth · offline**, and Save/reload the view.

Natural Earth remains coarse at city zoom; the place index has no street addresses or complete settlement coverage. Global Ctrl/Cmd+K search still uses the demo index. Recording/replay, other source families and the rest of the prototype acceptance gate remain later work. No full performance or accessibility certification is claimed.

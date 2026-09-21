# 0004 — Cesium basemap and local places

Status: implementation choice under [decision 0001](0001-prototype-stack.md), which permits a verified equivalent free source where formats differ. Prototype scope is unchanged.

Use OpenStreetMap's standard raster tiles through Cesium's stable `UrlTemplateImageryProvider`, with the bundled Natural Earth II map underneath and available explicitly offline. Keep both behind `BasemapSource`. Use a separate `PlaceSource` for the bundled Natural Earth populated-place index.

The north-up 2D view uses Cesium's [Web Mercator projection](https://cesium.com/learn/cesiumjs/ref-doc/WebMercatorProjection.html). Its default geographic projection compressed north–south proportions over Northern Europe. This display choice applies to both basemaps; coordinates and saved camera positions remain WGS84. The globe supports viewing the poles beyond Mercator's latitude limit.

[OpenFreeMap's integration](https://openfreemap.org/quick_start/) supplies MapLibre styles and vector tiles. Cesium 1.145.0's MVT provider is marked experimental in the pinned source; it does not consume those styles directly and [requires bounded zoom/extent construction](https://cesium.com/learn/cesiumjs-learn/load-mapbox-vector-tiles-in-cesiumjs/). A further renderer or custom style/tiling pipeline is unnecessary for this slice. OpenFreeMap remains a possible replacement adapter.

[OpenStreetMap's policy](https://operations.osmfoundation.org/policies/tiles/) permits normal interactive viewing without a key. Use the documented HTTPS endpoint, visible attribution, the browser's normal User-Agent/Referer and HTTP cache. No tile proxy, bulk download, offline tile archive or speculative area prefetch is implemented. Availability is best effort; failed tiles produce a visible fallback. Automated browser tests intercept all external tiles; live checks use a single initial view, without automated tile traversal.

Natural Earth's checksum-pinned place index ships with the application. Names and source-provided aliases are searched locally, with approximate point locations and explicit dataset attribution. Choosing a place changes the camera; collection movement remains the explicit **Search this area** action.

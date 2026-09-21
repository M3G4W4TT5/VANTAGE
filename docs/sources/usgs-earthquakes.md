# USGS earthquakes / DS-11

Verified 2026-09-21. The [GeoJSON summary documentation](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) links the keyless [past-day M2.5+ endpoint](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson), updated every minute. This integration uses that single feed, not catalog searches or detail downloads. The documented [feed lifecycle policy](https://earthquake.usgs.gov/earthquakes/feed/policy.php) applies. No numerical request quota was found in those pages; the local polling/response limits below are application budgets, not entitlements.

[USGS policy](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits) identifies USGS-produced data as US public domain and asks for credit; separately marked third-party media can have different rights. Visible attribution is **U.S. Geological Survey · contributing seismic networks**. This slice enables feed query, display and local caching of summary records. It does not download media or implement recording/export/saved snapshots.

[ComCat field definitions](https://earthquake.usgs.gov/data/comcat/index.php) distinguish occurrence (`time`), revision (`updated`) and feed generation (`metadata.generated`), all epoch milliseconds. Retrieval is recorded separately. Coordinates are longitude, latitude, depth; depth is kilometres with a network-dependent reference surface. We preserve negative depths and unknowns, separate depth from the two-coordinate geometry, and render surface epicentres. Magnitude/type, place, review status, event type and network remain reported properties. The raw feature is retained for supporting detail, not displayed as trusted markup. Source event links are constructed from validated IDs; payload URLs are never fetched.

## Adapter and collection

`IEarthquakeSource` returns a normalized current catalog snapshot plus source metadata. `UsgsEarthquakeSource` owns the endpoint, parsing, field/time conversion and USGS-scoped identity. Replace the implementation in `Program.cs` and select its ID through `Sources:Earthquakes:Provider`; ATLAS, storage and transport consume the capability. No automatic alias or cross-provider merging occurs.

One collector serves all earthquake panes/tabs, normally every 60 seconds while demanded. Maximum 32 subscribers, 1,000 returned records, 4 MiB decoded response, 10,000 parsed features and a 15-second request timeout. Subscriber churn cannot bypass the interval. Final unsubscribe cancels active work. Retries use bounded exponential backoff/jitter; longer Retry-After values prevail. Permission failures require operator correction/restart. Disabled sources retain available cached records.

Last successful snapshot membership, source generation/retrieval times and completeness survive restarts. Malformed/failed or older whole feeds retain the previous snapshot. Partial feeds keep prior members and report rejected/truncated records. Removal from a complete snapshot only changes membership; it does not erase an event or its versions. An unchanged HTTP success cannot make an old generated feed fresh.

## Versions and retention

Normalized content and source revision determine immutable observation IDs; retrieval time is excluded. Identical deliveries retain their first retrieval time. Newer source-update time wins even when occurrence moves earlier. Unknown/late revisions cannot displace a known revision. Equal-time conflicts preserve both versions and retain the first accepted display value. Superseding current revisions link to their predecessor; late arrivals remain independent immutable versions. The inspector reports this policy and can read up to 20 recently retrieved versions.

Cache budget per source: 48 hours / 50,000 observation versions and 10,000 current projections. Reads refuse expired observations; pruning follows successful collection. Physical deletion waits while idle/offline. Aircraft and earthquake retention/read paths have explicit data-type and source boundaries. Workspace Save preserves settings and references, not a saved evidence snapshot. Feed freshness uses generation time; event age uses occurrence time.

## Verification

Automated tests use original synthetic fixtures and replacement adapters, including revision ordering, unknown fields, cancellation, rate limiting, partial/removal semantics, schema upgrades and retention isolation. Browser fixtures intercept SignalR and public basemap tiles. Live smoke results are recorded separately in [the increment record](../shared-components-earthquakes.md).

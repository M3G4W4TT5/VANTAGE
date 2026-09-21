# VANTAGE prototype specification

> Version 0.8 · 2026-09-21 · Implementation requirements, not a claim of existing functionality.
> Scope: VANTAGE framework + ATLAS. The approved stack is recorded in [AGENTS.md](AGENTS.md), with rationale in [decision 0001](docs/decisions/0001-prototype-stack.md) and the [Blueprint UI decision](docs/decisions/0002-blueprint-ui.md).

## 1. Purpose and document boundaries

Build a self-hosted, single-operator intelligence environment for exploring public information across **place, time and source**. The prototype must be useful with real free data and demonstrate an extensible app framework.

| Document | Authority |
| --- | --- |
| This specification | Prototype behaviour, architecture, contracts and acceptance criteria |
| [AGENTS.md](AGENTS.md), [decision 0001](docs/decisions/0001-prototype-stack.md) and [decision 0002](docs/decisions/0002-blueprint-ui.md) | Approved implementation stack, agent workflow and decision rationale |
| [DESIGN.md](DESIGN.md) | Visual system, layout, accessibility and interaction styling |
| [VANTAGE_ECOSYSTEM.md](VANTAGE_ECOSYSTEM.md) | Exploratory future directions; not implementation requirements |

**MUST** is required for prototype completion. **OPTIONAL** is explicitly outside the completion gate. Requirements apply to supplied capabilities, not universal provider coverage. “Global” means worldwide navigation and geographically diverse sources; it does not promise every aircraft, vessel, camera or device.

## 2. Delivery boundary

| Included — MUST | Deferred / OPTIONAL |
| --- | --- |
| VANTAGE shell, registered apps, shared contracts and persistent workspaces | Third-party plugin marketplace or untrusted app execution |
| Complete ATLAS workflows and the reference connectors in §5 | Every possible provider and worldwide exhaustive collection |
| Map + globe, tables, media dock, inspection and comparison | Photorealistic terrain, VR and a native desktop wrapper |
| Search, saved queries, areas/radius search, collections, bounded recording/replay, import/export | Full case management, graph analysis, Markdown desk, analytical monitoring and reporting apps |
| Source configuration, health, inspectable provenance, saved evidence and tested backup/restore | Enterprise tenancy, real-time team editing, SSO and complex roles |
| AI capability interface and disabled/unconfigured states | Live OpenAI/Jev adapters; autonomous investigations |
| Solar context, maritime/rail/energy/hiking presets, approximate IP geolocation and dated regional aerial imagery | Optional source candidates in §13; realistic terrain/building shadow reconstruction |
| Official weather alerts, station air quality, regional road incidents, imagery discovery, hazard catalogs and internet-outage context | Additional providers beyond the required reference connectors |

- Deliver a web interface, backend services and durable storage runnable on one machine. Document one reproducible launch path and a container deployment path.
- Default deployment serves one local operator and binds to loopback. Remote exposure requires operator authentication and HTTPS; anonymous public hosting is not an acceptance target.
- No paid subscription, credit card or AI key is required. A free account/key is permitted where a connector requires it. Compute, storage and internet access are supplied by the operator.
- Ship a clearly labelled, deterministic demo workspace with redistributable fixtures and a bundled coarse basemap. Live and demo data remain visibly distinct.

## 3. ATLAS workflows

| ID | Requirement |
| --- | --- |
| AT-01 Explore | Navigate worldwide in 2D and globe views; retain area, layers, filters, time and selection when switching. Provide zoom, reset north, coordinates, scale and attribution. |
| AT-02 Layers | Group by domain; enable, reorder, set opacity, inspect legend, configure filters and see source/coverage/freshness. Persist settings per workspace. |
| AT-03 Search | Search indexed names, identifiers, coordinates, places and source records. Filter by domain, source, area and time. Clearly distinguish local results from explicit provider lookups. |
| AT-04 Inspect | Map/table selection resolves the same record. Show facts, observations, source links, timestamps, precision, conflicts and available actions. Resolve displayed source-derived facts to supporting observations; explain preferred display values and cross-source identity associations. Distinguish source updates/corrections, operator annotations and derived assessments. Missing facts stay unknown. |
| AT-05 Movement | Select/follow aircraft, vessels, public-transit vehicles and satellites; inspect recorded tracks or orbital predictions. Show gaps and prediction styling; allow follow mode to be cancelled. |
| AT-06 Time | Provide Live, Pause and Replay, a selectable interval and playback speed. Show retained coverage per layer; unavailable historical layers are hidden or labelled outside the selected time. |
| AT-07 Media | Discover cameras, radio and TV by origin/coverage, language and category. Open one or multiple players beside the map; detach into an internal pane, mute, stop or open the source page. |
| AT-08 Areas | Draw/edit bounding boxes and polygons; save named areas; measure distance/area; query within an area or a stated radius of a selected/entered point. Show distance units, filters, location uncertainty and result completeness. Handle the antimeridian without selecting the wrong hemisphere. Radius searches remain available through numeric input and table results. Route-corridor search is OPTIONAL. |
| AT-09 Compare | Open two ATLAS panes. Explicitly link or unlink selection, area and time independently; compare locations or periods without overwriting the other pane. |
| AT-10 Results | Sort/filter a virtualised table; synchronise selection with the canvas. Counts identify returned, visible and truncated results. Support a list-only workflow. |
| AT-11 Collect | Save bookmarks and named collections of entity/observation references, short plain-text notes and saved views. Provide distinct Save reference and Save permitted snapshot actions. Show whether supporting content is retained, external-only, expired or unavailable. Preserve reference identity across source corrections; a bookmark alone does not preserve data. |
| AT-12 Import/export | Preview and import GeoJSON, coordinate CSV and a documented media-directory JSON format. Export selected permitted data as GeoJSON/CSV and workspace configuration, saved queries, areas and collections/notes as versioned JSON for reimport. Preserve reference/provenance metadata and identify snapshots or assets not included; exclude secrets. Configuration export is not a backup. |
| AT-13 Solar context | For a selected observer location and pane time, calculate sun azimuth/elevation, sunrise/sunset, twilight and day/night state locally. Show a sun-direction overlay and numeric alternative; allow an explicit object height for modelled flat-ground shadow direction/length. Preserve observer and tool settings per pane/workspace. |
| AT-14 Saved queries | Create, name, edit, duplicate, delete and explicitly rerun reusable query definitions independently of a workspace. Preserve source scope, typed filters, spatial criteria and fixed or relative time semantics. Show effective bounds and completeness for each run. Restoring/importing a query does not execute it; running one does not create a monitor or recording. Provider lookups require an explicit user-started run. |

### Domain behaviour

| Layer family | Required information and behaviour |
| --- | --- |
| Aircraft | Position, ICAO identifier, callsign, altitude, speed, heading and observation age when supplied; aircraft filters and recorded trails. Do not infer route, operator or passenger identity from absence of data. |
| Vessels | Position, MMSI, name, type, navigation status, course/speed and supplied voyage fields. Mark manually reported destination/ETA as reported data. |
| Space | Catalog ID, name, orbital-element epoch, predicted position, ground track and selected-object pass prediction for an observer location. Label propagation and stop outside the configured validity window. |
| Public cameras | Location, operator, source URL, media type, capture time and availability. Distinguish a refreshed image, live video and recording. |
| Radio / TV | Station/channel identity, country/region, language, category, origin precision and playback options. Support origin, transmitter, broadcast-area and server-location roles separately. |
| Internet metadata | Known-IP lookup/import with source timestamp and supplied ports/hostnames; enrich through DS-21 with separately attributed approximate IP location. Show database date, location precision and supplied accuracy radius; a city centroid is never an exact device location. Preserve provider disagreements and keep unknown locations searchable off-map. Current geolocation does not establish historical location. No network scanning or device login. |
| Public transit / bikeshare | Vehicle or station identity, mode/operator, source observation time, retrieval age and supplied route/trip/availability fields. Preserve missing positions and feed gaps; do not present delayed playback or interpolation as a new observation. |
| Imagery / environment | Time-aware raster overlays, legend, acquisition/model time and opacity. Weather point inspection; earthquake points with magnitude, depth and source details. Active-fire points are satellite thermal-anomaly detections, not confirmed fires, and retain sensor, acquisition time, confidence and fire-radiative-power fields when supplied. |
| Regional aerial imagery | Dated orthophotography through DS-22 with footprint, acquisition date/interval, temporal precision, resolution, original CRS and transformation provenance. Offer available acquisitions for comparison; annual mosaics may contain different capture dates. Never invent a capture day or substitute the current mosaic for a missing historical period. |
| Official weather alerts | DS-23 warnings with issuing authority, affected area/zone, event type, severity, urgency, certainty and lifecycle times. Preserve updates and cancellations; show unknown geometry off-map rather than inventing a precise location. Alert status and source freshness are separate. |
| Air quality | DS-24 station/sensor measurements with pollutant, concentration, unit, averaging interval, observation age and available quality flags. Filter by pollutant and time; missing readings remain missing. Concentrations are not automatically an AQI, and different national AQI scales are not interchangeable. |
| Road incidents | DS-25 accidents, construction, restrictions and closures with supplied geometry, road/direction, schedule, status and revision time. Filter by type/status and retain regional coverage limits; incidents do not supply live vehicle positions. |
| Imagery discovery | DS-26 bounded area/date/collection searches with acquisition footprints, asset/band metadata, resolution and cloud metadata where supplied. Inspect and compare catalog results; explicitly select a supported asset for bounded rendering through the raster pipeline. Demonstrate one real acquisition on the map; unsupported or inaccessible assets retain inspectable metadata and an actionable unavailable state. Preserve lineage and deduplicate DS-22 assets. |
| Hazard catalog | DS-27 cross-hazard events with categories, source links, dated geometries and open/closed catalog status. Filter by area, category and time; retain temporal/location precision and unknowns. Catalog closure does not establish a hazard's physical end. Shared upstream reports are not independent corroboration. |
| Internet outages | DS-28 annotated outages and detected traffic anomalies with country/region/ASN scope, interval and attributed cause/supporting references. Filter by scope, time and record type; provide area and table views. Keep anomalies, annotated outages and provider service status distinct; no invented device locations or causes. |
| Launch events | Launch site, time window, status, vehicle, mission and supplied payload/stage/recovery details. Do not invent ascent telemetry; any illustrative trajectory is separately labelled predicted, reconstructed or demo. |
| Connectivity / RF | Distinguish public Wi-Fi availability, historical Wi-Fi radio observations, cellular antenna/site locations and mobile-coverage surfaces. Show source date, technology, provider, precision and observed/reported/modelled status. A site point never implies a coverage footprint; no scanning, connection attempts, credentials, packet content or client-device tracking. |
| Infrastructure / context | Airports, ports, transport, energy and telecom features from bounded online queries/imports. Supply maritime (harbours/seamarks/lighthouses), railway (tracks/stations), energy (power lines/substations/pipelines) and hiking (paths/routes) presets with filters and legends. Preserve OSM feature IDs across presets; repeated views of one feature are not independent corroboration. Infrastructure geometry proves neither live vehicle position nor current operating/access conditions. RSS/Atom headline cards with source links; map stories only with explicit or user-confirmed location evidence. |
| Solar context | Use a pinned, verified local calculation library such as [SunCalc](https://github.com/mourner/suncalc). Show UTC, azimuth in degrees clockwise from true north and elevation in degrees; optional local time is labelled with its timezone. Handle polar day/night and absent rise/set events. Shadows assume a vertical object of supplied height in metres on unobstructed flat ground; below-horizon or numerically unstable near-horizon results are unavailable with an explanation. Label output modelled (`predicted` evidence), preserve inputs/method version and distinguish calculation time from the modelled instant. Terrain/building shadows are OPTIONAL and require suitable geometry; current geometry cannot establish historical shadows or weather. |

Broadcast country/city knowledge uses an area or an explicitly labelled approximate marker. Never substitute a stream server’s IP location for editorial origin. Camera directories may describe places with no playable feed; the UI must communicate that distinction.

**Time semantics:** Pause freezes the displayed cursor while permitted collection continues. Replay filters observations by their source time; it does not reconstruct what an investigator knew at an earlier date. Show current-only metadata as current, and distinguish later corrections. Returning Live jumps to the latest available data, not an invented present position.

Solar calculations follow the pane cursor in Pause/Replay and current UTC in Live; they are derived results, not retained observations. Compute on demand without upstream calls. Area/time linking affects the solar tool only through explicitly linked context fields; an observer remains independently selected unless selection linking is enabled. Expose the calculation's supported date range and decline dates outside it.

## 4. VANTAGE framework responsibilities

| ID | Platform capability | Prototype boundary |
| --- | --- | --- |
| OS-01 Shell | App registry, launcher, active-app identity, commands, settings and notifications | ATLAS is the only required production app; no speculative launcher entries |
| OS-02 Workspaces | Create, rename, duplicate, restore and delete workspaces; pane layout and app state | Durable IDs, schema version, safe migrations and recoverable invalid state |
| OS-03 Shared context | Entity/evidence selection, area, time and pane linking | Explicit link groups; no implicit global pan/time changes |
| OS-04 Search/actions | Federated search-provider and action registries, reusable saved queries | Search current app records and saved items; no universal web crawler or implicit analytical monitoring |
| OS-05 Data services | Sources, catalog, entity lookup, observations, evidence/provenance resolution and bounded queries | Apps use service contracts; they do not query another app’s tables |
| OS-06 Connectors | Configuration, scheduler, subscriptions, cache, credentials and health | One coordinated upstream subscription/query per equivalent demand |
| OS-07 Persistence | Workspaces, collections/notes, areas, saved queries, snapshots, imported datasets, source config and recording; backup/restore | PostgreSQL/PostGIS plus local persistent file storage behind an interface; coordinated recovery under §§8/10 |
| OS-08 Operations | Background job progress/cancel, health panel and local structured logs | In-app notifications for jobs and source issues; no external messaging |
| OS-09 Optional AI | Register capabilities, credentials reference, explicit request, cancellation and result provenance | Core workflow runs unchanged with no provider configured |

### Architecture

```text
Browser: VANTAGE shell → app registry → ATLAS views
                  ↓ shared UI services / typed context events
             Versioned application API + data subscription channel
                  ↓
Backend: catalog / queries / storage / connector coordinator / jobs
                  ↓
         Provider adapters → public APIs, feeds, tiles and imports
```

Use a **modular monolith**: cohesive deployment, explicit internal modules and independently testable contracts. Background workers may share the backend process. A message broker, separate microservices and a graph database are not prerequisites.

- First-party apps are trusted registered modules. Registration supplies views and actions without ATLAS-specific branching in the shell.
- An app/view error is contained within its pane; the shell and other panes remain usable.
- High-frequency observation updates use the data subscription channel; the UI context bus carries user actions and shared state changes.
- Reuse a common data cache across panes. Dispose subscriptions and media when panes close; background recording continues only while explicitly enabled.
- Follow the approved stack, rendering and storage choices in [decision 0001](docs/decisions/0001-prototype-stack.md) and the Blueprint component choice in [decision 0002](docs/decisions/0002-blueprint-ui.md). Theme shared controls to DESIGN.md using its existing colours and CSS-variable tokens. Record material changes in short decision records against these requirements; implementation choices must not redefine the product scope.

## 5. Reference data connectors

Documentation checked **2026-09-21**. These are reference integration targets, not tested integrations or availability guarantees. Before enabling a connector, record its current endpoint, terms, attribution, quota and supported operations. Free service access, data licensing and open-source software are separate properties.

| ID / family | Reference source | Implementation constraint |
| --- | --- | --- |
| DS-01 Basemap / places | [OpenFreeMap](https://openfreemap.org/), bundled [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) | Free public tiles without a key; retain attribution. Natural Earth supplies the coarse offline basemap and place index, not street-address search. |
| DS-02 Aircraft | [ADSB.lol public API](https://www.adsb.lol/docs/open-data/api/) | Public API; ODbL data. Use documented public queries, not feeder-only access. Collection scope follows supported queries and fair use. |
| DS-03 Vessels | [AISStream](https://aisstream.io/) / [documentation](https://aisstream.io/documentation) | Free key; backend WebSocket only. Shared filtered subscription, compression and backoff. Provider does not durably replay missed events. |
| DS-04 Space | [CelesTrak GP](https://celestrak.org/NORAD/documentation/gp-data-formats.php) / [usage](https://celestrak.org/usage-policy.php) | Fetch explicit JSON/OMM; propagate locally with a verified SGP4 implementation. Cache elements; download no more than once per provider update, normally two hours. |
| DS-05 Cameras | [Fintraffic Digitraffic](https://www.digitraffic.fi/en/road-traffic/) / [terms](https://www.digitraffic.fi/en/terms-of-service/) | Public road-weather camera metadata/images; CC BY attribution. Reference coverage is Finland; refreshed snapshots are not live video. |
| DS-06 Radio | [Radio Browser](https://www.radio-browser.info/) / [API](https://docs.radio-browser.info/) | Free directory; nullable coordinates and independently failing streams. Follow its server discovery guidance; preserve station UUIDs. |
| DS-07 TV / news streams | [IPTV-org API](https://github.com/iptv-org/api) | Channel/stream metadata, country and broadcast area. Directory presence does not establish embedding rights or playback availability; prefer verified official public streams. |
| DS-08 Internet devices | [Shodan InternetDB](https://blog.shodan.io/introducing-the-internetdb-api/) | Keyless known-IP lookup, weekly data, free non-commercial service. It supplies neither a global device inventory nor geographic search. Commercial reuse requires a different entitlement/source. |
| DS-09 Imagery | [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/) | Public tiled imagery. Read capabilities for layer dates/projections; display acquisition time and product attribution. |
| DS-10 Weather | [Open-Meteo](https://open-meteo.com/) | Point weather/forecast; free hosted API is non-commercial and rate-limited. Attribute data and label model-derived values. |
| DS-11 Events | [USGS GeoJSON feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) | Earthquake feeds; cache according to update cadence. Source updates can revise prior events. |
| DS-12 Infrastructure | OSM via [Overpass](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) and local imports; context references: [OpenSeaMap](https://www.openseamap.org/index.php?L=1&id=quellen), [OpenRailwayMap](https://openrailwaymap.app/), [OpenInfraMap](https://openinframap.org/about) and [OpenHikingMap](https://openmaps.fr/map-legend/openhikingmap-legend.html) | Implement the maritime, rail, energy and hiking presets using explicit bounded feature queries with cache and OSM attribution. These references do not grant access to every hosted tile/third-party layer. Keep selectable features distinct from imagery. Never tile requests to harvest the planet from community servers. |
| DS-13 Media / headlines import | User-configured public-media manifest and RSS/Atom | Validate URLs, origin evidence and usage metadata. Import headline/excerpt/link; no automatic full-article scraping. |
| DS-14 Active fires | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/api/) | Free map key; bounded AOI/time requests with cache and clustering. Preserve sensor and acquisition fields and call records active-fire or thermal-anomaly detections, not confirmed fires. |
| DS-15 Public transit | Registered operator [GTFS-Realtime](https://gtfs.org/documentation/realtime/) feeds | Backend fetches only configured operator feeds and uses static GTFS when required for routes/stops. Preserve feed and vehicle timestamps, operator terms and incomplete coverage; begin with a small geographically diverse verified set. |
| DS-16 Bikeshare | Verified operator [GBFS](https://gbfs.org/documentation/reference/) feeds | Online station availability with operator-specific licence and attribution. Preserve `last_reported`, renting/returning state and feed version; begin with station-based systems and cap dense results. |
| DS-17 Launch events | [Launch Library 2](https://ll.thespacedevs.com/docs/) | Cache server-side within the anonymous allowance; an optional token may raise limits. The source supplies event/context metadata, not continuous ascent telemetry. |
| DS-18 Public Wi-Fi / RF observations | OSM public-hotspot features through DS-12; a bounded online wardriving-database API such as [WiGLE](https://wigle.net/) only after its current API terms and intended use are verified | Online queries only: the prototype does not import wardriving files or operate a scanner. Public-hotspot claims and historical radio observations are separate layers. Wi-Fi observations show age and precision and never imply current availability or permission to connect; no passwords, packet content or client-device identifiers. |
| DS-19 Cellular sites | [OpenCellID](https://docs.opencellid.org/docs/introduction), OSM telecom features through DS-12 and Denmark's [Mastedatabasen](https://datavejviser-indtastning.digst.govcloud.dk/dataset/mastedatabasen) | OpenCellID requires an access token and CC BY-SA attribution; use bounded online queries or coordinated provider snapshots, not user imports. Mastedatabasen exposes official CC0 APIs/WFS and existing/planned Danish antenna positions. Preserve source precision, last observation, operator/network identifiers and reported technologies such as GSM/EDGE, UMTS, LTE and NR. |
| DS-20 Mobile coverage | Official online coverage datasets, initially Denmark's [Tjekditnet mapping](https://digst.dk/tele/bredbaandsudrulning/bredbaandsdaekning/mobilkortlaegning/) and the US [FCC Broadband Data Collection](https://help.bdc.fcc.gov/hc/en-us/articles/43909220634651-How-to-Download-Mobile-Broadband-Coverage-Data-from-the-FCC-s-National-Broadband-Map-Step-by-Step-Instructions) | Coverage is provider-reported or modelled and region-specific, never derived from site points. Preserve provider, technology, indoor/outdoor basis, voice/data role, speed threshold, filing/effective date and methodology. Render large surfaces as tiled/level-of-detail overlays and keep measured performance separate. |
| DS-21 IP geolocation | [DB-IP Lite](https://db-ip.com/db/lite.php) city database; country/ASN datasets when needed | Monthly CSV/MMDB releases, CC BY 4.0 and visible DB-IP attribution. Backend downloads/validates a versioned database and performs bounded local IPv4/IPv6 lookups. Replace releases atomically, retain the last valid database on failure and expose stale/missing states. Store database date and lookup time separately; no exact device/person location or historical inference from current data. |
| DS-22 Regional aerial imagery | [USGS/USDA NAIP archive](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip) and [USGS NAIP imagery service](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer) | Start with one documented AOI in the conterminous US and actual dated acquisitions. Use bounded catalog/image requests and verified Cesium-compatible rendering; read acquisition metadata rather than treating service publication time as capture time. Historical coverage must be discovered, not assumed from the latest mosaic. Where needed, support operator-configured official archive assets through bounded ingestion/tiling jobs, not a general raster-upload feature. Preserve USGS/USDA credit, product terms, CRS and resolution; no paid imagery dependency. |
| DS-23 Official weather alerts | [NWS API](https://www.weather.gov/documentation/services-web-api) | Public US alerts with an identifying User-Agent, bounded requests, caching and rate-limit handling. Preserve CAP identifiers/references, issuing authority, severity/urgency/certainty and issue/effective/onset/expiry/update/cancellation semantics. Resolve supplied zone references when alert geometry is absent; retain unknown geometry if resolution fails. The recent-alert service is not an indefinite historical archive. |
| DS-24 Air quality | [OpenAQ v3](https://docs.openaq.org/) / [API key](https://docs.openaq.org/using-the-api/api-key) / [limits](https://docs.openaq.org/using-the-api/rate-limits) | Free account/key held on the backend. Bound AOI/time queries and pagination; honour quota headers and configurable limits (documented free tier: 60 requests/minute, 2,000/hour). Preserve original provider attribution/licence, station/sensor, pollutant, units, averaging interval, source time and supplied quality metadata. Coverage and operation permissions are provider-specific; no synthetic readings or automatic AQI conversion. |
| DS-25 Road incidents | [BC Open511 / DriveBC](https://api.open511.gov.bc.ca/help) | Public regional JSON/XML service under the Open Government Licence – British Columbia. Start with documented BC AOIs; bound requests and follow pagination. Preserve event IDs, revisions, points/lines/areas, road/direction, schedules and status. Disappearance from current results is not proof of an incident ending. |
| DS-26 Imagery discovery | [Element 84 Earth Search](https://element84.com/earth-search/) / [STAC catalog](https://earth-search.aws.element84.com/v1) | Bounded area/date/collection search for imagery acquisitions alongside DS-09/22. Preserve collection/item IDs, footprint, acquisition interval/precision, bands, resolution, cloud metadata and asset lineage; deduplicate shared NAIP acquisitions. Catalog results are not renderable tiles: verify collection-specific asset rights/access and budget COG reading, reprojection, tiling and cache storage separately. |
| DS-27 Hazard catalog | [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3) | Cross-hazard catalog alongside USGS/FIRMS. Preserve original source links, category, geometry dates and temporal precision; midnight placeholders must not imply exact timing. Catalog closure does not establish the physical end of a hazard. Link overlapping reports without treating them as independent corroboration. |
| DS-28 Internet outages | [Cloudflare Radar outages](https://developers.cloudflare.com/radar/investigate/outages/) / [traffic anomalies](https://developers.cloudflare.com/api/resources/radar/subresources/traffic_anomalies/methods/get/) | Backend-token connectivity context after quota and intended-use rights checks. Distinguish detected anomalies from annotated outages and provider status pages. Preserve country/region/ASN scope, time interval, supporting references and attributed cause/confidence; aggregate signals neither locate individual devices nor establish causes. |

All DS-01–DS-28 rows are part of the connector implementation scope; free-key connectors may be unconfigured at runtime. A named regional source establishes a working adapter, not worldwide coverage. Solar context is a required local calculation capability, not a network connector. Optional sources are listed separately in §13; the [source candidate review](docs/source-candidate-review.md) and [provider inventory assessment](docs/source-inventory-review-2026-09-21.md) record the evaluation rationale. The [complete provider inventory](docs/source-inventory-2026-09-21.md) is archival reference material, not additional implementation scope.

**Playback:** implement browser-supported audio/video, HLS when supported by the selected player, periodic images and approved provider embeds. Unsupported codec, CORS, mixed-content, geographic or embedding restrictions produce a specific unavailable state plus source link. Do not bypass restrictions through an unrestricted media proxy.

## 6. Shared data contract v1

Publish language-neutral JSON Schemas with the implementation. Required common fields remain small; domain-specific fields live in versioned, validated property schemas. These contracts do not prescribe a future universal ontology.

| Record | Minimum fields |
| --- | --- |
| Source | `id`, `name`, `connectorId`, `documentationUrl`, `termsUrl`, `attribution`, `capabilities`, `configurationSchema`, `credentialRef?` |
| Entity | `id`, `kind`, `label`, `externalIds[{namespace,value}]`, `schemaVersion` |
| Observation | `id`, `entityId`, `sourceId`, `observedAt?`, `retrievedAt`, `validFrom?`, `validTo?`, `geometry?`, `locationRole?`, `precision`, `evidenceClass`, `properties`, `provenance`, `schemaVersion` |
| Provenance | `sourceId`, `sourceRecordId?`, `sourceUrl`, `attribution`, `licenseRef?`, `rawRef?`, `derivedFrom[]`, `transformVersion?` |
| Layer | `id`, `kind`, `sourceIds`, `geometryTypes`, `filterSchema`, `styleRef`, `capabilities`, `coverage`, `freshnessPolicy` |
| Media resource | `id`, `entityId`, `sourceId`, `sourcePage`, `playbackMode`, `url?`, `mimeType?`, `capturedAt?`, `usageStatus` |
| Workspace | `id`, `name`, `revision`, `schemaVersion`, `panes[]`, `linkGroups[]`, `appStates`, `createdAt`, `updatedAt` |
| Collection / area | `id`, `name`, `revision`, `references[]` or `geometry`, optional `note`, `createdAt`, `updatedAt`, `schemaVersion` |
| Identity association | `id`, `entityId`, `sourceId`, `sourceRecordId?`, `ruleId`, `ruleVersion`, `supportingReferences[]`, `status`, `createdAt`, `schemaVersion` |
| Evidence reference | `id`, `targetKind`, `targetId`, `targetRevision?`, `provenance[]`, `createdAt`, `schemaVersion`; resolution returns retention and availability separately |
| Saved snapshot | `id`, `referenceIds[]`, `createdAt`, `permissionBasis`, versioned `manifest`, `schemaVersion`; manifest identifies preserved observation versions and any assets with size, media type and content hash/algorithm |
| Saved query | `id`, `name`, `revision`, `querySchemaVersion`, `sourceIds[]`, `executionScope`, `text?`, `kinds[]`, `filters`, `spatialFilter?`, `timeSpec`, `createdAt`, `updatedAt`, `schemaVersion` |

Rules:

1. IDs are stable opaque strings. External identifiers are namespaced; callsigns, names, MMSIs and IPs are not universal permanent identity guarantees. Cross-source merging requires an inspectable identity association with the rule/version and supporting records; preserve conflicting observations. Association status distinguishes `candidate`, `associated` and `rejected`; ambiguous matches stay candidates. Retain superseded decisions and their basis subject to source retention rules. Identity association is not a relationship between separate entities. Manual merge/reversal tools and a general relationship model are OPTIONAL.
2. Use UTC ISO-8601 instants, explicit units and WGS84 GeoJSON longitude/latitude. Store altitude separately with metres and its reference (barometric, ellipsoid, etc.). Unknown timestamps/coordinates are null, never fabricated or zero-filled.
3. `evidenceClass`: `observed | reported | predicted | inferred | demo`. Confidence, if supplied, records its source/method; it is not a universal truth score.
4. `precision` identifies point/city/region/country/unknown and optional numeric accuracy. Geometry does not imply exactness. Location role distinguishes physical asset, editorial origin, transmitter, coverage and server.
5. Repeated observations are idempotently deduplicated using provider IDs plus revision/content identity or a documented canonical hash. Corrections receive a new immutable observation ID and link to the version they correct or supersede; ordinary new observations append without being treated as corrections, and identical deliveries do not create new versions. Late arrivals must not overwrite newer current state. `provenance` embeds the provenance object above; raw content is optional and subject to source policy. A reference to an earlier observation never silently resolves to its replacement; expiration leaves an inspectable unavailable reference. An entity reference may resolve current entity details and is labelled accordingly.
6. Dynamic positions are observations, not mutable identity fields. History queries return actual available intervals, gaps and truncation metadata.
7. Publish domain property schemas for IP enrichment (`databaseDate`, `lookedUpAt`, provider location/precision and optional accuracy radius), aerial imagery (asset ID, acquisition date/interval and precision, footprint, resolution and CRS), and saved solar results (observer, modelled UTC instant, object height/assumptions, method/version and outputs). Date-only acquisitions stay date-only properties; leave `observedAt` null when an exact source instant is unknown. Solar results use `predicted` with calculation provenance; IP locations are provider estimates (`inferred`), not observed device coordinates.
8. Publish alert and road-incident property schemas with stable provider IDs, revision/reference relationships, original status, normalized lifecycle state, issued/updated/effective/onset/expiry times where supplied, schedules and original geometry/zone references. Preserve source distinctions between cancellation, expiry and confirmed end. Later corrections retain earlier versions; absence from a current feed only establishes absence from that result set. Use validity/schedule intervals for time filtering and show when retained revisions cannot establish historical state. Official warnings and incident reports use `reported` evidence, not measured occurrence claims.
9. Publish air-quality properties for station/sensor ID, pollutant/quantity, value, unit, averaging interval and available quality flags. Measurement time differs from retrieval time; unavailable readings are null. Preserve original units and provenance for any explicit conversion. Measured and modelled/derived products carry their respective evidence classes; a station point does not establish area-wide conditions.
10. Publish versioned domain property schemas for DS-26 imagery discovery, DS-27 hazard catalogs and DS-28 internet outages. Optional §13 adapters also inherit these contracts. Imagery discovery preserves collection/item identity, asset/band metadata, footprint, acquisition precision and processing lineage. Hazard reports preserve original publisher/document references and event-time/location precision; catalog closure does not prove physical termination. Outage/indicator records preserve geographic or ASN scope, interval, method and attributed cause/confidence. Shared upstream reports remain shared lineage, not independent corroboration; aggregate records do not acquire invented point locations.
11. Combined inspection resolves each displayed source-derived fact to observation IDs and property paths, including its evidence class. Explain any preferred value through a named display rule; alternatives remain inspectable. History distinguishes source updates, corrections, operator annotation revisions and derived assessments, with origin, time and supporting references. Store annotation history separately from provider facts. This is inspectable lineage; enterprise auditing and reconstructing everything known at a past date remain outside scope. Source reliability, identity uncertainty, location precision and assessment confidence remain distinct.
12. Evidence resolution reports `retention: reference_only | snapshot` and `availability: available | expired | unavailable | unsupported`, with a reason when unresolved. External-only content is not labelled retained. Snapshots include the actual permitted version, original source/retrieval times, precision and transformation lineage; assets resolve through the storage interface. A hash detects content change, not truth. Retention rules still apply; retain permitted reference metadata when underlying evidence must be removed.
13. Saved queries store criteria, not a result collection or snapshot. `executionScope` is `local | provider`; source IDs and supported capabilities remain explicit. `timeSpec` is `unbounded`, `fixed` with UTC bounds, or `relative` with a positive duration ending at run start. Unbounded time still obeys query/resource limits. Resolve relative bounds once per run; pagination uses those same bounds. Return a run descriptor containing query ID/revision when saved, start time, effective time bounds, actual source scope and completeness. Unsupported historical operations or unavailable sources remain visible, never silently converted to current lookups. Saving, restoring or importing criteria does not grant new source access.

## 7. App, context and API contracts v1

### App registration

An app manifest MUST declare `id`, `name`, `version`, `platformApiVersion`, `entryView`, `stateSchemaVersion`, `acceptedEntityKinds`, `actions` and `searchProviders`.

The host provides lifecycle hooks equivalent to `mount`, `activate`, `deactivate`, `serializeState`, `restoreState`, `dispose`. Host services expose navigation, query/subscription, context, persistence, commands and notifications. Apps receive credential handles only; server-side adapters own secrets. Unsupported major versions disable that module with a readable explanation.

### Shared context

```json
{
  "schemaVersion": 1,
  "workspaceId": "workspace-1",
  "paneId": "atlas-left",
  "selection": { "entityIds": [], "observationIds": [] },
  "area": null,
  "time": { "mode": "live", "cursor": null, "from": null, "to": null },
  "layerIds": [],
  "filters": {},
  "linkGroupId": null
}
```

- `area` is null or a GeoJSON Polygon/MultiPolygon. Time mode is `live | paused | replay`; non-live modes require a cursor, and replay requires bounds.
- `context.changed.v1` contains `eventId`, `originPaneId`, `linkGroupId`, `revision`, `changedFields`, `context`, `causationId?`. Only subscribed fields propagate; track monotonic revisions per originating pane and ignore previously applied events to prevent feedback loops.
- Actions declare `id`, `label`, accepted kinds and required capabilities; invocation supplies references plus context. Unsupported actions are hidden or explain why unavailable.
- Closing one pane cannot stop another pane’s data or mutate its unlinked context.

### Application boundary

Expose equivalent versioned operations through the approved REST/OpenAPI and SignalR stack; concrete route syntax remains an implementation choice.

| Operation | Contract |
| --- | --- |
| Discover apps/layers/actions/sources | Return registered capabilities, versions, configuration requirements and health |
| Search/query | Input text, kinds, source IDs, execution scope, spatial/time criteria and typed filters; output records, cursor, returned/total-known counts, completeness and run descriptor |
| Inspect / resolve evidence | Resolve entity plus requested observations, fact support, identity basis, history and provenance; distinguish current entity details from fixed evidence versions and return retention/availability |
| Subscribe | Input layer/area/filter demand; output initial snapshot followed by ordered batches of upserts/removals and health |
| Read history | Return observations plus available intervals, gaps, sampling policy and truncation |
| Save workspace/collection/area/query | Validate schema; use revision checks and conflict responses, not silent last-write overwrite; preserve references during export/reimport and do not execute restored queries |
| Save permitted snapshot | Validate operation rights/budget; preserve exact observation versions and permitted assets through a cancellable job; return manifest and evidence references |
| Import/export/record | Start cancellable job; return progress, validation results, artifact references and policy limits |

Every query is bounded and cancellable. Subscription batches include `subscriptionId`, `sequence`, `generatedAt` and completeness; reconnect uses a resume token if supported, otherwise a fresh snapshot with a reset marker. Removal from a viewport is not evidence that an object stopped existing. Errors use `code`, readable `message`, `retryable`, optional `retryAfter` and `sourceId`.

**Spatial queries:** `spatialFilter` is either an area with WGS84 Polygon/MultiPolygon geometry or `withinRadius` with centre `[longitude, latitude]` and positive finite `radiusMetres`, subject to documented size/result limits. Radius membership uses geodesic distance on WGS84, including the boundary. A displayed circle approximation must not replace the authoritative centre/radius calculation. Use documented geometry predicates for lines/areas. Location uncertainty must not yield an exact proximity claim: distinguish definite matches from possible matches where supplied uncertainty overlaps the search, and unknown where it cannot be evaluated. Preserve that distinction in table/export results. Provider bounding-box lookups may supply candidates followed by local filtering; expose truncation or incomplete upstream coverage.

Radius parameters belong to query/pane state and saved queries; the shared `area` context remains Polygon/MultiPolygon. Any derived area passed to another pane is labelled an approximation and cannot silently become an exact radius query. Applying a saved query changes only the receiving pane and explicitly linked context fields.

## 8. Connector execution and storage

- Each adapter declares supported modes (`catalog`, `poll`, `stream`, `history`, `tiles`, `lookup`), spatial/time coverage, credentials, quotas and attribution. Record query/display/embed/cache/record/export/redistribution permissions per dataset/product; unsupported or unverified operations remain unavailable. Website access and client-software licensing do not establish data permissions.
- Coordinator validates configuration, caches equivalent demand, applies per-source budgets, cancels obsolete work and uses exponential backoff with jitter. Honour `Retry-After`; authentication/permission errors require correction rather than endless retry.
- Preserve a last successful result separately from connection health. `healthy`, `degraded`, `offline`, `rate_limited`, `setup_required`, `disabled` and `error` are distinct states.
- Source timestamps drive freshness. Poll cadence and stale thresholds are connector-specific and visible in settings. A successful HTTP response does not make old data fresh.
- Persist user-created workspaces, areas, notes and their revisions, collections and saved queries until deletion. Bookmarks and identity support remain resolvable as expired/unavailable references after underlying observations expire, retaining only metadata allowed by source policy. Deleting a collection or query does not delete shared observations or independently saved snapshots.
- Recording is explicit per source/AOI and limited to permitted data. Proposed defaults: retain up to 24 hours or 2 GiB, whichever is reached first; evict oldest unpinned observations and expose the retained interval.
- Explicit saved snapshots use a separate 500 MiB default budget; warn before the limit and stop saving rather than silently deleting them. These are configurable prototype defaults, not provider promises.
- No continuous camera/audio/video recording is required. A media URL is a reference, not archived evidence. Store binary content only through an explicit permitted snapshot operation.
- Import preview reports row/field errors and coordinate order; reject invalid files without partial workspace corruption. Files and exports carry source/licence metadata and schema version.
- Store geolocation databases and raster assets behind the storage interface with versioned metadata. Validate downloads before activation, bound conversion/cache storage and keep large rasters out of ordinary observation rows. Expose dataset storage budgets separately from the observation recording limit; only explicit permitted snapshots enter the snapshot budget. Reprojections and derived tiles retain source lineage.

**Backup and restore:** document a coordinated procedure for database state, persistent binary assets and their linking metadata, including user work, saved evidence, imports and non-secret configuration. Stopping writers during backup is acceptable for the single-operator prototype. Record application/schema versions, backup time, included assets and integrity hashes in a manifest; identify rebuildable caches and deliberate exclusions. Restore to a clean installation of a documented compatible version, validate references/assets and then apply supported migrations. Report missing/corrupt assets or incompatible versions explicitly instead of claiming complete recovery. Recovery verification must not depend on optional providers being available.

Exclude credential values from backup artifacts as well as exports; document separate operator-managed secret recovery/reprovisioning and show setup-required for unresolved credential references. Specify how source retention restrictions apply to backups. Deletion removes active data according to its documented scope; copies may remain in older operator-held backups until those backups expire or are deleted, and restoration may reintroduce them. Document that behaviour without promising forensic erasure. Backup retention/storage is separate from recording, snapshot and cache budgets.

## 9. Optional AI integration boundary

The prototype MUST expose capabilities such as `summarizeSelection`, `classifyRecords` and `rankResults`; it MUST NOT assume every provider implements all capabilities. A deterministic mock adapter verifies the boundary and is visibly labelled demo. Live adapters are OPTIONAL and never required to use ATLAS.

- A future OpenAI adapter can summarise selected records with citations. The user previews scope and explicitly starts any paid request; no background billable calls.
- [TypeSafe Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) is a candidate for typed classification/scoring, not free-text summaries. Typed output still requires factual validation.
- Request contract: capability, selected references, supplied content, requested output schema, provider/model selection and budget. Response: output, citations, provider/model, generation time, usage if available and errors.
- Derived results remain separate from observations; store input references and provenance. Source content is data, not instructions. AI output never silently changes an entity, executes a command or becomes verified evidence.

## 10. Reliability, security and performance

| Area | Required outcome |
| --- | --- |
| Credentials | Backend secret store or protected environment; redact logs; never include keys in client state, share links or exports |
| External content | Validate/sanitise imported text; sandbox approved embeds; validate outbound destinations and redirects to prevent arbitrary proxying into private networks |
| Data boundaries | Consume intended public sources and user-authorised files. Device, Wi-Fi and cellular metadata does not grant permission to access a device, network or private camera; ATLAS performs no RF scanning, packet capture or connection attempts |
| Provider failure | One failed/slow connector cannot block shell, saved data or other layers; show actionable health and retry state |
| Offline | Open saved configuration and available cached/demo data; never label cached content live |
| Recovery | A documented coordinated database/file backup restores user work and permitted evidence on a clean installation; validate versions and integrity, identify missing assets, and recover optional-source configuration without requiring provider access |
| Observability | Per-source request/error/quota/lag counters and redacted logs; no third-party telemetry by default |
| Accessibility | Meet [DESIGN.md](DESIGN.md), including keyboard/list alternatives, focus, contrast, zoom and reduced motion |
| Resource bounds | Query limits, clustering, list virtualisation, batched updates and a visible media concurrency cap; start with four video players and one audible stream |

**Performance acceptance targets** on a documented four-core/16 GiB development machine, current Chromium, 1920×1080: interactive shell within 3 seconds from a warm local start; cached search p95 under 500 ms; selection-to-cached-inspector p95 under 200 ms; at least 30 fps panning with 10,000 clustered test features and 100 observation updates/second. Benchmark recorded fixtures, not upstream latency; report hardware and achieved values. These are targets to validate, not measured results.

## 11. Acceptance scenarios

| ID | Scenario and pass condition |
| --- | --- |
| AC-01 Start | Fresh install opens VANTAGE/ATLAS with no paid credentials. Demo mode and keyless real sources work; missing free keys show setup instructions. |
| AC-02 App framework | A test-only registered app/action receives selection, area and time without changing shell/ATLAS code. Unregister/dispose leaves no dangling listeners. |
| AC-03 Air/sea | Configure sources, inspect moving records and source times, follow a track, interrupt the feed and reconnect without invented movement or duplicate records. Validate AIS live with a free test key. |
| AC-04 Space | Validate propagation against independent reference vectors; show element epoch, predictions, pass times and invalid/stale-element behaviour. |
| AC-05 Media | Locate and play permitted radio/video/image examples; exercise two players, stop/mute and unavailable-stream fallback. City/country-only origins remain visibly approximate. |
| AC-06 Time | Record a bounded area, pause, replay and return live. Timeline gaps, expired intervals and live-only layers are explicit; no present-day data masquerades as historical. |
| AC-07 Compare | Link two panes, then unlink time; changes propagate only for still-linked fields without event loops or duplicate upstream demand. |
| AC-08 Save/restore | Save a workspace, collection and area; restart and restore. Export/reimport configuration without secrets; missing sources degrade gracefully. |
| AC-09 Context layers | Query imagery dates, weather, earthquakes, active-fire detections, launch events and transit/bikeshare. Exercise all four DS-12 presets in documented AOIs, inspect provenance and deduplicate shared OSM features. Compare two real dated DS-22 acquisitions for one AOI; verify footprint, date precision, resolution and unavailable-period handling. Validate solar outputs against independent reference values with documented tolerances, including polar day/night, below-horizon and near-horizon cases, offline operation, workspace restoration and linked/unlinked pane time. Import an RSS item with unknown location without fabricating a map pin. For DS-23, verify update/cancellation references, expiry, late revisions, zone resolution failure and unavailable historical state. For DS-24, verify pollutant/unit/averaging distinctions, quality flags, missing/stale readings and quota/setup handling without fabricated AQI. For DS-25, verify pagination, scheduled closures, revisions and disappearance from current results without falsely ending events. For DS-26, perform bounded spatial/temporal catalog search, inspect footprint/acquisition metadata, render one permitted real asset, verify unsupported-asset and cancellation/storage-bound states, and deduplicate shared DS-22 assets. For DS-27, verify category/time filtering, original source lineage, imprecise timestamps, catalog closure and overlapping reports without false corroboration. Exercise map/list selection, filters, pane time and workspace restoration for DS-23–27. |
| AC-10 Devices / connectivity | Look up/import a known public IP and enrich it with DS-21. Verify IPv4/IPv6, missing/stale database, failed refresh retaining the last valid release, unknown location, approximate city location, provider conflict and historical-time handling. Query online public-Wi-Fi, RF, cellular-site and mobile-coverage sources; distinguish historical Wi-Fi observations, antenna points and reported/modelled coverage, with technology, source date and precision. For DS-28, query annotated outages and traffic anomalies, preserve scope/time/supporting references and distinguish the two record types from provider status. Verify unknown cause, missing history, token/quota failure and map/table selection without fabricated device locations; restore filters and pane time. No scan, connection attempt, exact IP-derived device marker or invented coverage occurs. |
| AC-11 Failure/bounds | Exercise quota, malformed input, late/out-of-order updates, connection loss, cancellation, history eviction and stale workspace revision. Preserve user data and report the outcome. |
| AC-12 Quality | Pass visual/accessibility review, contract tests, performance targets and outbound-URL/secret-handling checks. AI-off operation produces no provider calls. |
| AC-13 Evidence | Two sources disagree about an attribute: both assertions, the preferred display rule and identity rule/version/support are inspectable. An ambiguous identity remains a candidate. Save a reference and permitted snapshot, then apply a correction and expire the original recording: the saved reference never changes target, retained evidence remains available where permitted, and unavailable support is explicit. Distinguish annotation history and derived assessments from source revisions; verify asset hashes without presenting them as truth verification. |
| AC-14 Saved queries | Save fixed and relative queries, restart and export/reimport them with collections/notes. Criteria and references survive without executing a lookup. Explicit runs preserve fixed bounds or resolve relative bounds once, including pagination, and expose effective scope/completeness. Exercise query revision conflicts, cancellation, missing sources and unsupported history. No monitor/recording starts, a rerun does not replace collection contents, and unlinked pane state is preserved. |
| AC-15 Radius | Verify inside/on/outside-boundary cases against independent geodesic reference values, including antimeridian and high-latitude cases. Test invalid/oversized radii, points/lines/areas, supplied uncertainty, unknown locations and truncated provider candidates without claiming exact proximity or full coverage. Numeric/list-only input, saved-query restoration and pane linking retain the documented semantics. |
| AC-16 Recovery | Back up deterministic user work, observation versions, identity support, notes, queries, workspaces, areas, imports and permitted snapshot assets; restore onto a clean compatible installation and compare records, references and hashes. Exercise missing optional sources/credentials, incompatible schema and missing/corrupt assets with explicit outcomes. Check secret exclusion and documented deletion/older-backup behaviour. Record the actual backup/restore commands and result. |

Each reference connector needs a small live smoke check with recorded date, configuration and result, plus deterministic fixtures for repeatable tests. Tests must not depend on public feeds staying online. A blocked provider is recorded as a release limitation or replaced by an equivalent verified free source; a mocked success is not a live integration pass.

## 12. Implementation sequence and completion

1. **Contracts and shell:** apply the approved stack decisions; implement schemas including evidence references, identity associations, snapshots and saved queries, registry, workspace persistence, layout and test app/action harness. Validate the themed Blueprint sidebar, inspector, results table and overlays in both themes as defined in DESIGN.md and decision 0002.
2. **Vertical slice:** keyless aircraft + inspectable provenance/identity basis + inspector + table + shared subscriptions. Prove the complete UI/backend/storage path.
3. **Observatory breadth:** implement remaining reference connectors and all domain views, with setup/health/failure states.
4. **Working environment:** areas/radius search, saved queries, comparison including dated aerial imagery, local solar context, bounded recording/replay, collections/snapshots, imports/exports, coordinated backup/restore and optional-AI boundary.
5. **Verification:** run AC-01–16, document source limitations, setup and recovery steps, resource budgets and measured results.

These are build stages, not separate scope reductions. Completion requires the entire included boundary, reproducible setup, schema/API documentation, passing acceptance evidence and a portfolio demonstration that clearly separates real integrations, historical data, predictions and fixtures.

## 13. Optional source candidates

These candidates are **OPTIONAL**, outside the completion gate and disabled until implemented and configured. Before adoption, verify current access, intended-use licence, quotas, schemas and operation permissions; record live smoke checks separately from fixtures. Use existing source, lookup and action contracts rather than adding speculative app entries.

| Candidate | Intended capability and constraints |
| --- | --- |
| [Global Fishing Watch](https://api-doc.globalfishingwatch.org/our-apis/documentation/) | Token-based vessel identity and historical activity enrichment. Current API use is non-commercial. Preserve dataset/version, temporal coverage and registry versus AIS claims; label apparent fishing/derived events inferred. Complements DS-03; does not replace live AIS or establish illegality. |
| [openAIP](https://github.com/openAIP/openaip-api-documentation) | Aeronautical reference features alongside aircraft observations. Verify live API entitlement, data licence and quota before implementation; these were not established by the review. Preserve airspace validity, altitude units/references and provenance; not certified navigation data. |
| [Deutsche Bahn APIs](https://data.deutschebahn.com/opendata) | Regional station, timetable and facility-status enrichment through current DB API Marketplace products. The former open-data portal moved; choose actual current services and terms. Timetable-derived positions are predictions, not measured train locations. |
| [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/), [RDW](https://opendata.rdw.nl/en/) and [AutoRef EU](https://www.autoref.eu/en/api-overview/docs) | Explicit identifier lookups for vehicle specifications/registration context. Start with vPIC's US-market scope or RDW's non-sensitive Dutch records; AutoRef requires separately verified key/access terms. No inferred owner identity or current vehicle location; manufacturing plant and registration jurisdiction remain distinct facts. |
| [OFAC Sanctions List Service](https://ofac.treasury.gov/sanctions-list-service), [OpenSanctions](https://www.opensanctions.org/docs/commercial/exemption/) | User-started evidence lookup against versioned lists. Preserve authority, list/record identifiers, effective dates and match rationale. Name matches remain candidates, not confirmed identity or compliance decisions. OpenSanctions data/API/commercial entitlements differ; full screening is deferred. |
| [Danish cadastral data](https://datafordeler.dk/dataoversigt/matriklen-mat/matriklen2/) | Regional parcel/building context after verifying current service/schema and access. Ownership/title/transaction workflows remain deferred and require separate entitlement; parcel access does not establish owner-data access. |
| [OpenHikingMap hosted tiles](https://openmaps.fr/tile-usage-policy.html) and other specialist map services | Optional imagery beyond required DS-12 features. Honour host attribution, usage limits and no-bulk/prefetch rules. [openrailwaymap.app tile policy](https://github.com/hiddewie/OpenRailwayMap-vector/blob/master/USAGE.md) requires public access without registration; do not assume compatibility with local/private deployment. OpenSeaMap third-party overlays and OpenInfraMap vector tiles require separate rights/format checks. |
| [IP2Location](https://www.ip2location.com/licensing), [MaxMind GeoLite](https://www.maxmind.com/en/geolite-free-ip-geolocation-data) | Alternatives to DS-21, not required parallel providers. Verify edition-specific attribution, refresh/deletion and export/redistribution obligations; preserve disagreements instead of silently selecting a precise location. |

Additional cameras such as Explore.org, EarthCam or OpenCCTV may enter DS-13 only after original operator, location and playback rights are verified. [EarthCam requires licensing for embedding](https://www.earthcam.com/faq.php); default to a source-page link. SeeAllTheThings is a discovery aid, not a bulk feed. Insecam is excluded as a bundled source without independently established operator publication rights. OpenWiFiMap remains under evaluation; [beaconDB](https://beacondb.net/) is a positioning service, not an established AOI inventory replacement for DS-18.

Paid tracking/history vendors, Track-Trace and unresolved provider names remain deferred or external references as documented in the [review](docs/source-candidate-review.md). Their presence in that review does not introduce a required integration or permit scraping consumer interfaces.

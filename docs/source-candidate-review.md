# ATLAS source candidate review

Reviewed 2026-09-21 against [PROTOTYPE_SPEC.md v0.3](../PROTOTYPE_SPEC.md), [DESIGN.md](../DESIGN.md) and the [approved stack](decisions/0001-prototype-stack.md).

This records the review against v0.3. Its recommended additions were adopted into [specification v0.4](../PROTOTYPE_SPEC.md) on 2026-09-21: required solar context, expanded DS-12 presets, DS-21 DB-IP and DS-22 regional aerial imagery; remaining candidates are optional/deferred under §13. The specification governs current scope. Provider documentation and public pages were reviewed; no authenticated API, playback, quota or Cesium integration was tested. “Unverified” means this review did not establish a usable integration, not that a provider necessarily lacks one. Published prices and terms can change.

## Recommended direction

The list mixes live observations, contextual maps, identifier lookups, analytical tools and consumer websites. Treating all of them as equivalent map feeds would produce misleading results and unnecessary connectors.

Prioritise:

1. **Solar context:** local sun position, daylight/twilight and an explicitly modelled shadow-direction tool tied to each pane's time cursor.
2. **Richer infrastructure presets:** maritime features, railways, power, pipelines and hiking paths through the existing bounded OSM connector. Named map projects are useful references; their hosted tiles have separate conditions.
3. **Approximate IP geolocation:** one provider initially, preferably DB-IP Lite for a simple local database integration. This fills a practical gap beside InternetDB, which does not itself supply location.
4. **Dated regional orthophotography:** a valuable extension of imagery and comparison, after choosing one actual dataset with suitable access, dates, licence and projection. Do not promise a global historical-aerial archive.

Evaluate **Global Fishing Watch** and **openAIP** next. Keep vehicle records, sanctions, property ownership and parcel tracking outside the initial completion gate; they need lookup and evidence workflows beyond adding a map layer.

## What the specification already covers

| Candidate area | Existing requirement | Consequence |
| --- | --- | --- |
| Aircraft and vessels | DS-02 ADSB.lol, DS-03 AISStream; AT-05; AC-03 | Another live tracking vendor is an alternative or optional enrichment, not a missing domain. |
| Satellite tracking | DS-04 CelesTrak, local SGP4 propagation, ground tracks and observer pass predictions; AC-04 | Already explicitly required. Predictions must retain element epoch and validity limits. |
| Rail/transit | DS-12 OSM infrastructure and DS-15 operator GTFS-Realtime | Distinguish infrastructure, timetable events and measured vehicle positions. |
| Wireless | DS-18 WiGLE candidate; DS-19 OpenCellID/official sites; DS-20 coverage | Already broad. Additional providers must add a distinct capability. |
| Cameras | DS-05 Digitraffic and DS-13 media manifests; EarthCam already named as an expansion candidate | Prioritise intentionally published, permitted sources with working playback. |
| Historical imagery | DS-09 time-aware GIBS; AT-06/09 | Dated high-resolution regional aerial imagery would add value; it is not guaranteed by GIBS coverage. |

All §5 rows currently count toward completion. New evaluation candidates should not simply be appended to that table unless they are deliberately made mandatory.

## Marine records

| Entry | Recommendation | Evidence and practical fit |
| --- | --- | --- |
| Vessel Tracker / Vesseltracker | Optional contracted provider | Assuming vesseltracker.com: it advertises tailored API/data services. No generally available free API entitlement was established. Potential value is vessel particulars and commercial history; keep AISStream as the free baseline. [Provider data services](https://www.vesseltracker.com/de/products/dataServices.html). |
| Ship AIS | Hold / external reference | Assuming shipais.com: the site could not be retrieved in this review, and a current supported API, licence and quota were not established. “AIS” alone names a technology, not a data-access agreement. Do not build around an assumed endpoint. |
| OpenSeaMap | Add maritime context through DS-12 | Useful seamarks, lighthouses, harbours and related features. Its chart combines OSM and several other sources, so chart access is not blanket reuse permission for every overlay or its AIS display. Start with bounded OSM feature queries; evaluate raster seamark tiles separately. [Source breakdown](https://www.openseamap.org/index.php?L=1&id=quellen). |
| Vessel Finder / VesselFinder | Optional paid adapter | A documented JSON/XML API exists, with purchased credits and subscriptions. Vessel details and port calls could enrich an inspector, but a free public website or trial does not satisfy permanent free operation. [API and pricing](https://api.vesselfinder.com/docs/). |
| Global Fishing Watch | Strong optional addition | Token-based APIs supply vessel identity, activity and analytical context. The current portal limits API use to non-commercial purposes. Particularly useful for historical maritime research; do not substitute it for the live AIS feed. Label apparent fishing activity and derived events as inference, preserve dataset versions and actual temporal coverage. [API documentation](https://api-doc.globalfishingwatch.org/our-apis/documentation/), [vessel identity API](https://api-doc.globalfishingwatch.org/our-apis/documentation/docs/v3/vessels). |

## Rail, space and shipment tracking

| Entry | Recommendation | Evidence and practical fit |
| --- | --- | --- |
| OpenRailwayMap | Add rail context; qualify hosted services | Stations, tracks and infrastructure fit DS-12. They do not locate live trains. The current openrailwaymap.app service has a documented search API, but its tile policy requires third-party applications to be public and accessible without registration. That is not clearly compatible with ATLAS's local-only default; use OSM features, self-hosted rendering or separately agreed tiles. This finding applies to that host, not automatically every OpenRailwayMap deployment. [API](https://openrailwaymap.app/api.html), [host policy](https://github.com/hiddewie/OpenRailwayMap-vector/blob/master/USAGE.md). |
| Deutsche Bahn Open-Data-Portal | Conditional regional addition | The old portal moved: datasets are now directed to Mobilithek, GovData and OpenData ÖPNV; APIs remain in DB API Marketplace. StaDa station metadata, timetables and facility status could be useful. Select an actual API with its own registration/quota/terms. Timetable delays are not measured train coordinates; any interpolated movement needs prediction styling. [Official migration and API overview](https://data.deutschebahn.com/opendata). |
| Satellite Tracking | Keep existing scope | Already covered by DS-04 and AC-04. Retaining historical element sets could improve replay later; today's elements must not be propagated arbitrarily far backward and presented as historical observations. No extra tracking website is needed merely to satisfy this category. |
| Track-Trace | External lookup; defer connector | A directory of carrier-specific shipment lookup forms and links, rather than an open geographic movement feed. Public pages do not establish a reusable common API. Future shipment work should use authorised carrier APIs, supplied tracking references and milestone events; a depot scan is not a continuous parcel location. [Track-Trace](https://www.track-trace.com/). |

## Aviation

| Entry | Recommendation | Evidence and practical fit |
| --- | --- | --- |
| Flightradar24 | Optional paid enrichment | Official API supports live/historical positions and richer flight context, but uses a separate paid subscription and credits. Explorer was listed at USD 9/month with a 20-item response limit when checked. Keep ADSB.lol as baseline. [API plans](https://fr24api.flightradar24.com/subscriptions-and-credits). |
| World Aeronautical Database | Unresolved / do not commit | If this means worldaerodata.com, the site could not be retrieved and current provenance, freshness and machine access were not established. If it is simply a description of openAIP, collapse the duplicate. Airport/reference data is distinct from flight tracking. |
| ADS-B Exchange | Optional paid alternative | Its Developer Hub currently lists the personal/community API at USD 10/month for 10,000 requests; commercial use has separate enterprise arrangements. “Community” does not mean a free baseline API. [Developer Hub](https://www.adsbexchange.com/community/developer-hub/). |
| ads-b.nl | External reference | The site is an aircraft-tracking interface; this review did not establish a supported public API and data-reuse entitlement. Do not scrape its UI as a replacement for DS-02. [Website](https://www.ads-b.nl/). |
| openAIP | High-value conditional addition | Aeronautical reference context is a useful complement to aircraft positions. An official API documentation project exists, but the live site/schema were inaccessible to this research tool, so current access, data licence and quota remain unverified here. Confirm these before adding an adapter. Preserve altitude units/references and validity for airspace information; do not treat the layer as certified navigation data. [Official API documentation repository](https://github.com/openAIP/openaip-api-documentation). |

## Vehicle records

These are mostly **identifier lookups**, not vehicle-location sources. Manufacturing plant, registration jurisdiction, damage-report location and a vehicle's current location must be different facts. A decoded VIN supplies no location observation.

| Entry | Recommendation | Evidence and practical fit |
| --- | --- | --- |
| MyAccident traffic accident map | Prefer an official crash dataset | Geographic crash history could fit an events layer, but report coverage and reusable API rights were not established. MyAccident describes its report collection; that is not evidence of an open feed. Use a selected transport authority's geocoded data if this capability is wanted. [Provider data description](https://myaccident.org/our-accident-reports). |
| NHTSA Vehicle API | Best initial vehicle lookup candidate, optional | vPIC has a documented public API and downloadable databases for manufacturer/VIN specifications. Coverage focuses on vehicles intended for US sale/import; it is not an ownership or accident-history database. Cache and bound calls. [API](https://vpic.nhtsa.dot.gov/api/), [coverage](https://vpic.nhtsa.dot.gov/). |
| FindByPlate | Defer | Official documentation describes a paid API, while another official page says it is temporarily disabled. Operational access needs confirmation. User-submitted images/comments need their own evidence treatment. [API instructions](https://findbyplate.com/page/api-instructions/), [availability notice](https://findbyplate.com/page/license-plate-search-api/). |
| carVertical VIN Decoder | External lookup / optional business integration | Consumer VIN tools do not establish a free history-data feed. Business API solutions are advertised; an appropriate contract would be needed before adopting that route. [Provider API statement](https://www.carvertical.com/fr/help/pour-les-clients-societes-de-leasing/existe-t-il-des-solutions-particulieres-pour-les-societes-de-leasing). |
| autoDNA VIN Lookup | External lookup / optional partner integration | Offers partner WebAPI and vehicle-history products. No general free API entitlement was established; this is not a baseline location feed. [Partner programme](https://www.autodna.com/company/partners-area). |
| VinDecodr | Resolve name; likely duplicate | The identifiable `vindecodr` package wraps NHTSA's API in R. If that is the intended entry, it adds no independent source and does not justify an R service in the approved stack. If a different website is intended, its URL is needed. [Package description](https://github.com/cran/vindecodr/blob/master/DESCRIPTION). |
| AutoRef (EU) | Conditional optional lookup | autoref.eu documents VIN, EU type-approval and Swiss type-approval lookups with an API key obtained by contacting the provider. Relevant European specifications, but free API quotas and redistribution permissions were not established. [API documentation](https://www.autoref.eu/en/api-overview/docs). |
| CarNet.ai | Defer to optional image-analysis capability | Recognises vehicle make/model/generation from images; it is not a VIN/history registry. It advertises conditional free plans and contact-based API access. If used, require an explicit user-started request and label output inferred with model/source provenance. [Product and FAQ](https://carnet.ai/). |
| Finnik (NL) | Prefer direct RDW open data | Finnik's site presented a browser-check page, so its integration terms remain unverified. RDW itself publishes non-sensitive vehicle-registration and inspection datasets. Evaluate those directly for a Netherlands adapter; neither implies owner identity or current vehicle location. [RDW open-data portal](https://opendata.rdw.nl/en/). |

## IP geolocation

Recommend **one** approximate-location enrichment provider, with source/database date and visible uncertainty. Keep provider assertions separate from InternetDB observations, preserve disagreement and never turn a city centroid into an exact device marker. A current database lookup does not establish an IP's historical location.

| Entry | Recommendation | Evidence and practical fit |
| --- | --- | --- |
| IP2Location.com | Viable alternative | A LITE edition is available with reduced accuracy; licensing differs across LITE, commercial databases and API services. Select one specific edition and verify distribution/export conditions. [Edition comparison](https://lite.ip2location.com/edition-comparison), [licensing](https://www.ip2location.com/licensing). |
| DB-IP | Preferred first candidate | Lite country/city/ASN databases have monthly releases in CSV/MMDB and CC BY 4.0 attribution. Local lookup avoids sending each researched IP to an external API. Lite coverage/accuracy is explicitly reduced. [Downloads and licence](https://db-ip.com/db/lite.php). |
| IP Location Finder | Unresolved / likely redundant | A generic product label used by multiple websites, not an identified provider. Require the exact URL before assessing its API and upstream data. Do not add a second wrapper around the same database without a demonstrated benefit. |
| MaxMind | Good alternative with lifecycle obligations | GeoLite is free, but its EULA includes attribution, keeping databases current, deleting old database versions and restrictions on locating people/households/street addresses. Account/download setup and snapshot/export handling need design review. Accuracy-radius support is useful. [GeoLite](https://www.maxmind.com/en/geolite-free-ip-geolocation-data), [licence obligations](https://support.maxmind.com/knowledge-base/articles/who-is-covered-by-the-geolite-end-user-license-agreement). |

## Wireless and connectivity

| Entry | Recommendation | Evidence and practical fit |
| --- | --- | --- |
| OpenCellID | Already included; refine expectations | Current docs give 1,000 request credits/user/day and CC BY-SA 4.0. Area lookup is limited to 4 km² and defaults to small paginated results; coordinated snapshots are more suitable for large AOIs. Cell observations/estimated locations are not necessarily surveyed mast coordinates or coverage footprints. [Limits](https://docs.opencellid.org/docs/getting-started/access-and-limits), [area-query guidance](https://wiki.opencellid.org/docs/help/troubleshooting), [licence](https://docs.opencellid.org/docs/introduction). |
| WiGLE | Already a conditional DS-18 target | Its individual licence is for personal/research/educational non-commercial use and restricts providing data access to third parties. Use operator credentials, verify API quotas and recording/export permissions, and keep historical RF observations separate from public-hotspot availability. [EULA](https://wigle.net/eula.html). |
| OpenSignal / Opensignal | Defer / external reports | Current offering centres on network-experience analytics and reports. This review did not establish a current unrestricted free coverage API. Measured performance would complement DS-20, but needs an actual licensed dataset and methodology. [Provider](https://www.opensignal.com/). |
| AntennaSearch | External reference | A US tower/antenna search site. A supported reusable API was not established. Useful for manual checking; an official registry dataset is a better connector target once selected and verified. Structures, antennas, radio licences and cellular coverage are distinct. [Provider description](https://www.antennasearch.com/). |
| beaconDB | Watchlist; not a WiGLE replacement | Its public API estimates location from supplied radio observations and can fall back to cell/IP estimates. It does not establish an AOI inventory endpoint for ATLAS. The project calls itself experimental and says downloadable dumps are not yet available. Its positioning use case also does not justify introducing RF scanning, which the spec excludes. [API and limitations](https://beacondb.net/). |

## Webcams

| Entry | Recommendation | Evidence and practical fit |
| --- | --- | --- |
| SeeAllTheThings | Discovery leads only | A small GitHub link collection, not a supported global feed API. Its README says its sources include transport authorities, tourism sites and Insecam. Re-verify each original operator, location, freshness and playback permission; do not import the collection wholesale. [Repository](https://github.com/baywolf88/seeallthethings). |
| Insecam | Exclude as a bundled source | This review could not verify current owner-authorised publication or reusable integration rights. Reachability and directory inclusion do not satisfy the specification's intended-public-source requirement. A camera independently published by its operator can be considered through that operator, without depending on Insecam. |
| EarthCam | Link out unless licensed | Its FAQ directs app/website embedding requests to licensing, and its linking policy prohibits embedding live images or framing site pages. Support a source-page link; add an embed only for a specifically permitted stream and mode. [FAQ](https://www.earthcam.com/faq.php), [linking policy](https://www.earthcam.com/site/linktous.php). |

## Additional domains and map tools

| Entry | Recommendation | Evidence and practical fit |
| --- | --- | --- |
| Property Records | Split physical geography from ownership | Parcels, buildings and addresses fit ATLAS as jurisdiction-specific context. Ownership, title documents and transactions require distinct access and evidence workflows. Denmark is a sensible candidate, but Datafordeler has service-specific setup and restricted-register access; a parcel map does not establish public owner access. Select a current service and schema before committing. [Matriklen service overview](https://datafordeler.dk/dataoversigt/matriklen-mat/matriklen2/), [restricted access](https://datafordeler.dk/vejledning/brugeradgang/anmodning-om-adgang/). |
| Historical Aerials | Add capability conditionally; avoid assuming a free vendor API | If this means NETRonline Historic Aerials, its site terms restrict reuse/display of content; use external links unless separately licensed. For the broader capability, evaluate official dated orthophoto services and USGS archives. Raw scanned frames may require georeferencing/orthorectification, so start with already georeferenced imagery. [Historic Aerials terms](https://www.historicaerials.com/terms), [USGS aerial archive](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-aerial-photo-single-frames). |
| Sanction Screening | Optional evidence lookup; defer full screening | Useful alongside vessels/organisations, but a name match is a candidate match, not confirmed identity or a compliance decision. OFAC has official downloadable lists. OpenSanctions adds aggregation/matching but distinguishes non-commercial data use, API access and commercial licensing. Preserve issuing authority, list ID, identifiers, effective dates, retrieved version and match rationale; do not imply a record's address is the subject's current location. [OFAC SLS](https://ofac.treasury.gov/sanctions-list-service), [OpenSanctions access/licensing](https://www.opensanctions.org/docs/commercial/exemption/). |
| SunCalc-like sun/shadows | Highest-priority new tool | Compute sun azimuth/elevation, sunrise/sunset, twilight and day/night context locally for an observer and pane time. SunCalc provides astronomical calculations; Cesium supplies scene shadow controls. Neither supplies historical building geometry or weather. Simple shadow direction/length can use an explicit user-supplied height and flat-ground assumption; terrain/building shadows need suitable geometry. Label results modelled/predicted. [SunCalc](https://github.com/mourner/suncalc), [Cesium Viewer](https://cesium.com/learn/cesiumjs/ref-doc/Viewer.html). |
| OpenInfrastructureMap / OpenInfraMap | Add presets within DS-12 | The project explicitly derives displayed infrastructure from OSM and recommends Overpass for small extracts. Reuse the existing connector for power lines, substations, pipelines, telecom and other selected features. Its hosted vector rendering is not automatically a Cesium imagery source or an unrestricted tile service. Map presence does not establish current operational status. [Source/access explanation](https://openinframap.org/about). |
| OpenHikingMap | Optional terrain/path context | The name is ambiguous: openhikingmap.com is parked; OpenMaps.fr provides an active OpenHikingMap service. Its hosted PNG tiles allow limited non-commercial use with attribution, prohibit bulk/prefetch and have no SLA. Useful optional background, or use bounded OSM trail/route features for selectable records. This does not add routing or prove current access/trail conditions. [Host policy](https://openmaps.fr/tile-usage-policy.html), [legend](https://openmaps.fr/map-legend/openhikingmap-legend.html). |

## Adopted specification changes

The following recommendations were applied in specification v0.4. DS-22 now names the [USGS NAIP imagery service](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer) and [NAIP archive](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip): their public documentation identifies dated orthoimagery, acquisition metadata and free public-domain downloads. Runtime date selection and Cesium integration still require verification.

1. **Extend §3 with solar context.** Bind calculations to pane time and observer location. Show UTC plus optional local time, north-referenced azimuth, elevation and daylight state. Handle polar day/night and below-horizon sun. Provide numeric/list output and a no-geometry fallback. Test independently known positions and linked/unlinked pane behaviour. Treat realistic 3D shadows as optional until free geometry coverage and performance are demonstrated.
2. **Make DS-12 presets explicit.** Define small bounded maritime, rail, energy and hiking queries, legends and source tags. Avoid duplicate OSM records masquerading as independent corroboration. A raster overlay cannot by itself supply selectable objects.
3. **Add one IP-geolocation enrichment contract.** Store database/provider date, location role, precision and accuracy radius when supplied; retain source-specific conflicts. Current lookups cannot overwrite historical location evidence. Adopt explicit database refresh and export policies.
4. **Extend imagery requirements with one dated regional orthophoto source.** Record footprint, acquisition date or interval, resolution, CRS and transformations. Do not invent a capture day for an annual mosaic or offer years the source lacks. Keep high-volume raster processing outside ordinary observation tables.
5. **Keep an optional-candidate register outside §5.** Put GFW, openAIP, DB APIs, vehicle lookup and sanctions here until their intended use, access and acceptance checks are settled. Existing capability/action contracts can host lookups; no new production app is required merely for a lookup.

For every adopted source, distinguish permission to **query, display, embed, cache, record, export and redistribute**. The specification already calls for these controls; implement them per dataset/product rather than assuming a provider-wide permission. A public website, open-source client and openly licensed dataset are three different things.

## Verification boundaries

- Reviewed all entries in the supplied list against existing scope and public provider/project documentation where accessible.
- Identified specific unknowns for ShipAIS, World Aeronautical Database, openAIP live terms/schema, Finnik and the generic IP Location Finder name. Failed page retrieval is not evidence that a service is permanently unavailable.
- No API credentials were used, accounts created, paid services enabled or source content imported. No connector is certified by this review.
- Specification v0.4 and DESIGN.md now include the adopted scope, with expanded AC-09/AC-10 checks and a separate optional register. Integration smoke checks, actual response schemas, CORS/media compatibility, Cesium format support and sustained quota behaviour remain implementation work.

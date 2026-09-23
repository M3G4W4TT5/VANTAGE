# Gotham and Gotham Europa — public capability inventory

Research snapshot: 2026-09-23. This is a reference about **Palantir's described product**, not a VANTAGE specification, feature decision, implementation plan, or verification of a customer deployment. The earlier [Gotham/VANTAGE assessment](gotham-capability-review-2026-09-21.md) records recommendations separately. The [reference index](../design/reference/README.md) locates the original screenshots.

## Evidence and interpretation

| Label | Evidence | What it can establish |
| --- | --- | --- |
| **Vendor description** | Palantir's public [2024 G-Cloud 14 service definition][s1] (physical PDF pages cited below), [Gotham API documentation][s2], and [Europa page][s3] | Features and contracts described by Palantir at the cited time; not availability, entitlement, measured performance, or effectiveness in every installation. |
| **Screenshot visible** | The [16 earlier software screenshots](../design/reference/README.md#primary-software-screenshots) and [14 Europa screenshots](<../design/reference/Gotham Europa Info/>) supplied by the user | Visible controls, labels, arrangements, and example outputs; not working interactions, synchronization, model accuracy, or security enforcement. Capture dates are not release dates. |
| **Independent context** | The [POL-INTEL research article][s4] | Organizational customization of an ontology and its practical consequences; not a current Gotham feature list. |

The 2024 service definition describes an offering and also says that other sensitive applications are omitted. Its feature list is therefore **neither a universal installed-app list nor an exhaustive Gotham catalog**. Palantir describes Gotham as incorporating Foundry capabilities; a Foundry feature should not be attributed to every Gotham installation solely because the products can interoperate. Some public API endpoints are marked beta or preview. [S1, pp. 3–5][s1] · [API index][s2]

## Platform and data model

| Area | Documented capability | Evidence |
| --- | --- | --- |
| Shared workspace | A browser or desktop workspace opens multiple application instances over shared data. An object or artifact can move between Graph, Gaia, Dossier, and other tools. | [S1, pp. 3, 5][s1] |
| Integration | Structured and unstructured data, streaming sources, and media can be integrated; Palantir describes Foundry-backed import/export. External systems can also remain federated and searchable. | [S1, pp. 3–5][s1] |
| Dynamic ontology / RevDB | Typed objects, properties, and relationships model concepts such as people, places, documents, and events. API objects have a primary key, type, property arrays, and optional intrinsic coordinates and time interval. | [S1, p. 4][s1] · [API object][a1] |
| Links and identity resolution | The API can create typed links and resolve records from different source systems that refer to one entity. Resolution metadata identifies canonical and constituent objects. Unresolve preserves their independent histories. | [API links][a2] · [API resolution][a3] |
| Multiple sources for a fact | A property may be supplied by multiple sources. The property-update API refuses an ambiguous multi-source write by default unless the caller explicitly applies it to all sources. | [API property update][a4] |
| Federated search | A configured external source exposes a name, namespaces, and allowed query shapes. Results can be handled like object records for reading, but the API says federated objects are read-only. | [API federation][a5] |
| Geotemporal data | Geotime defines an **observation** at a place and time, a **track** as observations of one entity over time, static versus changing properties, and an Observation Spec schema. The API lists latest/history searches, writes, subscriptions, and track/object linking; this API area is marked beta. | [API observation concepts][a6] · [API index][s2] |
| Search and aggregates | Object search supports typed filters, keyword, comparison, Boolean combinations, polygon containment, and pagination. The applications add cross-source search, facets, charts, timelines, drill-down, and searches around a selected object. | [API search][a7] · [S1, pp. 5, 7, 12–13][s1] |
| Provenance, access, audit | The service definition says data remains tied to its source, restrictions can apply to individual attributes, and user/admin activity is audited. Derived and shared artifacts are described as subject to the same security model. These are vendor claims, not independently tested guarantees here. | [S1, pp. 4–5, 17–18][s1] |
| Extensibility | OAuth 2.0 HTTP/JSON REST APIs expose Gotham resources. The service definition describes integration with external applications/models and open-format export. A separate Defense Ontology SDK is mentioned, with availability to be confirmed through Palantir. | [API introduction][s2] · [S1, pp. 4–5][s1] |
| Deployment and operations | The service definition describes support for cloud/hybrid deployments, onboarding, training, backup/recovery, and data extraction/off-boarding. These are service/deployment claims, not analytical app features. | [S1, pp. 16–23][s1] |

**Important distinction:** RevDB objects and links, Geotime observations and tracks, external federated records, and saved application artifacts are separately documented concepts. The sources do not disclose a complete internal architecture or guarantee that every application uses the same persistence path. The [POL-INTEL study][s4], based on a particular deployment, is additional reason not to assume one fixed ontology across customers.

## Named analytical and collaboration applications

These names and functions are from the 2024 service definition. Page references are physical PDF pages. They describe product capabilities, without establishing present-day packaging or licensing. [S1, pp. 5–15][s1]

| Application | Described work |
| --- | --- |
| **Browser** | Search integrated and federated sources; inspect objects, properties, relationships, notes, metadata, and change history; edit permitted properties and open an object from another app. [S1, p. 5][s1] |
| **Custom Object Views** | Configurable, object-specific tabs and widgets in Browser; different views for teams/workflows, with permission-restricted sections. [S1, pp. 6–7][s1] |
| **Object Explorer** | Filter and aggregate large object sets; inspect charts, histograms, timelines, trends, and relationships; subscribe to condition-based object alerts. [S1, p. 7][s1] |
| **Graph** | Explore linked entities on a canvas; search around records, inspect property statistics, annotate/style networks, use temporal views, and export interactive HTML analyses. [S1, pp. 11–13][s1] |
| **Gaia** | Combine data on a shared map; use spatial and temporal searches (including radius, route, and polygon), geotag records, create heatmaps, and work with GIS layers and overlays. A documented map artifact has a nested layer hierarchy; map API operations include adding objects, artifacts, and annotations, plus KMZ/WFS exchange. Some map endpoints are beta/preview. [S1, pp. 13–14][s1] · [API map][a8] |
| **Video** | Inspect live/archived full-motion video, annotate and tag entities, overlay geospatial intelligence and model detections, and extract frames/clips for further work. This exceeds ordinary video playback. [S1, pp. 14–15][s1] |
| **Dossier** | Collaboratively write notes, profiles, and reports with linked objects, maps, graphs, sourced excerpts, attachments, templates, and Word/PDF export. Embedded data may update with its source. [S1, pp. 10–11][s1] |
| **Slides** | Build collaborative, data-linked briefings from templates, reuse clips from other apps, and export PPTX/PDF. [S1, pp. 9–10][s1] |
| **Chat** | Send messages, files, objects, and artifacts in channels with platform permissions and classification controls; the service definition also describes bridges to external messaging systems. [S1, p. 8][s1] |
| **Inbox** | Triage persistent notifications from saved searches, watched objects, geofences, and shared artifacts; follow alerts back to the relevant application. [S1, p. 9][s1] |

The current API index also documents **Target Workbench** resources such as targets and stage-based target boards. That is a separate military workflow, not a generic investigative app or a VANTAGE feature decision. The 2024 service definition explicitly says some sensitive operational apps are not listed. [API index][s2] · [S1, p. 5][s1]

## Gotham Europa descriptions

Palantir presents Europa as a Gotham evolution rather than a clearly separate product with a published, exhaustive app catalog. Its [Europa page][s3] and the locally saved [page text](<../design/reference/Gotham Europa Info/gotham_europa_notes.txt>) describe:

- **Collaboration:** synchronous work using Gotham artifacts through Dossier, Chat, and Slides; browser users working with desktop-workspace users.
- **Multimodal ML:** applying models to sensor data, satellite imagery, audio, text, and full-motion video, with support for third-party model integration. Vendor claims about processing scale are not independently verified here.
- **Video intelligence:** live-video overlays with Gotham data and AI detections, backed by what the vendor calls a high-scale spatiotemporal system.
- **Audio:** review, transcription, translation, and entity extraction within an audio module.
- **Infrastructure choices:** the current page describes hybrid hosting, data/infrastructure sovereignty controls, and use of local AI vendors; exact deployment requirements and availability are not public in the reviewed material.

The 2024 service definition already says the Gotham Workspace is browser-accessible. Europa's page emphasizes browser/desktop collaboration; it does **not** establish that browser access first appeared with Europa. [S1, p. 5][s1] · [Europa][s3]

## What the supplied screenshots show

The [earlier 16-image set](../design/reference/README.md#primary-software-screenshots) visibly covers globe/object lists, selected-object inspection, asset timelines, spatial overlays, a layer tree and sources, object/area search, a workflow board, satellite filters, and simulation panels. These are UI observations only. The individual originals and attribution are in the [reference index](../design/reference/README.md).

The additional Europa images are linked individually below. Descriptions follow the [existing inspection record](atlas-workspace-change-record-2026-09-22.md#15-evidence-and-reference-limits); they do not assert hidden behavior.

| Screenshot | Visible pattern or example |
| --- | --- |
| [10:06:46](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-06-46.png>) | Map/reference card inside a conversation. |
| [10:07:00](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-07-00.png>) | Searchable artifact library with metadata and previews, including maps, sheets, decks, videos, and AI taskings. |
| [10:08:06](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-08-06.png>) and [10:08:11](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-08-11.png>) | Map layers/sources/tools, annotations, and related clips. |
| [10:08:21](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-08-21.png>) | Map clip reused in a presentation with a return-to-source affordance. |
| [10:09:05](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-09-05.png>) | Processing/model lineage diagram. The image alone does not establish that this is a core Gotham graph-analysis app rather than adjacent ML tooling. |
| [10:10:00](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-10-00.png>) | Simulation inputs, spatial results, and time coverage. |
| [10:10:47](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-10-47.png>), [10:11:12](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-11-12.png>), and [10:11:36](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-11-36.png>) | Image-region note, detection filters, multi-source timeline, and imagery-age cue. |
| [10:12:36](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-12-36.png>) | Grouped spatial tools and an annotation destination. |
| [10:12:46](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-12-46.png>) | Archived video with detection boxes and report overlay. |
| [10:14:15](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-14-15.png>) | Audio transcript and inspectable model information, including language/translation and confidence-related fields. |
| [10:14:37](<../design/reference/Gotham Europa Info/Screenshot From 2026-09-22 10-14-37.png>) | Browser-delivered interface and explicit notional/demo-data labeling. |

## Unknown or installation-specific

- Which named apps and Europa features are available together, licensed, enabled, or current in any particular installation.
- The complete internal storage and synchronization design, data limits, recovery guarantees, latency, and how cross-app permissions are enforced in practice.
- Precise model identity, evaluation, accuracy, human-review defaults, and real-world processing throughput for Europa AI features.
- Exact behavior of controls visible only in still images, including keyboard access, collaboration latency, and whether demo outputs were generated live.
- The degree to which Foundry capabilities, third-party integrations, and Defense Ontology SDK access are included in a given Gotham deployment.

These gaps should remain questions during later VANTAGE feature selection; vendor claims and screenshot inferences should not silently turn into VANTAGE requirements.

## Source register

- **S1:** [Palantir Platform: Gotham — G-Cloud 14 service definition][s1], copyright 2024, publicly hosted November-uploaded PDF, 24 physical pages. This is distinct from the May-named copy discussed in the [2026-09-21 review](gotham-capability-review-2026-09-21.md). Reviewed for this inventory 2026-09-23.
- **S2:** [Gotham API index][s2] and linked endpoint documentation, checked 2026-09-23. The site exposes version 1.0 and 2.0 pages; check each endpoint's version and beta/preview status before relying on it.
- **S3:** [Palantir Gotham Europa][s3], rendered page checked during the 2026-09-22/23 research; the supplied text is preserved [locally](<../design/reference/Gotham Europa Info/gotham_europa_notes.txt>). The plain-text crawler does not expose all rendered page content.
- **S4:** [*A world of Palantir: Ontological politics in the Danish police's POL-INTEL*][s4], independent research on one organization; useful context for customization, not product-wide technical documentation.
- **Local observations:** [reference index](../design/reference/README.md) and [2026-09-22 inspection record](atlas-workspace-change-record-2026-09-22.md#15-evidence-and-reference-limits).

[s1]: https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/documents/92736/801146272055049-service-definition-document-2024-11-26-1253.pdf
[s2]: https://www.palantir.com/docs/gotham/api
[s3]: https://www.palantir.com/platforms/gotham/europa/
[s4]: https://researcher.itu.dk/p/en/research-outputs/a-world-of-palantir-ontological-politics-in-the-danish-polices-po
[a1]: https://www.palantir.com/docs/gotham/api/revdb-resources/objects/get-object
[a2]: https://www.palantir.com/docs/gotham/api/v1/revdb-resources/objects/create-object-link
[a3]: https://www.palantir.com/docs/gotham/api/v1/revdb-resources/resolution/resolution-basics
[a4]: https://www.palantir.com/docs/gotham/api/revdb-resources/objects/update-object-property
[a5]: https://www.palantir.com/docs/gotham/api/v1/revdb-resources/federated-sources/federated-source-basics
[a6]: https://www.palantir.com/docs/gotham/api/v1/geotime-resources/observations/observation-basics
[a7]: https://www.palantir.com/docs/gotham/api/revdb-resources/objects/search-objects
[a8]: https://www.palantir.com/docs/gotham/api/map-resources/maps/load-map

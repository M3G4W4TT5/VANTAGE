# VANTAGE — Ecosystem brief

> Exploratory direction · 2026-09-21. This file is not a roadmap or an implementation contract.

## Intent

**VANTAGE** is an open-source intelligence operating environment: a coherent workspace for finding, inspecting, connecting and explaining publicly available information. Potential users include investigative journalists, public-interest researchers, missing-person investigation teams and financial analysts.

The near-term commitment is **ATLAS + the VANTAGE framework**, defined in [PROTOTYPE_SPEC.md](PROTOTYPE_SPEC.md). Visual guidance lives in [DESIGN.md](DESIGN.md).

VANTAGE should support a continuous research workflow: discover relevant information, inspect its provenance, collect references, compare explanations, develop findings and produce cited outputs. New evidence can send the operator back to an earlier question. Observations, operator annotations and derived assessments remain distinguishable throughout.

## Basis for app boundaries and names

Define each capability through an operator task, an established method, comparable tools and an inspectable result. Choose a permanent app name after the workflow and boundary are understood. ATLAS retains its established name; future categories below use descriptive working labels.

The earlier names were illustrative placeholders, without a documented method or tool mapping. Retire that proposed app list, including COMPASS, whose navigational meaning overlaps ATLAS. This does not remove the underlying research directions. A capability may become a shared view, a feature in an existing app or a separate app; a category is not a launcher entry.

The [Gotham capability review](docs/gotham-capability-review-2026-09-21.md) supplies the initial comparison. The public 2024 [Gotham service definition][gotham] also describes Browser, Object Explorer, Graph, Gaia, Dossier, Slides, Inbox and Video. These are useful workflow references, not a requirement to reproduce their packaging or a statement about current product availability. Methods and non-Palantir references below provide an independent basis for VANTAGE's proposed capabilities.

## Capability categories

The Gotham column identifies comparable surfaces in that service definition. The proposed behaviour and examples are VANTAGE design judgments, not claims that Gotham or the other tools implement the same workflow.

| Category / operator question | Gotham reference | Method and practical tool reference | Proposed VANTAGE capability and example |
| --- | --- | --- | --- |
| **Search and object exploration:** what information is available, and what does this record represent? | Browser; Object Explorer (pp. 5–7) | Information retrieval, faceted exploration and cross-referencing; [OCCRP Aleph][aleph] | Search source records and saved work, inspect one entity, refine a result set and save criteria or references. Later, add aggregations with a stated counting unit and drill-down. Example: compare infrastructure records from two sources without assuming name matches establish identity. |
| **Geospatial analysis — ATLAS:** where and when was something observed? | Gaia (pp. 13–14) | GIS spatial predicates and temporal layers; [QGIS spatial queries][qgis-spatial] and [temporal controls][qgis-time] | Maps/globe, layers, area/radius queries, imagery comparison and recorded movement. Example: inspect dated thermal detections near transport infrastructure, with precision and coverage visible. This remains the only specified production app. |
| **Relationship analysis:** how are these entities connected, and what supports each connection? | Graph (pp. 11–13) | Link analysis and, where justified, network analysis; [i2 Analyst's Notebook][i2] | Typed, directed relationships with supporting references, applicable time, origin and review status. Start with lists and one-hop expansion. Example: follow an organisation–asset relationship supported by an authorised public record. A graph canvas follows useful relationship data; centrality is not evidential confidence. |
| **Timeline and event analysis:** what happened in what order? | Temporal tools within Graph, Object Explorer and Gaia; no separate timeline app asserted | Event chronology and temporal comparison; [i2 Analyst's Notebook][i2] | Compare events, observations, intervals and source revisions, including uncertain times and gaps. Example: compare an incident report, imagery acquisition and subsequent closure notice. Start as coordinated views inside ATLAS or an investigation; sequence alone does not establish causation. |
| **Investigations and evidence:** which explanation is supported, contradicted or unresolved? | Dossier (pp. 10–11) | Source evaluation, key-assumptions checks and Analysis of Competing Hypotheses (ACH); [Tradecraft Primer][tradecraft]. Collection, preservation and verification practice: [Berkeley Protocol][berkeley] | A research question, notes, alternative explanations, findings, supporting/contradicting evidence and unresolved leads. Begin with a lean Markdown desk and stable references. Example: compare explanations for apparent disruption without turning a nearby detection into proof of damage. Structured techniques guide review; they do not generate an objective truth score. |
| **Reports and briefings:** how can someone inspect and understand the finding? | Dossier; Slides (pp. 9–11) | Citation-based synthesis and annotation-to-source navigation; [Zotero's reader and notes][zotero] | A written output with selected findings, citations, relevant map/timeline context and caveats. Distinguish a working draft from an issued version. Begin inside the investigation workflow; a presentation editor or separate reporting app needs demonstrated demand. |
| **Monitoring and inbox:** what changed that warrants review? | Inbox; Object Explorer alerts (pp. 7, 9) | Indicators/signposts of change; [Tradecraft Primer][tradecraft] | Explicit rules over saved queries, objects or areas; an inbox links each event to its triggering evidence, rule version and coverage. Example: surface a new official closure report for a watched area. A rule match prompts review; it does not establish the operator's hypothesis. |
| **Media examination:** what does this image, recording or broadcast actually support? | Video (pp. 14–15) | Source verification, temporal/spatial corroboration and documented handling; [Berkeley Protocol][berkeley] | Permitted timecoded notes, still frames, annotations and source comparison. Example: compare a supplied image with dated imagery while recording uncertainty about capture time. Playback remains in ATLAS; capture and analysis require a separate ingestion/rights specification. Public broadcast/RF context does not imply interception or private communications analysis. |

## Shared capabilities and specialist directions

- **Object inspection and evidence resolution** are reusable platform surfaces. Individual-record inspection and bulk exploration have different interaction needs but share entity, observation and provenance services. Operator annotations do not overwrite provider assertions.
- **Sources, ingestion and preservation** extend the existing connector and storage services. A dedicated management interface needs an operator workflow beyond configuration and health. Keep source references, permitted snapshots, temporary caches and operational backups distinct.
- **Infrastructure, maritime, rail, aviation and remote sensing** begin as datasets, filters and domain tools within the relevant categories. A specialist data family alone does not justify another app.
- **Forecasting and scenarios** remain a later analytical direction. Define the question, method, assumptions, validation and uncertainty before considering a separate tool; indicators may be more useful than a numeric forecast.
- **Collaboration, chat, enterprise permissions and military tasking** remain outside the prototype. The presence of an equivalent Gotham tool does not establish a VANTAGE user need.

## Shared research concepts

These are conceptual distinctions for future specifications, not a new universal ontology.

| Concept | Meaning |
| --- | --- |
| Saved query | Criteria to run again against available data, with explicit source scope and fixed or relative time semantics. It preserves neither results nor an ongoing monitor. |
| Collection | Selected references and short notes; it does not promise that referenced content is retained. |
| Snapshot | An explicit, permitted preserved version of selected data and its provenance. A content hash can identify alteration, not establish truth. |
| Identity association | The documented basis for treating source records as referring to the same entity; distinct from a relationship between separate entities. |
| Relationship | An attributed assertion connecting entities, with type/direction, applicable time and supporting references. Source reports and operator hypotheses remain distinguishable. |
| Finding | A versioned analytical statement with its reasoning, supporting/contradicting references, assumptions and unresolved questions. It does not replace source observations. |
| Investigation | A research question and the findings, evidence and leads developed to answer it. |
| Issued brief | A versioned output whose conclusions and evidence references do not silently change when live sources update. State what was retained and what remains external. |

## Proposed first experiment after ATLAS

Test one path: **select observations → collect references → add an attributed relationship or note → write a finding → export a cited brief**. This is an experiment, not a release order or a commitment to separate apps.

Use a public-source question such as whether available reports support transport disruption near a thermal-anomaly detection. Compare dated imagery and official incident reports, retain the actual source references, consider alternative explanations and export the finding with unresolved gaps. Nearby detections alone establish neither damage nor causation.

The experiment succeeds if another reader can trace the finding to the observations used, distinguish source reports from interpretation, inspect conflicting evidence and see what is unavailable. A source correction must remain discoverable without silently rewriting an issued conclusion. Validate the workflow before choosing permanent names or app boundaries.

## Prerequisites for later capabilities

- **Relationships:** a focused relation vocabulary, endpoint identity decisions, temporal validity and evidence resolution. Use bounded relational queries initially; no graph database or general ontology editor is implied.
- **Documents and excerpts:** a separate ingestion specification covering extraction, page/excerpt locators, permitted storage and untrusted content. RSS import does not become full-text scraping.
- **Aggregations and network measures:** define the counting unit, duplicate handling, coverage and drill-down. Source density, graph layout and connection count are not measures of truth or importance by themselves.
- **Monitoring:** durable rules/checkpoints, deduplication, cancellation, restart recovery and explicit replay/retention semantics. Treat feed gaps as unknown coverage, not departures or resolved events. Begin with an in-app inbox; platform job/source notifications remain separate.
- **Media analysis:** verified capture/export rights, original versus annotated assets and available/uncertain time metadata. Continuous recording and automated detection need a separate specification.
- **AI assistance:** explicit user requests, cited inputs and reviewable derived output through the existing capability interface. No silent edits or autonomous investigation.

## Principles to carry forward

- Share context deliberately: a selected object, area, time window or collection should move between compatible tools without losing its source references.
- Keep observation, interpretation and hypothesis distinguishable. Preserve provenance and conflicting accounts.
- Make AI optional and capability-based. Different providers may summarise, classify or score; their output remains reviewable derived material.
- Prefer open formats, portable user data and free sources. Optional commercial services use the operator’s own credentials.
- Keep the proposed investigation desk lean: normal Markdown editing and reading, with evidence references and clear analytical structure.
- Support lawful public-source research. Public metadata does not imply access to a private system or certainty about a person.

## Decisions intentionally left open

Permanent future-app names, boundaries and release order; detailed workflows; relationship vocabularies; specialist storage; collaboration and permissions; notification delivery; model selection; commercial integrations; deployment scale and business model. Any later reconsideration of agent autonomy requires its own explicit scope decision.

Before a category becomes a separate app, document its user, recurring task, method, inputs, inspectable output, reference tools and reason it needs an independent workspace. Write a focused specification from validated needs. Evolve platform contracts from those needs; do not build speculative infrastructure or launcher placeholders from this brief.

## Reference basis

Sources checked 2026-09-21. Product documentation establishes described capabilities, not independently measured effectiveness or integration compatibility. The method-to-capability mapping above is our design proposal. Adapting preservation practices does not claim legal admissibility or full compliance with the Berkeley Protocol.

- [Palantir Gotham, public G-Cloud 14 service definition][gotham], copyright 2024; November-uploaded document, distinct from the May-named PDF reviewed in the [original assessment](docs/gotham-capability-review-2026-09-21.md). Physical pages 5–15 support the tool mapping.
- [QGIS spatial-query lesson][qgis-spatial] and [QGIS 3.40 temporal controls][qgis-time]: spatial filtering and time-aware layers.
- [i2 Analyst's Notebook product description][i2]: association, temporal, spatial and statistical views, including link and social-network analysis.
- [OCCRP Aleph key terms][aleph]: entities, datasets, cross-referencing and investigation workspaces.
- [A Tradecraft Primer, March 2009][tradecraft]: key assumptions, information quality, indicators and competing hypotheses; printed pp. 7–16. Used as a method reference, not evidence that a particular interface improves analytical accuracy.
- [Berkeley Human Rights Center / OHCHR protocol project][berkeley]: identification, collection, preservation, verification and analysis of digital open-source information.
- [Zotero PDF reader and note editor][zotero]: annotations linked back to source pages and citations.

[gotham]: https://assets.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/documents/92736/801146272055049-service-definition-document-2024-11-26-1253.pdf
[qgis-spatial]: https://docs.qgis.org/3.10/en/docs/training_manual/spatial_databases/spatial_queries.html
[qgis-time]: https://docs.qgis.org/3.40/en/docs/user_manual/map_views/map_view.html#time-based-control-on-the-map-canvas
[i2]: https://i2group.com/hubfs/Products/i2-Analysts-Notebook.pdf
[aleph]: https://docs.aleph.occrp.org/users/getting-started/key-terms/
[tradecraft]: https://www.cia.gov/resources/csi/static/Tradecraft-Primer-apr09.pdf
[berkeley]: https://humanrights.berkeley.edu/projects/developing-the-berkeley-protocol-on-digital-open-source-investigations/
[zotero]: https://www.zotero.org/support/pdf_reader

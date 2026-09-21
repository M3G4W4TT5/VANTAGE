# VANTAGE — Design guide

> Implementation reference for Codex. Software-inspired direction approved on 2026-09-21, based on 16 user-supplied Palantir software screenshots. See the [reference index](design/reference/README.md) for primary software references and historical website captures.
> Component implementation: Palantir Blueprint, approved on 2026-09-21 in [decision 0002](docs/decisions/0002-blueprint-ui.md). The VANTAGE colours and visual tokens below remain authoritative.

## 1. Product

- **VANTAGE** — Open-source intelligence operating environment.
- **ATLAS** — first app; a global observatory inside the shared VANTAGE shell.
- Share navigation, tokens, components and context across apps. Future app names are illustrative; show only usable apps.
- Use Blueprint as the primary component library, themed to this guide; retain CSS Modules for application layout and custom views.
- Core use requires no paid services. Optional AI and paid connectors use user-provided credentials.

## 2. Visual direction

**Tactical, utilitarian, selectively dense.** VANTAGE is an operational workspace inspired by the supplied Palantir software screenshots. Use compact typography, dark neutral surfaces, precise alignment, thin rules and contextual panels around a prominent working canvas. Support dense information when the task requires it, while keeping the initial view focused. Achieve minimalism through prioritisation, grouping and progressive disclosure. Use original VANTAGE branding and assets.

| Observed reference | VANTAGE rule |
| --- | --- |
| [Globe and object list](design/reference/software/01-globe-object-list.png) | Prominent canvas, compact object rows and edge-anchored controls. |
| [Selected object and timeline](design/reference/software/04-selected-asset-timeline.png) | Selection reveals key metrics and relevant actions; time details expand when needed. |
| [Map layers](design/reference/software/09-map-layer-tree.png) and [data sources](design/reference/software/10-map-data-sources.png) | Searchable, grouped navigation with clear active state and source status. |
| [Area search](design/reference/software/12-area-search.png) | Contextual tools beside the canvas; visible filters and explicit numeric values. |
| [Board inspector](design/reference/software/14-board-inspector.png) | Compact repeated rows, progress cues and adjacent details preserve working context. |
| [Simulation panels](design/reference/software/16-simulation-panels.png) | Related inputs and results can sit side by side when the task warrants the density. |

**Evidence and scope:** the user identifies these as Palantir Gotham software screenshots. They show several treatments, including charcoal, navy, yellow-green and blue accents, and a light sidebar. VANTAGE uses one coherent token system rather than copying every variation. Exact fonts, motion, keyboard behaviour and responsive behaviour cannot be established from stills; values below are VANTAGE implementation choices. The earlier website captures remain historical references only. Boards, simulations and military workflows do not add features to the [prototype specification](PROTOTYPE_SPEC.md).

## 3. Design tokens

Centralise semantic CSS variables. ATLAS defaults to dark; offer light mode and persist the user’s choice.

Preserve the exact values below when adapting Blueprint. Keep one VANTAGE token definition shared by library components, custom views and the map interface.

| Token | Dark | Light |
| --- | --- | --- |
| `--canvas` | `#11161B` | `#F3F5F7` |
| `--surface` | `#1B222A` | `#FFFFFF` |
| `--surface-raised` | `#26313C` | `#E7EDF3` |
| `--hover` | `#26313C` | `#E7EDF3` |
| `--text` | `#E6EBF0` | `#202830` |
| `--text-muted` | `#A7B2BF` | `#536170` |
| `--divider` | `#35414D` | `#CFD7E0` |
| `--control-border` | `#728393` | `#75818D` |
| `--accent` | `#8AB4F8` | `#245FAD` |
| `--on-accent` | `#11161B` | `#FFFFFF` |
| `--selection-bg` | `#23354D` | `#E5EFFC` |
| `--selection-outline` | `#D8A6FF` | `#873FCC` |
| `--focus-ring` | `#8AB4F8` | `#245FAD` |

- **Colour roles:** cool charcoal surfaces and restrained blue for interaction; purple outlines/brackets for selected records. Use `--on-accent` on accent-filled actions. Reserve amber, red and green for meaningful states; define separate semantic status and map-category tokens. Colour must not be the only cue.
- **Surface roles:** use `--divider` for decorative rules and `--control-border` for essential control boundaries. Selected surfaces use `--selection-bg` with a purple selection edge or outline. Links remain underlined. Validate composed states in both themes, including focus on accent-filled controls.
- **Font:** Inter with Arial/sans-serif fallback; a chosen substitute, not an identified source font. System monospace for coordinates, timestamps and IDs; tabular numerals for data.
- **Type scale:** metadata 12px; working text 13–14px; reading 16px; panel titles 14–16px; standalone page titles 18–24px. Keep operational information readable instead of shrinking it to fit more content.
- **Type treatment:** weight 400 for labels, 500 for emphasis and 600 for object names and headings; line-height 1.4–1.45 for UI and 1.6 for reading. Uppercase and modest letter spacing are reserved for short section labels. Establish hierarchy through alignment, weight and grouping.
- **Spacing:** 4, 8, 12, 16, 24, 32px. Standard panel padding 12px; section gaps 16px; related controls 4–8px apart. Distinct tasks retain clear separation.
- **Geometry:** 1px borders; 0–2px radii; 32px desktop controls; 32–36px single-line rows; 16–18px stroke icons. Expand rows for meaningful secondary information. Preserve the target sizes in §7. Use solid panels over imagery and restrained shadows for overlays only.
- **Icons:** [Tabler Icons](https://github.com/tabler/tabler-icons) is an approved source. Prefer its outline style for ordinary interface actions, inherit colour with `currentColor`, preserve its proportions and provide accessible names where an icon conveys meaning.
- **Loading indicators:** [SVG Spinners](https://github.com/n3r4zzurr0/svg-spinners) is an approved source for indeterminate progress. Pair spinners with useful status text, stop or simplify their animation for `prefers-reduced-motion`, and do not use them where determinate progress can be shown.
- **Custom SVGs:** custom icons, diagrams, marks and spinners are allowed. Match the shared stroke, sizing, colour and motion conventions rather than forcing a library asset that does not fit.
- **Functional graphics:** grids, range rings, selection brackets and telemetry appear only when they represent actual data or an active tool. Use original domain-appropriate symbols; military tasking vocabulary and symbols are not the default ATLAS language.
- **Avoid:** pill-heavy controls, rounded card stacks, neon glows, decorative telemetry, gratuitous gradients and continuous background animation.

### Blueprint theme integration

- Load the selected Blueprint packages' styles once, followed by one scoped VANTAGE theme adapter. Map supported Blueprint CSS variables to these tokens and use small, centralised component overrides where fixed vendor styles remain. Keep application/pane layout in CSS Modules. Use the styling API of the pinned release; Sass variables are build-time settings, not runtime theme switches.
- Map canvas/panels to `--canvas`/`--surface`/`--surface-raised`, text to `--text`/`--text-muted`, primary actions to `--accent`/`--on-accent`, selection to `--selection-bg`, and focus to `--focus-ring`. Retain the distinction between `--divider` and `--control-border`. Map Blueprint warning/danger/success intents to VANTAGE's semantic status tokens, independently of selection and map categories.
- Apply Inter, the existing type/spacing scale, 0–2px corners and 32px desktop controls. Use solid fills and thin borders; replace vendor gradients and default elevations where they conflict with this guide. Preserve essential control boundaries when changing shadows. Compact variants still meet §7 target sizes and text reflow requirements.
- Apply VANTAGE tokens and Blueprint's matching dark/light state to the app and portal containers. Menus, date pickers, tooltips, dialogs and notifications must retain the active theme when rendered outside a pane. Coordinate overlay layering with Cesium controls and other panes; preserve focus trapping, Escape dismissal and focus return where appropriate.
- Share VANTAGE components for repeated domain patterns and styling. Prefer Blueprint's controls for their intended purpose, keeping overrides out of individual app modules. Build the Cesium canvas, pane layout/linking, media dock and timeline as application views using the same tokens. Do not maintain overlapping Radix controls.
- Keep Tabler/custom icons for established VANTAGE actions; Blueprint's built-in component icons and spinners are acceptable. Use a consistent symbol, size and colour for each action, including accessible names and reduced-motion treatment. Library adoption does not require adding more visible controls or panels.

Package versions and React 19 restrictions are in [decision 0002](docs/decisions/0002-blueprint-ui.md). Use `PopoverNext` and `Overlay2` when those primitives are needed; avoid deprecated legacy `Popover` and `Overlay`.

## 4. ATLAS composition

```text
┌ VANTAGE / ATLAS ── Search ── Workspace ── Sources / Settings ┐
│ Filters          │                                        │
│                  │       MAP / GLOBE       │ Inspector    │
│                  │                        │ (selection)  │
│                  │                        │              │
├ Time / live state ── Expand timeline / results / media ────┤
└ Coordinates / scale ── Attribution ── Source freshness ────┘
```

- **Desktop:** 40px shell bar, 280px primary sidebar, 360px contextual inspector and 32px compact time bar. Side panels collapse and resize; the canvas gets remaining space. These are starting dimensions, not limits on text reflow or zoom.
- **Initial view:** show the canvas, one primary sidebar for layers/search and compact time/status controls. Open the inspector on selection; expand tables, media and the full timeline when needed. Restore user-chosen panel visibility, widths and arrangement with the workspace.
- **Canvas:** quiet, dark or desaturated basemap with distinct layer symbols. Prioritise selected and relevant labels, cluster dense features and vary detail with zoom. Keep selected objects identifiable when labels are suppressed. Selection adds an outline/bracket and opens the inspector.
- **Layers:** aircraft, vessels, public transit, bikeshare, satellites, launch events, public cameras, radio/news streams, internet-device metadata, public Wi-Fi/RF observations, cellular sites and coverage, imagery, environment, infrastructure and events.
- **Context layers:** expose maritime, rail, energy and hiking presets within infrastructure. Distinguish approximate IP locations from exact observations using labelled areas or uncertainty markers. Dated aerial layers show acquisition date/interval and footprint; available acquisitions remain selectable in comparison panes.
- **Alerts, air quality and roads:** provide distinct layer controls and legends for official warning areas, pollutant stations and road incidents. Alerts expose type, severity, urgency, certainty and lifecycle status; roads expose type/status and schedules. Air-quality filters select pollutant and time, with units and averaging interval beside readings. Preserve points/lines/areas, use labelled zone boundaries, and keep unknown locations accessible in the table. Selection and source freshness remain visually separate from hazard severity.
- **Imagery discovery, hazards and outages:** required DS-26–28 views include imagery catalog results that show footprints and available acquisitions with a separate render/download action and unavailable-asset state. Hazard catalogs expose original sources and overlapping reports. Outage context uses labelled regions or ASN tables, distinguishing anomalies from annotated outages without device-location pins. Show only implemented source capabilities.
- **Current ATLAS controls:** Map / List in the toolbar. Results expand from the map’s bottom summary bar; 2D / Globe controls sit at the map’s top right. Filters and inspector resize by dragging their inner edge, with keyboard arrow keys on the focused separator. No duplicate matching-record lists or panel-width sliders.
- **Marker states:** aircraft use plane symbols: recent blue, older than 60 seconds or unknown age yellow, reported grounded red (ground state takes precedence). A small superscript question mark indicates missing central facts; domain legends define them. Unknown direction is never conveyed by colour or a circle. Earthquakes remain surface epicentres; far-side markers, badges and selection brackets are hidden by the globe.
- **Views:** coordinate map, table and media; keep a list-only workflow available. Use a task-appropriate dock rather than opening every view at once. Preserve source imagery colours; dock players with explicit play/mute/stop controls.
- **Time:** keep Live/Pause/Replay mode and UTC time visible. Expand history tracks, retained coverage and playback details on demand; gaps and unavailable history remain explicit. Time state belongs to its pane unless deliberately linked.
- **Solar tool:** open on demand beside the canvas with observer, pane time, sun direction/elevation and daylight state. Optional height input reveals a labelled flat-ground shadow estimate; show assumptions and unavailable results beside the values. Provide the same information numerically without map interaction, and keep calculated overlays visually distinct from observations.
- Keep attribution and map controls visible. Corner controls must not obscure data or require hidden gestures.

## 5. Shared interactions

### Information density

| Level | Visible information |
| --- | --- |
| Overview | Identity, type, freshness and the few values needed to scan or compare. |
| Selection | Key facts, relevant actions, source and observation time. |
| Expanded detail | Full provenance, historical observations, conflicts and advanced controls. |

- Keep active filters, incomplete/truncated result counts, stale data and significant errors visible at every level. Surface conflict and precision cues beside affected values; expand their supporting detail on demand.
- Prefer compact rows, ruled sections, tabs and small metric grids. Use cards when an object needs several related attributes; do not wrap every value in its own card.
- Keep the current task and selection visible while details open. Avoid repeating the same facts across multiple always-open panels. Progressive disclosure changes presentation, not access to required information or functionality.
- Expanded inspection resolves displayed facts to supporting observations, explains preferred values and identity associations, and separates source corrections, operator notes and derived assessments. Keep expired/unavailable evidence visible with its reason; do not replace an earlier saved version with current facts.

### Components

Use `@blueprintjs/core` for shared controls/forms, navigation, dialogs and feedback, `@blueprintjs/select` for searchable choices, and `@blueprintjs/datetime` for date/time inputs as needed. Date controls must preserve the specification's UTC, fixed/relative interval and source-precision semantics; their locale defaults do not define application time.

Use `@blueprintjs/table` for the virtualised results grid, verifying row selection, sorting/filtering, resize behaviour, keyboard/screen-reader access and stable focus under updates. Provide a usable semantic list/table alternative wherever the grid cannot expose the required information accessibly. Reuse the same query and selection contracts. Small static property tables can use semantic HTML with the shared theme.

| Component | Required behaviour |
| --- | --- |
| Buttons / segments | Outline default; accent fill for the primary action. Active segments use a tint and edge/underline. Distinguish hover, pressed, selected, disabled and focus states. |
| Layer / result rows | Aligned icon, label, comparison values and status. Persistent selection uses an outline or edge marker plus tint, independently of hover. Keep the selected record recognisable across map, table and inspector. |
| Inspector | Title → key facts → time/location → source → actions. Compact metrics and ruled sections; full provenance and supporting observations expand within the same context. |
| Tabs / contextual tools | Small labelled tabs and grouped controls. Tool rails have accessible names; selected tools and their effect on the current area or object are explicit. |
| Search / app switcher | Keyboard-accessible and labelled. `Ctrl/Cmd+K` opens search; Escape dismisses overlays and restores focus. |
| Saved queries | Show name, source/execution scope, active criteria and fixed or relative time. Provide an explicit Run action and show effective bounds and incomplete results. Restoring criteria does not run provider lookups or enable monitoring. |
| Radius search | Offer point selection and labelled numeric longitude/latitude plus radius/unit inputs; keep results usable in the table. Distinguish definite, possible and unknown proximity where precision limits the answer; a displayed circle does not assert exact source locations. |
| Saved evidence | Separate Save reference from Save permitted snapshot. Show external-only versus retained content, plus expired/unavailable states; disabled snapshot actions explain policy or budget limits. Export identifies referenced assets that are not included. |
| Linked panes | Explicit opt-in entity/area/time linking. “Open in” passes stable entity/evidence references to compatible apps. |

Persist workspace layers, filters and pane arrangement, including expanded details. Apps reuse shared components and context contracts; future app workflows remain governed by their own specifications.

## 6. Data and feedback

- Keep attribution and observation time visible; expose retrieval time, location precision and provenance in the inspector.
- Label **live, delayed, stale, predicted, inferred and demo** data with text plus symbols. Satellite propagation is predicted; broadcaster origin differs from stream-server location; IP location is approximate.
- Design **loading, empty, partial coverage, disconnected, rate-limited and setup-required** states with useful next actions. Preserve usable results on failure.
- Offer replay only for available history. Label timezone and units. Feed gaps remain gaps.
- Show IP database date separately from lookup time; never present a current lookup as historical location. Aerial mosaics retain date precision rather than an invented timestamp. Solar calculations at historical cursors remain labelled modelled and do not imply observed weather or historical building geometry.
- Keep category, severity and selection encodings separate. Colour always has an accompanying label, icon or line pattern.
- Alert and incident inspectors distinguish issued, updated, effective, onset, expiry and cancellation/end information; expand revision relationships on demand. Missing current-feed entries do not silently become resolved incidents. Replay explains unavailable historical state. Air-quality inspectors retain station/sensor, quality flags and measurement time; stale, missing and differently averaged readings remain distinguishable, with no implied AQI scale.

## 7. Accessibility and adaptation

- Target 4.5:1 contrast for normal text; 3:1 for large text and essential UI boundaries. Decorative dividers may be subtler.
- Provide 2px visible focus outlines, accessible icon names, semantic controls and a list/table alternative to map interaction.
- Make essential information available without hover. Targets: at least 24px; 44px for touch.
- Below 1200px, show one side panel; below 768px, use a full-width canvas with one details sheet. Preserve usability at 200% zoom.
- Transitions: 120–180ms colour/opacity, 180–240ms panels. Respect `prefers-reduced-motion`; omit decorative motion and animated map travel.
- Streaming updates preserve focus and layout. Cluster features, virtualise large lists and limit concurrent playback.

## 8. Implementation checklist

- [ ] Reuse shared tokens/components; keep private API keys out of browser code.
- [ ] During shell scaffolding, implement a representative Blueprint layer/filter sidebar, inspector and virtualised results table, including search/date controls and a portalled overlay. Record actual customisation and test results before repeating the patterns across apps.
- [ ] Verify the exact VANTAGE palette, typography, borders, sizing and selected/disabled/error states in both themes, including menus, date pickers, dialogs and tooltips outside the pane DOM. Check contrast, keyboard/focus return, list-only access, 200% zoom, narrow layouts, reduced motion and streaming focus/selection stability.
- [ ] Compare implemented screens against the primary software references for composition, hierarchy, density, rules and geometry; verify VANTAGE tokens in both light and dark themes.
- [ ] Review overview, selection and expanded-detail states. Default panels stay focused; active filters, source problems and incomplete results remain visible.
- [ ] Check dense map labels, selected objects, result rows and contextual panels at representative data volumes. Grids and other overlays serve an active task or actual data.
- [ ] Verify selection, filters, inspector, playback and workspace restore.
- [ ] Verify fact support, identity rationale, conflicting/corrected observations, annotation history and reference/snapshot availability in map and list-only workflows.
- [ ] Check saved-query fixed/relative time, explicit execution, effective bounds, missing sources and restoration; check numeric radius entry, units, uncertainty and linked/unlinked pane behaviour.
- [ ] Check infrastructure presets, IP uncertainty, aerial acquisition comparison and the solar tool in linked/unlinked panes; verify numeric solar access and polar/no-shadow states.
- [ ] Check alert updates/cancellations and missing geometry, air-quality units/averaging/quality states, and scheduled/updated road incidents in map and list-only views. Verify legends, severity versus selection, time filtering and restored filters without relying on colour alone.
- [ ] Check imagery catalog footprints, acquisition selection, supported rendering and unavailable assets; hazard provenance and date precision; and outage/anomaly scope and unknown cause. Verify map/table alternatives, pane time and workspace restoration for DS-26–28.
- [ ] Review loading, empty, stale, offline and setup-required states.
- [ ] Check keyboard, focus, contrast, narrow layouts, zoom and reduced motion.
- [ ] Verify icons and loading indicators have accessible names or adjacent status text; retain required third-party licence notices.
- [ ] Keep reference captures as documentation; ship original VANTAGE assets.

**References:** the 16 primary software screenshots are retained unchanged in [design/reference/software/](design/reference/software/). The 16 earlier website/case-study captures remain at their existing paths under [design/reference/](design/reference/), including the historical [overview](design/reference/16-overview.png). See the [reference index](design/reference/README.md) for attribution and source mapping. This guide establishes visual direction; implemented behaviour still requires testing.

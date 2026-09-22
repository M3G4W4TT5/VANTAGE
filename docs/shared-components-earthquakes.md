# Shared components and earthquake increment

The four approved stages are implemented in order after checkpoint `a9724cf`. No NASA imagery or combined-layer controls were added in this increment. On 2026-09-22, the owner approved [composed ATLAS and platform ownership](decisions/0006-vantage-shell-and-composed-atlas.md), [NEXUS connections](decisions/0007-configurable-connections.md) and [authentication](decisions/0008-authentication-and-session-lifecycle.md). Those changes are documented requirements pending implementation; the delivered/verification record below remains historical.

## Delivered

- Shared Cesium viewer/camera/basemap lifecycle, batched point-marker rendering, picking and selection brackets. Aircraft owns its follow/circle/altitude presentation; earthquakes use surface epicentres and a magnitude legend. Both use pinned Tabler SVGs. Web Mercator 2D, Northern Europe and explicit Save are retained.
- Configurable Blueprint and semantic result tables use identical domain column definitions. Inspector framing, field rows, UTC formatting and source/provenance disclosure are shared. Component ownership and enforced provider-import boundaries are in `AGENTS.md`.
- `IEarthquakeSource` with a USGS past-day M2.5+ adapter, one bounded shared collector, cancellation, backoff and retained snapshot/health. HTTP transport, batch diffing, validation and sequence/reset cache mechanics are reused; domain ordering remains explicit.
- An additive EF migration labels existing aircraft observations and adds earthquake feed/current tables. Retention is scoped by data type and source. Immutable versions preserve provenance, first retrieval, source revision and occurrence, with supersession links and inspectable retained revisions. OpenAPI/NSwag output is regenerated.
- A single-domain Earthquakes view with map/list/inspector selection, Zoom to event, magnitude/location/event-age filtering, sorting and loading/empty/partial/stale/unavailable states. Save restores view, camera, filters, basemap, selection and panels. Switching domains preserves separate cameras, filters and selections.

See [decision 0005](decisions/0005-shared-points-and-earthquake-revisions.md) and the [USGS source record](sources/usgs-earthquakes.md) for contracts, policies and verified source documentation.

## Verification record — 2026-09-22 local time

- Native .NET build: passed, no warnings/errors. xUnit: **6 passed**, including real isolated PostgreSQL/PostGIS migrations and persistence checks, with no skipped scenarios. Tests cover normalization/unknowns, revised/late/equal-time events, provider replacement, shared demand/cancellation, source/type retention isolation and pre-increment data migration.
- Frontend ESLint and TypeScript: passed. Vitest: **4 passed** across three files. Native and pinned Docker production builds passed; the existing Cesium chunk-size warning remains. EF reported no pending model changes. OpenAPI and NSwag outputs were regenerated.
- Production browser checks: **7 passed in one final run (1.8 minutes)** using pinned Playwright **1.63.0 Noble** with software WebGL. Fixtures intercept observation streams and public basemap tiles. Selection, revision/sequence recovery, explicit Save/restoration, view switching, source states, both themes, keyboard/narrow layouts and existing aircraft/place workflows are covered. Dark/light screenshots were reviewed; shared input-icon alignment was corrected.
- Before applying the additive migration, the app was stopped and existing observation/workspace counts and content hashes captured. Immediately after migration, both matched exactly: **1,170 observations** (`16414b9f5274b35e0f4018d49ef836f3`) and **2 workspaces** (`ca6c04efdb020534512815d7708e1810`). Local configuration, secrets and the database volume were retained.
- Separate live USGS smoke at **2026-09-21 22:07:39 UTC**: **46 events**, provider count 46, zero rejected, no truncation, healthy source. Feed generation was 22:07:21 UTC and retrieval 22:07:21.871 UTC. The test selected a real event, resolved its immutable observation through REST (200), opened provenance and zoomed to its surface marker. Depth remained a separate kilometre property; geometry had only longitude/latitude. No JavaScript errors or external browser requests occurred with the offline basemap. This is a point-in-time live result, not a coverage guarantee.

Local evidence is under `artifacts/earthquakes/`: `live-usgs.json`, `live-usgs.png`, `final-browser-report/index.html` and `final-browser-results/` screenshots. The smoke used a temporary workspace and removed it afterwards. Earlier failures exposed a Tabler package export-path mistake, a source-state fixture sent before its socket connected, and an icon alignment issue visible in screenshots; all were corrected. A cold Vite/software-WebGL screenshot also exceeded its early 45-second budget; the same workflow subsequently passed. These timings are not prototype performance measurements.

Unrelated editor configuration and the relocated native launch-profile file were preserved. README native commands now specify Development and the loopback URL explicitly, independently of editor launch profiles. The local review target remains the Compose app.

## Review and remaining scope

Open the local application at port 5080 and select **Earthquakes**. The subsequent UI refinement removed the demo view; legacy demo workspaces now open Aircraft. Use **List** to inspect events outside Northern Europe, select one and **Zoom to event**. Save and reload to verify your preferred view.

The feed is a bounded current snapshot, not complete detection or historical replay. Cache retention is not evidence preservation. Unknown depth, magnitude, times and location remain unknown. Global shell search currently searches saved workspaces; use domain filters for live records. Follow the revised [implementation sequence](../PROTOTYPE_SPEC.md#12-implementation-sequence-and-completion) for platform/identity foundations and the approved combined-layer migration. NASA imagery, remaining connector breadth, full accessibility/performance targets and AC-01–21 remain prototype work.

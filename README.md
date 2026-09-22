<picture>
  <source media="(prefers-color-scheme: dark)" srcset="logo/vantage%20logos/final/01-vantage-full-white-transparent.png">
  <source media="(prefers-color-scheme: light)" srcset="logo/vantage%20logos/final/02-vantage-full-black-transparent.png">
  <img src="logo/vantage%20logos/final/02-vantage-full-black-transparent.png"
       alt="VANTAGE logo">
</picture>

VANTAGE is a free and open-source civilian intelligence environment for finding, inspecting, connecting and explaining publicly available information. It aims to make capabilities associated with platforms such as [Palantir Gotham](https://www.palantir.com/platforms/gotham/) accessible for open-source intelligence.

ATLAS is the first application in the ecosystem, providing shared map, globe, table, search and inspection workflows for exploring observations across place, time and source.

The wider framework is designed to grow into connected tools for relationships, timelines, investigations, monitoring, media analysis and cited reporting.

---

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo/atlas%20logos/final/atlas-text-white-transparent.png">
    <source media="(prefers-color-scheme: light)" srcset="logo/atlas%20logos/final/atlas-text-black-transparent.png">
    <img src="logo/atlas%20logos/final/atlas-text-black-transparent.png"
         alt="ATLAS logo text"
         width="200">
  </picture>
</p>

ATLAS now displays **live aircraft from ADSB.lol** and **earthquake events from the USGS past-day M2.5+ feed** on a Cesium 2D map or globe, starting over Northern Europe. Map, table and inspector share observations stored in PostgreSQL/PostGIS. All live sources use capability adapters. The detailed basemap has an offline fallback, and **Find a place** searches a bundled city/town index. Choose **Aircraft** or **Earthquakes** to use one domain view at a time. Both share the map, markers, results table and inspector structure. Workspace changes require **Save**; live feed updates do not mark the workspace unsaved.

![VANTAGE ATLAS displaying earthquake observations on the map, results table and inspector](artifacts/figures/vantage_atlas_earthquakes_example.png)

The complete prototype remains governed by [PROTOTYPE_SPEC.md](PROTOTYPE_SPEC.md), [DESIGN.md](DESIGN.md) and the [approved decisions](docs/decisions/0002-blueprint-ui.md). [Stage 1](docs/stage-1.md), [Stage 2](docs/stage-2.md), the [adapter/map follow-up](docs/adapters-map-places.md) and the [aircraft source record](docs/sources/adsb-lol.md) document results and limitations. The [shared components / earthquake increment](docs/shared-components-earthquakes.md) and [USGS source record](docs/sources/usgs-earthquakes.md) cover the latest work.

## Prerequisites and pins

Run commands from the repository root. This Fedora laptop already has the prerequisites; no system installation is needed.

| Tool | Pin / location |
| --- | --- |
| Node / npm | 24.20.0 / 11.19.0; `mise.toml`, `frontend/package.json` |
| Local .NET SDK | 10.0.111; `global.json` |
| EF CLI / NSwag | 10.0.11 / 14.7.1; `.config/dotnet-tools.json` |
| JavaScript / NuGet packages | Exact direct versions and committed lockfiles |
| PostgreSQL / PostGIS | 18 / 3.6 image pinned by digest in `infra/compose.yaml` |
| Browser tests | Playwright 1.63.0 and matching Ubuntu Noble container, pinned by digest |
| Container .NET SDK / runtime | 10.0.401 / 10.0.11, pinned by digest; `infra/global.json` |

The SDK container uses a separate explicit pin because Microsoft's registry did not provide a `10.0.111` SDK image. Both builds target .NET 10; the container does not change the installed SDK. Docker Engine and Compose are required. Commands below use `sudo` because this laptop's Docker socket requires it.

```sh
node --version
npm --version
dotnet --version
sudo docker version
sudo docker compose version
```

## Start locally

Generate local configuration, restore the locked dependencies and start the database:

```sh
node scripts/init-local.mjs
npm --prefix frontend ci
dotnet tool restore
dotnet restore Vantage.slnx --locked-mode
sudo docker compose --env-file infra/.env -f infra/compose.yaml up -d --wait db
ASPNETCORE_ENVIRONMENT=Development dotnet run --project backend/Vantage.Api --no-launch-profile -- --migrate
```

In separate terminals:

```sh
ASPNETCORE_ENVIRONMENT=Development dotnet run --project backend/Vantage.Api --no-launch-profile -- --urls http://127.0.0.1:5080
```

```sh
npm --prefix frontend run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/api` and `/hubs` to the API on port 5080. PostgreSQL is bound to loopback port 54329. The first browser visit creates a workspace if none exists. New workspaces open live aircraft; legacy demo workspaces open Aircraft and keep their stored state unchanged until Save. **Search this area** moves the bounded aircraft query to the map centre. **List** provides a map-free alternative. **Save** or **Ctrl/Cmd+S** persists changes; Ctrl/Cmd+K opens search. Changing a filter, panel, selection, camera, time or theme marks the workspace unsaved.

## Run the built application in containers

Stop the native API first if it occupies port 5080. This builds the frontend into ASP.NET's `wwwroot`, runs migrations, then starts one origin for UI and API:

```sh
node scripts/init-local.mjs
sudo docker compose --env-file infra/.env -f infra/compose.yaml --profile container up -d --build app
```

Open [http://127.0.0.1:5080](http://127.0.0.1:5080). [Health](http://127.0.0.1:5080/api/v1/health) reports `ready` after storage is available. The application runs as the image's non-root user; only the host's Docker command needs sudo.

```sh
sudo docker compose --env-file infra/.env -f infra/compose.yaml --profile container stop app
```

The named `vantage_database` volume retains workspaces across stops and container recreation. Do not remove that volume to fix an ordinary startup problem.

## Contracts and migrations

REST DTOs live in `backend/Vantage.Api/Contracts`. JSON Schemas for shared records and pane state live in `contracts/schemas/v1/records.schema.json`. Workspace state is validated on both sides; revision checks reject stale saves. Unsupported stored state is preserved and reported as an error.

After REST changes, regenerate both OpenAPI and the TypeScript client; the API need not be running:

```sh
npm --prefix frontend run api:generate
```

Commit the generated `contracts/openapi/v1.json` and `frontend/src/api/generated/client.ts` together. Do not hand-edit the client. The running API also serves `/api/openapi/v1.json`.

For a database change, create and review an EF migration, then apply it explicitly:

```sh
dotnet ef migrations add YourChangeName --project backend/Vantage.Api --output-dir Persistence/Migrations
ASPNETCORE_ENVIRONMENT=Development dotnet run --project backend/Vantage.Api --no-launch-profile -- --migrate
```

Normal API startup does not migrate the database. Compose uses a separate migration job. The `/hubs/observations` SignalR hub streams separate versioned `AircraftBatch` and `EarthquakeBatch` contracts. Earthquake revisions are ordered by source-update time, independently of occurrence and retrieval. The additive `EarthquakeObservations` migration preserves aircraft records/workspaces and scopes shared observation retention by data type/source. Reconnect uses a reset snapshot because the source has no durable resume history. Schema validation and sequence checks run before frontend cache mutation.

## Checks

```sh
dotnet build Vantage.slnx --no-restore
node scripts/test-backend.mjs
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```

The backend check creates and drops its own randomly named database on the local PostgreSQL server, applies real PostGIS migrations, and checks workspace persistence/revision handling, aircraft spatial queries, earthquake normalization/revisions, source substitution, cancellation and retention isolation. It uses the ignored local configuration, or `VANTAGE_TEST_CONNECTION` when supplied. Plain `dotnet test` skips the database scenarios without that environment variable. The frontend checks exercise linked context/lifecycle cleanup, separate domain ordering, schema validation/reset recovery, earthquake filters and surface markers. Browser checks mock observation WebSockets and public map tiles, covering selection, explicit Save/restoration and source-health states. Live smoke checks are recorded separately.

On Fedora, run browser checks in the matching Playwright container against the built app; no host browser dependencies are installed. The container explicitly uses software WebGL; trace filmstrips are disabled to avoid continuous GPU readback, while DOM/network traces and selected screenshots remain available:

```sh
sudo docker compose --env-file infra/.env -f infra/compose.yaml --profile test up -d --build app
sudo docker compose --env-file infra/.env -f infra/compose.yaml --profile test build browser
sudo docker compose --env-file infra/.env -f infra/compose.yaml --profile test run --no-deps --name vantage-browser-review browser
mkdir -p artifacts
sudo docker cp vantage-browser-review:/tests/frontend/test-results ./artifacts/browser-results
sudo docker cp vantage-browser-review:/tests/frontend/playwright-report ./artifacts/browser-report
```

Use a fresh container name on subsequent runs, or remove the old **test container** with `sudo docker rm vantage-browser-review`. Screenshots and traces stay outside Git. Tests create and delete their own workspaces. To check the native Vite path instead, use the built browser image with `--network host -e PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173`.

## Layout and configuration

- `frontend/src/platform`: registry, context bus, workspace service, shared observation channels/cache, map/marker and results/inspector components, shell and theme. It contains no ATLAS-specific branches.
- `frontend/src/apps/atlas`: the registered app, aircraft/earthquake domain presentation.
- `backend/Vantage.Api`: platform workspace/observation services, ATLAS endpoints, EF persistence and replaceable `Connectors/AdsbLol` / `Connectors/Usgs` in a modular monolith.
- `contracts`: versioned schemas, OpenAPI and NSwag configuration. `tests/` and `frontend/tests/` hold the small verification harnesses.
- `infra`: Compose and image definitions. `scripts`: local configuration, client generation and the backend check.

`init-local.mjs` generates a random database password in `infra/.env` and the API's `appsettings.Development.local.json`, both ignored by Git and created with mode 0600. It preserves existing files. Environment variables override application settings. Keep credentials out of `VITE_*` variables: those enter the browser bundle. If changing the database port, update both local files; changing the password file alone does not rotate an existing database password.

There is no authentication yet. Host ports stay on loopback as required. Do not expose this stage publicly.

Blueprint uses `PopoverNext` and the supported overlay path, with one theme adapter applied to the body so portals inherit the active theme. Normal `npm ci` succeeds without force/legacy-peer flags. An upstream, unused legacy `react-popper@2.3.0` dependency still reports React 19 as outside its peer range in `npm ls`; keep the restriction on deprecated `Popover`/`Overlay` components. The date control receives a bundled locale explicitly to avoid Blueprint's Webpack-specific dynamic locale loader.

Cesium assets are prepared automatically by `predev` / `prebuild` from the pinned package. The coarse Natural Earth basemap requires no network service or key. **OpenStreetMap** supplies detailed online tiles through a separate adapter. The selector offers the offline map explicitly; a tile/network failure falls back to it with a visible message and manual retry. See [the basemap decision](docs/decisions/0004-cesium-basemap.md) and [DS-01 source record](docs/sources/basemap-places.md).

Aircraft services consume `IAircraftSource`, selected from DI registration using `Sources__Aircraft__Provider` (Compose: `VANTAGE_AIRCRAFT_PROVIDER`, default `adsb-lol`). Register a replacement adapter in `Program.cs` and select its ID; its metadata supplies source name, query limits, coverage and polling policy. Storage and UI remain provider-independent; cached data retains its original source.

ADSB.lol defaults to enabled, collecting only while an aircraft view is open. Native settings are `Sources__AdsbLol__Enabled=false` and `Sources__AdsbLol__PollSeconds=60`; Compose uses `VANTAGE_ADSB_ENABLED=false` and `VANTAGE_ADSB_POLL_SECONDS=60` in `infra/.env` or the invoking environment. Polling cannot be lowered below 30 seconds. Restart the API/container after changing these settings. No provider credential is needed. Cache budgets and retention are documented in the source record.

Basemap and place capability contracts live in `frontend/src/platform/maps` and `platform/places`; adapters and their registration live in `frontend/src/connectors`. Changing the registered provider does not change the ATLAS view. Every future source follows the same capability-boundary rule.

**Find a place** searches 7,342 bundled Natural Earth cities/towns, including supplied aliases and accent-insensitive matching. It makes no geocoding request. Positions are approximate map labels, not addresses or verified current observations. Selecting a place moves the camera; **Search this area** explicitly moves the aircraft collection. Save retains the camera and chosen basemap. Global Ctrl/Cmd+K searches saved workspaces; use each domain’s filters for live records.

The place index is checked into `frontend/public/data/`; ordinary builds work without downloading it. To reproduce it from the checksum-pinned upstream release (or supply a previously downloaded source file as the final argument):

```sh
node frontend/scripts/prepare-places.mjs
```

Production builds emit `third-party-licenses.txt` with bundled dependency notices, including Blueprint, React, Inter and Tabler Icons. Original repository marks are reused; design reference screenshots are not shipped.

## Earthquakes

Select **Earthquakes** in the ATLAS toolbar. The source supplies a worldwide past-day M2.5+ feed; it does not promise complete global detection. Northern Europe remains the starting camera, so use the map results drawer or List and **Zoom to event** to inspect distant events. Filter by location/event ID, magnitude or event age; sort by occurrence, magnitude or source update. The legend uses size and labels, and selection adds brackets. All columns, including depth in km, magnitude type, three timestamps and provenance, are available in both grid and accessible table.

Save preserves the active view, filters, camera, selection, basemap and panels. Aircraft and earthquake cameras/filters remain separate. Feed updates do not mark the workspace dirty. Occurrence drives event age; feed generation drives freshness. A stale/unavailable feed retains its last successful snapshot with a visible status. Unknown fields remain unknown; depth is never passed as Cesium altitude.

Earthquake collection requires no key. Native settings: `Sources__Earthquakes__Provider=usgs-earthquakes`, `Sources__Usgs__Enabled=false` to disable, and `Sources__Usgs__PollSeconds=60` (minimum 60). Compose equivalents are `VANTAGE_EARTHQUAKE_PROVIDER`, `VANTAGE_USGS_ENABLED`, `VANTAGE_USGS_POLL_SECONDS`. Restart after configuration changes. The endpoint is fixed inside the adapter. REST exposes cached `/api/v1/earthquakes`, source metadata and typed immutable observation reads; SignalR demand starts shared collection. No open view means no upstream polling.

NASA imagery and combined-layer controls are not part of this increment. The complete prototype acceptance gate remains outstanding; these checks do not certify full performance or accessibility compliance.

## Map and panel controls

See the [UI refinement record](docs/ui-refinement.md) for marker rules, migration behaviour and verification.

**Map / List** switches the main view. On the map, expand the bottom result-count bar to see the grid, and use **2D / 3D** at the top right. Drag the inner edge of **Filters** or the inspector to resize; focus the edge and use arrow keys, Home or End for keyboard resizing. Widths and drawer state persist only with Save.

Aircraft are plane symbols: red for reported grounded, yellow for old/unknown-age positions, blue for recent positions. Ground state takes precedence. Purple brackets identify selection. A small superscript **?** flags missing track/heading, ground state or position time; earthquake badges flag missing magnitude, depth or occurrence time. Legends explain the rules and inspector/table fields retain explicit unknowns. Globe occlusion applies to symbols, badges and brackets. The retired demo collection and demo search provider are removed.

# VANTAGE / ATLAS

Stage 1 implements the app registry, versioned contracts, PostgreSQL-backed workspaces and the themed Blueprint shell. ATLAS currently explores **52 synthetic records** through filters, an inspector, a virtualised grid and a semantic table. The canvas reserves space for the next stage's map; no live providers or AI services are called.

The complete prototype remains governed by [PROTOTYPE_SPEC.md](PROTOTYPE_SPEC.md), [DESIGN.md](DESIGN.md) and the [approved decisions](docs/decisions/0002-blueprint-ui.md). [Stage 1 verification](docs/stage-1.md) records results and limitations.

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
dotnet run --project backend/Vantage.Api -- --migrate
```

In separate terminals:

```sh
dotnet run --project backend/Vantage.Api
```

```sh
npm --prefix frontend run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Vite proxies `/api` and the reserved `/hubs` path to the API on port 5080. PostgreSQL is bound to loopback port 54329. The first browser visit creates a workspace if none exists. **Save** or **Ctrl/Cmd+S** persists changes; Ctrl/Cmd+K opens search. Changing a filter, panel, selection, time or theme marks the workspace unsaved.

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
dotnet run --project backend/Vantage.Api -- --migrate
```

Normal API startup does not migrate the database. Compose uses a separate migration job. SignalR event schemas exist as contracts only; a hub and generated/validated live payload handling belong to the next stage.

## Checks

```sh
dotnet build Vantage.slnx --no-restore
node scripts/test-backend.mjs
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```

The backend check creates and drops its own randomly named database on the local PostgreSQL server, applies real PostGIS migrations, and checks persistence/restart and revision handling. It uses the ignored local configuration, or `VANTAGE_TEST_CONNECTION` when supplied. Plain `dotnet test` skips this scenario without that environment variable. The frontend unit check exercises linked context and app lifecycle cleanup.

On Fedora, run browser checks in the matching Playwright container against the built app; no host browser dependencies are installed:

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

- `frontend/src/platform`: registry, context bus, workspace service, shell and shared theme. It contains no ATLAS-specific branches.
- `frontend/src/apps/atlas`: the registered app, fixture adapter and ATLAS views.
- `backend/Vantage.Api`: platform workspace/health endpoints, ATLAS default state and EF persistence in a modular monolith. Connector modules will be added when their vertical slices are implemented.
- `contracts`: versioned schemas, OpenAPI and NSwag configuration. `tests/` and `frontend/tests/` hold the small verification harnesses.
- `infra`: Compose and image definitions. `scripts`: local configuration, client generation and the backend check.

`init-local.mjs` generates a random database password in `infra/.env` and the API's `appsettings.Development.local.json`, both ignored by Git and created with mode 0600. It preserves existing files. Environment variables override application settings. Keep credentials out of `VITE_*` variables: those enter the browser bundle. If changing the database port, update both local files; changing the password file alone does not rotate an existing database password.

There is no authentication yet. Host ports stay on loopback as required. Do not expose this stage publicly.

Blueprint uses `PopoverNext` and the supported overlay path, with one theme adapter applied to the body so portals inherit the active theme. Normal `npm ci` succeeds without force/legacy-peer flags. An upstream, unused legacy `react-popper@2.3.0` dependency still reports React 19 as outside its peer range in `npm ls`; keep the restriction on deprecated `Popover`/`Overlay` components. The date control receives a bundled locale explicitly to avoid Blueprint's Webpack-specific dynamic locale loader.

Production builds emit `third-party-licenses.txt` with bundled dependency notices, including Blueprint, React and Inter. Original repository marks are reused; design reference screenshots are not shipped.

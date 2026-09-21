# Stage 1: contracts and shell

This is the historical foundation checkpoint; [Stage 2](stage-2.md) adds live aircraft and the map.

Implemented on 2026-09-21, following the first step of [the specification](../PROTOTYPE_SPEC.md#12-implementation-sequence-and-completion). This is a foundation for the complete prototype, not a claim that AC-01–16 are complete.

## Delivered

- Version 1 JSON Schemas for shared data, provenance/identity, evidence references, snapshots, saved queries, workspace/context and observation-batch envelopes. Explicit REST workspace DTOs, OpenAPI and an NSwag-generated TypeScript client.
- PostgreSQL/PostGIS configuration and an EF migration for `platform.workspaces`. Create, rename, save, list, duplicate and delete APIs, optimistic revision checks, bounded/validated state and preservation of unsupported saved data.
- A generic React app registry, action/search contracts, app lifecycle cleanup and a separate user-context bus with explicit field linking, sequence/deduplication checks and independent pane state. A test-only app exercises registration, linked selection/area, unlinked time and disposal.
- An ATLAS fixture app: filters, resizable/collapsible panels, selection, expandable evidence details, UTC date control, Blueprint grid, semantic table, deterministic simulated updates, search and persistent dark/light appearance. Workspace switching/reloading protects unsaved changes.
- Pinned local tools/packages and container images, ignored local secrets, development proxy, production same-origin hosting and a Fedora-compatible Playwright container. [README](../README.md) contains the actual commands.

Only ATLAS is registered in the visible application. Pane state/linking contracts support further composition; a user-facing split-pane/link editor belongs to the working-environment stage. The current sidebar's three layers and all 52 records are explicitly synthetic. There is no Cesium map, SignalR hub, collector or live provider call yet.

## Verification

Environment: Fedora 44 x86_64, AMD Ryzen 5 PRO 4650U (6 cores / 12 threads), approximately 14 GiB usable RAM. Node 24.20.0, npm 11.19.0, native .NET SDK 10.0.111, Docker 29.8.1 and Compose 5.5.1. Browser checks use Playwright 1.63.0 / Chromium 153.0.8010.12 inside its pinned Noble image.

| Check | Result |
| --- | --- |
| Native .NET build | Passed; zero warnings/errors |
| Real PostgreSQL/PostGIS integration scenario | Passed; fresh isolated database, migration, save/restart, stale-write rejection, invalid-version rejection, duplicate and delete semantics |
| Frontend lint, TypeScript and production build | Passed |
| Vitest context/lifecycle scenario | Passed |
| NSwag regeneration | Passed; a second generation left OpenAPI and client hashes unchanged |
| Playwright workflows | Three passed on Vite and on the built container application: saved restoration/selection, narrow keyboard/list access, and failed-save draft recovery |
| Production startup | Migration job completed; ASP.NET serves UI/API on loopback port 5080; persisted workspaces survived app recreation |
| Local secrets | Ignored files have mode 0600; excluded from Docker build inputs; credentials not placed in frontend configuration |

Browser screenshots cover the overview, selection/expanded inspector, virtual grid, date/selection portals and dialogs in both themes. Visual review compared the composition with the [selected-object reference](../design/reference/software/04-selected-asset-timeline.png): compact ruled panels, an open working canvas and progressive disclosure, using VANTAGE's own palette and marks. Reference imagery is not shipped.

The theme adapter overrides the pinned packages' actual CSS variables and fixed selectors, including dark-state specificity and date selection. Keyboard checks cover search, Escape, menu focus return and dialog focus containment/return. List focus and inspector selection survive a changing fixture value. The narrow layout was checked at 390×844 with reduced motion. A 960×540 CSS viewport checks the reflow corresponding to 200% zoom on a 1920×1080 display; this is an emulation, not a native browser-menu zoom test.

Computed token-pair contrast: normal/muted/accent/error text across canvas, panel, raised and selected surfaces has minimum ratios of **5.78:1 dark / 5.37:1 light**. Primary-action text is **8.63:1 / 6.33:1**. Essential control boundaries against ordinary surfaces are at least **3.39:1 / 3.37:1**. Selected calendar colours were also checked on rendered controls. These samples are not a full accessibility certification; manual screen-reader and touch-device verification remain outstanding.

Local evidence is retained in the ignored `artifacts/browser-results`, `artifacts/browser-report` and `artifacts/theme-review` folders. Browser runs can regenerate their screenshots with the README commands.

## Known limits and next stage

- Normal locked npm installs succeed without force/legacy-peer flags. Blueprint still carries an unused legacy `react-popper@2.3.0` whose peer declaration excludes React 19, so `npm ls` reports that upstream mismatch. The implemented views use the approved modern overlay path; keep the restriction on deprecated components.
- The initial production entry bundle is approximately 862 kB (247 kB gzip), with 543 kB of CSS (59 kB gzip). Vite's large-chunk warning remains visible. Map load, frame rate, ingestion throughput, memory ceilings and the specification's performance targets have not been measured.
- Future record schemas establish shared envelopes; source-specific validation, persisted observations, evidence retention and recovery still need their implementation stages. No mock outcome has been reported as a verified live integration.

**Next:** the specified keyless-aircraft vertical slice: verify a free source and map data, add Cesium, source/provenance storage and identity basis, a bounded shared collector/subscription path, snapshot/resume handling, and map/table/inspector selection. Then continue with observatory breadth, the working environment and AC-01–16 verification. The full approved prototype scope remains unchanged.

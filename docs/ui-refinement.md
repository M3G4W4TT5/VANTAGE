# ATLAS map and panel refinement — 2026-09-22

Starting checkpoint: `2f6a13c` (`Implement shared map components and live earthquake events`). The checkpoint includes the prior implementation and existing editor configuration; nothing was pushed.

## Changes

- Aircraft always use a plane symbol. Reported grounded aircraft are red, old (over 60 seconds) or unknown-age positions yellow, and recent positions blue. Ground state takes precedence over age. The aircraft legend explains these rules; table columns also expose ground state and track.
- Shared markers support a small superscript `?`, independent of colour. Aircraft flag unavailable track/heading, ground state or position time; earthquakes flag missing magnitude, depth or occurrence. A known true heading can supply direction when track is absent; otherwise the symbol defaults north without claiming a known heading. Inspectors retain the explicit unknown fields.
- Shared globe visibility checks the camera-to-position segment against the WGS84 ellipsoid before rendering or picking symbols, badges and selection brackets. It refreshes on camera movement. 2D remains Web Mercator; earthquake depth remains separate from marker altitude.
- Map / List are the two top-level views. Map results expand from the bottom count/coverage bar. 2D / 3D controls belong to the map’s top-right corner. Redundant Results, Accessible list and Northern Europe buttons are removed.
- Filters replaces Layers. Duplicate matching-record sections and width sliders are removed. Shared edge handles resize both filters and inspector, with pointer capture and arrow-key/Home/End support. Saved widths and drawer state retain explicit Save semantics.
- Purple selection outlines use shared tokens in both themes; their contrast against the standard canvas is 9.37:1 dark and 5.32:1 light. Basemap imagery varies, so these ratios do not certify every geographic background.
- The demo collection, its UI fixtures and demo search provider are removed. Existing demo workspace JSON remains readable and opens Aircraft; normalization stays unsaved until explicit Save. Global search currently searches workspaces; domain filters search live records.

No database/API/schema changes, source-provider changes, NASA imagery or combined-layer controls are included.

## Verification

Frontend ESLint, TypeScript/production build and six Vitest tests pass. Focused tests cover aircraft state/age/missing-information rules, earthquake missing facts, and front/back/elevated globe visibility. The existing Cesium bundle-size warning remains.

Browser verification uses the pinned Playwright 1.63.0 Noble image with software WebGL, intercepted observation streams and intercepted public basemap tiles. **Eight browser workflows passed in the final run (1.9 minutes)**: aircraft and place/basemap regressions; earthquake selection, revision and Save recovery; source-health states; far-side hiding and near-side picking; pointer/keyboard resizing and persisted widths; narrow/reduced-motion layouts; and failed-save recovery. Dark/light screenshots were reviewed. An initial place-search regression caused by removing reused row CSS was found and fixed; the final run passes with no timeout increase.

Reports and screenshots are in `artifacts/ui-refinement/browser-report/index.html` and `artifacts/ui-refinement/browser-results/`. Temporary test workspaces were removed, including the one left by the failed run. The app is running at port 5080. No backend tests or fresh live-provider smoke were rerun for this frontend-only change; the prior backend verification remains documented separately.

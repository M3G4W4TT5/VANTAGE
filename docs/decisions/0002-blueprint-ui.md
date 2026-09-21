# 0002 - Blueprint component library

Status: accepted by the project owner on 2026-09-21. Supersedes the Radix component-library choice in [decision 0001](0001-prototype-stack.md); its other stack and deployment choices remain in effect.

## Decision

Use **Palantir Blueprint** as VANTAGE's primary React component library. Keep React, TypeScript and Vite, CSS Modules for application layout/custom components, and shared CSS-variable design tokens. Do not introduce a parallel Radix control library.

[DESIGN.md](../../DESIGN.md) remains authoritative for appearance: retain its exact dark/light colours, Inter typography, thin rules, compact density, square controls, focus treatment and responsive/accessibility requirements. Theme Blueprint to those choices through one shared adapter. Its default palette, corner radii and shadows do not redefine VANTAGE's design.

Blueprint supplies reusable controls. VANTAGE still implements the app shell, pane layout/state/linking, Cesium canvas, timeline, media integration, streaming and domain-specific inspection. Gotham references guide composition and workflows; Blueprint adoption does not add Gotham capabilities to prototype scope.

## Rationale

[Blueprint](https://github.com/palantir/blueprint) targets data-dense desktop interfaces and supplies styled controls plus selection, date/time and table packages. That suits ATLAS's layers, filters, inspectors and results. The earlier [Radix](https://www.radix-ui.com/primitives/docs/overview/introduction) choice supplied unstyled primitives and required more assembly. Reduced implementation effort is an expectation to validate, not a measured result.

## Package and React compatibility

Use React 19 with matching React DOM/type packages and compatible stable Vite/TypeScript versions, pinned during scaffolding. Blueprint's [React 19 guidance](https://github.com/palantir/blueprint/wiki/React-19-Support) identifies core v6.16.0 onward as supporting the published React 19 peer range. Use `PopoverNext` and `Overlay2`; do not render deprecated legacy `Popover` or `Overlay` directly.

Published package metadata checked 2026-09-21 gives this compatible starting set. These packages have independent version numbers; do not assign the core version to every package.

| Package | Verified version | Intended use |
| --- | --- | --- |
| [@blueprintjs/core](https://registry.npmjs.org/@blueprintjs%2fcore/6.20.0) | 6.20.0 | Controls, forms, navigation, overlays and feedback |
| [@blueprintjs/select](https://registry.npmjs.org/@blueprintjs%2fselect/6.3.6) | 6.3.6 | Searchable selection and multi-selection |
| [@blueprintjs/datetime](https://registry.npmjs.org/@blueprintjs%2fdatetime/6.2.6) | 6.2.6 | Date/time inputs; application owns UTC and precision semantics |
| [@blueprintjs/table](https://registry.npmjs.org/@blueprintjs%2ftable/6.2.6) | 6.2.6 | Virtualised results grid, subject to the required accessible workflow |
| [@blueprintjs/icons](https://registry.npmjs.org/@blueprintjs%2ficons/6.14.1) | 6.14.1 | Blueprint component icons/dependency |

All five list React, React DOM and React types peers as `18 || 19`; select, datetime and table depend on core `^6.20.0` and icons `^6.14.1`. Pin exact direct versions and commit the npm lockfile when scaffolding, adding companion packages as needed. Recheck metadata if changing this set. Do not bypass incompatible peer dependencies using force or legacy-peer flags. The registry check is not an installation, build or browser test.

## Styling and implementation consequences

- Import required Blueprint package styles once, then apply a centrally maintained VANTAGE theme adapter. Use supported CSS variables for the pinned release and scoped component overrides for remaining fixed styles. Blueprint's [Sass variables](https://raw.githubusercontent.com/palantir/blueprint/develop/packages/core/src/common/_variables.scss) are build-time inputs; do not assume all properties respond to runtime variables. Do not fork vendor CSS or edit dependencies.
- Keep VANTAGE tokens as the single source for both themes. Cover portalled menus/dialogs/tooltips as well as the app root; retain overlay focus management and intentional layering above Cesium.
- Share small VANTAGE components where they encode repeated styling or behaviour. Keep CSS Modules for layouts and custom views. Avoid scattering vendor selectors across app modules or wrapping every API without a concrete need.
- Blueprint's built-in icons and loading feedback may coexist with the approved Tabler/SVG/custom assets; use a consistent symbol and treatment for each action. Retain dependency licence notices.
- During the first shell implementation stage, build a representative themed layer/filter sidebar, inspector and virtualised results table with selection/date controls and a portalled overlay. Check both themes, keyboard/focus, list-only access, 200% zoom, narrow layouts, reduced motion and streaming selection/focus stability. Include contrast and selected/disabled/error states; record customisation and performance evidence.
- Blueprint adoption is approved now. That first implementation slice validates the integration; if a component falls short, address it within this design and record a specific limitation. A visual trial and performance measurements have not yet run because this repository contains documentation only.

This decision changes the UI component choice. It adds no paid service, backend changes, new apps or reduced prototype completion requirements.

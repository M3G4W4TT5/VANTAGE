# 0001 - Prototype technology stack

Status: accepted by the project owner on 2026-09-21. The original Radix UI component choice is superseded by [decision 0002 — Blueprint](0002-blueprint-ui.md); all other choices remain in effect.

## Decision

Use the approved stack listed in [AGENTS.md](../../AGENTS.md): React/TypeScript/Vite for the interface, ASP.NET Core on .NET 10 LTS for the backend, PostgreSQL/PostGIS for persistence and CesiumJS for ATLAS visualization.

The current component library, React compatibility and theming rules are defined in [decision 0002](0002-blueprint-ui.md).

Keep one repository and the modular monolith required by [PROTOTYPE_SPEC.md](../../PROTOTYPE_SPEC.md). The React shell hosts registered apps and shared workspace/context services. ASP.NET Core serves the compiled frontend and API from one origin; Vite serves frontend development. Docker Compose supplies the reproducible container deployment.

This decision resolves previously open implementation choices. [DESIGN.md](../../DESIGN.md) continues to govern the interface, and [VANTAGE_ECOSYSTEM.md](../../VANTAGE_ECOSYSTEM.md) remains exploratory. ATLAS is the only required production app.

## Rationale

- The initial UI choice used React, Radix and custom CSS for direct visual control. Decision 0002 replaces Radix with themed Blueprint components while preserving the VANTAGE design tokens.
- ASP.NET Core supplies a consistent foundation for APIs, collector lifecycles and SignalR communication.
- PostgreSQL/PostGIS fits relational application data, timestamped observations and spatial queries; Npgsql/NetTopologySuite connects spatial operations to the backend.
- CesiumJS supports the required flat-map/globe and time-dependent visualization workflows.
- REST/OpenAPI with a generated TypeScript client supports a C# backend without manually duplicating REST client definitions.

## Consequences

- Maintain C# and TypeScript toolchains. Pin compatible stable versions during scaffolding and document actual commands in the README.
- Keep contracts language-neutral. NSwag covers REST; SignalR messages and stored/exported records retain their own versioned schemas.
- Store files behind a local persistent storage interface. Keep metadata and user configuration in PostgreSQL. Implement the required AI interface and labelled mock; optional live AI adapters remain server-side and use user credentials.
- Hosted workers need explicit persistence for restart-surviving jobs. SignalR needs application-level sequencing and reconnect recovery.
- Verify Cesium/provider format compatibility. A vector-tile source is not automatically usable as a Cesium imagery layer; use a suitable adapter or a verified equivalent free source under the specification's source-substitution rules.
- The stack does not introduce a required paid service or change prototype scope. Future-app technologies and detailed boundaries remain open.

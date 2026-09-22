# 0003 - Replaceable source adapters

Status: accepted by the project owner. The provider-adapter boundary remains in force. [Decision 0007](0007-configurable-connections.md), approved 2026-09-22, extends registration/configuration to editable connection instances; it does not replace capability contracts.

## Decision

Every source must be integrated through a replaceable adapter from the outset. This includes different forms of data access: APIs, live streams, imagery/tiles, media, catalogs and imports. Shared services and domain views consume capability contracts, not concrete provider implementations.

Provider request/authentication logic, interpretation of configured endpoints, raw formats, field conversion and identity rules belong to the adapter. Source metadata supplies attribution, validated configuration requirements, coverage, limits and supported operations. Shared observation envelopes and persisted provenance remain independent of a particular provider. Source-specific properties retain their own validated schemas.

Replacing a provider for an existing supported capability should require an adapter and source registration/configuration changes, with the existing consumers preserved. Differences in available fields, precision, history, access rights or delivery behaviour must remain explicit. Stored records keep their original source identity and provenance after a switch.

## Implementation direction

- Use small interfaces suited to each capability, such as bounded queries, subscriptions, lookups or imagery/media access. Implement each when needed; sources need not support identical operations. Keep the existing modular monolith and dependency injection.
- Reuse collection coordination, caching, cancellation, health and retry handling where the behaviour is shared; let adapters supply provider constraints and report unsupported operations.
- Preserve the aircraft/earthquake capability boundaries established after this decision. The next configuration change replaces single-active-provider selection with a registry of saved connection instances, before expanding the catalogue. Use registered metadata for source details and retain the working map/list/inspector components and observation provenance.
- Reuse source substitution and domain revision checks when making that change. Subsequent integrations establish their adapter boundary before their UI and collection logic spread through the application.
- Keep source origin, connector type, bundled template, connection, dataset and layer distinct. NEXUS manages configuration; shared services coordinate authorized connection/dataset demand and expose it through capabilities. Configuration enables supported formats/operations, never arbitrary parsing or executable extensions.

The accepted requirement is replaceability across every source type. Interface names remain implementation choices grounded in the current slice; the approved configured-instance, secret-handling and lifecycle requirements now follow decision 0007.

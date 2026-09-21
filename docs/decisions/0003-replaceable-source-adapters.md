# 0003 - Replaceable source adapters

Status: accepted by the project owner. This makes the provider-adapter boundary in [the specification](../../PROTOTYPE_SPEC.md) explicit for all remaining development. It changes neither the approved stack nor prototype scope.

## Decision

Every source must be integrated through a replaceable adapter from the outset. This includes different forms of data access: APIs, live streams, imagery/tiles, media, catalogs and imports. Shared services and domain views consume capability contracts, not concrete provider implementations.

Provider request/authentication logic, raw formats, field conversion and identity rules belong to the adapter. Source metadata supplies attribution, configuration requirements, coverage, limits and supported operations. Shared observation envelopes and persisted provenance remain independent of a particular provider. Source-specific properties retain their own validated schemas.

Replacing a provider for an existing supported capability should require an adapter and source registration/configuration changes, with the existing consumers preserved. Differences in available fields, precision, history, access rights or delivery behaviour must remain explicit. Stored records keep their original source identity and provenance after a switch.

## Implementation direction

- Use small interfaces suited to each capability, such as bounded queries, subscriptions, lookups or imagery/media access. Implement each when needed; sources need not support identical operations. Keep the existing modular monolith and dependency injection.
- Reuse collection coordination, caching, cancellation, health and retry handling where the behaviour is shared; let adapters supply provider constraints and report unsupported operations.
- Before adding more sources, move ADSB.lol behind the aircraft capability contract and remove its remaining assumptions from shared persistence, transport schemas and UI labels. Use registered metadata for source details. Retain the working map/list/inspector behaviour and existing observation provenance.
- Use the current aircraft checks to verify this refactor. Subsequent source integrations should establish their adapter boundary before their UI and collection logic spread through the application.

The accepted requirement is replaceability across every source type. The exact interface names and source-registration layout remain implementation choices grounded in the current slice.

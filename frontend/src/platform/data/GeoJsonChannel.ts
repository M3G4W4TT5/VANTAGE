import { ObservationChannel } from './ObservationChannel';
import type { ObservationSnapshot } from './ObservationChannel';
import type { EntityRecord, SourceHealth } from './observationTypes';
import { validateContract } from '../contracts';
import { sessionService } from '../session/SessionService';

export type GeoJsonGeometry = { type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon';
  coordinates: unknown[] };
export type GeoJsonRecord = { entity: EntityRecord; observation: {
  id: string; entityId: string; sourceId: string; observedAt: string | null; retrievedAt: string;
  geometry: GeoJsonGeometry | null; locationRole: string | null; precision: { level: string };
  evidenceClass: 'reported'; properties: Record<string, unknown> | null;
  validFrom: string | null; validTo: string | null; supersedesObservationId: string | null; schemaVersion: 1;
  provenance: { sourceId: string; sourceRecordId: string; sourceUrl: string; attribution: string; licenseRef: string;
    rawRef: string; derivedFrom: string[]; transformVersion: string; transformDescription?: string | null };
}; identityRule: string; identityDescription?: string | null };
export type GeoJsonCompleteness = { returned: number; limit: number; truncated: boolean; coverage: string;
  feedRetrievedAt: string | null; providerCount: number | null; rejectedCount: number };
export type GeoJsonSource = { id: string; name: string; documentationUrl: string; termsUrl: string; attribution: string;
  capabilities: string[]; pollSeconds: number; resultLimit: number; cacheHours: number; coverage: string;
  scopeLabel: string; staleAfterSeconds: number };
export type GeoJsonBatch = { schemaVersion: 1; subscriptionId: string; sequence: number; generatedAt: string;
  reset: boolean; upserts: GeoJsonRecord[]; removals: string[]; health: SourceHealth;
  completeness: GeoJsonCompleteness; source: GeoJsonSource };
export type GeoJsonSnapshot = ObservationSnapshot<GeoJsonRecord, GeoJsonCompleteness, GeoJsonSource, SourceHealth>;

// Server validation is authoritative; this checks the independently versioned SignalR boundary.
function validGeometry(geometry: GeoJsonGeometry | null): boolean {
  if (!geometry) return true;
  let count = 0;
  const position = (value: unknown): boolean => Array.isArray(value) && value.length >= 2 && value.length <= 3 &&
    value.every(part => typeof part === 'number' && Number.isFinite(part)) &&
    value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90 && ++count <= 50000;
  const line = (value: unknown) => Array.isArray(value) && value.length >= 2 && value.every(position);
  const ring = (value: unknown) => Array.isArray(value) && value.length >= 4 && value.every(position) &&
    Array.isArray(value[0]) && Array.isArray(value[value.length - 1]) && value[0][0] === value[value.length - 1][0] &&
    value[0][1] === value[value.length - 1][1];
  const polygon = (value: unknown) => Array.isArray(value) && value.length > 0 && value.every(ring);
  const value = geometry.coordinates;
  switch (geometry.type) {
    case 'Point': return position(value);
    case 'MultiPoint': return Array.isArray(value) && value.length > 0 && value.every(position);
    case 'LineString': return line(value);
    case 'MultiLineString': return Array.isArray(value) && value.length > 0 && value.every(line);
    case 'Polygon': return polygon(value);
    case 'MultiPolygon': return Array.isArray(value) && value.length > 0 && value.every(polygon);
  }
}

export class GeoJsonChannel extends ObservationChannel<GeoJsonRecord, GeoJsonCompleteness, GeoJsonSource, SourceHealth, GeoJsonBatch> {
  constructor(readonly connectionId: string, readonly workspaceId: string, released: () => void = () => {}) {
    super({ method: 'GeoJsonConnection', args: [connectionId, workspaceId], replaceEqual: true, released,
      order: record => record.observation.retrievedAt,
      validate: value => {
        validateContract<GeoJsonBatch>('GeoJsonBatch', value);
        if (!(value as GeoJsonBatch).upserts.every(record => validGeometry(record.observation.geometry)))
          throw new Error('Invalid GeoJSON geometry batch.');
        return value as GeoJsonBatch;
      },
      initial: { records: [], transport: 'connecting', resets: 0,
        health: { state: 'loading', message: 'Connecting to the local GeoJSON service.', lastSuccessAt: null,
          nextAttemptAt: null, providerCount: null, rejectedCount: 0 },
        completeness: { returned: 0, limit: 500, truncated: false, coverage: 'Source scope is not yet available.',
          feedRetrievedAt: null, providerCount: null, rejectedCount: 0 } },
    });
  }
}
const channels = new Map<string, GeoJsonChannel>();
export function geoJsonChannel(connectionId: string, workspaceId: string) {
  const key = `${connectionId}:${workspaceId}`;
  let channel = channels.get(key);
  if (!channel) { channel = new GeoJsonChannel(connectionId, workspaceId, () => { if (channels.get(key) === channel) channels.delete(key); }); channels.set(key, channel); }
  return channel;
}
export function clearGeoJsonChannel() { for (const channel of [...channels.values()]) channel.dispose(); channels.clear(); }
sessionService.onInvalidate(clearGeoJsonChannel);

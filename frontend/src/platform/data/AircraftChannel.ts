import type { EntityRecord, ObservationEnvelope, SourceHealth } from './observationTypes';
import { ObservationChannel } from './ObservationChannel';
import type { AircraftSourceDto } from '../../api/generated/client';
import { validateContract } from '../contracts';
import { sessionService } from '../session/SessionService';

export type AircraftQuery = { longitude: number; latitude: number; radiusNm: number };
export type AircraftRecord = {
  entity: EntityRecord;
  observation: ObservationEnvelope & {
    evidenceClass: 'reported' | 'inferred';
    properties: { schemaVersion: 1; address: string; addressNamespace: string; callsign: string | null;
      registration: string | null; aircraftType: string | null; sourceType: string;
      speedMetresPerSecond: number | null; barometricAltitudeMetres: number | null; ellipsoidAltitudeMetres: number | null;
      trackDegrees: number | null; trueHeadingDegrees: number | null; onGround: boolean | null;
      positionObservedAt: string | null; containmentRadiusMetres: number | null; mlatFields: string[] };
  };
  identityRule: string; identityDescription?: string | null;
};
export type AircraftHealth = SourceHealth;
export type AircraftBatch = { schemaVersion: 1; subscriptionId: string; sequence: number; generatedAt: string;
  reset: boolean; query: AircraftQuery; upserts: AircraftRecord[]; removals: string[]; health: AircraftHealth;
  completeness: { returned: number; limit: number; truncated: boolean; coverage: string }; source: Required<AircraftSourceDto> };
export type AircraftSnapshot = { records: AircraftRecord[]; health: AircraftHealth;
  completeness: AircraftBatch['completeness']; source?: Required<AircraftSourceDto>; transport: 'connecting' | 'connected' | 'offline'; resets: number };
const initial = (): AircraftSnapshot => ({ records: [], health: { state: 'loading', message: 'Connecting to the local aircraft service.',
  lastSuccessAt: null, nextAttemptAt: null, providerCount: null, rejectedCount: 0 },
  completeness: { returned: 0, limit: 500, truncated: false, coverage: 'Source coverage is not yet available.' }, transport: 'connecting', resets: 0 });

export class AircraftChannel extends ObservationChannel<AircraftRecord, AircraftBatch['completeness'], Required<AircraftSourceDto>, AircraftHealth, AircraftBatch> {
  constructor(readonly query: AircraftQuery, readonly connectionId?: string, readonly workspaceId?: string) {
    super({ method: connectionId ? 'AircraftConnection' : 'Aircraft', args: connectionId ? [connectionId, workspaceId ?? null, query] : [query],
      initial: initial(), replaceEqual: true,
      order: record => record.observation.properties.positionObservedAt ?? record.observation.observedAt,
      validate: value => {
        validateContract<AircraftBatch>('AircraftBatch', value);
        if (queryKey(value.query) !== queryKey(query)) throw new Error('Batch belongs to another query.');
        return value;
      }, released: () => { const key = channelKey(query, connectionId, workspaceId); if (channels.get(key) === this) channels.delete(key); },
    });
  }
}
const channels = new Map<string, AircraftChannel>();
const queryKey = (query: AircraftQuery) => `${query.longitude.toFixed(2)}:${query.latitude.toFixed(2)}:${query.radiusNm}`;
const channelKey = (query: AircraftQuery, connectionId?: string, workspaceId?: string) =>
  `${connectionId ?? 'default'}:${workspaceId ?? 'global'}:${queryKey(query)}`;
export function aircraftChannel(query: AircraftQuery, connectionId?: string, workspaceId?: string) {
  const key = channelKey(query, connectionId, workspaceId); let channel = channels.get(key);
  if (!channel) { channel = new AircraftChannel(query, connectionId, workspaceId); channels.set(key, channel); }
  return channel;
}
export function clearAircraftChannels() { for (const channel of [...channels.values()]) channel.dispose(); channels.clear(); }
sessionService.onInvalidate(clearAircraftChannels);

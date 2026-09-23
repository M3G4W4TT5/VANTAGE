import { ObservationChannel } from './ObservationChannel';
import type { ObservationSnapshot } from './ObservationChannel';
import type { EntityRecord, ObservationEnvelope, SourceHealth } from './observationTypes';
import type { EarthquakeSourceDto } from '../../api/generated/client';
import { validateContract } from '../contracts';
import { sessionService } from '../session/SessionService';

// SignalR has its own v1 schema and validation, independent of the generated REST client.
export type EarthquakeRecord = {
  entity: EntityRecord;
  observation: ObservationEnvelope & {
    evidenceClass: 'reported' | 'observed' | 'inferred'; supersedesObservationId: string | null;
    properties: { schemaVersion: 1; magnitude: number | null; magnitudeType: string | null; depthKilometres: number | null;
      depthReference: string; place: string | null; sourceUpdatedAt: string | null; reviewStatus: string | null;
      eventType: string | null; network: string | null };
  };
  identityRule: string; identityDescription?: string | null;
};
export type EarthquakeCompleteness = { returned: number; limit: number; truncated: boolean; coverage: string;
  feedGeneratedAt: string | null; feedRetrievedAt: string | null; providerCount: number | null; rejectedCount: number };
export type EarthquakeBatch = { schemaVersion: 1; subscriptionId: string; sequence: number; generatedAt: string;
  reset: boolean; upserts: EarthquakeRecord[]; removals: string[]; health: SourceHealth;
  completeness: EarthquakeCompleteness; source: Required<EarthquakeSourceDto> };
export type EarthquakeSnapshot = ObservationSnapshot<EarthquakeRecord, EarthquakeCompleteness, Required<EarthquakeSourceDto>, SourceHealth>;
export class EarthquakeChannel extends ObservationChannel<EarthquakeRecord, EarthquakeCompleteness, Required<EarthquakeSourceDto>, SourceHealth, EarthquakeBatch> {
  constructor(readonly connectionId?: string, readonly workspaceId?: string, released: () => void = () => {}) {
    super({ method: connectionId ? 'EarthquakeConnection' : 'Earthquakes', args: connectionId ? [connectionId, workspaceId ?? null] : [],
      replaceEqual: false, released,
      order: record => record.observation.properties.sourceUpdatedAt,
      validate: value => { validateContract<EarthquakeBatch>('EarthquakeBatch', value); return value; },
      initial: { records: [], transport: 'connecting', resets: 0,
        health: { state: 'loading', message: 'Connecting to the local earthquake service.', lastSuccessAt: null, nextAttemptAt: null, providerCount: null, rejectedCount: 0 },
        completeness: { returned: 0, limit: 1000, truncated: false, coverage: 'Source scope is not yet available.', feedGeneratedAt: null, feedRetrievedAt: null, providerCount: null, rejectedCount: 0 } },
    });
  }
}
const channels = new Map<string, EarthquakeChannel>();
export function earthquakeChannel(connectionId?: string, workspaceId?: string) {
  const key = `${connectionId ?? 'default'}:${workspaceId ?? 'global'}`;
  let channel = channels.get(key);
  if (!channel) { channel = new EarthquakeChannel(connectionId, workspaceId, () => { if (channels.get(key) === channel) channels.delete(key); }); channels.set(key, channel); }
  return channel;
}
export function clearEarthquakeChannel() { for (const channel of [...channels.values()]) channel.dispose(); channels.clear(); }
sessionService.onInvalidate(clearEarthquakeChannel);

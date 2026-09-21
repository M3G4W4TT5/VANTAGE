import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import type { HubConnection, ISubscription } from '@microsoft/signalr';
import type { AircraftSourceDto } from '../../api/generated/client';
import { validateContract } from '../contracts';

export type AircraftQuery = { longitude: number; latitude: number; radiusNm: number };
export type AircraftRecord = {
  entity: { id: string; label: string; kind: string; externalIds: { namespace: string; value: string }[]; schemaVersion: 1 };
  observation: {
    id: string; entityId: string; sourceId: string; observedAt: string | null; retrievedAt: string;
    geometry: { type: 'Point'; coordinates: [number, number] } | null; locationRole: string | null;
    precision: { level: 'unknown' }; evidenceClass: 'reported' | 'inferred'; schemaVersion: 1;
    properties: { schemaVersion: 1; address: string; addressNamespace: string; callsign: string | null;
      registration: string | null; aircraftType: string | null; sourceType: string;
      speedMetresPerSecond: number | null; barometricAltitudeMetres: number | null; ellipsoidAltitudeMetres: number | null;
      trackDegrees: number | null; trueHeadingDegrees: number | null; onGround: boolean | null;
      positionObservedAt: string | null; containmentRadiusMetres: number | null; mlatFields: string[] };
    provenance: { sourceId: string; sourceRecordId: string; sourceUrl: string; attribution: string; licenseRef: string;
      rawRef: string; derivedFrom: string[]; transformVersion: string; transformDescription?: string | null };
  };
  identityRule: string; identityDescription?: string | null;
};
export type AircraftHealth = { state: 'loading' | 'healthy' | 'degraded' | 'offline' | 'rate_limited' | 'disabled' | 'error';
  message: string; lastSuccessAt: string | null; nextAttemptAt: string | null; providerCount: number | null; rejectedCount: number };
export type AircraftBatch = { schemaVersion: 1; subscriptionId: string; sequence: number; generatedAt: string;
  reset: boolean; query: AircraftQuery; upserts: AircraftRecord[]; removals: string[]; health: AircraftHealth;
  completeness: { returned: number; limit: number; truncated: boolean; coverage: string }; source: Required<AircraftSourceDto> };
export type AircraftSnapshot = { records: AircraftRecord[]; health: AircraftHealth;
  completeness: AircraftBatch['completeness']; source?: Required<AircraftSourceDto>; transport: 'connecting' | 'connected' | 'offline'; resets: number };
const initial = (): AircraftSnapshot => ({ records: [], health: { state: 'loading', message: 'Connecting to the local aircraft service.',
  lastSuccessAt: null, nextAttemptAt: null, providerCount: null, rejectedCount: 0 },
  completeness: { returned: 0, limit: 500, truncated: false, coverage: 'Source coverage is not yet available.' }, transport: 'connecting', resets: 0 });

// No observation is sent through ContextBus or written into workspace state.
export class AircraftChannel {
  private snapshot = initial();
  private listeners = new Set<() => void>();
  private sequence = -1;
  private subscriptionId: string | null = null;
  private connection?: HubConnection;
  private stream?: ISubscription<unknown>;
  private references = 0;
  private retry?: ReturnType<typeof setTimeout>;
  private stopTimer?: ReturnType<typeof setTimeout>;
  constructor(readonly query: AircraftQuery) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(next: AircraftSnapshot) { this.snapshot = next; this.listeners.forEach(listener => listener()); }
  acquire = () => {
    clearTimeout(this.stopTimer); this.references++;
    if (!this.connection) void this.connect();
    return () => { this.references--; if (this.references === 0) this.stopTimer = setTimeout(() => this.stop(), 200); };
  };
  private stop() {
    clearTimeout(this.retry); this.stream?.dispose(); this.stream = undefined;
    const old = this.connection; this.connection = undefined; void old?.stop();
    channels.delete(queryKey(this.query));
  }
  private async connect() {
    const connection = new HubConnectionBuilder().withUrl('/hubs/observations')
      .withAutomaticReconnect([0, 2000, 5000, 15000, 30000]).configureLogging(LogLevel.None).build();
    this.connection = connection;
    connection.onreconnecting(() => this.disconnected('Connection lost. Keeping cached observations while reconnecting.'));
    connection.onreconnected(() => { if (this.connection === connection && this.references) this.openStream(); });
    connection.onclose(() => {
      if (this.connection !== connection) return;
      this.connection = undefined; this.disconnected('Local service is offline. Retrying in five seconds.');
      this.retry = setTimeout(() => { if (this.references) void this.connect(); }, 5000);
    });
    try {
      await connection.start();
      if (this.connection === connection && this.references) this.openStream(); else await connection.stop();
    } catch {
      if (this.connection !== connection) return;
      this.connection = undefined; this.disconnected('Could not connect to the local service. Retrying in five seconds.');
      clearTimeout(this.retry); this.retry = setTimeout(() => { if (this.references) void this.connect(); }, 5000);
    }
  }
  private disconnected(message: string) {
    this.publish({ ...this.snapshot, transport: 'offline', health: { ...this.snapshot.health, message } });
  }
  private openStream() {
    this.stream?.dispose(); this.sequence = -1; this.subscriptionId = null;
    this.stream = this.connection!.stream<unknown>('Aircraft', this.query).subscribe({
      next: value => {
        try { if (this.accept(value) === 'gap') this.recover('A subscription gap was detected. Requesting a fresh snapshot.'); }
        catch { this.recover('An invalid data batch was rejected. Requesting a fresh snapshot.'); }
      },
      error: () => this.recover('The aircraft subscription ended. Retrying with a fresh snapshot.'),
      complete: () => { /* Disposal and transport reconnection are handled separately. */ },
    });
  }
  private recover(message: string) {
    this.disconnected(message); clearTimeout(this.retry);
    this.stream?.dispose(); this.stream = undefined;
    this.retry = setTimeout(() => { if (this.references && this.connection?.state === 'Connected') this.openStream(); }, 2000);
  }
  // Public for the deterministic sequence/recovery test; all wire data is validated before mutation.
  accept(value: unknown): 'accepted' | 'duplicate' | 'gap' {
    validateContract<AircraftBatch>('AircraftBatch', value);
    if (queryKey(value.query) !== queryKey(this.query)) throw new Error('Batch belongs to another query.');
    if (!value.reset && (value.subscriptionId !== this.subscriptionId || this.sequence < 0)) return 'gap';
    if (value.subscriptionId === this.subscriptionId && value.sequence <= this.sequence) return 'duplicate';
    if (!value.reset && value.sequence !== this.sequence + 1) return 'gap';
    if (!value.reset && this.snapshot.source?.id !== value.source.id) return 'gap';
    const records = new Map(value.reset ? [] : this.snapshot.records.map(record => [record.entity.id, record]));
    value.removals.forEach(id => records.delete(id));
    for (const record of value.upserts) {
      if (record.observation.sourceId !== value.source.id || record.observation.provenance.sourceId !== value.source.id) throw new Error('Mismatched source identity.');
      if (record.entity.id !== record.observation.entityId) throw new Error('Mismatched observation identity.');
      const old = records.get(record.entity.id);
      const stamp = record.observation.properties.positionObservedAt ?? record.observation.observedAt;
      const oldStamp = old?.observation.properties.positionObservedAt ?? old?.observation.observedAt;
      if (oldStamp && (!stamp || Date.parse(stamp) < Date.parse(oldStamp))) continue;
      records.set(record.entity.id, record);
    }
    if (records.size > value.source.resultLimit || records.size > value.completeness.limit) throw new Error('Aircraft result limit exceeded.');
    this.subscriptionId = value.subscriptionId; this.sequence = value.sequence;
    this.publish({ records: [...records.values()], health: value.health, completeness: value.completeness, source: value.source,
      transport: 'connected', resets: this.snapshot.resets + (value.reset ? 1 : 0) });
    return 'accepted';
  }
}
const channels = new Map<string, AircraftChannel>();
const queryKey = (query: AircraftQuery) => `${query.longitude.toFixed(2)}:${query.latitude.toFixed(2)}:${query.radiusNm}`;
export function aircraftChannel(query: AircraftQuery) {
  const key = queryKey(query); let channel = channels.get(key);
  if (!channel) { channel = new AircraftChannel(query); channels.set(key, channel); }
  return channel;
}

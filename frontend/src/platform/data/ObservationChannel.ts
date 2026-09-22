import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import type { HubConnection, ISubscription } from '@microsoft/signalr';
import { sessionBoundary, sessionService } from '../session/SessionService';
import { SessionHttpClient } from '../session/SessionHttpClient';

// No observation is sent through ContextBus or written into workspace state.
export type ObservationRecord = { entity: { id: string }; observation: { id: string; entityId: string; sourceId: string; provenance: { sourceId: string } } };
export type ObservationHealth = { state: string; message: string };
export type ObservationBatch<R extends ObservationRecord, C, S extends { id: string; resultLimit: number }> = {
  reset: boolean; subscriptionId: string; sequence: number; upserts: R[]; removals: string[];
  health: ObservationHealth; completeness: C & { limit: number }; source: S;
};
export type ObservationSnapshot<R, C, S, H> = { records: R[]; health: H; completeness: C; source?: S; transport: 'connecting' | 'connected' | 'offline'; resets: number };
export class ObservationChannel<R extends ObservationRecord, C extends { limit: number }, S extends { id: string; resultLimit: number }, H extends ObservationHealth, B extends ObservationBatch<R, C, S> & { health: H }> {
  private snapshot: ObservationSnapshot<R, C, S, H>;
  private listeners = new Set<() => void>();
  private sequence = -1;
  private subscriptionId: string | null = null;
  private connection?: HubConnection;
  private stream?: ISubscription<unknown>;
  private references = 0;
  private retry?: ReturnType<typeof setTimeout>;
  private stopTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private boundary: string | null = null;
  private releaseSession?: () => void;
  constructor(private options: {
    method: string; args: unknown[]; initial: ObservationSnapshot<R, C, S, H>;
    validate(value: unknown): B; order(record: R): string | null; replaceEqual: boolean; released(): void;
  }) { this.snapshot = options.initial; }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(next: ObservationSnapshot<R, C, S, H>) { this.snapshot = next; this.listeners.forEach(listener => listener()); }
  acquire = () => {
    if (this.disposed) throw new Error('This observation cache has been released.');
    this.boundary = sessionBoundary(sessionService.getSnapshot().session);
    sessionService.assertCurrent(this.boundary);
    if (!sessionService.getSnapshot().session?.user.canUseData) throw new Error('Data access is unavailable for this account.');
    this.releaseSession ??= sessionService.onInvalidate(() => this.dispose());
    clearTimeout(this.stopTimer); this.references++;
    if (!this.connection) void this.connect();
    let released = false;
    return () => { if (released || this.disposed) return; released = true; this.references--; if (this.references === 0) this.stopTimer = setTimeout(() => this.dispose(), 200); };
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.references = 0;
    clearTimeout(this.retry); clearTimeout(this.stopTimer);
    this.releaseSession?.(); this.releaseSession = undefined;
    this.stream?.dispose(); this.stream = undefined;
    const old = this.connection; this.connection = undefined; void old?.stop();
    this.sequence = -1; this.subscriptionId = null;
    this.publish({ ...this.options.initial, records: [], transport: 'offline', health: { ...this.options.initial.health, message: 'Session or subscription ended.' } });
    this.listeners.clear();
    this.options.released();
  }
  private async connect() {
    if (this.disposed) return;
    const connection = new HubConnectionBuilder().withUrl('/hubs/observations', { httpClient: new SessionHttpClient() })
      .withAutomaticReconnect([0, 2000, 5000, 15000, 30000]).configureLogging(LogLevel.None).build();
    this.connection = connection;
    connection.onreconnecting(() => { if (!this.disposed) this.disconnected('Connection lost. Keeping cached observations while reconnecting.'); });
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
    if (this.disposed) return;
    try { sessionService.assertCurrent(this.boundary); } catch { this.dispose(); return; }
    this.stream?.dispose(); this.sequence = -1; this.subscriptionId = null;
    this.stream = this.connection!.stream<unknown>(this.options.method, ...this.options.args).subscribe({
      next: value => {
        if (this.disposed) return;
        try { sessionService.assertCurrent(this.boundary); } catch { this.dispose(); return; }
        try { if (this.accept(value) === 'gap') this.recover('A subscription gap was detected. Requesting a fresh snapshot.'); }
        catch { this.recover('An invalid data batch was rejected. Requesting a fresh snapshot.'); }
      },
      error: () => this.recover('The observation subscription ended. Retrying with a fresh snapshot.'),
      complete: () => { /* Disposal and transport reconnection are handled separately. */ },
    });
  }
  private recover(message: string) {
    if (this.disposed) return;
    this.disconnected(message); clearTimeout(this.retry);
    this.stream?.dispose(); this.stream = undefined;
    this.retry = setTimeout(() => { if (this.references && this.connection?.state === 'Connected') this.openStream(); }, 2000);
  }
  // Public for the deterministic sequence/recovery test; all wire data is validated before mutation.
  accept(value: unknown): 'accepted' | 'duplicate' | 'gap' {
    if (this.disposed) throw new Error('This observation cache has been released.');
    const batch = this.options.validate(value);
    if (!batch.reset && (batch.subscriptionId !== this.subscriptionId || this.sequence < 0)) return 'gap';
    if (batch.subscriptionId === this.subscriptionId && batch.sequence <= this.sequence) return 'duplicate';
    if (!batch.reset && batch.sequence !== this.sequence + 1) return 'gap';
    if (!batch.reset && this.snapshot.source?.id !== batch.source.id) return 'gap';
    const records = new Map(batch.reset ? [] : this.snapshot.records.map(record => [record.entity.id, record]));
    batch.removals.forEach(id => records.delete(id));
    for (const record of batch.upserts) {
      if (record.observation.sourceId !== batch.source.id || record.observation.provenance.sourceId !== batch.source.id) throw new Error('Mismatched source identity.');
      if (record.entity.id !== record.observation.entityId) throw new Error('Mismatched observation identity.');
      const old = records.get(record.entity.id);
      const stamp = this.options.order(record);
      const oldStamp = old ? this.options.order(old) : null;
      if (old && ((oldStamp && (!stamp || Date.parse(stamp) < Date.parse(oldStamp))) ||
        (!this.options.replaceEqual && stamp === oldStamp))) continue;
      records.set(record.entity.id, record);
    }
    if (records.size > batch.source.resultLimit || records.size > batch.completeness.limit) throw new Error('Observation result limit exceeded.');
    this.subscriptionId = batch.subscriptionId; this.sequence = batch.sequence;
    this.publish({ records: [...records.values()], health: batch.health, completeness: batch.completeness, source: batch.source,
      transport: 'connected', resets: this.snapshot.resets + (batch.reset ? 1 : 0) });
    return 'accepted';
  }
}

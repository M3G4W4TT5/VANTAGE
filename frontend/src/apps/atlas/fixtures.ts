export type DemoRecord = {
  id: string; label: string; kind: 'Aircraft' | 'Vessel' | 'Place'; layerId: string;
  observedAt: string; latitude: number | null; longitude: number | null; speed: number | null;
  observationId: string; evidenceClass: 'demo';
};
export const fixtureTime = '2026-09-21T12:00:00.000Z';
export const layers = [
  { id: 'demo-aircraft', label: 'Aircraft', icon: 'airplane' as const, count: 24 },
  { id: 'demo-vessels', label: 'Vessels', icon: 'ship' as const, count: 16 },
  { id: 'demo-places', label: 'Places', icon: 'map-marker' as const, count: 12 },
];
/** Original synthetic fixtures; no provider data, real identifiers or inferred ownership. */
export const records: DemoRecord[] = layers.flatMap((layer, domain) => Array.from({ length: layer.count }, (_, i) => ({
  id: `demo-${domain}-${i + 1}`, label: `${['Demo flight', 'Demo vessel', 'Demo place'][domain]} ${String(i + 1).padStart(2, '0')}`,
  kind: ['Aircraft', 'Vessel', 'Place'][domain] as DemoRecord['kind'], layerId: layer.id,
  observedAt: fixtureTime, latitude: i % 7 === 0 ? null : 54 + (i % 10) * .2,
  longitude: i % 7 === 0 ? null : 10 + (i % 12) * .3,
  speed: domain === 2 || i % 5 === 0 ? null : domain === 0 ? 210 + i : 4 + i / 10,
  observationId: `demo-observation-${domain}-${i + 1}-v1`, evidenceClass: 'demo' as const,
})));

export class FixtureStore {
  private items = records;
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setInterval>;
  private tick = 0;
  getSnapshot = () => this.items;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  preview() {
    this.stop();
    this.timer = setInterval(() => {
      this.tick++;
      const first = this.tick * 10 % this.items.length;
      this.items = this.items.map((record, i) => (i - first + this.items.length) % this.items.length < 10 && record.speed !== null
        ? { ...record, speed: records[i].speed! + (this.tick % 5) / 10, observationId: `${records[i].observationId}-preview-${this.tick}` } : record);
      this.listeners.forEach(fn => fn());
    }, 100);
  }
  stop() { clearInterval(this.timer); this.timer = undefined; }
}

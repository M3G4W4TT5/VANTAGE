import type { EarthquakeRecord, EarthquakeSnapshot } from '../../platform/data/EarthquakeChannel';
import type { ResultColumn } from '../../platform/ui/ResultsTable';
import type { PointMarker } from '../../platform/maps/PointMarkers';
import type { EarthquakeSettings } from './atlasModule';
import { utc } from '../../platform/ui/format';
export const defaultEarthquakeSettings: EarthquakeSettings = { query: '', minimumMagnitude: null, maxAgeHours: null, sort: 'occurred' };
export const magnitudeStyle = (magnitude: number | null) => magnitude === null ? { size: 18, colour: '--text-muted' } :
  magnitude < 4 ? { size: 22, colour: '--event-low' } : magnitude < 6 ? { size: 28, colour: '--event-moderate' } : { size: 36, colour: '--event-high' };
export function earthquakeMarker(record: EarthquakeRecord): PointMarker | null {
  const o = record.observation;
  if (!o.geometry) return null;
  return { reference: { entityId: record.entity.id, observationId: o.id }, longitude: o.geometry.coordinates[0], latitude: o.geometry.coordinates[1],
    symbol: 'event', missingInformation: o.properties.magnitude === null || o.properties.depthKilometres === null || o.observedAt === null, ...magnitudeStyle(o.properties.magnitude) };
}
export function matchesEarthquake(record: EarthquakeRecord, settings: EarthquakeSettings, now: number) {
  const o = record.observation; const p = o.properties;
  return `${record.entity.label} ${o.provenance.sourceRecordId} ${p.place ?? ''}`.toLowerCase().includes(settings.query.toLowerCase()) &&
    (settings.minimumMagnitude === null || (p.magnitude !== null && p.magnitude >= settings.minimumMagnitude)) &&
    (settings.maxAgeHours === null || (o.observedAt !== null && now - Date.parse(o.observedAt) <= settings.maxAgeHours * 3600000));
}
export function earthquakeHealth(snapshot: EarthquakeSnapshot, now: number) {
  if (snapshot.transport !== 'connected') return snapshot.transport;
  if (snapshot.health.state !== 'healthy') return snapshot.health.state === 'degraded' ? 'partial' : snapshot.health.state;
  const generated = snapshot.completeness.feedGeneratedAt;
  return !generated ? 'freshness unknown' : now - Date.parse(generated) > (snapshot.source?.staleAfterSeconds ?? 180) * 1000 ? 'stale' : 'healthy';
}
export const earthquakeColumns: ResultColumn<EarthquakeRecord>[] = [
  { id: 'label', label: 'Location', width: 240, value: r => r.entity.label },
  { id: 'magnitude', label: 'Magnitude', width: 110, value: r => r.observation.properties.magnitude?.toFixed(1) ?? 'Unknown' },
  { id: 'type', label: 'Magnitude type', width: 120, value: r => r.observation.properties.magnitudeType ?? 'Unknown' },
  { id: 'depth', label: 'Depth · km', width: 120, value: r => r.observation.properties.depthKilometres?.toFixed(1) ?? 'Unknown' },
  { id: 'occurred', label: 'Occurred · UTC', width: 210, value: r => utc(r.observation.observedAt) },
  { id: 'updated', label: 'Source updated · UTC', width: 210, value: r => utc(r.observation.properties.sourceUpdatedAt) },
  { id: 'retrieved', label: 'Version retrieved · UTC', width: 210, value: r => utc(r.observation.retrievedAt) },
  { id: 'source', label: 'Provenance · source / event ID', width: 240, value: r => `${r.observation.sourceId} / ${r.observation.provenance.sourceRecordId}` },
];

import type { GeoJsonBatch, GeoJsonGeometry, GeoJsonRecord } from '../../src/platform/data/GeoJsonChannel';

export function geoJsonRecord(id: string, geometry: GeoJsonGeometry | null, sourceId = 'fixture.geojson'): GeoJsonRecord {
  const now = '2026-09-23T10:00:00Z';
  const entityId = `geojson:${sourceId}:${id}`;
  const observationId = `obs:${sourceId}:${id}`;
  return { entity: { id: entityId, kind: 'geojson-feature', label: id, externalIds: [{ namespace: sourceId, value: id }], schemaVersion: 1 },
    identityRule: 'source-feature-id/v1', identityDescription: 'Fixture declared ID.',
    observation: { id: observationId, entityId, sourceId, schemaVersion: 1, observedAt: null, retrievedAt: now,
      geometry, locationRole: geometry ? 'source_geometry' : null, precision: { level: 'unknown' },
      evidenceClass: 'reported', properties: { fixture: true }, validFrom: null, validTo: null, supersedesObservationId: null,
      provenance: { sourceId, sourceRecordId: id, sourceUrl: 'https://feed.example.org/current.geojson',
        attribution: 'Original synthetic fixture', licenseRef: 'https://feed.example.org/terms', rawRef: observationId,
        derivedFrom: [], transformVersion: 'http-geojson/v1' } } };
}

export function geoJsonFixture(records: GeoJsonRecord[] = [
  geoJsonRecord('TEST POINT', { type: 'Point', coordinates: [12, 58] }),
  geoJsonRecord('TEST LINE', { type: 'LineString', coordinates: [[12, 58], [13, 59]] }),
  geoJsonRecord('TEST AREA', { type: 'Polygon', coordinates: [[[12, 58], [13, 58], [13, 59], [12, 58]]] }),
  geoJsonRecord('TEST UNKNOWN', null),
], sourceId = 'fixture.geojson'): GeoJsonBatch {
  const now = '2026-09-23T10:00:00Z';
  return { schemaVersion: 1, subscriptionId: `${sourceId}-subscription`, sequence: 0, generatedAt: now,
    reset: true, upserts: records, removals: [],
    health: { state: 'healthy', message: 'Synthetic GeoJSON response.', lastSuccessAt: now, nextAttemptAt: null,
      providerCount: records.length, rejectedCount: 0 },
    completeness: { returned: records.length, limit: 500, truncated: false, coverage: 'Synthetic fixture area.',
      feedRetrievedAt: now, providerCount: records.length, rejectedCount: 0 },
    source: { id: sourceId, name: 'Synthetic GeoJSON source', documentationUrl: 'https://feed.example.org/current.geojson',
      termsUrl: 'https://feed.example.org/terms', attribution: 'Original synthetic fixture', capabilities: ['current_catalog', 'point_line_polygon'],
      pollSeconds: 120, resultLimit: 500, cacheHours: 48, coverage: 'Synthetic fixture area.', scopeLabel: 'Fixture snapshot', staleAfterSeconds: 360 } };
}

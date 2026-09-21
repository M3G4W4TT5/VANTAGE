import type { AircraftBatch, AircraftRecord } from '../../src/platform/data/AircraftChannel';
// Synthetic wire fixtures, used only in tests. Browser tests never reach ADSB.lol.
export function aircraftFixture(sequence = 0, reset = true, speed = 100): AircraftBatch {
  const time = '2026-09-21T12:00:00.000Z';
  const observationTime = new Date(Date.parse(time) + sequence * 1000).toISOString();
  const record: AircraftRecord = { entity: { id: 'fixture-provider:abcdef', kind: 'aircraft', label: 'TEST01', externalIds: [{ namespace: 'icao24', value: 'abcdef' }], schemaVersion: 1 },
    observation: { id: `obs:fixture-${sequence}`, entityId: 'fixture-provider:abcdef', sourceId: 'fixture-provider', observedAt: observationTime, retrievedAt: observationTime,
      geometry: { type: 'Point', coordinates: [12, 58] }, locationRole: 'physical_asset', precision: { level: 'unknown' }, evidenceClass: 'reported', schemaVersion: 1,
      properties: { schemaVersion: 1, address: 'abcdef', addressNamespace: 'icao24', callsign: 'TEST01', registration: null, aircraftType: null,
        sourceType: 'adsb_icao', speedMetresPerSecond: speed, barometricAltitudeMetres: 3048, ellipsoidAltitudeMetres: null, trackDegrees: 0,
        trueHeadingDegrees: null, onGround: false, positionObservedAt: observationTime, containmentRadiusMetres: null, mlatFields: [] },
      provenance: { sourceId: 'fixture-provider', sourceRecordId: 'abcdef', sourceUrl: 'https://example.com/aircraft', attribution: 'Synthetic test fixture',
        licenseRef: 'https://example.com/terms', rawRef: `obs:fixture-${sequence}`, derivedFrom: [], transformVersion: 'fixture-provider/v1' } }, identityRule: 'fixture-provider-address/v1' };
  return { schemaVersion: 1, subscriptionId: 'test-aircraft', sequence, generatedAt: observationTime, reset,
    query: { longitude: 12, latitude: 58, radiusNm: 250 }, upserts: [record], removals: [],
    health: { state: 'healthy', message: 'Synthetic browser fixture; no live provider request.', lastSuccessAt: time, nextAttemptAt: null, providerCount: 1, rejectedCount: 0 },
    source: { id: 'fixture-provider', name: 'Synthetic alternate provider', documentationUrl: 'https://example.com/', termsUrl: 'https://example.com/terms', attribution: 'Synthetic test fixture', capabilities: ['bounded_query'], pollSeconds: 45, maximumRadiusNm: 300, minimumRadiusNm: 10, resultLimit: 20, cacheHours: 24, coverage: 'Synthetic coverage.' },
    completeness: { returned: 1, limit: 20, truncated: false, coverage: 'Test fixture only.' } };
}

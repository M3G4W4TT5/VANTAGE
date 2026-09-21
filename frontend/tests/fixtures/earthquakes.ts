import type { EarthquakeBatch } from '../../src/platform/data/EarthquakeChannel';
export function earthquakeFixture(sequence = 0, reset = true, magnitude: number | null = 4.2): EarthquakeBatch {
  const now = new Date().toISOString(); const occurred = new Date(Date.now() - 3600000).toISOString();
  const id = `obs:quake-${sequence}`;
  return { schemaVersion: 1, subscriptionId: 'earthquake-test', sequence, generatedAt: now, reset, removals: [],
    source: { id: 'quake-fixture', name: 'Synthetic earthquake source', documentationUrl: 'https://example.com/', termsUrl: 'https://example.com/terms',
      attribution: 'Original test fixture', capabilities: ['current_catalog'], pollSeconds: 60, resultLimit: 1000, cacheHours: 48,
      coverage: 'Synthetic source coverage. Not a live integration.', scopeLabel: 'Past day · M2.5+ · worldwide', staleAfterSeconds: 180 },
    health: { state: 'healthy', message: 'Synthetic source snapshot received.', lastSuccessAt: now, nextAttemptAt: null, providerCount: 1, rejectedCount: 0 },
    completeness: { returned: 1, limit: 1000, truncated: false, coverage: 'Synthetic source coverage.', feedGeneratedAt: now, feedRetrievedAt: now, providerCount: 1, rejectedCount: 0 },
    upserts: [{ entity: { id: 'quake-fixture:event1', kind: 'earthquake', label: 'TEST EPICENTRE', externalIds: [{ namespace: 'fixture:event', value: 'event1' }], schemaVersion: 1 },
      identityRule: 'fixture-event/v1', identityDescription: 'Synthetic provider event ID.',
      observation: { id, entityId: 'quake-fixture:event1', sourceId: 'quake-fixture', schemaVersion: 1, observedAt: occurred, retrievedAt: now,
        geometry: { type: 'Point', coordinates: [12, 58] }, locationRole: 'epicentre', precision: { level: 'unknown' }, evidenceClass: 'reported', supersedesObservationId: sequence ? 'obs:quake-0' : null,
        properties: { schemaVersion: 1, magnitude, magnitudeType: 'mw', depthKilometres: 123.4, depthReference: 'Synthetic reference', place: 'TEST EPICENTRE', sourceUpdatedAt: now,
          reviewStatus: 'reviewed', eventType: 'earthquake', network: 'fixture' },
        provenance: { sourceId: 'quake-fixture', sourceRecordId: 'event1', sourceUrl: 'https://example.com/event1', attribution: 'Original test fixture', licenseRef: 'https://example.com/terms', rawRef: id, derivedFrom: [], transformVersion: 'fixture/v1' } } }],
  };
}

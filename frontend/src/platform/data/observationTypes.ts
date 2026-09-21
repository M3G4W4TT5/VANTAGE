export type EntityRecord = { id: string; label: string; kind: string; externalIds: { namespace: string; value: string }[]; schemaVersion: 1 };
export type ObservationEnvelope = {
  id: string; entityId: string; sourceId: string; observedAt: string | null; retrievedAt: string;
  geometry: { type: 'Point'; coordinates: [number, number] } | null; locationRole: string | null;
  precision: { level: 'unknown' }; schemaVersion: 1;
  provenance: { sourceId: string; sourceRecordId: string; sourceUrl: string; attribution: string; licenseRef: string;
    rawRef: string; derivedFrom: string[]; transformVersion: string; transformDescription?: string | null };
};
export type SourceHealth = { state: 'loading' | 'healthy' | 'degraded' | 'offline' | 'rate_limited' | 'disabled' | 'error' | 'setup_required';
  message: string; lastSuccessAt: string | null; nextAttemptAt: string | null; providerCount: number | null; rejectedCount: number };

import type { AircraftRecord } from '../../platform/data/AircraftChannel';
import type { PointMarker } from '../../platform/maps/PointMarkers';
export function aircraftMarker(record: AircraftRecord, now: number): PointMarker | null {
  const o = record.observation; if (!o.geometry) return null;
  const p = o.properties; const [longitude, latitude] = o.geometry.coordinates;
  const age = p.positionObservedAt ? now - Date.parse(p.positionObservedAt) : Infinity;
  return { reference: { entityId: record.entity.id, observationId: o.id }, longitude, latitude,
    altitudeMetres: p.ellipsoidAltitudeMetres ?? 0, symbol: 'plane', size: 24,
    colour: p.onGround === true ? '--aircraft-ground' : age > 60000 ? '--aircraft-stale' : '--accent',
    rotationDegrees: (p.trackDegrees ?? p.trueHeadingDegrees ?? 0) - 90,
    missingInformation: (p.trackDegrees ?? p.trueHeadingDegrees) === null || p.onGround === null || p.positionObservedAt === null };
}

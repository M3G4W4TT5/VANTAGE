import type { AircraftRecord } from '../../platform/data/AircraftChannel';
import type { AircraftLayer } from './atlasModule';
import { aircraftMarker } from './aircraftPresentation';

export function matchesAircraft(record: AircraftRecord, layer: AircraftLayer, now: number) {
  const p = record.observation.properties;
  const age = p.positionObservedAt ? now - Date.parse(p.positionObservedAt) : Infinity;
  const query = layer.filters.query.toLowerCase();
  return `${record.entity.label} ${p.address} ${p.registration ?? ''} ${p.aircraftType ?? ''}`.toLowerCase().includes(query) &&
    (layer.filters.freshness === 'all' || (layer.filters.freshness === 'recent' ? age <= 60000 : age > 60000));
}

export function aircraftLayerMarkers(layer: AircraftLayer, records: AircraftRecord[], now: number) {
  return records.filter(record => matchesAircraft(record, layer, now)).map(record => {
    const marker = aircraftMarker(record, now);
    return marker && { ...marker, appearanceId: `${layer.id}:${record.entity.id}`,
      reference: { ...marker.reference, layerInstanceId: layer.id },
      size: marker.size * layer.appearance.sizeScale, opacity: layer.appearance.opacity };
  }).filter(marker => marker !== null);
}

import type { EarthquakeRecord } from '../../platform/data/EarthquakeChannel';
import type { EarthquakeLayer } from './atlasModule';
import { earthquakeMarker, matchesEarthquake } from './earthquakePresentation';

export function earthquakeLayerMarkers(layer: EarthquakeLayer, records: EarthquakeRecord[], now: number) {
  return records.filter(record => matchesEarthquake(record, layer.filters, now)).map(record => {
    const marker = earthquakeMarker(record);
    return marker && { ...marker, appearanceId: `${layer.id}:${record.entity.id}`,
      reference: { ...marker.reference, layerInstanceId: layer.id },
      size: marker.size * layer.appearance.sizeScale, opacity: layer.appearance.opacity };
  }).filter(marker => marker !== null);
}

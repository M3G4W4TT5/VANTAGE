import type { GeoJsonRecord } from '../../platform/data/GeoJsonChannel';
import type { PointMarker } from '../../platform/maps/PointMarkers';
import type { GeoJsonVector } from '../../platform/maps/GeoJsonVectors';
import type { GeoJsonLayer } from './atlasModule';

export function matchesGeoJson(record: GeoJsonRecord, layer: GeoJsonLayer): boolean {
  const needle = layer.filters.query.trim().toLocaleLowerCase();
  return !needle || [record.entity.label, record.observation.provenance.sourceRecordId,
    JSON.stringify(record.observation.properties)].join(' ').toLocaleLowerCase().includes(needle);
}
export function geoJsonLayerMarkers(layer: GeoJsonLayer, records: GeoJsonRecord[]): PointMarker[] {
  const markers: PointMarker[] = [];
  for (const record of records.filter(value => matchesGeoJson(value, layer))) {
    const geometry = record.observation.geometry;
    if (!geometry || geometry.type !== 'Point' && geometry.type !== 'MultiPoint') continue;
    const points = (geometry.type === 'Point' ? [geometry.coordinates] : geometry.coordinates) as number[][];
    points.forEach((point, index) => markers.push({
      reference: { entityId: record.entity.id, observationId: record.observation.id, layerInstanceId: layer.id },
      appearanceId: `${layer.id}:${record.entity.id}${index ? `:${index}` : ''}`,
      longitude: point[0], latitude: point[1], symbol: 'circle', size: 17 * layer.appearance.sizeScale,
      colour: '#40b7ab', opacity: layer.appearance.opacity,
    }));
  }
  return markers;
}
export function geoJsonLayerVectors(layer: GeoJsonLayer, records: GeoJsonRecord[]): GeoJsonVector[] {
  return records.filter(value => matchesGeoJson(value, layer)).flatMap(record => {
    const geometry = record.observation.geometry;
    if (!geometry || geometry.type === 'Point' || geometry.type === 'MultiPoint') return [];
    return [{ appearanceId: `${layer.id}:${record.entity.id}`,
      reference: { entityId: record.entity.id, observationId: record.observation.id, layerInstanceId: layer.id },
      geometry, opacity: layer.appearance.opacity }];
  });
}

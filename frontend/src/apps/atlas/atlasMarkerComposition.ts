import type { AircraftChannel } from '../../platform/data/AircraftChannel';
import type { EarthquakeChannel } from '../../platform/data/EarthquakeChannel';
import type { GeoJsonChannel } from '../../platform/data/GeoJsonChannel';
import type { PointMarker } from '../../platform/maps/PointMarkers';
import type { GeoJsonVector } from '../../platform/maps/GeoJsonVectors';
import type { AtlasLayer } from './atlasModule';
import type { AtlasChannel } from './atlasDemand';
import { layerDemandKey } from './atlasDemand';
import { aircraftLayerMarkers } from './aircraftLayerData';
import { earthquakeLayerMarkers } from './earthquakeLayerData';
import { geoJsonLayerMarkers, geoJsonLayerVectors } from './geoJsonLayerData';
import { groupId, mapRecordKey, mapVisibility } from './atlasGroups';
import type { MapVisibilityState } from './atlasGroups';

// One broken presenter does not prevent the other layer instances from painting.
export const MAP_MARKER_LIMIT = 2400;
export const MAP_LAYER_LIMIT = 600;
export const markerQuota = (activeLayerCount: number) =>
  Math.min(MAP_LAYER_LIMIT, Math.max(1, Math.floor(MAP_MARKER_LIMIT / (activeLayerCount || 1))));
export function composedMarkers(layers: AtlasLayer[], channels: Map<string, AtlasChannel>, workspaceId: string,
  now: number, failed: (layerId: string) => void, visibilityState: MapVisibilityState = {}): PointMarker[] {
  const markers: PointMarker[] = [];
  const visibility = mapVisibility(visibilityState);
  const hiddenGroups = new Set(visibilityState.hiddenMapGroupIds ?? []);
  const shownKeys = new Set(visibilityState.shownMapRecordIds ?? []);
  const hasShown = (layer: AtlasLayer) => [...shownKeys].some(key => key.startsWith(layer.id + ':'));
  const active = layers.filter(layer => layer.visible && layer.participating &&
    (!hiddenGroups.has(groupId(layer)) || hasShown(layer)));
  const quota = markerQuota(active.length);
  for (const layer of active) {
    const channel = channels.get(layerDemandKey(layer, workspaceId));
    if (!channel) continue;
    try {
      const onlyShown = hiddenGroups.has(groupId(layer));
      const candidates = layer.domain === 'aircraft' ? aircraftLayerMarkers(layer,
        (channel as AircraftChannel).getSnapshot().records.filter(record => !onlyShown || shownKeys.has(mapRecordKey(layer, record.entity.id))), now) :
        layer.domain === 'earthquakes' ? earthquakeLayerMarkers(layer, (channel as EarthquakeChannel).getSnapshot().records.filter(record =>
          !onlyShown || shownKeys.has(mapRecordKey(layer, record.entity.id))), now) :
          geoJsonLayerMarkers(layer, (channel as GeoJsonChannel).getSnapshot().records.filter(record =>
            !onlyShown || shownKeys.has(mapRecordKey(layer, record.entity.id))));
      markers.push(...candidates.filter(marker => visibility.recordShown(layer, marker.appearanceId ?? '')).slice(0, quota));
    } catch { failed(layer.id); }
  }
  return markers;
}

export const MAP_VECTOR_LIMIT = 240;
export function composedVectors(layers: AtlasLayer[], channels: Map<string, AtlasChannel>, workspaceId: string,
  failed: (layerId: string) => void, visibilityState: MapVisibilityState = {}): GeoJsonVector[] {
  const vectors: GeoJsonVector[] = [];
  const visibility = mapVisibility(visibilityState);
  const hiddenGroups = new Set(visibilityState.hiddenMapGroupIds ?? []);
  const shownKeys = new Set(visibilityState.shownMapRecordIds ?? []);
  const active = layers.filter(layer => layer.domain === 'geojson' && layer.visible && layer.participating &&
    (!hiddenGroups.has(groupId(layer)) || [...shownKeys].some(key => key.startsWith(layer.id + ':'))));
  const quota = Math.max(1, Math.floor(MAP_VECTOR_LIMIT / (active.length || 1)));
  for (const layer of active) {
    if (layer.domain !== 'geojson') continue;
    const channel = channels.get(layerDemandKey(layer, workspaceId)) as GeoJsonChannel | undefined;
    if (!channel) continue;
    try {
      const onlyShown = hiddenGroups.has(groupId(layer));
      const candidates = geoJsonLayerVectors(layer, channel.getSnapshot().records.filter(record =>
        !onlyShown || shownKeys.has(mapRecordKey(layer, record.entity.id))));
      vectors.push(...candidates.filter(vector => visibility.recordShown(layer, vector.appearanceId)).slice(0, quota));
    } catch { failed(layer.id); }
  }
  return vectors;
}

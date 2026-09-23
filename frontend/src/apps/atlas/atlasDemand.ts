import type { AircraftChannel } from '../../platform/data/AircraftChannel';
import type { EarthquakeChannel } from '../../platform/data/EarthquakeChannel';
import type { AtlasLayer } from './atlasModule';

export type AtlasChannel = AircraftChannel | EarthquakeChannel;

export function layerDemandKey(layer: AtlasLayer, workspaceId: string) {
  return JSON.stringify([layer.domain, layer.connectionId, layer.datasetId, workspaceId,
    layer.domain === 'aircraft' ? layer.query : null]);
}

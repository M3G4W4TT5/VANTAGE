import type { EarthquakeChannel, EarthquakeRecord } from '../../platform/data/EarthquakeChannel';
import { PointMap } from '../../platform/maps/PointMap';
import type { CameraState } from '../../platform/maps/PointMarkers';
import { earthquakeMarker } from './earthquakePresentation';
export function EarthquakeMap({ channel, basemapId, mode, camera, selectedId, select, setCamera, matches }: {
  channel: EarthquakeChannel; basemapId: string; mode: '2d' | '3d'; camera?: CameraState; selectedId?: string;
  select(id: string, observationId?: string): void; setCamera(camera: CameraState): void; matches(record: EarthquakeRecord): boolean;
}) {
  return <PointMap label="Earthquake map" basemapId={basemapId} mode={mode} camera={camera} selectedId={selectedId}
    setCamera={setCamera} select={reference => select(reference.entityId, reference.observationId)} subscribe={channel.subscribe}
    getMarkers={() => channel.getSnapshot().records.filter(matches).map(earthquakeMarker).filter(marker => marker !== null)}
    caption="Surface epicentres · symbol size represents magnitude · brackets mark selection" />;
}

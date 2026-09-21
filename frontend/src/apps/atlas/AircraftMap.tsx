import { Cartesian3, Color } from 'cesium';
import { aircraftMarker } from './aircraftPresentation';
import type { AircraftChannel, AircraftQuery, AircraftRecord } from '../../platform/data/AircraftChannel';
import { PointMap } from '../../platform/maps/PointMap';
import type { CameraState } from '../../platform/maps/PointMarkers';

export function AircraftMap({ basemapId, channel, mode, setMode, camera, selectedId, query, matches, select, setCamera, setQuery, follow }: {
  basemapId: string; channel: AircraftChannel; mode: '2d' | '3d'; setMode(mode: '2d' | '3d'): void; camera?: CameraState; selectedId?: string; query: AircraftQuery;
  matches(record: AircraftRecord): boolean; select(id: string, observationId?: string): void; setCamera(camera: CameraState): void;
  setQuery(query: AircraftQuery): void; follow: boolean;
}) {
  return <PointMap label="Aircraft map" basemapId={basemapId} mode={mode} setMode={setMode} camera={camera} selectedId={selectedId}
    subscribe={channel.subscribe} setCamera={setCamera} select={reference => select(reference.entityId, reference.observationId)} suppressCameraSave={follow}
    getMarkers={() => channel.getSnapshot().records.filter(matches).map(record => aircraftMarker(record, Date.now())).filter(marker => marker !== null)}
    setup={viewer => {
      const circle = viewer.entities.add({ position: Cartesian3.fromDegrees(query.longitude, query.latitude),
        ellipse: { semiMajorAxis: query.radiusNm * 1852, semiMinorAxis: query.radiusNm * 1852,
          material: Color.fromCssColorString('#8ab4f8').withAlpha(.05), outline: true, outlineColor: Color.fromCssColorString('#8ab4f8'), height: 0 } });
      return () => { if (!viewer.isDestroyed()) viewer.entities.remove(circle); };
    }}
    afterPaint={viewer => {
      const record = follow ? channel.getSnapshot().records.find(r => r.entity.id === selectedId && matches(r)) : undefined;
      if (record?.observation.geometry) {
        const [longitude, latitude] = record.observation.geometry.coordinates;
        viewer.camera.setView({ destination: Cartesian3.fromDegrees(longitude, latitude, viewer.camera.positionCartographic.height) });
      }
    }}
    action={{ label: 'Search this area', onClick: position => setQuery({ longitude: +position.longitude.toFixed(2),
      latitude: Math.max(-85, Math.min(85, +position.latitude.toFixed(2))), radiusNm: query.radiusNm }) }}
    caption={<>Circle: {query.radiusNm} NM aircraft collection area</>} />;
}

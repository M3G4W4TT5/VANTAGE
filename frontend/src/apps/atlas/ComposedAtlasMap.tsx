import { Cartesian3, Color } from 'cesium';
import type { Entity, Viewer } from 'cesium';
import { useCallback, useMemo, useRef } from 'react';
import type { AircraftChannel } from '../../platform/data/AircraftChannel';
import { PointMap } from '../../platform/maps/PointMap';
import type { CameraState, RecordReference, ViewportBounds } from '../../platform/maps/PointMarkers';
import { useSourceServices } from '../../platform/sources/SourceServices';
import type { AircraftLayer, AtlasLayer, AtlasState } from './atlasModule';
import { layerShown } from './atlasGroups';
import type { AtlasChannel } from './atlasDemand';
import { layerDemandKey } from './atlasDemand';
import { composedMarkers, composedVectors } from './atlasMarkerComposition';
import { matchesAircraft } from './aircraftLayerData';
import { PlaceSearch } from './PlaceSearch';

export function ComposedAtlasMap({ state, layers, channels, workspaceId, selectedId, follow, select, setCamera, setMode, setViewport,
  setQuery, reportFailure, basemapId, setBasemap }: {
  state: AtlasState; layers: AtlasLayer[]; channels: Map<string, AtlasChannel>; workspaceId: string;
  selectedId?: string; follow: boolean; select(reference: RecordReference): void;
  setCamera(camera: CameraState): void; setMode(mode: '2d' | '3d'): void; setViewport(bounds: ViewportBounds | null): void;
  setQuery(layer: AircraftLayer, query: AircraftLayer['query']): void; reportFailure(layerId: string): void; basemapId: string;
  setBasemap(id: string): void;
}) {
  const { placeSource } = useSourceServices();
  const selectedLayer = layers.find(layer => layer.id === state.selectedLayerId && layer.visible && layer.participating);
  const aircraft = selectedLayer?.domain === 'aircraft' ? selectedLayer : undefined;
  const queryOutline = useRef<{ viewer: Viewer; key: string; entity: Entity } | null>(null);
  const channelsList = useMemo(() => [...new Set(layers.filter(layerShown)
    .map(layer => channels.get(layerDemandKey(layer, workspaceId))).filter((channel): channel is AtlasChannel => !!channel))],
  [channels, layers, workspaceId]);
  const subscribe = useCallback((listener: () => void) => {
    const releases = channelsList.map(channel => channel.subscribe(listener));
    return () => releases.forEach(release => release());
  }, [channelsList]);
  const selectedAppearance = state.selectedLayerId && selectedId ? `${state.selectedLayerId}:${selectedId}` : undefined;
  const describePick = (reference: RecordReference) => {
    const layer = layers.find(item => item.id === reference.layerInstanceId);
    const channel = layer && channels.get(layerDemandKey(layer, workspaceId));
    const record = channel?.getSnapshot().records.find(value => value.entity.id === reference.entityId);
    return `${record?.entity.label ?? reference.entityId} · ${layer?.domain === 'aircraft' ? 'Aircraft' : layer?.domain === 'earthquakes' ? 'Earthquakes' : 'GeoJSON'} · ${layer?.id.slice(0, 8) ?? 'layer'}`;
  };
  return <PointMap label="ATLAS composed map" basemapId={basemapId} mode={state.mapMode} setMode={setMode}
    camera={state.camera} selectedId={selectedAppearance} select={select} describePick={describePick} setCamera={setCamera}
    setViewport={setViewport} drawOrderKey={layers.map(layer => layer.id).join('|')} setBasemap={setBasemap}
    subscribe={subscribe} getMarkers={() => composedMarkers(layers, channels, workspaceId, Date.now(), reportFailure, state)}
    getVectors={() => composedVectors(layers, channels, workspaceId, reportFailure, state)}
    suppressCameraSave={follow}
    afterPaint={viewer => {
      try {
        const outlineKey = aircraft ? `${aircraft.id}:${aircraft.query.longitude}:${aircraft.query.latitude}:${aircraft.query.radiusNm}` : '';
        if (queryOutline.current && (queryOutline.current.viewer !== viewer || queryOutline.current.key !== outlineKey)) {
          if (!queryOutline.current.viewer.isDestroyed()) queryOutline.current.viewer.entities.remove(queryOutline.current.entity);
          queryOutline.current = null;
        }
        if (aircraft && !queryOutline.current) {
          const entity = viewer.entities.add({ position: Cartesian3.fromDegrees(aircraft.query.longitude, aircraft.query.latitude),
            ellipse: { semiMajorAxis: aircraft.query.radiusNm * 1852, semiMinorAxis: aircraft.query.radiusNm * 1852,
              material: Color.fromCssColorString('#8ab4f8').withAlpha(.05), outline: true,
              outlineColor: Color.fromCssColorString('#8ab4f8'), height: 0 } });
          queryOutline.current = { viewer, key: outlineKey, entity };
        }
      } catch { if (aircraft) reportFailure(aircraft.id); }
      if (!follow || !aircraft || state.selectedLayerId !== aircraft.id || !selectedId) return;
      try {
        const channel = channels.get(layerDemandKey(aircraft, workspaceId)) as AircraftChannel | undefined;
        const record = channel?.getSnapshot().records.find(value => value.entity.id === selectedId && matchesAircraft(value, aircraft, Date.now()));
        if (!record?.observation.geometry) return;
        const [longitude, latitude] = record.observation.geometry.coordinates;
        viewer.camera.setView({ destination: Cartesian3.fromDegrees(longitude, latitude, viewer.camera.positionCartographic.height) });
      } catch { reportFailure(aircraft.id); }
    }}
    action={aircraft ? { label: 'Search this area', onClick: position => setQuery(aircraft, {
      longitude: +position.longitude.toFixed(2), latitude: Math.max(-85, Math.min(85, +position.latitude.toFixed(2))),
      radiusNm: aircraft.query.radiusNm }) } : { label: 'Search this area', disabled: true,
      unavailableReason: 'Select an aircraft record to change its group’s queried area.', onClick: () => {} }}
    toolContent={<PlaceSearch source={placeSource} select={place => setCamera({ longitude: place.longitude, latitude: place.latitude, height: 75000 })} />} />;
}

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Button } from '@blueprintjs/core';
import { BillboardCollection, Cartesian2, Cartesian3, Color, Ion, Math as CesiumMath, SceneMode,
  ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer, EllipsoidTerrainProvider, WebMercatorProjection } from 'cesium';
import type { Billboard } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { AircraftChannel, AircraftQuery, AircraftRecord } from '../../platform/data/AircraftChannel';
import styles from './Atlas.module.css';
import { basemapSources, offlineBasemap } from '../../connectors/sourceRegistration';
import { mountBasemap } from '../../platform/maps/mountBasemap';
import type { BasemapStatus } from '../../platform/maps/mountBasemap';

export type CameraState = { longitude: number; latitude: number; height: number };
const aircraftIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="white" stroke="#131a23" stroke-width="1.5" d="M14 3Q16 0 18 3L19 12L29 20V23L19 19L18 26L22 29V31L16 29L10 31V29L14 26L13 19L3 23V20L13 12Z"/></svg>');
const positionIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="6" fill="white" stroke="#131a23" stroke-width="2"/></svg>');
export function AircraftMap({ basemapId, channel, mode, camera, selectedId, query, matches, select, setCamera, setQuery, follow }: {
  basemapId: string; channel: AircraftChannel; mode: '2d' | '3d'; camera?: CameraState; selectedId?: string; query: AircraftQuery;
  matches(record: AircraftRecord): boolean; select(id: string): void; setCamera(camera: CameraState): void;
  setQuery(query: AircraftQuery): void; follow: boolean;
}) {
  const element = useRef<HTMLDivElement>(null); const viewerRef = useRef<Viewer | null>(null);
  const interacted = useRef(false); const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [basemap, setBasemap] = useState<BasemapStatus>(); const [attempt, setAttempt] = useState(0);
  const redraw = useRef<() => void>(() => {}); const [error, setError] = useState(''); const [ready, setReady] = useState(false);
  const selected = useEffectEvent(() => selectedId); const visible = useEffectEvent(matches); const picked = useEffectEvent(select);
  const persistCamera = useEffectEvent(setCamera); const shouldFollow = useEffectEvent(() => follow);
  const initialCamera = useEffectEvent(() => camera ?? { longitude: 12, latitude: 58, height: 2400000 });
  useEffect(() => {
    let cancelled = false; let viewer: Viewer | undefined; let handler: ScreenSpaceEventHandler | undefined;
    let frame = 0; let unsubscribe = () => {}; let removeMove = () => {}; let removeError = () => {}; let removeTiles = () => {}; let removeBasemap = () => {};
    const start = async () => {
      try {
        Ion.defaultAccessToken = '';
        if (cancelled || !element.current) return;
        viewer = new Viewer(element.current, { baseLayer: false, terrainProvider: new EllipsoidTerrainProvider(),
          // Preserve local map proportions; the default geographic projection squashes northern latitudes.
          mapProjection: new WebMercatorProjection(),
          sceneMode: mode === '2d' ? SceneMode.SCENE2D : SceneMode.SCENE3D, animation: false, timeline: false,
          baseLayerPicker: false, geocoder: false, homeButton: false, navigationHelpButton: false, sceneModePicker: false,
          fullscreenButton: false, infoBox: false, selectionIndicator: false, skyBox: false, skyAtmosphere: false,
          requestRenderMode: false, maximumRenderTimeChange: Infinity, shouldAnimate: false });
        viewerRef.current = viewer;
        setReady(false); setError('');
        const cleanup = await mountBasemap(viewer, basemapSources.find(source => source.id === basemapId), offlineBasemap,
          value => { if (!cancelled) setBasemap(value); });
        if (cancelled) { cleanup(); return; }
        removeBasemap = cleanup;
        interacted.current = false;
        viewer.scene.backgroundColor = Color.fromCssColorString('#101419');
        viewer.scene.globe.baseColor = Color.fromCssColorString('#1b222a');
        viewer.scene.globe.maximumScreenSpaceError = 1;
        removeTiles = viewer.scene.globe.tileLoadProgressEvent.addEventListener((remaining: number) => {
          if (cancelled || !viewer) return;
          // Mercator reprojection can need additional frames after the tile fetch completes.
          // Keep the renderer active until its queue drains, then return to drawing on demand.
          viewer.scene.requestRenderMode = remaining === 0;
          viewer.scene.requestRender();
          if (remaining === 0) setReady(true);
        });
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1000;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 30000000;
        const initial = initialCamera();
        viewer.camera.setView({ destination: Cartesian3.fromDegrees(initial.longitude, initial.latitude, initial.height) });
        const markers = viewer.scene.primitives.add(new BillboardCollection()) as BillboardCollection;
        const billboards = new Map<string, Billboard>();
        viewer.entities.add({ id: 'collection-area', position: Cartesian3.fromDegrees(query.longitude, query.latitude),
          ellipse: { semiMajorAxis: query.radiusNm * 1852, semiMinorAxis: query.radiusNm * 1852,
            material: Color.fromCssColorString('#66a3ff').withAlpha(0.05), outline: true, outlineColor: Color.fromCssColorString('#b2c7e8'), height: 0 } });
        const paint = () => {
          frame = 0; if (!viewer || viewer.isDestroyed()) return;
          const present = new Set<string>(); const selection = selected();
          for (const record of channel.getSnapshot().records) {
            if (!record.observation.geometry || !visible(record)) continue;
            const id = record.entity.id; present.add(id); const o = record.observation; const p = o.properties;
            const [longitude, latitude] = o.geometry!.coordinates;
            const position = Cartesian3.fromDegrees(longitude, latitude, p.ellipsoidAltitudeMetres ?? 0);
            let marker = billboards.get(id);
            if (!marker) { marker = markers.add({ id, position, image: aircraftIcon, width: 24, height: 24, disableDepthTestDistance: Number.POSITIVE_INFINITY }); billboards.set(id, marker); }
            marker.position = position; marker.rotation = -CesiumMath.toRadians(p.trackDegrees ?? 0);
            marker.image = p.trackDegrees === null ? positionIcon : aircraftIcon;
            const age = p.positionObservedAt ? Date.now() - Date.parse(p.positionObservedAt) : Infinity;
            marker.color = Color.fromCssColorString(id === selection ? '#ffffff' : age > 60000 ? '#afbacb' : '#66a3ff');
            marker.scale = id === selection ? 1.5 : 1;
            if (id === selection && shouldFollow()) {
              const height = viewer.camera.positionCartographic.height;
              viewer.camera.setView({ destination: Cartesian3.fromDegrees(longitude, latitude, height) });
            }
          }
          for (const [id, marker] of billboards) if (!present.has(id)) { markers.remove(marker); billboards.delete(id); }
          viewer.scene.requestRender();
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
        redraw.current = schedule; unsubscribe = channel.subscribe(schedule); schedule();
        handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: { position: Cartesian2 }) => {
          const hit: unknown = viewer?.scene.pick(movement.position);
          if (hit && typeof hit === 'object' && 'id' in hit && typeof hit.id === 'string' && billboards.has(hit.id)) picked(hit.id);
        }, ScreenSpaceEventType.LEFT_CLICK);
        removeMove = viewer.camera.moveEnd.addEventListener(() => {
          if (!viewer || shouldFollow() || !interacted.current) return;
          interacted.current = false;
          const p = viewer.camera.positionCartographic;
          persistCamera({ longitude: CesiumMath.toDegrees(p.longitude), latitude: CesiumMath.toDegrees(p.latitude), height: p.height });
        });
        removeError = viewer.scene.renderError.addEventListener(() => setError('Map rendering stopped. Use the list to inspect aircraft.'));
      } catch { if (!cancelled) setError('The map could not start. WebGL may be unavailable; the aircraft list remains usable.'); }
    };
    void start();
    return () => { cancelled = true; cancelAnimationFrame(frame); unsubscribe(); removeMove(); removeError(); removeTiles(); removeBasemap(); handler?.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy(); viewerRef.current = null; redraw.current = () => {}; };
  }, [channel, mode, query.longitude, query.latitude, query.radiusNm, basemapId, attempt]);
  useEffect(() => { redraw.current(); }, [selectedId, matches, follow]);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !camera) return;
    const position = viewer.camera.positionCartographic;
    if (Math.abs(CesiumMath.toDegrees(position.longitude) - camera.longitude) > .0001 ||
      Math.abs(CesiumMath.toDegrees(position.latitude) - camera.latitude) > .0001 || Math.abs(position.height - camera.height) > 1)
      viewer.camera.setView({ destination: Cartesian3.fromDegrees(camera.longitude, camera.latitude, camera.height) });
  }, [camera]);
  const centerQuery = () => {
    const position = viewerRef.current?.camera.positionCartographic;
    if (position) setQuery({ longitude: +CesiumMath.toDegrees(position.longitude).toFixed(2),
      latitude: Math.max(-85, Math.min(85, +CesiumMath.toDegrees(position.latitude).toFixed(2))), radiusNm: query.radiusNm });
  };
  return <div className={styles.map} role="region" aria-label="Aircraft map" data-ready={ready}>
    <div ref={element} className={styles.mapSurface} onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
      onPointerMove={event => { const start = pointerStart.current; if (event.buttons && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) interacted.current = true; }}
      onPointerUp={() => { pointerStart.current = null; }} onPointerCancel={() => { pointerStart.current = null; }} onWheel={() => { interacted.current = true; }} onKeyDown={() => { interacted.current = true; }} />
    <div className={styles.mapTools}>
      <Button small icon="search-around" onClick={centerQuery} disabled={!ready}>Search this area</Button>
      <Button small icon="plus" aria-label="Zoom in" onClick={() => { interacted.current = true; viewerRef.current?.camera.zoomIn(viewerRef.current.camera.positionCartographic.height * .4); }} />
      <Button small icon="minus" aria-label="Zoom out" onClick={() => { interacted.current = true; viewerRef.current?.camera.zoomOut(viewerRef.current.camera.positionCartographic.height * .6); }} />
    </div>
    <div className={styles.mapCaption}>{basemap?.name ?? 'Loading basemap'}{basemap?.offline && ' · coarse map'}<br />Circle: {query.radiusNm} NM aircraft collection area</div>
    {!ready && !error && <div className={styles.mapNotice} role="status">Loading the map…</div>}
    {basemap?.message && <div className={styles.basemapStatus} role="status">{basemap.message}
      <Button small minimal onClick={() => setAttempt(n => n + 1)}>Retry basemap</Button></div>}
    {error && <div className={styles.mapNotice} role="alert">{error}</div>}
  </div>;
}

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@blueprintjs/core';
import { Cartesian2, Cartesian3, Color, Ion, Math as CesiumMath, SceneMode,
  ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer, EllipsoidTerrainProvider, WebMercatorProjection } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { PointMarkers, northernEuropeCamera } from './PointMarkers';
import type { CameraState, PointMarker, RecordReference } from './PointMarkers';
import { UiIcon } from '../ui/UiIcon';
import { useSourceServices } from '../sources/SourceServices';
import styles from './PointMap.module.css';
import { mountBasemap } from './mountBasemap';
import type { BasemapStatus } from './mountBasemap';

export function PointMap({ label, basemapId, subscribe, getMarkers, mode, camera, selectedId, select, setCamera,
  setup, afterPaint, suppressCameraSave = false, action, caption }: {
  label: string; basemapId: string; mode: '2d' | '3d'; camera?: CameraState; selectedId?: string;
  subscribe(listener: () => void): () => void; getMarkers(): PointMarker[];
  select(reference: RecordReference): void; setCamera(camera: CameraState): void;
  setup?(viewer: Viewer): () => void; afterPaint?(viewer: Viewer): void; suppressCameraSave?: boolean;
  action?: { label: string; onClick(camera: CameraState): void }; caption?: ReactNode;
}) {
  const { basemapSources, offlineBasemap } = useSourceServices();
  const element = useRef<HTMLDivElement>(null); const viewerRef = useRef<Viewer | null>(null);
  const interacted = useRef(false); const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [basemap, setBasemap] = useState<BasemapStatus>(); const [attempt, setAttempt] = useState(0);
  const redraw = useRef<() => void>(() => {}); const [error, setError] = useState(''); const [ready, setReady] = useState(false);
  const selected = useEffectEvent(() => selectedId); const points = useEffectEvent(getMarkers); const picked = useEffectEvent(select);
  const persistCamera = useEffectEvent(setCamera); const skipSave = useEffectEvent(() => suppressCameraSave);
  const paintDomain = useEffectEvent((viewer: Viewer) => afterPaint?.(viewer));
  const setupDomain = useEffectEvent((viewer: Viewer) => setup?.(viewer) ?? (() => {}));
  const initialCamera = useEffectEvent(() => camera ?? northernEuropeCamera);
  useEffect(() => {
    let cancelled = false; let viewer: Viewer | undefined; let handler: ScreenSpaceEventHandler | undefined;
    let frame = 0; let removeDomain = () => {}; let markers: PointMarkers | undefined; let theme: MutationObserver | undefined; let unsubscribe = () => {}; let removeMove = () => {}; let removeError = () => {}; let removeTiles = () => {}; let removeBasemap = () => {};
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
        markers = new PointMarkers(viewer);
        removeDomain = setupDomain(viewer);
        const paint = () => {
          frame = 0; if (!viewer || viewer.isDestroyed()) return;
          markers?.update(points(), selected()); paintDomain(viewer);
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
        redraw.current = schedule; unsubscribe = subscribe(schedule); schedule();
        theme = new MutationObserver(schedule);
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: { position: Cartesian2 }) => {
          const hit: unknown = viewer?.scene.pick(movement.position);
          if (hit && typeof hit === 'object' && 'id' in hit) { const reference = markers?.pick(hit.id); if (reference) picked(reference); }
        }, ScreenSpaceEventType.LEFT_CLICK);
        removeMove = viewer.camera.moveEnd.addEventListener(() => {
          if (!viewer || skipSave() || !interacted.current) return;
          interacted.current = false;
          const p = viewer.camera.positionCartographic;
          persistCamera({ longitude: CesiumMath.toDegrees(p.longitude), latitude: CesiumMath.toDegrees(p.latitude), height: p.height });
        });
        removeError = viewer.scene.renderError.addEventListener(() => setError('Map rendering stopped. Use the list to inspect records.'));
      } catch { if (!cancelled) setError('The map could not start. WebGL may be unavailable; the list remains usable.'); }
    };
    void start();
    return () => { cancelled = true; cancelAnimationFrame(frame); unsubscribe(); theme?.disconnect(); removeDomain(); markers?.dispose(); removeMove(); removeError(); removeTiles(); removeBasemap(); handler?.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy(); viewerRef.current = null; redraw.current = () => {}; };
  }, [subscribe, mode, basemapId, attempt, basemapSources, offlineBasemap]);
  useEffect(() => { redraw.current(); }, [selectedId, getMarkers, afterPaint]);
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !camera) return;
    const position = viewer.camera.positionCartographic;
    if (Math.abs(CesiumMath.toDegrees(position.longitude) - camera.longitude) > .0001 ||
      Math.abs(CesiumMath.toDegrees(position.latitude) - camera.latitude) > .0001 || Math.abs(position.height - camera.height) > 1)
      viewer.camera.setView({ destination: Cartesian3.fromDegrees(camera.longitude, camera.latitude, camera.height) });
  }, [camera]);
  const getCamera = () => {
    const position = viewerRef.current?.camera.positionCartographic;
    return position ? { longitude: CesiumMath.toDegrees(position.longitude), latitude: CesiumMath.toDegrees(position.latitude), height: position.height } : undefined;
  };
  return <div className={styles.map} role="region" aria-label={label} data-ready={ready}>
    <div ref={element} className={styles.mapSurface} onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
      onPointerMove={event => { const start = pointerStart.current; if (event.buttons && start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) interacted.current = true; }}
      onPointerUp={() => { pointerStart.current = null; }} onPointerCancel={() => { pointerStart.current = null; }} onWheel={() => { interacted.current = true; }} onKeyDown={() => { interacted.current = true; }} />
    <div className={styles.mapTools}>
      {action && <Button small icon={<UiIcon name="search" />} disabled={!ready} onClick={() => { const current = getCamera(); if (current) action.onClick(current); }}>{action.label}</Button>}
      <Button small icon={<UiIcon name="plus" />} aria-label="Zoom in" onClick={() => { interacted.current = true; viewerRef.current?.camera.zoomIn(viewerRef.current.camera.positionCartographic.height * .4); }} />
      <Button small icon={<UiIcon name="minus" />} aria-label="Zoom out" onClick={() => { interacted.current = true; viewerRef.current?.camera.zoomOut(viewerRef.current.camera.positionCartographic.height * .6); }} />
    </div>
    <div className={styles.mapCaption}>{basemap?.name ?? 'Loading basemap'}{basemap?.offline && ' · coarse map'}{caption && <><br />{caption}</>}</div>
    {!ready && !error && <div className={styles.mapNotice} role="status">Loading the map…</div>}
    {basemap?.message && <div className={styles.basemapStatus} role="status">{basemap.message}
      <Button small minimal onClick={() => setAttempt(n => n + 1)}>Retry basemap</Button></div>}
    {error && <div className={styles.mapNotice} role="alert">{error}</div>}
  </div>;
}

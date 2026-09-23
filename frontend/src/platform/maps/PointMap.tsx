import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, PopoverNext } from '@blueprintjs/core';
import { Cartesian2, Cartesian3, Color, Ion, Math as CesiumMath, SceneMode,
  ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer, EllipsoidTerrainProvider, WebMercatorProjection } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { PointMarkers, northernEuropeCamera, uniquePickedReferences } from './PointMarkers';
import { GeoJsonVectors } from './GeoJsonVectors';
import type { GeoJsonVector } from './GeoJsonVectors';
import type { CameraState, PointMarker, RecordReference, ViewportBounds } from './PointMarkers';
import { UiIcon } from '../ui/UiIcon';
import { useSourceServices } from '../sources/SourceServices';
import styles from './PointMap.module.css';
import { mountBasemap } from './mountBasemap';
import type { BasemapStatus } from './mountBasemap';

function visibleBounds(viewer: Viewer): ViewportBounds | null {
  const ellipsoid = viewer.scene.globe.ellipsoid;
  const rectangle = viewer.camera.computeViewRectangle(ellipsoid);
  if (rectangle) return { west: CesiumMath.toDegrees(rectangle.west), east: CesiumMath.toDegrees(rectangle.east),
    south: CesiumMath.toDegrees(rectangle.south), north: CesiumMath.toDegrees(rectangle.north) };
  if (viewer.scene.mode !== SceneMode.SCENE2D) return null;
  const width = viewer.scene.canvas.clientWidth; const height = viewer.scene.canvas.clientHeight;
  if (!width || !height) return null;
  const pick = (x: number, y: number) => {
    const point = viewer.camera.pickEllipsoid(new Cartesian2(x, y), ellipsoid);
    return point ? ellipsoid.cartesianToCartographic(point) : undefined;
  };
  const centre = pick(width / 2, height / 2);
  const left = pick(0, height / 2); const right = pick(width, height / 2);
  if (!centre || !left || !right) return null;
  const top = pick(width / 2, 0); const bottom = pick(width / 2, height);
  const longitude = (radians: number) => ((CesiumMath.toDegrees(radians) + 180) % 360 + 360) % 360 - 180;
  return { west: longitude(left.longitude), east: longitude(right.longitude),
    south: bottom ? CesiumMath.toDegrees(bottom.latitude) : -90,
    north: top ? CesiumMath.toDegrees(top.latitude) : 90 };
}

export function PointMap({ label, basemapId, subscribe, getMarkers, getVectors, mode, setMode, camera, selectedId, select, setCamera,
  setup, afterPaint, suppressCameraSave = false, action, toolContent, setBasemap, describePick, setViewport, drawOrderKey = '' }: {
  label: string; basemapId: string; mode: '2d' | '3d'; setMode(mode: '2d' | '3d'): void; camera?: CameraState; selectedId?: string;
  subscribe(listener: () => void): () => void; getMarkers(): PointMarker[]; getVectors?(): GeoJsonVector[];
  select(reference: RecordReference): void; setCamera(camera: CameraState): void;
  setViewport?(bounds: ViewportBounds | null): void;
  drawOrderKey?: string;
  describePick?(reference: RecordReference): string;
  setup?(viewer: Viewer): () => void; afterPaint?(viewer: Viewer): void; suppressCameraSave?: boolean;
  action?: { label: string; disabled?: boolean; unavailableReason?: string; onClick(camera: CameraState): void };
  toolContent?: ReactNode; setBasemap?(id: string): void;
}) {
  const { basemapSources, offlineBasemap } = useSourceServices();
  const element = useRef<HTMLDivElement>(null); const viewerRef = useRef<Viewer | null>(null);
  const interacted = useRef(false); const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [basemap, setBasemapStatus] = useState<BasemapStatus>(); const [attempt, setAttempt] = useState(0);
  const [basemapMenuOpen, setBasemapMenuOpen] = useState(false);
  const redraw = useRef<() => void>(() => {}); const [error, setError] = useState(''); const [ready, setReady] = useState(false);
  const [overlap, setOverlap] = useState<{ choices: RecordReference[]; x: number; y: number } | null>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (overlap) firstChoice.current?.focus(); }, [overlap]);
  const selected = useEffectEvent(() => selectedId); const points = useEffectEvent(getMarkers);
  const vectors = useEffectEvent(() => getVectors?.() ?? []); const picked = useEffectEvent(select);
  const order = useEffectEvent(() => drawOrderKey);
  const persistCamera = useEffectEvent(setCamera); const skipSave = useEffectEvent(() => suppressCameraSave);
  const updateViewport = useEffectEvent((bounds: ViewportBounds | null) => setViewport?.(bounds));
  const paintDomain = useEffectEvent((viewer: Viewer) => afterPaint?.(viewer));
  const setupDomain = useEffectEvent((viewer: Viewer) => setup?.(viewer) ?? (() => {}));
  const initialCamera = useEffectEvent(() => camera ?? northernEuropeCamera);
  useEffect(() => {
    let cancelled = false; let viewer: Viewer | undefined; let handler: ScreenSpaceEventHandler | undefined;
    let frame = 0; let removeDomain = () => {}; let markers: PointMarkers | undefined; let shapes: GeoJsonVectors | undefined;
    let theme: MutationObserver | undefined; let removeMove = () => {}; let removeError = () => {}; let removeTiles = () => {}; let removeBasemap = () => {};
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
        const publishViewport = () => { if (viewer && !viewer.isDestroyed()) updateViewport(visibleBounds(viewer)); };
        const cleanup = await mountBasemap(viewer, basemapSources.find(source => source.id === basemapId), offlineBasemap,
          value => { if (!cancelled) setBasemapStatus(value); });
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
          if (remaining === 0) { setReady(true); publishViewport(); }
        });
        viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1000;
        viewer.scene.screenSpaceCameraController.maximumZoomDistance = 30000000;
        const initial = initialCamera();
        viewer.camera.setView({ destination: Cartesian3.fromDegrees(initial.longitude, initial.latitude, initial.height) });
        publishViewport();
        markers = new PointMarkers(viewer);
        shapes = new GeoJsonVectors(viewer);
        removeDomain = setupDomain(viewer);
        const paint = () => {
          frame = 0; if (!viewer || viewer.isDestroyed()) return;
          markers?.setDrawOrderKey(order()); markers?.update(points(), selected()); shapes?.update(vectors(), selected()); paintDomain(viewer);
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
        redraw.current = schedule; schedule();
        theme = new MutationObserver(schedule);
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: { position: Cartesian2 }) => {
          const hits: unknown[] = viewer?.scene.drillPick(movement.position, 32) ?? [];
          const choices = uniquePickedReferences(hits, id => markers?.pick(id) ?? shapes?.pick(id));
          if (choices.length === 1) { setOverlap(null); picked(choices[0]); }
          else if (choices.length > 1) setOverlap({ choices, x: movement.position.x, y: movement.position.y });
          else setOverlap(null);
        }, ScreenSpaceEventType.LEFT_CLICK);
        removeMove = viewer.camera.moveEnd.addEventListener(() => {
          publishViewport();
          if (!viewer || skipSave() || !interacted.current) return;
          interacted.current = false;
          const p = viewer.camera.positionCartographic;
          persistCamera({ longitude: CesiumMath.toDegrees(p.longitude), latitude: CesiumMath.toDegrees(p.latitude), height: p.height });
        });
        removeError = viewer.scene.renderError.addEventListener(() => setError('Map rendering stopped. Use the list to inspect records.'));
      } catch { if (!cancelled) setError('The map could not start. WebGL may be unavailable; the list remains usable.'); }
    };
    void start();
    return () => { cancelled = true; cancelAnimationFrame(frame); theme?.disconnect(); removeDomain(); markers?.dispose(); shapes?.dispose(); removeMove(); removeError(); removeTiles(); removeBasemap(); handler?.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy(); viewerRef.current = null; redraw.current = () => {}; };
  }, [mode, basemapId, attempt, basemapSources, offlineBasemap]);
  useEffect(() => {
    const unsubscribe = subscribe(() => redraw.current());
    redraw.current();
    return unsubscribe;
  }, [subscribe]);
  useEffect(() => { redraw.current(); }, [selectedId, getMarkers, getVectors, afterPaint, drawOrderKey]);
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
      <Button small icon={<UiIcon name="plus" />} aria-label="Zoom in" onClick={() => { interacted.current = true; viewerRef.current?.camera.zoomIn(viewerRef.current.camera.positionCartographic.height * .4); }} />
      <Button small icon={<UiIcon name="minus" />} aria-label="Zoom out" onClick={() => { interacted.current = true; viewerRef.current?.camera.zoomOut(viewerRef.current.camera.positionCartographic.height * .6); }} />
      <PopoverNext placement="bottom-start" content={<div className={styles.mapToolMenu}>
        {toolContent}
        {action && <Button small disabled={!ready || action.disabled} title={action.unavailableReason}
          onClick={() => { const current = getCamera(); if (current) action.onClick(current); }}>{action.label}</Button>}
        {action?.disabled && action.unavailableReason && <small>{action.unavailableReason}</small>}
      </div>}><Button small icon={<UiIcon name="tools" />} aria-label="Map tools" /></PopoverNext>
    </div>
    <div className={styles.mapModes} role="group" aria-label="Map projection">
      <div className={styles.mapProjection}><Button small className={styles.projectionButton} active={mode === '2d'}
        aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>2D</Button>
        <Button small className={styles.projectionButton} active={mode === '3d'}
          aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D</Button></div>
      {setBasemap && <PopoverNext placement="bottom-end" isOpen={basemapMenuOpen} onInteraction={setBasemapMenuOpen}
        content={<div className={styles.basemapMenu} role="menu" aria-label="Terrain options">
          {basemapSources.map(source => <button key={source.id} role="menuitemradio" aria-checked={source.id === basemapId}
            onClick={() => { setBasemap(source.id); setBasemapMenuOpen(false); }}>{source.name}</button>)}
        </div>}><Button small className={styles.basemapButton} aria-haspopup="menu" aria-expanded={basemapMenuOpen}>
          Terrain</Button></PopoverNext>}
    </div>
    {overlap && <div className={styles.overlap} role="group" aria-label="Overlapping records"
      style={{ left: `min(${overlap.x}px, calc(100% - 260px))`, top: `min(${overlap.y}px, calc(100% - 180px))` }}
      onKeyDown={event => { if (event.key === 'Escape') { setOverlap(null); event.stopPropagation(); } }}>
      <strong>Choose a record · {overlap.choices.length} appearances</strong>
      <div className={styles.overlapChoices}>{overlap.choices.map((reference, index) => <button key={`${reference.layerInstanceId}:${reference.entityId}`}
        ref={index === 0 ? firstChoice : undefined} onClick={() => { setOverlap(null); select(reference); }}>
        {describePick?.(reference) ?? `${reference.entityId} · ${reference.layerInstanceId ?? 'layer'}`}
      </button>)}</div>
      <Button small minimal onClick={() => setOverlap(null)}>Close choices</Button>
    </div>}
    {!ready && !error && <div className={styles.mapNotice} role="status">Loading the map…</div>}
    {basemap?.message && <div className={styles.basemapStatus} role="status">{basemap.message}
      <Button small minimal onClick={() => setAttempt(n => n + 1)}>Retry basemap</Button></div>}
    {error && <div className={styles.mapNotice} role="alert">{error}</div>}
  </div>;
}

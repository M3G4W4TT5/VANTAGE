import { AircraftLegend } from './AircraftLegend';
import { ResultsDock } from '../../platform/ui/ResultsDock';
import { PanelResize } from '../../platform/ui/PanelResize';
import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { InputGroup, Tag } from '@blueprintjs/core';
import type { AppViewProps } from '../../platform/registry/AppRegistry';
import { aircraftChannel } from '../../platform/data/AircraftChannel';
import type { AircraftQuery, AircraftRecord } from '../../platform/data/AircraftChannel';
import type { AtlasState } from './atlasModule';
import { AircraftInspector } from './AircraftInspector';
import { ageLabel, utc } from '../../platform/ui/format';
import { ResultsTable } from '../../platform/ui/ResultsTable';
import { aircraftColumns } from './aircraftColumns';
import styles from './Atlas.module.css';
import { useSourceServices } from '../../platform/sources/SourceServices';
import { MapOptions } from './MapOptions';
import { ViewToolbar } from './ViewToolbar';
import { UiIcon } from '../../platform/ui/UiIcon';
const AircraftMap = lazy(() => import('./AircraftMap').then(module => ({ default: module.AircraftMap })));
const northernEurope: AircraftQuery = { longitude: 12, latitude: 58, radiusNm: 250 };

export function LiveAircraftView({ pane, host, updateState }: AppViewProps) {
  const { defaultBasemapId } = useSourceServices();
  const state = pane.state as AtlasState; const { context } = pane;
  const area = state.aircraftQuery ?? northernEurope;
  const channel = useMemo(() => aircraftChannel({ longitude: area.longitude, latitude: area.latitude, radiusNm: area.radiusNm }),
    [area.longitude, area.latitude, area.radiusNm]);
  const snapshot = useSyncExternalStore(channel.subscribe, channel.getSnapshot);
  const source = snapshot.source;
  const maximumRadius = source?.maximumRadiusNm ?? area.radiusNm;
  const [now, setNow] = useState(Date.now); const [follow, setFollow] = useState(false);
  useEffect(() => channel.acquire(), [channel]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  const patch = (next: Partial<AtlasState>) => updateState({ ...host.getState(), ...next });
  const query = typeof context.filters.query === 'string' ? context.filters.query : '';
  const freshness = typeof context.filters.freshness === 'string' ? context.filters.freshness : 'all';
  const matches = (record: AircraftRecord) => {
    const p = record.observation.properties;
    const age = p.positionObservedAt ? now - Date.parse(p.positionObservedAt) : Infinity;
    return `${record.entity.label} ${p.address} ${p.registration ?? ''} ${p.aircraftType ?? ''}`.toLowerCase().includes(query.toLowerCase()) &&
      (freshness === 'all' || (freshness === 'recent' ? age <= 60000 : age > 60000));
  };
  const filtered = snapshot.records.filter(matches).sort((a, b) => a.entity.label.localeCompare(b.entity.label) || a.entity.id.localeCompare(b.entity.id));
  const selectedId = context.selection.entityIds[0]; const selected = snapshot.records.find(r => r.entity.id === selectedId);
  const showInspector = !!selected && state.inspectorOpen;
  const select = (id: string, observationId?: string) => {
    const record = channel.getSnapshot().records.find(r => r.entity.id === id); if (!record) return;
    host.changeContext({ selection: { entityIds: [id], observationIds: [observationId ?? record.observation.id] } }); patch({ inspectorOpen: true });
  };
  const isOffline = snapshot.transport === 'offline' || ['offline', 'error', 'rate_limited'].includes(snapshot.health.state);
  const sourceAge = snapshot.health.lastSuccessAt ? now - Date.parse(snapshot.health.lastSuccessAt) : null;
  const healthLabel = snapshot.transport !== 'connected' ? snapshot.transport : snapshot.health.state === 'healthy' && sourceAge !== null && sourceAge > 90000 ? 'stale' : snapshot.health.state;
  return <main id="workspace" className={styles.atlas} style={{ '--sidebar-width': `${state.sidebarWidth}px`, '--inspector-width': `${state.inspectorWidth}px` } as CSSProperties}>
    <ViewToolbar pane={pane} host={host} updateState={updateState} />
    <div className={styles.body} data-inspector={showInspector}>
      {state.sidebarOpen && <div className={styles.sidebarWrap}><aside className={styles.sidebar} aria-label="Filters">
        <div className={styles.panelHeader}><span>FILTERS</span><span className={styles.muted}>01</span></div>
        <MapOptions paneId={pane.id} basemapId={state.basemapId} setBasemap={basemapId => patch({ basemapId })}
          setCamera={camera => { setFollow(false); patch({ viewMode: 'canvas', camera }); }} />
        <div className={styles.sidebarSection}><InputGroup leftIcon={<UiIcon name="search" />} aria-label="Filter aircraft" placeholder="Callsign, ICAO, registration…" value={query}
          onChange={e => host.changeContext({ filters: { ...context.filters, query: e.target.value } })} />
          <label className={styles.fieldLabel} htmlFor={`${pane.id}-freshness`}>Position age</label>
          <select className={styles.fullSelect} id={`${pane.id}-freshness`} value={freshness} onChange={e => host.changeContext({ filters: { ...context.filters, freshness: e.target.value } })}>
            <option value="all">All available observations</option><option value="recent">Updated within 60 seconds</option><option value="stale">Older or age unknown</option>
          </select>
        </div>
        <AircraftLegend />
        <div className={styles.sidebarSection}><div className={styles.sectionHeading}><span><UiIcon name="plane" /> Aircraft · {source?.name ?? 'Connecting'}</span><Tag minimal>{healthLabel}</Tag></div>
          <p className={styles.muted}>{snapshot.health.message}</p>
          <dl className={styles.sourceStats}><dt>Last success</dt><dd>{ageLabel(snapshot.health.lastSuccessAt, now)}</dd>
            <dt>Provider returned</dt><dd>{snapshot.health.providerCount ?? 'Unknown'}</dd><dt>Rejected records</dt><dd>{snapshot.health.rejectedCount}</dd>
            <dt>Available / cap</dt><dd>{snapshot.records.length} / {source?.resultLimit ?? snapshot.completeness.limit}{snapshot.completeness.truncated ? ' · limited' : ''}</dd>
          </dl>
          <p className={styles.muted}>Query centre {area.latitude.toFixed(2)}° N, {area.longitude.toFixed(2)}° E. The circle does not establish complete airspace coverage.</p>
          <label className={styles.fieldLabel} htmlFor={`${pane.id}-radius`}>Collection radius</label>
          <select className={styles.fullSelect} id={`${pane.id}-radius`} value={area.radiusNm} onChange={e => patch({ aircraftQuery: { ...area, radiusNm: +e.target.value } })}>
            {[...new Set([25, 50, 100, area.radiusNm, maximumRadius])].filter(n => n >= (source?.minimumRadiusNm ?? 10) && n <= maximumRadius).sort((a, b) => a - b).map(n => <option key={n} value={n}>{n} nautical miles</option>)}
          </select>

        </div>
      </aside><PanelResize label="Filters width" edge="right" value={state.sidebarWidth} min={240} max={440} onChange={sidebarWidth => patch({ sidebarWidth })} /></div>}
      <div className={styles.workspaceCenter}>
        {isOffline && <div className={styles.sourceBanner} role="status">{snapshot.health.message} {snapshot.health.nextAttemptAt && `Next attempt: ${utc(snapshot.health.nextAttemptAt)}.`}</div>}
        {selectedId && !selected && <div className={styles.sourceBanner}>The selected aircraft is outside the current result or no longer in this cache. Its selection has been preserved.</div>}
        {state.viewMode === 'canvas' && <Suspense fallback={<div className={styles.empty}>Loading the map…</div>}>
          <AircraftMap key={`${state.mapMode}:${area.longitude}:${area.latitude}:${area.radiusNm}`} basemapId={state.basemapId ?? defaultBasemapId} channel={channel} mode={state.mapMode ?? '2d'} setMode={mapMode => patch({ mapMode })} camera={state.camera} selectedId={selectedId} query={area} matches={matches} select={select}
            setCamera={camera => patch({ camera })} setQuery={aircraftQuery => { setFollow(false); patch({ aircraftQuery }); }} follow={follow} />
        </Suspense>}
        <ResultsDock title="Aircraft" count={filtered.length} summary={<>{filtered.filter(r => r.observation.geometry).length} mappable · {snapshot.records.length} available · {snapshot.completeness.truncated ? 'result limit reached' : 'coverage incomplete'}</>} list={state.viewMode === 'list'} open={state.resultsOpen} toggle={() => patch({ resultsOpen: !state.resultsOpen })}>
          <ResultsTable records={filtered} columns={aircraftColumns} getId={r => r.entity.id} label="Aircraft results" selectedId={selectedId} select={select} semantic={state.viewMode === 'list'} />
        </ResultsDock>
      </div>
      {showInspector && <div className={styles.inspectorWrap}><AircraftInspector record={selected} now={now} selectedObservationId={context.selection.observationIds[0]} expanded={state.expandedDetails}
        toggleExpanded={() => patch({ expandedDetails: !state.expandedDetails })} close={() => { setFollow(false); patch({ inspectorOpen: false }); }} follow={follow} toggleFollow={() => { setFollow(!follow); patch({ viewMode: 'canvas' }); }} />
        <PanelResize label="Inspector width" edge="left" value={state.inspectorWidth} min={280} max={520} onChange={inspectorWidth => patch({ inspectorWidth })} />
      </div>}
    </div>
    <footer className={styles.timebar}><div className={styles.toolbarGroup}><UiIcon name="clock" /><strong>Live collection</strong><span className={styles.mono}>{new Date(now).toISOString().slice(11, 19)} UTC</span></div><span className={styles.muted}>{source?.pollSeconds ?? '—'} s refresh · observed positions only · recording/replay not yet available</span></footer>
    <div className={styles.statusbar}><span><a href={source?.documentationUrl} target="_blank" rel="noreferrer">{source?.attribution ?? 'Aircraft source connecting'}</a></span><span>{healthLabel} · {selected ? `Selected: ${selected.entity.label}` : 'Nothing selected'}</span></div>
  </main>;
}

import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { Button, Icon, InputGroup, Tag } from '@blueprintjs/core';
import type { AppViewProps } from '../../platform/registry/AppRegistry';
import { aircraftChannel } from '../../platform/data/AircraftChannel';
import type { AircraftQuery, AircraftRecord } from '../../platform/data/AircraftChannel';
import type { AtlasState } from './atlasModule';
import { AircraftInspector } from './AircraftInspector';
import { ageLabel, utc } from './aircraftFormat';
import { ResultsTable } from './ResultsTable';
import styles from './Atlas.module.css';
import { basemapSources, defaultBasemapId, placeSource } from '../../connectors/sourceRegistration';
import { PlaceSearch } from './PlaceSearch';
const AircraftMap = lazy(() => import('./AircraftMap').then(module => ({ default: module.AircraftMap })));
const northernEurope: AircraftQuery = { longitude: 12, latitude: 58, radiusNm: 250 };

export function LiveAircraftView({ pane, host, updateState }: AppViewProps) {
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
  const select = (id: string) => {
    const record = channel.getSnapshot().records.find(r => r.entity.id === id); if (!record) return;
    host.changeContext({ selection: { entityIds: [id], observationIds: [record.observation.id] } }); patch({ inspectorOpen: true });
  };
  const isOffline = snapshot.transport === 'offline' || ['offline', 'error', 'rate_limited'].includes(snapshot.health.state);
  const sourceAge = snapshot.health.lastSuccessAt ? now - Date.parse(snapshot.health.lastSuccessAt) : null;
  const healthLabel = snapshot.transport !== 'connected' ? snapshot.transport : snapshot.health.state === 'healthy' && sourceAge !== null && sourceAge > 90000 ? 'stale' : snapshot.health.state;
  const summary = filtered.map(r => ({ id: r.entity.id, label: r.entity.label, kind: 'Aircraft', speed: r.observation.properties.speedMetresPerSecond,
    observedAt: r.observation.properties.positionObservedAt, evidenceClass: r.observation.evidenceClass }));
  return <main id="workspace" className={styles.atlas} style={{ '--sidebar-width': `${state.sidebarWidth}px`, '--inspector-width': `${state.inspectorWidth}px` } as CSSProperties}>
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}><Button minimal icon="panel-stats" active={state.sidebarOpen} onClick={() => patch({ sidebarOpen: !state.sidebarOpen })}>Layers</Button>
        <span className={styles.separator} /><Button minimal icon="map" active={state.viewMode === 'canvas'} onClick={() => patch({ viewMode: 'canvas' })}>Map</Button>
        <Button minimal icon="list" active={state.viewMode === 'list'} onClick={() => patch({ viewMode: 'list' })}>List</Button>
        <Button minimal icon="th" active={state.resultsOpen} onClick={() => patch({ resultsOpen: !state.resultsOpen })}>Results</Button>
        <span className={styles.separator} /><Button minimal active={(state.mapMode ?? '2d') === '2d'} onClick={() => patch({ mapMode: '2d' })}>2D</Button>
        <Button minimal icon="globe" active={state.mapMode === '3d'} onClick={() => patch({ mapMode: '3d' })}>Globe</Button>
      </div>
      <div className={styles.toolbarGroup}><Button minimal onClick={() => {
        host.changeContext({ layerIds: ['demo-aircraft', 'demo-vessels', 'demo-places'], filters: { query: '', kind: 'all' },
          selection: { entityIds: [], observationIds: [] }, time: { mode: 'live', cursor: null, from: null, to: null } });
        patch({ dataMode: 'demo' });
      }}>Demo collection</Button><Tag minimal>LIVE AIRCRAFT</Tag></div>
    </div>
    <div className={styles.body} data-inspector={showInspector}>
      {state.sidebarOpen && <aside className={styles.sidebar} aria-label="Layers and filters">
        <div className={styles.panelHeader}><span>LAYERS & FILTERS</span><span className={styles.muted}>01</span></div>
        <PlaceSearch source={placeSource} select={place => {
          setFollow(false); patch({ viewMode: 'canvas', camera: { longitude: place.longitude, latitude: place.latitude, height: 75000 } });
        }} />
        <div className={styles.sidebarSection}>
          <label className={styles.sectionHeading} htmlFor={`${pane.id}-basemap`}>Basemap</label>
          <select className={styles.fullSelect} id={`${pane.id}-basemap`} value={state.basemapId ?? defaultBasemapId}
            onChange={event => patch({ basemapId: event.target.value })}>
            {basemapSources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select>
        </div>
        <div className={styles.sidebarSection}><InputGroup leftIcon="search" aria-label="Filter aircraft" placeholder="Callsign, ICAO, registration…" value={query}
          onChange={e => host.changeContext({ filters: { ...context.filters, query: e.target.value } })} />
          <label className={styles.fieldLabel} htmlFor={`${pane.id}-freshness`}>Position age</label>
          <select className={styles.fullSelect} id={`${pane.id}-freshness`} value={freshness} onChange={e => host.changeContext({ filters: { ...context.filters, freshness: e.target.value } })}>
            <option value="all">All available observations</option><option value="recent">Updated within 60 seconds</option><option value="stale">Older or age unknown</option>
          </select>
        </div>
        <div className={styles.sidebarSection}><div className={styles.sectionHeading}><span><Icon icon="airplane" /> Aircraft · {source?.name ?? 'Connecting'}</span><Tag minimal>{healthLabel}</Tag></div>
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
          <Button minimal icon="locate" onClick={() => patch({ aircraftQuery: { ...northernEurope, radiusNm: maximumRadius }, camera: { longitude: 12, latitude: 58, height: 2400000 } })}>Northern Europe</Button>
        </div>
        <div className={styles.sidebarSection}><div className={styles.sectionHeading}>Matching aircraft <span>{filtered.length}</span></div>
          {filtered.slice(0, 6).map(record => <button key={record.entity.id} className={styles.resultRow} data-selected={selectedId === record.entity.id} onClick={() => select(record.entity.id)}>
            <Icon icon="airplane" /><span>{record.entity.label}<small>{record.observation.properties.address.toUpperCase()} · {ageLabel(record.observation.properties.positionObservedAt, now)}</small></span><Icon icon="chevron-right" />
          </button>)}
          {!filtered.length && <p className={styles.muted}>{snapshot.health.state === 'loading' ? 'Waiting for aircraft observations…' : 'No aircraft match this query. This is not proof that the airspace is empty.'}</p>}
          <Button minimal rightIcon="arrow-right" onClick={() => patch({ viewMode: 'list' })}>Show all results</Button>
        </div>
        <div className={styles.sidebarFooter}><label>Panel width <input aria-label="Sidebar width" type="range" min="240" max="440" step="10" value={state.sidebarWidth} onChange={e => patch({ sidebarWidth: +e.target.value })} /></label></div>
      </aside>}
      <div className={styles.workspaceCenter}>
        {isOffline && <div className={styles.sourceBanner} role="status">{snapshot.health.message} {snapshot.health.nextAttemptAt && `Next attempt: ${utc(snapshot.health.nextAttemptAt)}.`}</div>}
        {selectedId && !selected && <div className={styles.sourceBanner}>The selected aircraft is outside the current result or no longer in this cache. Its selection has been preserved.</div>}
        {state.viewMode === 'canvas' && <Suspense fallback={<div className={styles.empty}>Loading the map…</div>}>
          <AircraftMap key={`${state.mapMode}:${area.longitude}:${area.latitude}:${area.radiusNm}`} basemapId={state.basemapId ?? defaultBasemapId} channel={channel} mode={state.mapMode ?? '2d'} camera={state.camera} selectedId={selectedId} query={area} matches={matches} select={select}
            setCamera={camera => patch({ camera })} setQuery={aircraftQuery => { setFollow(false); patch({ aircraftQuery }); }} follow={follow} />
        </Suspense>}
        {(state.viewMode === 'list' || state.resultsOpen) && <section className={styles.results} data-full={state.viewMode === 'list'} aria-label="Results">
          <div className={styles.resultsHeader}><strong>Aircraft <span>{filtered.length}</span></strong><span className={styles.muted}>{filtered.filter(r => r.observation.geometry).length} mappable · {snapshot.records.length} available · {snapshot.completeness.truncated ? 'result limit reached' : 'coverage incomplete'}</span>
            <div className={styles.resultsActions}>{state.viewMode === 'canvas' && <><Button minimal onClick={() => patch({ viewMode: 'list' })}>Accessible list</Button><Button minimal icon="cross" aria-label="Close results" onClick={() => patch({ resultsOpen: false })} /></>}</div>
          </div>
          <ResultsTable records={summary} selectedId={selectedId} select={select} semantic={state.viewMode === 'list'} live />
        </section>}
      </div>
      {showInspector && <div className={styles.inspectorWrap}><AircraftInspector record={selected} now={now} selectedObservationId={context.selection.observationIds[0]} expanded={state.expandedDetails}
        toggleExpanded={() => patch({ expandedDetails: !state.expandedDetails })} close={() => { setFollow(false); patch({ inspectorOpen: false }); }} follow={follow} toggleFollow={() => { setFollow(!follow); patch({ viewMode: 'canvas' }); }} />
        <label className={styles.inspectorResize}>Panel width <input aria-label="Inspector width" type="range" min="280" max="520" step="10" value={state.inspectorWidth} onChange={e => patch({ inspectorWidth: +e.target.value })} /></label>
      </div>}
    </div>
    <footer className={styles.timebar}><div className={styles.toolbarGroup}><Icon icon="time" /><strong>Live collection</strong><span className={styles.mono}>{new Date(now).toISOString().slice(11, 19)} UTC</span></div><span className={styles.muted}>{source?.pollSeconds ?? '—'} s refresh · observed positions only · recording/replay not yet available</span></footer>
    <div className={styles.statusbar}><span><a href={source?.documentationUrl} target="_blank" rel="noreferrer">{source?.attribution ?? 'Aircraft source connecting'}</a></span><span>{healthLabel} · {selected ? `Selected: ${selected.entity.label}` : 'Nothing selected'}</span></div>
  </main>;
}

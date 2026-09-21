import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { Button, InputGroup, Tag } from '@blueprintjs/core';
import type { AppViewProps } from '../../platform/registry/AppRegistry';
import { earthquakeChannel } from '../../platform/data/EarthquakeChannel';
import type { EarthquakeRecord } from '../../platform/data/EarthquakeChannel';
import { useSourceServices } from '../../platform/sources/SourceServices';
import { ResultsTable } from '../../platform/ui/ResultsTable';
import { UiIcon } from '../../platform/ui/UiIcon';
import { ageLabel, utc } from '../../platform/ui/format';
import type { AtlasState, EarthquakeSettings } from './atlasModule';
import { ViewToolbar } from './ViewToolbar';
import { MapOptions } from './MapOptions';
import { EarthquakeInspector } from './EarthquakeInspector';
import { defaultEarthquakeSettings, earthquakeColumns, earthquakeHealth, magnitudeStyle, matchesEarthquake } from './earthquakePresentation';
import styles from './Atlas.module.css';
const EarthquakeMap = lazy(() => import('./EarthquakeMap').then(module => ({ default: module.EarthquakeMap })));

export function EarthquakeView({ pane, host, updateState }: AppViewProps) {
  const state = pane.state as AtlasState; const { context } = pane;
  const { defaultBasemapId } = useSourceServices();
  const channel = useMemo(() => earthquakeChannel(), []);
  const snapshot = useSyncExternalStore(channel.subscribe, channel.getSnapshot); const source = snapshot.source;
  const [now, setNow] = useState(Date.now);
  useEffect(() => channel.acquire(), [channel]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  const patch = (next: Partial<AtlasState>) => updateState({ ...host.getState(), ...next });
  const settings = state.earthquakeSettings ?? defaultEarthquakeSettings;
  const filter = (next: Partial<EarthquakeSettings>) => patch({ earthquakeSettings: { ...settings, ...next } });
  const matches = (record: EarthquakeRecord) => matchesEarthquake(record, settings, now);
  const sortValue = (record: EarthquakeRecord) => settings.sort === 'magnitude' ? record.observation.properties.magnitude ?? -Infinity :
    Date.parse((settings.sort === 'updated' ? record.observation.properties.sourceUpdatedAt : record.observation.observedAt) ?? '') || -Infinity;
  const filtered = snapshot.records.filter(matches).sort((a, b) => sortValue(b) - sortValue(a) || a.entity.id.localeCompare(b.entity.id));
  const selectedId = context.selection.entityIds[0]; const selected = snapshot.records.find(record => record.entity.id === selectedId);
  const showInspector = !!selected && state.inspectorOpen; const health = earthquakeHealth(snapshot, now); const c = snapshot.completeness;
  const select = (id: string, observationId?: string) => {
    const record = channel.getSnapshot().records.find(r => r.entity.id === id); if (!record) return;
    host.changeContext({ selection: { entityIds: [id], observationIds: [observationId ?? record.observation.id] } }); patch({ inspectorOpen: true });
  };
  const zoom = () => {
    if (!selected?.observation.geometry) return;
    const [longitude, latitude] = selected.observation.geometry.coordinates;
    patch({ viewMode: 'canvas', earthquakeCamera: { longitude, latitude, height: 750000 } });
  };
  const emptyText = snapshot.health.state === 'loading' ? 'Waiting for the first earthquake snapshot…' : !c.feedRetrievedAt ?
    'Earthquake data is unavailable. Check source status.' : snapshot.records.length === 0 ?
      'No events were returned in this feed snapshot. This does not establish that no earthquakes occurred.' :
      'No events match these filters. Unknown magnitude or occurrence time cannot match a numeric filter.';
  return <main id="workspace" className={styles.atlas} style={{ '--sidebar-width': `${state.sidebarWidth}px`, '--inspector-width': `${state.inspectorWidth}px` } as CSSProperties}>
    <ViewToolbar pane={pane} host={host} updateState={updateState} />
    <div className={styles.body} data-inspector={showInspector}>
      {state.sidebarOpen && <aside className={styles.sidebar} aria-label="Layers and filters">
        <div className={styles.panelHeader}><span>EARTHQUAKES</span><Tag minimal>{health}</Tag></div>
        <MapOptions paneId={pane.id} basemapId={state.basemapId} setBasemap={basemapId => patch({ basemapId })}
          setCamera={earthquakeCamera => patch({ viewMode: 'canvas', earthquakeCamera })} />
        <div className={styles.sidebarSection}>
          <InputGroup leftIcon={<UiIcon name="search" />} aria-label="Filter earthquakes" placeholder="Location or source event ID…" value={settings.query}
            maxLength={500} onChange={event => filter({ query: event.target.value })} />
          <label className={styles.fieldLabel} htmlFor={`${pane.id}-magnitude`}>Minimum magnitude</label>
          <select className={styles.fullSelect} id={`${pane.id}-magnitude`} value={settings.minimumMagnitude ?? 'all'}
            onChange={event => filter({ minimumMagnitude: event.target.value === 'all' ? null : +event.target.value })}>
            <option value="all">All feed values, including unknown</option>{[2.5, 3, 4, 5, 6].map(value => <option key={value} value={value}>M {value.toFixed(1)}+</option>)}
          </select>
          <label className={styles.fieldLabel} htmlFor={`${pane.id}-event-age`}>Event age</label>
          <select className={styles.fullSelect} id={`${pane.id}-event-age`} value={settings.maxAgeHours ?? 'all'}
            onChange={event => filter({ maxAgeHours: event.target.value === 'all' ? null : +event.target.value })}>
            <option value="all">Whole received feed, including unknown</option>{[1, 6, 24].map(hours => <option key={hours} value={hours}>Occurred within {hours} hours</option>)}
          </select>
          <label className={styles.fieldLabel} htmlFor={`${pane.id}-event-sort`}>Sort events</label>
          <select className={styles.fullSelect} id={`${pane.id}-event-sort`} value={settings.sort} onChange={event => filter({ sort: event.target.value as EarthquakeSettings['sort'] })}>
            <option value="occurred">Occurrence · newest first</option><option value="magnitude">Magnitude · largest first</option><option value="updated">Source update · newest first</option>
          </select>
          <Button minimal onClick={() => patch({ earthquakeSettings: defaultEarthquakeSettings })}>Clear filters</Button>
        </div>
        <div className={styles.sidebarSection}>
          <div className={styles.sectionHeading}>Magnitude legend</div>
          <div className={styles.magnitudeLegend} aria-label="Magnitude legend">{[[3, '< 4'], [5, '4–5.9'], [6, '6+'], [null, 'Unknown']].map(([value, label]) => {
            const style = magnitudeStyle(value as number | null);
            return <span key={label} style={{ color: `var(${style.colour})` }}><UiIcon name={value === null ? 'circle' : 'event'} size={style.size} /><span>{label}</span></span>;
          })}</div>
          <p className={styles.muted}>Surface epicentres. Size indicates magnitude; brackets indicate selection. Magnitude does not measure local impact.</p>
        </div>
        <div className={styles.sidebarSection}>
          <div className={styles.sectionHeading}><span><UiIcon name="event" /> {source?.name ?? 'Connecting'}</span></div>
          <strong>{source?.scopeLabel ?? 'Feed scope loading'}</strong>
          <p className={styles.muted}>{source?.coverage ?? c.coverage}</p>
          <dl className={styles.sourceStats}><dt>Feed generated</dt><dd>{ageLabel(c.feedGeneratedAt, now)}</dd>
            <dt>Last retrieval</dt><dd>{ageLabel(c.feedRetrievedAt, now)}</dd><dt>Provider returned</dt><dd>{c.providerCount ?? 'Unknown'}</dd>
            <dt>Rejected records</dt><dd>{c.rejectedCount}</dd><dt>Available / cap</dt><dd>{snapshot.records.length} / {c.limit}</dd>
          </dl>
          <p className={styles.muted}>{snapshot.health.message}</p>
          <Button minimal icon={<UiIcon name="locate" />} onClick={() => patch({ earthquakeCamera: { longitude: 12, latitude: 58, height: 2400000 }, viewMode: 'canvas' })}>Northern Europe</Button>
        </div>
        <div className={styles.sidebarSection}><div className={styles.sectionHeading}>Matching events <span>{filtered.length}</span></div>
          {filtered.slice(0, 6).map(record => <button key={record.entity.id} className={styles.resultRow} data-selected={selectedId === record.entity.id} onClick={() => select(record.entity.id)}>
            <UiIcon name="event" /><span>{record.entity.label}<small>M {record.observation.properties.magnitude?.toFixed(1) ?? 'unknown'} · {ageLabel(record.observation.observedAt, now)}</small></span><UiIcon name="right" />
          </button>)}
          {!filtered.length && <p className={styles.muted}>{emptyText}</p>}
          <Button minimal rightIcon={<UiIcon name="right" />} onClick={() => patch({ viewMode: 'list' })}>Show all results</Button>
        </div>
        <div className={styles.sidebarFooter}><label>Panel width <input aria-label="Sidebar width" type="range" min="240" max="440" step="10" value={state.sidebarWidth} onChange={event => patch({ sidebarWidth: +event.target.value })} /></label></div>
      </aside>}
      <div className={styles.workspaceCenter}>
        <div className={styles.sourceBanner} role="status"><strong>{health} · {source?.scopeLabel ?? 'Feed scope loading'}</strong> · {filtered.length} matching / {snapshot.records.length} available · {c.truncated || c.rejectedCount ? 'partial feed' : 'bounded feed snapshot'}
          {health === 'stale' && <> · Feed generation is overdue; displayed events are cached.</>}
          {health !== 'healthy' && <> · {snapshot.health.message} {snapshot.health.nextAttemptAt && `Next attempt: ${utc(snapshot.health.nextAttemptAt)}.`}</>}
        </div>
        {!filtered.length && <div className={styles.sourceBanner} role="status">{emptyText}</div>}
        {selectedId && (!selected || !matches(selected)) && <div className={styles.sourceBanner}>{selected ? 'The selected event is hidden by the active filters; its inspector remains available.' : 'The selected event is outside the current feed or cache. Its saved reference is preserved.'}</div>}
        {state.viewMode === 'canvas' && <Suspense fallback={<div className={styles.empty}>Loading the map…</div>}>
          <EarthquakeMap channel={channel} basemapId={state.basemapId ?? defaultBasemapId} mode={state.mapMode ?? '2d'} camera={state.earthquakeCamera}
            selectedId={selectedId} select={select} matches={matches} setCamera={earthquakeCamera => patch({ earthquakeCamera })} />
        </Suspense>}
        {(state.viewMode === 'list' || state.resultsOpen) && <section className={styles.results} data-full={state.viewMode === 'list'} aria-label="Results">
          <div className={styles.resultsHeader}><strong>Earthquakes <span>{filtered.length}</span></strong>
            <span className={styles.muted}>{filtered.filter(r => r.observation.geometry).length} mappable · worldwide feed, not a map-area query</span>
            {state.viewMode === 'canvas' && <div className={styles.resultsActions}><Button minimal onClick={() => patch({ viewMode: 'list' })}>Accessible list</Button>
              <Button minimal icon={<UiIcon name="close" />} aria-label="Close results" onClick={() => patch({ resultsOpen: false })} /></div>}
          </div>
          <ResultsTable records={filtered} columns={earthquakeColumns} getId={r => r.entity.id} label="Earthquake results" selectedId={selectedId} select={select} semantic={state.viewMode === 'list'} />
        </section>}
      </div>
      {showInspector && <div className={styles.inspectorWrap}><EarthquakeInspector record={selected} selectedObservationId={context.selection.observationIds[0]} now={now}
        expanded={state.expandedDetails} toggleExpanded={() => patch({ expandedDetails: !state.expandedDetails })} close={() => patch({ inspectorOpen: false })} zoom={zoom} />
        <label className={styles.inspectorResize}>Panel width <input aria-label="Inspector width" type="range" min="280" max="520" step="10" value={state.inspectorWidth} onChange={event => patch({ inspectorWidth: +event.target.value })} /></label>
      </div>}
    </div>
    <footer className={styles.timebar}><div className={styles.toolbarGroup}><UiIcon name="clock" /><strong>Current feed</strong><span className={styles.mono}>{new Date(now).toISOString().slice(11, 19)} UTC</span></div>
      <span className={styles.muted}>{source?.pollSeconds ?? '—'} s polling · event age and feed freshness are separate · no historical replay</span></footer>
    <div className={styles.statusbar}><span><a href={source?.documentationUrl} target="_blank" rel="noreferrer">{source?.attribution ?? 'Earthquake source connecting'}</a></span><span>{health} · {selected ? `Selected: ${selected.entity.label}` : 'Nothing selected'}</span></div>
  </main>;
}

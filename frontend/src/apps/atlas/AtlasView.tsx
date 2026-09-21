import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { Button, Checkbox, Icon, InputGroup, MenuItem, PopoverNext, Tag } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { DateInput } from '@blueprintjs/datetime';
import enUS from 'date-fns/locale/en-US/index.js';
import type { AppViewProps } from '../../platform/registry/AppRegistry';
import type { AtlasState } from './atlasModule';
import { FixtureStore, fixtureTime, layers } from './fixtures';
import { ResultsTable } from './ResultsTable';
import { Inspector } from './Inspector';
import styles from './Atlas.module.css';

const kinds = ['all', 'Aircraft', 'Vessel', 'Place'];
export function AtlasView({ pane, host, updateState }: AppViewProps) {
  const state = pane.state as AtlasState;
  const [store] = useState(() => new FixtureStore());
  const records = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [preview, setPreview] = useState(false);
  const [dateError, setDateError] = useState(false);
  useEffect(() => { if (preview) store.preview(); else store.stop(); return () => store.stop(); }, [preview, store]);
  const patch = (next: Partial<AtlasState>) => updateState({ ...state, ...next });
  const { context } = pane;
  const query = typeof context.filters.query === 'string' ? context.filters.query : '';
  const kind = typeof context.filters.kind === 'string' ? context.filters.kind : 'all';
  const filtered = records.filter(r => context.layerIds.includes(r.layerId) && (kind === 'all' || r.kind === kind) &&
    `${r.label} ${r.id}`.toLowerCase().includes(query.toLowerCase()) && (!context.time.cursor || r.observedAt <= context.time.cursor))
    .sort((a, b) => a[state.sort].localeCompare(b[state.sort]) || a.id.localeCompare(b.id));
  const selectedId = context.selection.entityIds[0];
  const selected = records.find(r => r.id === selectedId);
  const showInspector = !!selected && state.inspectorOpen;
  const select = (id: string) => {
    const record = records.find(r => r.id === id)!;
    host.changeContext({ selection: { entityIds: [id], observationIds: [record.observationId] } });
    patch({ inspectorOpen: true });
  };
  return <main id="workspace" className={styles.atlas} style={{ '--sidebar-width': `${state.sidebarWidth}px`, '--inspector-width': `${state.inspectorWidth}px` } as CSSProperties}>
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}><Button minimal icon="panel-stats" active={state.sidebarOpen} onClick={() => patch({ sidebarOpen: !state.sidebarOpen })}>Layers</Button>
        <span className={styles.separator} /><Button minimal icon="map" active={state.viewMode === 'canvas'} onClick={() => patch({ viewMode: 'canvas' })}>Canvas</Button>
        <Button minimal icon="list" active={state.viewMode === 'list'} onClick={() => patch({ viewMode: 'list' })}>List</Button></div>
      <div className={styles.toolbarGroup}><Tag minimal>DEMO</Tag><span className={styles.muted}>No live sources</span></div>
    </div>
    <div className={styles.body} data-inspector={showInspector}>
      {state.sidebarOpen && <aside className={styles.sidebar} aria-label="Layers and filters">
        <div className={styles.panelHeader}><span>LAYERS & FILTERS</span><span className={styles.muted}>03</span></div>
        <div className={styles.sidebarSection}>
          <InputGroup leftIcon="search" aria-label="Filter demo records" placeholder="Find a record…" value={query}
            onChange={e => host.changeContext({ filters: { ...context.filters, query: e.target.value } })} />
          <label className={styles.fieldLabel}>Record type</label>
          <Select<string> items={kinds} filterable={false} onItemSelect={value => host.changeContext({ filters: { ...context.filters, kind: value } })}
            itemRenderer={(item, { handleClick, modifiers }) => <MenuItem key={item} text={item === 'all' ? 'All types' : item} onClick={handleClick} active={modifiers.active} selected={kind === item} />}>
            <Button fill alignText="left" rightIcon="chevron-down" aria-label="Record type">{kind === 'all' ? 'All types' : kind}</Button>
          </Select>
        </div>
        <div className={styles.sidebarSection}><div className={styles.sectionHeading}>Demo collection <span>{records.length}</span></div>
          {layers.map(layer => <div className={styles.layer} key={layer.id}><Checkbox checked={context.layerIds.includes(layer.id)}
            onChange={() => host.changeContext({ layerIds: context.layerIds.includes(layer.id) ? context.layerIds.filter(id => id !== layer.id) : [...context.layerIds, layer.id] })}>
            <Icon icon={layer.icon} /> <span>{layer.label}</span></Checkbox><span className={styles.muted}>{layer.count}</span></div>)}
          <div className={styles.sourceNote}><Icon icon="info-sign" /><span>Bundled, synthetic records.<br />No provider connection.</span></div>
        </div>
        <div className={styles.sidebarSection}><div className={styles.sectionHeading}>Matching records <span>{filtered.length}</span></div>
          {filtered.slice(0, 6).map(record => <button key={record.id} className={styles.resultRow} data-selected={selectedId === record.id} onClick={() => select(record.id)}>
            <Icon icon={record.kind === 'Aircraft' ? 'airplane' : record.kind === 'Vessel' ? 'ship' : 'map-marker'} /><span>{record.label}<small>{record.kind} · Demo</small></span><Icon icon="chevron-right" />
          </button>)}
          {!filtered.length && <p className={styles.muted}>No matching records.</p>}
          <Button minimal rightIcon="arrow-right" onClick={() => patch({ viewMode: 'list' })}>Show all results</Button>
        </div>
        <div className={styles.sidebarFooter}><label>Panel width <input aria-label="Sidebar width" type="range" min="240" max="440" step="10" value={state.sidebarWidth} onChange={e => patch({ sidebarWidth: +e.target.value })} /></label></div>
      </aside>}
      <div className={styles.workspaceCenter}>
        {state.viewMode === 'canvas' && <div className={styles.canvas}>
          <div className={styles.canvasLabel}><Icon icon="globe" /> GLOBAL OBSERVATORY</div>
          <div className={styles.canvasEmpty}><img src="/brand/atlas-mark-white.svg" alt="" />
            <div className={styles.eyebrow}>ATLAS / DEMO WORKSPACE</div><h1>Explore the demo collection</h1>
            <p>The map is unavailable in this preview.<br />Open the records to explore selection, filters and provenance.</p>
            <Button intent="primary" icon="th" onClick={() => patch({ resultsOpen: true })}>Open results</Button>
            <span className={styles.canvasCaption}>{filtered.length} matching records · 3 fixture layers</span>
          </div>
        </div>}
        {(state.viewMode === 'list' || state.resultsOpen) && <section className={styles.results} data-full={state.viewMode === 'list'} aria-label="Results">
          <div className={styles.resultsHeader}><strong>Results <span>{filtered.length}</span></strong><span className={styles.muted}>{filtered.length} returned · {filtered.length} visible · complete fixture set</span>
            <div className={styles.resultsActions}><label>Sort <select aria-label="Sort results" value={state.sort} onChange={e => patch({ sort: e.target.value as AtlasState['sort'] })}><option value="label">Name</option><option value="kind">Type</option></select></label>
              {state.viewMode === 'canvas' && <><Button minimal onClick={() => patch({ viewMode: 'list' })}>Accessible list</Button><Button minimal icon="cross" aria-label="Close results" onClick={() => patch({ resultsOpen: false })} /></>}</div>
          </div>
          <ResultsTable records={filtered} selectedId={selectedId} select={select} semantic={state.viewMode === 'list'} />
        </section>}
      </div>
      {showInspector && <div className={styles.inspectorWrap}>
        <Inspector record={selected} expanded={state.expandedDetails} toggleExpanded={() => patch({ expandedDetails: !state.expandedDetails })} close={() => patch({ inspectorOpen: false })} />
        <label className={styles.inspectorResize}>Panel width <input aria-label="Inspector width" type="range" min="280" max="520" step="10" value={state.inspectorWidth} onChange={e => patch({ inspectorWidth: +e.target.value })} /></label>
      </div>}
    </div>
    <footer className={styles.timebar}><div className={styles.toolbarGroup}><Icon icon="time" /><strong>Demo time</strong><span className={styles.mono}>{(context.time.cursor ?? fixtureTime).slice(0, 19).replace('T', ' ')} UTC</span>
      <PopoverNext placement="top-start" content={<div className={styles.timePopover}><label className="bp6-label">Pane time · UTC</label>
        <DateInput locale={enUS} value={context.time.cursor ?? fixtureTime} timezone="UTC" showTimezoneSelect={false} disableTimezoneSelect
          formatDate={date => date.toISOString().slice(0, 10)} parseDate={value => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
            const date = new Date(`${value}T12:00:00Z`);
            return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : false;
          }}
          onChange={value => { setDateError(false); if (value) host.changeContext({ time: { mode: 'paused', cursor: new Date(value).toISOString(), from: null, to: null } }); }}
          onError={() => setDateError(true)} inputProps={{ 'aria-label': 'Pane date UTC' }} />
        {dateError && <p role="alert" className={styles.error}>Enter a valid date as YYYY-MM-DD.</p>}
        <p className={styles.muted}>Fixture observations begin at 12:00 UTC on 21 September 2026.</p>
        <Button onClick={() => host.changeContext({ time: { mode: 'live', cursor: null, from: null, to: null } })}>Reset demo time</Button>
      </div>}><Button minimal icon="calendar" aria-label="Change pane time" /></PopoverNext>
    </div><Button minimal active={preview} icon={preview ? 'pause' : 'play'} onClick={() => setPreview(!preview)}>{preview ? 'Stop demo updates' : 'Preview demo updates'}</Button></footer>
    <div className={styles.statusbar}><span>VANTAGE synthetic fixtures · v1</span><span>{preview ? 'Simulated updates · not a live feed' : 'No live source requests'} · {selected ? `Selected: ${selected.label}` : 'Nothing selected'}</span></div>
  </main>;
}

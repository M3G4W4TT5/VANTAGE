import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Dialog, DialogBody, DialogFooter, PopoverNext } from '@blueprintjs/core';
import type { ConnectionDto, ConnectionStatusDto } from '../../api/generated/client';
import type { AppViewProps } from '../../platform/registry/AppRegistry';
import { aircraftChannel } from '../../platform/data/AircraftChannel';
import type { AircraftChannel } from '../../platform/data/AircraftChannel';
import { earthquakeChannel } from '../../platform/data/EarthquakeChannel';
import type { EarthquakeChannel } from '../../platform/data/EarthquakeChannel';
import { geoJsonChannel } from '../../platform/data/GeoJsonChannel';
import type { GeoJsonChannel } from '../../platform/data/GeoJsonChannel';
import { useSourceServices } from '../../platform/sources/SourceServices';
import { client, errorMessage } from '../../platform/workspaces/WorkspaceService';
import { PanelResize } from '../../platform/ui/PanelResize';
import { UiIcon } from '../../platform/ui/UiIcon';
import { AircraftInspector } from './AircraftInspector';
import { AtlasLayerEditor } from './AtlasLayerEditor';
import { AtlasResultsView } from './AtlasResultsView';
import { atlasGroups, groupId, layerShown, mapRecordKey, setGroupMapRecordsShown, setGroupsVisible } from './atlasGroups';
import type { AtlasGroup } from './atlasGroups';
import { categoryOf, collectResults, domainLabel } from './atlasResults';
import type { AtlasResult } from './atlasResults';
import { MAP_MARKER_LIMIT, MAP_VECTOR_LIMIT, markerQuota } from './atlasMarkerComposition';
import { ContributorBoundary } from './ContributorBoundary';
import type { AircraftLayer, AtlasLayer, AtlasState, EarthquakeLayer, GeoJsonLayer } from './atlasModule';
import type { AtlasChannel } from './atlasDemand';
import { layerDemandKey } from './atlasDemand';
import { EarthquakeInspector } from './EarthquakeInspector';
import { AtlasContextMenu } from './AtlasContextMenu';
import type { AtlasMenuItem, GroupAction } from './AtlasContextMenu';
import { LayerLegendHint } from './LayerLegendHint';
import { MapListResize } from './MapListResize';
import { GeoJsonInspector } from './GeoJsonInspector';
import styles from './Atlas.module.css';

const ComposedAtlasMap = lazy(() => import('./ComposedAtlasMap').then(module => ({ default: module.ComposedAtlasMap })));
const dataDomain = (domain: AtlasLayer['domain']) => domain === 'aircraft' ? 'aircraft' : domain === 'earthquakes' ? 'earthquake' : 'geojson';
const noViewport = () => {};
const groupMenuItems: AtlasMenuItem<GroupAction>[] = [
  { action: 'filters', label: 'Filters' }, { action: 'actions', label: 'Actions' },
  { action: 'settings', label: 'Settings' }, { action: 'delete', label: 'Delete group', danger: true },
];
const sourceMenuItems: AtlasMenuItem<'configure'>[] = [{ action: 'configure', label: 'Configure in NEXUS' }];

function available(layer: AtlasLayer, connections: ConnectionDto[] | null, workspaceId: string) {
  const connection = connections?.find(item => item.id === layer.connectionId);
  const dataset = connection?.datasets?.find(item => item.id === layer.datasetId && item.connectionId === layer.connectionId);
  return connection?.status === 'available' && (connection.scope === 'global' || connection.workspaceId === workspaceId) &&
    dataset?.domain === dataDomain(layer.domain) && dataset.availability === 'available';
}

type Message = { key: string; text: string; severity: 'info' | 'warning' | 'error' };

export function AtlasView({ pane, host, updateState }: AppViewProps) {
  const state = pane.state as AtlasState;
  const { context } = pane;
  const { defaultBasemapId } = useSourceServices();
  const [connections, setConnections] = useState<ConnectionDto[] | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, ConnectionStatusDto>>({});
  const [resultLimit, setResultLimit] = useState(300);
  const [now, setNow] = useState(Date.now);
  const [follow, setFollow] = useState(false);
  const [failedLayers, setFailedLayers] = useState<string[]>([]);
  const [editingGroup, setEditingGroup] = useState<{ id: string | null; view: 'settings' | 'filters' | 'actions' } | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [groupMenu, setGroupMenu] = useState<{ id: string; x: number; y: number; returnFocus: HTMLElement } | null>(null);
  const [sourceMenu, setSourceMenu] = useState<{ id: string; name: string; x: number; y: number; returnFocus: HTMLElement } | null>(null);
  const closeGroupMenu = useCallback(() => setGroupMenu(null), []);
  const closeSourceMenu = useCallback(() => setSourceMenu(null), []);
  const [readMessages, setReadMessages] = useState('');
  const [, refreshSnapshots] = useState(0);
  const workspaceId = context.workspaceId;
  const showMap = state.showMap ?? state.viewMode === 'canvas';
  const showList = state.showList ?? state.viewMode === 'list';
  const ratio = state.mapListRatio ?? .55;
  const sidebarTab = state.sidebarTab === 'sources' ? 'sources' : 'layers';
  const groups = atlasGroups(state.layers);
  const editedGroup = editingGroup?.id ? groups.find(group => group.id === editingGroup.id) ?? null : null;
  const deletingGroup = deletingGroupId ? groups.find(group => group.id === deletingGroupId) ?? null : null;

  const loadConnections = async (signal?: AbortSignal) => {
    try { setConnections(await client.connections_List(signal)); setConnectionError(''); }
    catch (reason) { if (!signal?.aborted) setConnectionError(errorMessage(reason)); }
  };
  useEffect(() => {
    const abort = new AbortController();
    void client.connections_List(abort.signal).then(items => {
      if (!abort.signal.aborted) { setConnections(items); setConnectionError(''); }
    }).catch(reason => { if (!abort.signal.aborted) setConnectionError(errorMessage(reason)); });
    return () => abort.abort();
  }, []);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (sidebarTab !== 'sources' || !connections) return;
    const abort = new AbortController();
    void Promise.all(connections.filter(item => item.id).map(async connection => {
      try { return [connection.id!, await client.connections_Status(connection.id!, abort.signal)] as const; }
      catch { return null; }
    })).then(rows => { if (!abort.signal.aborted) setSourceStatuses(Object.fromEntries(rows.filter(row => row !== null))); });
    return () => abort.abort();
  }, [sidebarTab, connections]);

  // Participation requests data independently of display visibility. Dormant migrated layers remain idle until shown.
  const demandJson = JSON.stringify([...new Map(state.layers.filter(layer => layer.participating && available(layer, connections, workspaceId))
    .map(layer => [layerDemandKey(layer, workspaceId), layer.domain === 'aircraft' ?
      { key: layerDemandKey(layer, workspaceId), domain: layer.domain, connectionId: layer.connectionId, workspaceId, query: layer.query } :
      { key: layerDemandKey(layer, workspaceId), domain: layer.domain, connectionId: layer.connectionId, workspaceId }])).values()]);
  const channels = useMemo(() => {
    const result = new Map<string, AtlasChannel>();
    const requests = JSON.parse(demandJson) as ({ key: string; domain: 'aircraft'; connectionId: string; workspaceId: string; query: AircraftLayer['query'] } |
      { key: string; domain: 'earthquakes' | 'geojson'; connectionId: string; workspaceId: string })[];
    for (const request of requests) result.set(request.key, request.domain === 'aircraft' ?
      aircraftChannel(request.query, request.connectionId, request.workspaceId) : request.domain === 'earthquakes' ?
        earthquakeChannel(request.connectionId, request.workspaceId) : geoJsonChannel(request.connectionId, request.workspaceId));
    return result;
  }, [demandJson]);
  const visibleDemandJson = JSON.stringify([...new Set(state.layers.filter(layerShown)
    .map(layer => layerDemandKey(layer, workspaceId)))]);
  useEffect(() => {
    const releases: (() => void)[] = [];
    for (const channel of channels.values()) {
      try { releases.push(channel.acquire()); }
      catch { queueMicrotask(() => setConnectionError('Data access ended. Sign in again to resume this group.')); }
    }
    return () => releases.forEach(release => release());
  }, [channels]);
  useEffect(() => {
    const unsubscribes = (JSON.parse(visibleDemandJson) as string[]).flatMap(key => {
      const channel = channels.get(key);
      return channel ? [channel.subscribe(() => refreshSnapshots(value => value + 1))] : [];
    });
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [channels, visibleDemandJson]);

  const patch = (next: Partial<AtlasState>) => updateState({ ...host.getState(), ...next });
  const setLayers = (layers: AtlasLayer[], next: Partial<AtlasState> = {}) => {
    host.changeContext({ layerIds: layers.filter(layer => layer.participating).map(layer => layer.id) });
    patch({ layers, ...next });
  };
  const selectedLayer = state.layers.find(layer => layer.id === state.selectedLayerId);
  const selectedId = context.selection.entityIds[0];
  const aircraftFor = (layer: AircraftLayer) => channels.get(layerDemandKey(layer, workspaceId)) as AircraftChannel | undefined;
  const earthquakeFor = (layer: EarthquakeLayer) => channels.get(layerDemandKey(layer, workspaceId)) as EarthquakeChannel | undefined;
  const geoJsonFor = (layer: GeoJsonLayer) => channels.get(layerDemandKey(layer, workspaceId)) as GeoJsonChannel | undefined;
  const select = (layerId: string, entityId: string, observationId?: string) => {
    const layer = state.layers.find(item => item.id === layerId);
    if (!layer) return;
    const record = layer.domain === 'aircraft' ? aircraftFor(layer)?.getSnapshot().records.find(item => item.entity.id === entityId) :
      layer.domain === 'earthquakes' ? earthquakeFor(layer)?.getSnapshot().records.find(item => item.entity.id === entityId) :
        geoJsonFor(layer)?.getSnapshot().records.find(item => item.entity.id === entityId);
    if (!record) return;
    const selection = { entityIds: [entityId], observationIds: [observationId ?? record.observation.id] };
    host.changeContext({ selection });
    patch({ focusedLayerId: layerId, selectedLayerId: layerId, inspectorOpen: true,
      layers: state.layers.map(item => item.id === layerId ? { ...item, lastSelection: selection } : item) });
    setFollow(false);
  };
  const selectedAircraft = selectedLayer?.domain === 'aircraft' ?
    aircraftFor(selectedLayer)?.getSnapshot().records.find(record => record.entity.id === selectedId) : undefined;
  const selectedEarthquake = selectedLayer?.domain === 'earthquakes' ?
    earthquakeFor(selectedLayer)?.getSnapshot().records.find(record => record.entity.id === selectedId) : undefined;
  const selectedGeoJson = selectedLayer?.domain === 'geojson' ?
    geoJsonFor(selectedLayer)?.getSnapshot().records.find(record => record.entity.id === selectedId) : undefined;
  const showInspector = state.inspectorOpen && !!selectedLayer && layerShown(selectedLayer) && (!!selectedAircraft || !!selectedEarthquake || !!selectedGeoJson);

  const toggleGroup = (group: AtlasGroup, visible: boolean) =>
    setLayers(setGroupsVisible(state.layers, new Set([group.id]), visible));
  const toggleCategory = (category: string) => {
    const members = groups.filter(group => categoryOf(group.domain) === category);
    const visible = !members.every(group => group.visible);
    const ids = new Set(members.map(group => group.id));
    setLayers(setGroupsVisible(state.layers, ids, visible));
  };
  const saveGroup = (members: AtlasLayer[], mode: 'replace' | 'copy', move: number) => {
    const replaced = editedGroup && mode === 'replace' ? state.layers.filter(layer => groupId(layer) !== editedGroup.id) : state.layers;
    const insert = editedGroup && mode === 'replace' ?
      state.layers.slice(0, state.layers.findIndex(layer => groupId(layer) === editedGroup.id))
        .filter(layer => groupId(layer) !== editedGroup.id).length : replaced.length;
    let next = [...replaced.slice(0, insert), ...members, ...replaced.slice(insert)];
    if (move !== 0) {
      const ordered = atlasGroups(next);
      const index = ordered.findIndex(group => group.id === groupId(members[0]));
      if (index >= 0) {
        const [block] = ordered.splice(index, 1);
        ordered.splice(Math.max(0, Math.min(ordered.length, index + move)), 0, block);
        next = ordered.flatMap(group => group.layers);
      }
    }
    const liveIds = new Set(next.map(layer => layer.id));
    setLayers(next, { focusedLayerId: liveIds.has(state.focusedLayerId) ? state.focusedLayerId : members[0].id,
      selectedLayerId: state.selectedLayerId && liveIds.has(state.selectedLayerId) ? state.selectedLayerId : null,
      hiddenMapRecordIds: (state.hiddenMapRecordIds ?? []).filter(key => [...liveIds].some(id => key.startsWith(id + ':'))),
      shownMapRecordIds: (state.shownMapRecordIds ?? []).filter(key => [...liveIds].some(id => key.startsWith(id + ':'))) });
    setEditingGroup(null);
  };
  const removeGroup = (group: AtlasGroup) => {
    const next = state.layers.filter(layer => groupId(layer) !== group.id);
    const liveIds = new Set(next.map(layer => layer.id));
    setLayers(next, { focusedLayerId: liveIds.has(state.focusedLayerId) ? state.focusedLayerId : next[0]?.id ?? 'none',
      selectedLayerId: state.selectedLayerId && liveIds.has(state.selectedLayerId) ? state.selectedLayerId : null,
      hiddenMapRecordIds: (state.hiddenMapRecordIds ?? []).filter(key => [...liveIds].some(id => key.startsWith(id + ':'))),
      shownMapRecordIds: (state.shownMapRecordIds ?? []).filter(key => [...liveIds].some(id => key.startsWith(id + ':'))),
      hiddenMapGroupIds: (state.hiddenMapGroupIds ?? []).filter(id => id !== group.id) });
    setFollow(false); setDeletingGroupId(null);
  };
  const toggleMapRecord = (row: AtlasResult) => {
    const key = mapRecordKey(row.layer, row.record.entity.id);
    const groupHidden = (state.hiddenMapGroupIds ?? []).includes(groupId(row.layer));
    const field = groupHidden ? 'shownMapRecordIds' : 'hiddenMapRecordIds';
    const current = state[field] ?? [];
    if (current.includes(key)) patch({ [field]: current.filter(item => item !== key) });
    else if (current.length < 2000) patch({ [field]: [...current, key] });
    else host.notify('This pane has reached its saved map-visibility limit. Change another record before selecting more.');
  };
  const toggleGroupMapRecords = (group: AtlasGroup, shown: boolean) =>
    patch(setGroupMapRecordsShown(state, group, shown));
  const chooseGroupAction = (action: GroupAction) => {
    const id = groupMenu?.id;
    closeGroupMenu();
    if (!id) return;
    if (action === 'delete') setDeletingGroupId(id);
    else setEditingGroup({ id, view: action });
  };
  const allGroups = collectResults(state.layers.filter(layerShown), channels, workspaceId, now);
  const quota = markerQuota(allGroups.length);
  const markerCount = (group: typeof allGroups[number]) => group.rows.reduce((total, row) => {
    const geometry = row.record.observation.geometry;
    if (row.layer.domain === 'geojson' && geometry?.type === 'MultiPoint') return total + geometry.coordinates.length;
    return total + (geometry?.type === 'Point' ? 1 : 0);
  }, 0);
  const mapLimited = allGroups.some(group => markerCount(group) > quota);
  const geoGroups = allGroups.filter(group => group.layer.domain === 'geojson');
  const vectorQuota = Math.max(1, Math.floor(MAP_VECTOR_LIMIT / (geoGroups.length || 1)));
  const vectorsLimited = geoGroups.some(group => group.rows.filter(row => {
    const type = row.record.observation.geometry?.type;
    return type && type !== 'Point' && type !== 'MultiPoint';
  }).length > vectorQuota);
  const selectResult = (row: AtlasResult) => select(row.layer.id, row.record.entity.id, row.record.observation.id);
  const messages: Message[] = [];
  if (connectionError) messages.push({ key: 'connections', text: connectionError, severity: 'error' });
  const seenChannels = new Set<string>();
  for (const layer of state.layers.filter(layerShown)) {
    const key = layerDemandKey(layer, workspaceId);
    if (seenChannels.has(key)) continue;
    seenChannels.add(key);
    const channel = channels.get(key);
    if (!channel) {
      if (connections) messages.push({ key, text: `${domainLabel(layer.domain)} · Its saved source is unavailable. Check the connection in NEXUS.`,
        severity: 'warning' });
      continue;
    }
    const snapshot = channel.getSnapshot();
    if (snapshot.transport === 'offline')
      messages.push({ key, text: `${domainLabel(layer.domain)} · ${snapshot.health.message}`, severity: 'warning' });
    else if (snapshot.health.state !== 'healthy' && snapshot.health.state !== 'loading')
      messages.push({ key, text: `${domainLabel(layer.domain)} · ${snapshot.health.message}`, severity:
        snapshot.health.state === 'error' || snapshot.health.state === 'setup_required' ? 'error' : 'warning' });
    if (snapshot.completeness.truncated)
      messages.push({ key: key + ':limit', text: `${domainLabel(layer.domain)} returned a limited batch. List counts cover only the current cache.`, severity: 'warning' });
  }
  if (mapLimited) messages.push({ key: 'map-limit', text: `Map symbols are limited to ${quota} per source appearance (${MAP_MARKER_LIMIT} per pane). List retains all cached matches.`, severity: 'info' });
  if (vectorsLimited) messages.push({ key: 'vector-limit', text: `Map lines and areas are limited to ${vectorQuota} per GeoJSON appearance (${MAP_VECTOR_LIMIT} per pane). List retains all cached matches.`, severity: 'info' });
  if (allGroups.some(group => group.error)) messages.push({ key: 'list-presenter', text: 'A group could not prepare its records. Other groups remain available.', severity: 'error' });
  if (failedLayers.length) messages.push({ key: 'presenter', text: `Presentation failed for ${failedLayers.join(', ')}. Other groups remain available.`, severity: 'error' });
  if (context.time.mode !== 'live') messages.push({ key: 'saved-time', text: `Saved ${context.time.mode} time is retained, but current groups show live cache only.`, severity: 'warning' });
  const messageSignature = messages.map(item => `${item.key}:${item.text}`).join('|');
  const unread = messages.length > 0 && readMessages !== messageSignature;
  const strongest = messages.some(item => item.severity === 'error') ? 'error' : messages.some(item => item.severity === 'warning') ? 'warning' : 'info';
  const reportFailure = (id: string) => setFailedLayers(previous => previous.includes(id) ? previous : [...previous, id]);

  return <main id="workspace" className={styles.atlas} style={{ '--sidebar-width': `${state.sidebarWidth}px`,
    '--inspector-width': `${state.inspectorWidth}px` } as CSSProperties}>
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <Button minimal icon={<UiIcon name="layers" />} active={state.sidebarOpen}
          onClick={() => patch({ sidebarOpen: !state.sidebarOpen })}>Sidebar</Button>
        <span className={styles.separator} />
        <Button minimal icon={<UiIcon name="map" />} active={showMap} disabled={showMap && !showList}
          aria-pressed={showMap} onClick={() => patch({ showMap: !showMap, showList, viewMode: !showMap ? 'canvas' : 'list' })}>Map</Button>
        <Button minimal icon={<UiIcon name="list" />} active={showList} disabled={showList && !showMap}
          aria-pressed={showList} onClick={() => patch({ showMap, showList: !showList, viewMode: !showList ? 'list' : 'canvas' })}>List</Button>
      </div>
      <PopoverNext placement="bottom-end" content={<div className={styles.messageInbox} aria-label="Messages">
        <strong>Messages</strong>{messages.length ? messages.map(message => <p key={message.key} data-severity={message.severity}>{message.text}</p>) :
          <p>No current messages.</p>}
      </div>}><Button minimal className={styles.bellButton} aria-label={`Messages${unread ? ', unread' : ''}`}
        icon={<UiIcon name="bell" />} onClick={() => setReadMessages(messageSignature)}>
        {unread && <sup data-severity={strongest}>!</sup>}</Button></PopoverNext>
    </div>
    <div className={styles.body} data-inspector={showInspector}>
      {state.sidebarOpen && <div className={styles.sidebarWrap}><aside className={styles.sidebar} aria-label="ATLAS Layers Sources">
        <div className={styles.sidebarTabs} role="tablist" aria-label="ATLAS sidebar">
          {(['layers', 'sources'] as const).map(tab => <button key={tab} role="tab" aria-selected={sidebarTab === tab}
            tabIndex={sidebarTab === tab ? 0 : -1} onClick={() => patch({ sidebarTab: tab })}
            onKeyDown={event => {
              const tabs = ['layers', 'sources'] as const; const index = tabs.indexOf(tab);
              const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ?
                (index + tabs.length - 1) % tabs.length : -1;
              if (next < 0) return;
              event.preventDefault(); patch({ sidebarTab: tabs[next] });
              (event.currentTarget.parentElement?.querySelectorAll('button[role="tab"]')[next] as HTMLButtonElement | undefined)?.focus();
            }}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
        </div>
        {sidebarTab === 'layers' && <div className={styles.sidebarSection}>
          <div className={styles.layersHeading}><strong>Groups</strong><Button small minimal className={styles.addGroupButton}
            icon={<UiIcon name="plus" size={17} />} aria-label="Add group" title="Add group"
            onClick={() => setEditingGroup({ id: null, view: 'settings' })} /></div>
          <div className={styles.layerColumns}><span>Group</span><span>Show</span></div>
          {(['Vehicles & satellites', 'Events & alerts', 'Feeds & reports'] as const).map(category => {
            const members = groups.filter(group => categoryOf(group.domain) === category);
            if (!members.length) return null;
            return <details key={category} className={styles.category} open>
              <summary>{category}</summary>
              <button className={styles.categoryVisibility} type="button"
                aria-label={`${members.every(group => group.visible) ? 'Hide' : 'Show'} ${category}`}
                aria-pressed={members.every(group => group.visible)} onClick={() => toggleCategory(category)}
                title={members.every(group => group.visible) ? 'Hide category from map and List' : 'Show category on map and in List'}>
                <UiIcon name={members.every(group => group.visible) ? 'eye' : 'eyeOff'} size={16} /></button>
              {members.map(group => <div className={styles.layerGroupRow} key={group.id} role="group" tabIndex={0}
                aria-label={`${group.name} group; open options with Shift+F10`}
                onContextMenu={event => { event.preventDefault(); closeSourceMenu(); setGroupMenu({ id: group.id, x: event.clientX, y: event.clientY,
                  returnFocus: event.currentTarget }); }}
                onKeyDown={event => {
                  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
                  event.preventDefault(); closeSourceMenu(); const bounds = event.currentTarget.getBoundingClientRect();
                  setGroupMenu({ id: group.id, x: bounds.left + 30, y: bounds.bottom, returnFocus: event.currentTarget });
                }}>
                <div className={styles.layerGroupName}>
                  <LayerLegendHint name={group.name} domain={group.domain} />
                  {group.layers.length > 1 && <small title={`${group.layers.length} configured sources`}> · {group.layers.length}</small>}
                </div>
                <button className={styles.visibilityButton} type="button" aria-label={`${group.visible ? 'Hide' : 'Show'} ${group.name}`}
                  aria-pressed={group.visible} onClick={() => toggleGroup(group, !group.visible)}
                  title={group.visible ? 'Visible on map and in List' : 'Hidden from map and List'}>
                  <UiIcon name={group.visible ? 'eye' : 'eyeOff'} size={18} /></button>
              </div>)}
            </details>;
          })}
          {!groups.length && <p className={styles.muted}>No groups yet. Add a group and choose a configured source.</p>}
        </div>}
        {sidebarTab === 'sources' && <div className={styles.sidebarSection}>
          <div className={styles.layersHeading}><strong>Configured sources</strong><Button small minimal onClick={() => void loadConnections()}>Refresh</Button></div>
          {connections?.map(connection => <div key={connection.id} className={styles.compactSource} role="group" tabIndex={0}
            aria-label={`${connection.name} source; open options with Shift+F10`}
            onContextMenu={event => { event.preventDefault(); closeGroupMenu();
              setSourceMenu({ id: connection.id!, name: connection.name ?? 'Unnamed source', x: event.clientX, y: event.clientY,
                returnFocus: event.currentTarget }); }}
            onKeyDown={event => {
              if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
              event.preventDefault(); closeGroupMenu(); const bounds = event.currentTarget.getBoundingClientRect();
              setSourceMenu({ id: connection.id!, name: connection.name ?? 'Unnamed source', x: bounds.left + 30, y: bounds.bottom,
                returnFocus: event.currentTarget });
            }}>
            <strong title={connection.name}>{connection.name}</strong>
            <small title={`${connection.status ?? 'Unknown'} · ${sourceStatuses[connection.id ?? '']?.healthState ?? 'not checked'}`}>
              {(sourceStatuses[connection.id ?? '']?.healthState ?? connection.status ?? 'Unknown').replaceAll('_', ' ')}</small>
          </div>)}
          {!connections && !connectionError && <p role="status">Loading sources…</p>}
          {connections?.length === 0 && <p role="status">No connections configured.</p>}
        </div>}
      </aside><PanelResize label="ATLAS sidebar width" edge="right" value={state.sidebarWidth} min={240} max={440}
        onChange={sidebarWidth => patch({ sidebarWidth })} /></div>}
      <div className={styles.workspaceCenter}>
        <div className={styles.mapListSplit} style={{ '--map-ratio': `${Math.round(ratio * 100)}%` } as CSSProperties}>
          {showMap && <div className={styles.mapPane}><Suspense fallback={<div className={styles.empty}>Loading the map…</div>}>
            <ComposedAtlasMap key={state.mapMode} state={state} layers={state.layers} channels={channels} workspaceId={workspaceId}
              selectedId={selectedId} follow={follow} basemapId={state.basemapId ?? defaultBasemapId} reportFailure={reportFailure}
              select={reference => { if (reference.layerInstanceId) select(reference.layerInstanceId, reference.entityId, reference.observationId); }}
              setMode={mapMode => patch({ mapMode })} setBasemap={basemapId => patch({ basemapId })}
              setCamera={camera => patch({ camera })} setViewport={noViewport}
              setQuery={(layer, query) => { setFollow(false); setLayers(state.layers.map(item =>
                groupId(item) === groupId(layer) && item.domain === 'aircraft' ? { ...item, query } : item)); }} />
          </Suspense></div>}
          {showMap && showList && <MapListResize ratio={ratio} onChange={mapListRatio => patch({ mapListRatio })} />}
          {showList && <div className={styles.listPane}><AtlasResultsView groups={allGroups} selectedLayerId={state.selectedLayerId}
            selectedId={selectedId} select={selectResult} visibilityState={state}
            toggleMapRecord={toggleMapRecord} toggleGroupMapRecords={toggleGroupMapRecords}
            limit={resultLimit} showMore={() => setResultLimit(value => value + 300)} />
          </div>}
        </div>
        <div className={styles.timelineBar}><button onClick={() => patch({ timelineOpen: !state.timelineOpen })}
          aria-expanded={!!state.timelineOpen}>Timeline</button>
          <button aria-label={state.timelineOpen ? 'Collapse timeline' : 'Expand timeline'}
            onClick={() => patch({ timelineOpen: !state.timelineOpen })}><UiIcon name={state.timelineOpen ? 'down' : 'up'} size={18} /></button>
        </div>
        {state.timelineOpen && <div className={styles.timelinePlaceholder} role="status">Timeline is not available for the current live sources. No replay or recording is active.</div>}
      </div>
      {showInspector && <div className={styles.inspectorWrap}>
        <div className={styles.inspectorContext}>Selected record · {selectedLayer ? `${domainLabel(selectedLayer.domain)} · ${selectedLayer.groupName ?? selectedLayer.id.slice(0, 8)}` : 'group unavailable'}</div>
        {selectedAircraft && <ContributorBoundary key={selectedLayer?.id} label="Aircraft inspector"><AircraftInspector record={selectedAircraft} now={now} selectedObservationId={context.selection.observationIds[0]}
          expanded={state.expandedDetails} toggleExpanded={() => patch({ expandedDetails: !state.expandedDetails })}
          close={() => { setFollow(false); patch({ inspectorOpen: false }); }} follow={follow}
          toggleFollow={() => { setFollow(!follow); patch({ showMap: true, viewMode: 'canvas' }); }} /></ContributorBoundary>}
        {selectedEarthquake && <ContributorBoundary key={selectedLayer?.id} label="Earthquake inspector"><EarthquakeInspector record={selectedEarthquake} selectedObservationId={context.selection.observationIds[0]}
          workspaceId={workspaceId} now={now} expanded={state.expandedDetails}
          toggleExpanded={() => patch({ expandedDetails: !state.expandedDetails })}
          close={() => patch({ inspectorOpen: false })} zoom={() => {
            const coordinates = selectedEarthquake.observation.geometry?.coordinates;
            if (coordinates) patch({ camera: { longitude: coordinates[0], latitude: coordinates[1], height: 750000 }, showMap: true, viewMode: 'canvas' });
          }} /></ContributorBoundary>}
        {selectedGeoJson && <ContributorBoundary key={selectedLayer?.id} label="GeoJSON inspector"><GeoJsonInspector record={selectedGeoJson}
          selectedObservationId={context.selection.observationIds[0]} workspaceId={workspaceId}
          expanded={state.expandedDetails} toggleExpanded={() => patch({ expandedDetails: !state.expandedDetails })}
          close={() => patch({ inspectorOpen: false })} /></ContributorBoundary>}
        <PanelResize label="Inspector width" edge="left" value={state.inspectorWidth} min={280} max={520}
          onChange={inspectorWidth => patch({ inspectorWidth })} />
      </div>}
    </div>
    {groupMenu && <AtlasContextMenu label={`${groups.find(group => group.id === groupMenu.id)?.name ?? 'Group'} group options`}
      items={groupMenuItems}
      x={groupMenu.x} y={groupMenu.y} returnFocus={groupMenu.returnFocus}
      onClose={closeGroupMenu} onChoose={chooseGroupAction} />}
    {sourceMenu && <AtlasContextMenu label={`${sourceMenu.name} source options`} items={sourceMenuItems}
      x={sourceMenu.x} y={sourceMenu.y} returnFocus={sourceMenu.returnFocus}
      onClose={closeSourceMenu} onChoose={() => { closeSourceMenu(); host.openSystemTool?.('nexus', sourceMenu.id); }} />}
    {deletingGroup && <Dialog isOpen title={`Delete group · ${deletingGroup.name}`} onClose={() => setDeletingGroupId(null)}>
      <DialogBody>Delete this group's saved presentation and stop its pane demand? Stored observations and NEXUS connections remain.</DialogBody>
      <DialogFooter actions={<><Button onClick={() => setDeletingGroupId(null)}>Cancel</Button>
        <Button intent="danger" onClick={() => removeGroup(deletingGroup)}>Delete group</Button></>} />
    </Dialog>}
    {editingGroup && <AtlasLayerEditor key={`${editingGroup.id ?? 'new'}:${editingGroup.view}`} group={editedGroup}
      view={editingGroup.view} connections={connections ?? []}
      workspaceId={workspaceId} paneId={pane.id} camera={state.camera} totalLayers={state.layers.length} recovery={state.recovery}
      onClose={() => setEditingGroup(null)} onSave={saveGroup} />}
  </main>;
}

import { useState } from 'react';
import { Button, Dialog, DialogBody, DialogFooter } from '@blueprintjs/core';
import type { ConnectionDto, DatasetDto } from '../../api/generated/client';
import type { CameraState } from '../../platform/maps/PointMarkers';
import { AircraftLayerFilters } from './AircraftContributor';
import { EarthquakeLayerFilters } from './EarthquakeContributor';
import { defaultEarthquakeSettings } from './earthquakePresentation';
import type { AircraftLayer, AtlasLayer, AtlasState, EarthquakeLayer } from './atlasModule';
import type { AtlasGroup } from './atlasGroups';
import styles from './Atlas.module.css';

type Source = { connection: ConnectionDto; dataset: DatasetDto };
const sourceKey = (connectionId: string, datasetId: string) => `${connectionId}\u001f${datasetId}`;

export function AtlasLayerEditor({ group, view = 'settings', connections, workspaceId, paneId, camera, totalLayers, recovery, onClose, onSave }: {
  group: AtlasGroup | null; connections: ConnectionDto[]; workspaceId: string; paneId: string; camera: CameraState;
  view?: 'settings' | 'filters' | 'actions'; totalLayers: number; recovery?: AtlasState['recovery']; onClose(): void;
  onSave(members: AtlasLayer[], mode: 'replace' | 'copy', move: number): void;
}) {
  const [id] = useState(() => group?.id ?? crypto.randomUUID());
  const [name, setName] = useState(group?.name ?? 'New group');
  const [domain, setDomain] = useState<AtlasLayer['domain']>(group?.domain ?? 'aircraft');
  const [members, setMembers] = useState<AtlasLayer[]>(() => structuredClone(group?.layers ?? []));
  const [tab, setTab] = useState('Sources');
  const [move, setMove] = useState(0);
  const [mode, setMode] = useState<'replace' | 'copy'>('replace');
  const first = members[0];
  const visible = group?.visible ?? true;
  const sourceList: Source[] = connections.flatMap(connection => (connection.datasets ?? [])
    .filter(dataset => dataset.domain === (domain === 'aircraft' ? 'aircraft' : 'earthquake'))
    .map(dataset => ({ connection, dataset })));
  const selected = new Set(members.map(layer => sourceKey(layer.connectionId, layer.datasetId)));
  const usable = (source: Source) => source.connection.status === 'available' && source.dataset.availability === 'available' &&
    (source.connection.scope === 'global' || source.connection.workspaceId === workspaceId);
  const createMember = (source: Source): AtlasLayer => {
    const base = { id: crypto.randomUUID(), groupId: id, groupName: name, connectionId: source.connection.id!, datasetId: source.dataset.id!,
      visible, participating: visible, appearance: structuredClone(first?.appearance ?? { opacity: 1, sizeScale: 1 }) };
    if (domain === 'aircraft') {
      const previous = first?.domain === 'aircraft' ? first : undefined;
      return { ...base, domain, query: structuredClone(previous?.query ?? { longitude: camera.longitude,
        latitude: Math.max(-85, Math.min(85, camera.latitude)), radiusNm: 250 }),
        filters: structuredClone(previous?.filters ?? { query: '', freshness: 'all' }) };
    }
    const previous = first?.domain === 'earthquakes' ? first : undefined;
    return { ...base, domain, filters: structuredClone(previous?.filters ?? defaultEarthquakeSettings) };
  };
  const updateShared = (changed: AtlasLayer) => setMembers(current => current.map(layer => {
    if (layer.domain !== changed.domain) return layer;
    if (changed.domain === 'aircraft' && layer.domain === 'aircraft')
      return { ...layer, filters: changed.filters, query: changed.query, appearance: changed.appearance };
    if (changed.domain === 'earthquakes' && layer.domain === 'earthquakes')
      return { ...layer, filters: changed.filters, appearance: changed.appearance };
    return layer;
  }));
  const tabs = ['Sources', 'Appearance', 'Coverage & time', ...(recovery ? ['Previous view'] : [])];
  const additional = mode === 'copy' ? members.length : members.length - (group?.layers.length ?? 0);
  const valid = name.trim().length > 0 && name.trim().length <= 120 && members.length > 0 && totalLayers + additional <= 16;
  const save = () => {
    if (!valid) return;
    const groupId = mode === 'copy' ? crypto.randomUUID() : id;
    onSave(members.map(layer => ({ ...layer, id: mode === 'copy' ? crypto.randomUUID() : layer.id,
      groupId, groupName: name.trim(), visible })), mode, move);
  };
  return <Dialog isOpen title={group ? `${view === 'settings' ? 'Group settings' : view === 'filters' ? 'Filters' : 'Actions'} · ${group.name}` : 'Add group'}
    onClose={onClose} className={styles.layerDialog}
    style={view === 'settings' ? { width: 'min(960px, calc(100vw - 32px))' } : undefined}>
    <DialogBody>
      {view === 'settings' && <>
      <div className={styles.editorHeading}>
        <label>Group name<input value={name} maxLength={120} onChange={event => setName(event.target.value)} /></label>
        <label>Type<select value={domain} disabled={!!group || members.length > 0}
          onChange={event => setDomain(event.target.value as AtlasLayer['domain'])}>
          <option value="aircraft">Aircraft</option><option value="earthquakes">Earthquakes</option></select></label>
      </div>
      <div className={styles.editorTabs} role="tablist" aria-label="Group settings">{tabs.map(item => <button key={item} role="tab"
        aria-selected={tab === item} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)}
        onKeyDown={event => {
          const index = tabs.indexOf(item); const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length :
            event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : -1;
          if (next < 0) return;
          event.preventDefault(); setTab(tabs[next]);
          (event.currentTarget.parentElement?.querySelectorAll('button[role="tab"]')[next] as HTMLButtonElement | undefined)?.focus();
        }}>{item}</button>)}</div>
      {tab === 'Sources' && <div className={styles.editorPanel} role="tabpanel">
        <p>Choose one or more configured {domain === 'aircraft' ? 'aircraft' : 'earthquake'} datasets. Connection settings remain in NEXUS.</p>
        {sourceList.map(source => {
          const key = sourceKey(source.connection.id!, source.dataset.id!);
          const checked = selected.has(key);
          return <label className={styles.editorSource} key={key}><input type="checkbox" checked={checked}
            disabled={!checked && (!usable(source) || totalLayers + additional >= 16)}
            onChange={event => setMembers(current => event.target.checked ? [...current, createMember(source)] :
              current.filter(layer => sourceKey(layer.connectionId, layer.datasetId) !== key))} />
            <span><strong>{source.connection.name}</strong><small>{source.dataset.coverage ?? source.dataset.productId ?? 'Coverage unknown'} · {source.connection.status}</small></span>
          </label>;
        })}
        {!sourceList.length && <p role="status">No compatible datasets are configured. Add a connection in NEXUS first.</p>}
        {members.some(layer => !sourceList.some(source => sourceKey(source.connection.id!, source.dataset.id!) ===
          sourceKey(layer.connectionId, layer.datasetId))) && <p role="status">A saved source is unavailable here. Its reference remains in this draft.</p>}
      </div>}
      </>}
      {view === 'filters' && <div className={styles.editorPanel}>{first?.domain === 'aircraft' ?
        <AircraftLayerFilters key={first.id} layer={first as AircraftLayer} paneId={paneId} update={updateShared} /> :
        first?.domain === 'earthquakes' ? <EarthquakeLayerFilters layer={first as EarthquakeLayer} paneId={paneId} update={updateShared} /> :
          <p>This group has no configured dataset.</p>}</div>}
      {view === 'settings' && tab === 'Appearance' && <div className={styles.editorPanel} role="tabpanel">{first ? <>
        <label className={styles.fieldLabel}>Marker opacity · {first.appearance.opacity.toFixed(1)}
          <input type="range" min="0" max="1" step="0.1" value={first.appearance.opacity}
            onChange={event => updateShared({ ...first, appearance: { ...first.appearance, opacity: +event.target.value } })} /></label>
        <label className={styles.fieldLabel}>Marker size · {first.appearance.sizeScale.toFixed(1)}×
          <input type="range" min="0.5" max="2" step="0.1" value={first.appearance.sizeScale}
            onChange={event => updateShared({ ...first, appearance: { ...first.appearance, sizeScale: +event.target.value } })} /></label>
      </> : <p>Choose a dataset in Sources first.</p>}</div>}
      {view === 'settings' && tab === 'Coverage & time' && <div className={styles.editorPanel} role="tabpanel">
        {members.map(layer => {
          const source = sourceList.find(item => item.connection.id === layer.connectionId && item.dataset.id === layer.datasetId);
          return <p key={layer.id}><strong>{source?.connection.name ?? layer.connectionId}</strong> · {source?.dataset.coverage ?? 'Coverage unavailable'}<br />
            {source?.dataset.attribution ?? 'Attribution unavailable'} · {source?.dataset.pollSeconds ? `${source.dataset.pollSeconds}s provider cadence` : 'Cadence unavailable'}</p>;
        })}
        <p>Current cache only. Historical time filtering is unavailable for these sources.</p>
      </div>}
      {view === 'actions' && <div className={styles.editorPanel}>
        <p>These changes take effect when you choose Save changes below.</p>
        <div className={styles.actionGrid}>
          <Button small disabled={!group} onClick={() => setMove(value => value - 1)}>Draw earlier</Button>
          <Button small disabled={!group} onClick={() => setMove(value => value + 1)}>Draw later</Button>
          <Button small disabled={!group} active={mode === 'copy'} onClick={() => { setMode('copy'); setName(`${group?.name ?? name} copy`); }}>Copy group</Button>
        </div>
        {mode === 'copy' && <label className={styles.editorHeading}>Copy name<input value={name} maxLength={120}
          onChange={event => setName(event.target.value)} /></label>}
        {move !== 0 && <p>Drawing order change: {move > 0 ? `later by ${move}` : `earlier by ${-move}`}.</p>}
      </div>}
      {view === 'settings' && tab === 'Previous view' && recovery && <div className={styles.editorPanel} role="tabpanel"><p>{recovery.explanation}</p>
        <p>Prior {recovery.inactiveDomain} camera: {recovery.inactiveCamera ?
          `${recovery.inactiveCamera.longitude.toFixed(2)}, ${recovery.inactiveCamera.latitude.toFixed(2)}` : 'No saved camera'}.</p>
        {recovery.legacyDataMode === 'demo' && <p>The prior pane used demo mode; live sources remain hidden until explicitly shown.</p>}
      </div>}
      {!valid && <p className={styles.error} role="alert">Name the group and choose a source. A pane supports up to 16 source appearances.</p>}
    </DialogBody>
    <DialogFooter actions={<><Button onClick={onClose}>Discard</Button>
      <Button intent="primary" disabled={!valid} onClick={save}>{mode === 'copy' ? 'Save copy' : 'Save changes'}</Button></>} />
  </Dialog>;
}

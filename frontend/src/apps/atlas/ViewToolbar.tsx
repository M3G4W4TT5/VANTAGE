import { Button } from '@blueprintjs/core';
import type { AppViewProps } from '../../platform/registry/AppRegistry';
import type { AtlasState } from './atlasModule';
import { UiIcon } from '../../platform/ui/UiIcon';
import styles from './Atlas.module.css';
export function ViewToolbar({ pane, host, updateState }: AppViewProps) {
  const state = pane.state as AtlasState;
  const patch = (next: Partial<AtlasState>) => updateState({ ...host.getState(), ...next });
  const view = state.liveView ?? 'aircraft';
  const changeView = (next: 'aircraft' | 'earthquakes') => {
    if (next === view) return;
    const saved = next === 'aircraft' ? state.aircraftSelection : state.earthquakeSelection;
    const previous = view === 'aircraft' ? { aircraftSelection: pane.context.selection } : { earthquakeSelection: pane.context.selection };
    host.changeContext({ layerIds: [next], selection: saved ?? { entityIds: [], observationIds: [] }, time: { mode: 'live', cursor: null, from: null, to: null } });
    patch({ ...previous, liveView: next, inspectorOpen: !!saved?.entityIds.length });
  };
  return <div className={styles.toolbar}>
    <div className={styles.toolbarGroup}>
      <Button minimal icon={<UiIcon name="layers" />} active={state.sidebarOpen} onClick={() => patch({ sidebarOpen: !state.sidebarOpen })}>Layers</Button>
      <span className={styles.separator} />
      <Button minimal icon={<UiIcon name="map" />} active={state.viewMode === 'canvas'} onClick={() => patch({ viewMode: 'canvas' })}>Map</Button>
      <Button minimal icon={<UiIcon name="list" />} active={state.viewMode === 'list'} onClick={() => patch({ viewMode: 'list' })}>List</Button>
      <Button minimal icon={<UiIcon name="table" />} active={state.resultsOpen} onClick={() => patch({ resultsOpen: !state.resultsOpen })}>Results</Button>
      <span className={styles.separator} />
      <Button minimal active={(state.mapMode ?? '2d') === '2d'} onClick={() => patch({ mapMode: '2d' })}>2D</Button>
      <Button minimal icon={<UiIcon name="globe" />} active={state.mapMode === '3d'} onClick={() => patch({ mapMode: '3d' })}>Globe</Button>
    </div>
    <div className={styles.toolbarGroup} role="group" aria-label="ATLAS domain view">
      <Button minimal icon={<UiIcon name="plane" />} active={view === 'aircraft'} aria-pressed={view === 'aircraft'} onClick={() => changeView('aircraft')}>Aircraft</Button>
      <Button minimal icon={<UiIcon name="event" />} active={view === 'earthquakes'} aria-pressed={view === 'earthquakes'} onClick={() => changeView('earthquakes')}>Earthquakes</Button>
      <Button minimal onClick={() => {
        host.changeContext({ layerIds: ['demo-aircraft', 'demo-vessels', 'demo-places'], filters: { query: '', kind: 'all' },
          selection: { entityIds: [], observationIds: [] }, time: { mode: 'live', cursor: null, from: null, to: null } }); patch({ dataMode: 'demo' });
      }}>Demo collection</Button>
    </div>
  </div>;
}

import { useEffect } from 'react';
import type { AppViewProps } from '../../platform/registry/AppRegistry';
import { EarthquakeView } from './EarthquakeView';
import { LiveAircraftView } from './LiveAircraftView';
export function AtlasView(props: AppViewProps) {
  const { pane, host, updateState } = props;
  useEffect(() => {
    if (pane.state.dataMode === 'live') return;
    host.changeContext({ layerIds: ['aircraft'], filters: {}, selection: { entityIds: [], observationIds: [] },
      time: { mode: 'live', cursor: null, from: null, to: null } });
    updateState({ ...host.getState(), dataMode: 'live', liveView: 'aircraft', inspectorOpen: false });
  }, [pane.state.dataMode, host, updateState]);
  return pane.state.liveView === 'earthquakes' ? <EarthquakeView {...props} /> : <LiveAircraftView {...props} />;
}

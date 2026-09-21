import type { AppViewProps } from '../../platform/registry/AppRegistry';
import { DemoView } from './DemoView';
import { EarthquakeView } from './EarthquakeView';
import { LiveAircraftView } from './LiveAircraftView';
export function AtlasView(props: AppViewProps) {
  return props.pane.state.dataMode === 'live' ? props.pane.state.liveView === 'earthquakes' ? <EarthquakeView {...props} /> : <LiveAircraftView {...props} /> : <DemoView {...props} />;
}

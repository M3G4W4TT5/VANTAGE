import type { AppViewProps } from '../../platform/registry/AppRegistry';
import { DemoView } from './DemoView';
import { LiveAircraftView } from './LiveAircraftView';
export function AtlasView(props: AppViewProps) {
  return props.pane.state.dataMode === 'live' ? <LiveAircraftView {...props} /> : <DemoView {...props} />;
}

import type { AppModule } from '../../platform/registry/AppRegistry';
import type { Selection } from '../../platform/contracts';
import { validateContract } from '../../platform/contracts';
import { AtlasView } from './AtlasView';
import { records } from './fixtures';

import type { AircraftQuery } from '../../platform/data/AircraftChannel';
import type { CameraState } from '../../platform/maps/PointMarkers';
export type EarthquakeSettings = { query: string; minimumMagnitude: number | null; maxAgeHours: number | null; sort: 'occurred' | 'magnitude' | 'updated' };
export type AtlasState = {
  liveView?: 'aircraft' | 'earthquakes'; earthquakeSettings?: EarthquakeSettings; earthquakeCamera?: CameraState;
  aircraftSelection?: Selection; earthquakeSelection?: Selection;
  basemapId?: string; dataMode?: 'live' | 'demo'; aircraftQuery?: AircraftQuery; mapMode?: '2d' | '3d'; camera?: CameraState;
  schemaVersion: 1; viewMode: 'canvas' | 'list'; resultsOpen: boolean; sidebarOpen: boolean;
  inspectorOpen: boolean; sidebarWidth: number; inspectorWidth: number; sort: 'label' | 'kind'; expandedDetails: boolean;
};
export const atlasModule: AppModule = {
  manifest: { id: 'atlas', name: 'ATLAS', version: '0.1.0', platformApiVersion: 1, entryView: 'AtlasView', stateSchemaVersion: 1,
    acceptedEntityKinds: ['aircraft', 'earthquake', 'vessel', 'place'], actions: [{ id: 'inspect-demo', label: 'Inspect record', acceptedKinds: ['aircraft', 'vessel', 'place'], requiredCapabilities: ['demo'] }], searchProviders: ['atlas-demo'] },
  View: AtlasView,
  actions: [{ id: 'inspect-demo', label: 'Inspect record', acceptedKinds: ['aircraft', 'vessel', 'place'], requiredCapabilities: ['demo'],
    run: (selection, _context, host) => {
      host.changeContext({ selection: { ...selection, observationIds: records.filter(r => selection.entityIds.includes(r.id)).map(r => r.observationId) },
        layerIds: ['demo-aircraft', 'demo-vessels', 'demo-places'], filters: { query: '', kind: 'all' },
        time: { mode: 'live', cursor: null, from: null, to: null } });
      host.updateState({ ...host.getState(), inspectorOpen: true, dataMode: 'demo' });
    } }],
  searchProviders: [{ id: 'atlas-demo', search: text => records.filter(r => `${r.label} ${r.id}`.toLowerCase().includes(text.toLowerCase())).slice(0, 30)
    .map(r => ({ id: r.id, label: r.label, kind: r.kind.toLowerCase() })) }],
  serializeState: state => structuredClone(state),
  restoreState: state => { validateContract<AtlasState>('AtlasState', state); return state; },
};

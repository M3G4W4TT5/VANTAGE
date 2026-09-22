import type { AppModule } from '../../platform/registry/AppRegistry';
import type { Selection } from '../../platform/contracts';
import { validateContract } from '../../platform/contracts';
import { AtlasView } from './AtlasView';

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
    kind: 'app', workspaceRequired: true,
    branding: { dark: '/brand/atlas-wordmark-white.svg', light: '/brand/atlas-wordmark-black.svg', alt: 'ATLAS' },
    navigation: { label: 'ATLAS', order: 10 },
    acceptedEntityKinds: ['aircraft', 'earthquake'], actions: [], searchProviders: [] },
  View: AtlasView,
  actions: [], searchProviders: [],
  serializeState: state => structuredClone(state),
  restoreState: state => { validateContract<AtlasState>('AtlasState', state); return state; },
};

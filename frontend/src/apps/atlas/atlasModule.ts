import type { AppModule } from '../../platform/registry/AppRegistry';
import type { Selection } from '../../platform/contracts';
import { validateContract } from '../../platform/contracts';
import { AtlasView } from './AtlasView';

import type { AircraftQuery } from '../../platform/data/AircraftChannel';
import type { CameraState } from '../../platform/maps/PointMarkers';
export type EarthquakeSettings = { query: string; minimumMagnitude: number | null; maxAgeHours: number | null; sort: 'occurred' | 'magnitude' | 'updated' };
export type AtlasLayerBase = { id: string; connectionId: string; datasetId: string; groupId?: string; groupName?: string;
  visible: boolean; participating: boolean;
  appearance: { opacity: number; sizeScale: number }; lastSelection?: Selection };
export type AircraftLayer = AtlasLayerBase & { domain: 'aircraft'; query: AircraftQuery; filters: { query: string; freshness: 'all' | 'recent' | 'older' } };
export type EarthquakeLayer = AtlasLayerBase & { domain: 'earthquakes'; filters: EarthquakeSettings };
export type AtlasLayer = AircraftLayer | EarthquakeLayer;
export type AtlasState = {
  schemaVersion: 2; camera: CameraState; layers: AtlasLayer[]; focusedLayerId: string; selectedLayerId: string | null;
  resultScope: 'focused' | 'participating' | 'selected' | 'map-area'; resultLayerIds?: string[];
  resultTable?: 'mixed' | 'aircraft' | 'earthquakes'; sidebarTab?: 'layers' | 'sources' | 'tools';
  showMap?: boolean; showList?: boolean; mapListRatio?: number; timelineOpen?: boolean;
  hiddenMapRecordIds?: string[]; hiddenMapGroupIds?: string[]; shownMapRecordIds?: string[];
  basemapId?: string; mapMode: '2d' | '3d';
  viewMode: 'canvas' | 'list'; resultsOpen: boolean; sidebarOpen: boolean; inspectorOpen: boolean;
  sidebarWidth: number; inspectorWidth: number; sort: 'label' | 'kind'; expandedDetails: boolean;
  recovery?: { fromStateVersion: 1; inactiveDomain: 'aircraft' | 'earthquakes'; inactiveCamera: CameraState | null;
    inactiveSelection: Selection; legacyDataMode?: 'live' | 'demo'; legacyContextFilters: Record<string, unknown>; explanation: string };
};
export const atlasModule: AppModule = {
  manifest: { id: 'atlas', name: 'ATLAS', version: '0.2.0', platformApiVersion: 1, entryView: 'AtlasView', stateSchemaVersion: 2,
    kind: 'app', workspaceRequired: true,
    branding: { dark: '/brand/atlas-wordmark-white.svg', light: '/brand/atlas-wordmark-black.svg', alt: 'ATLAS' },
    navigation: { label: 'ATLAS', order: 10 },
    acceptedEntityKinds: ['aircraft', 'earthquake'], actions: [], searchProviders: [] },
  View: AtlasView,
  actions: [], searchProviders: [],
  serializeState: state => structuredClone(state),
  restoreState: state => { validateContract<AtlasState>('AtlasState', state); return state; },
};

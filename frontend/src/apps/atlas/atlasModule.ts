import type { AppModule } from '../../platform/registry/AppRegistry';
import { validateContract } from '../../platform/contracts';
import { AtlasView } from './AtlasView';
import { records } from './fixtures';

export type AtlasState = {
  schemaVersion: 1; viewMode: 'canvas' | 'list'; resultsOpen: boolean; sidebarOpen: boolean;
  inspectorOpen: boolean; sidebarWidth: number; inspectorWidth: number; sort: 'label' | 'kind'; expandedDetails: boolean;
};
export const atlasModule: AppModule = {
  manifest: { id: 'atlas', name: 'ATLAS', version: '0.1.0', platformApiVersion: 1, entryView: 'AtlasView', stateSchemaVersion: 1,
    acceptedEntityKinds: ['aircraft', 'vessel', 'place'], actions: [{ id: 'inspect-demo', label: 'Inspect record', acceptedKinds: ['aircraft', 'vessel', 'place'], requiredCapabilities: ['demo'] }], searchProviders: ['atlas-demo'] },
  View: AtlasView,
  actions: [{ id: 'inspect-demo', label: 'Inspect record', acceptedKinds: ['aircraft', 'vessel', 'place'], requiredCapabilities: ['demo'],
    run: (selection, _context, host) => {
      host.changeContext({ selection: { ...selection, observationIds: records.filter(r => selection.entityIds.includes(r.id)).map(r => r.observationId) } });
      host.updateState({ ...host.getState(), inspectorOpen: true });
    } }],
  searchProviders: [{ id: 'atlas-demo', search: text => records.filter(r => `${r.label} ${r.id}`.toLowerCase().includes(text.toLowerCase())).slice(0, 30)
    .map(r => ({ id: r.id, label: r.label, kind: r.kind.toLowerCase() })) }],
  serializeState: state => structuredClone(state),
  restoreState: state => { validateContract<AtlasState>('AtlasState', state); return state; },
};

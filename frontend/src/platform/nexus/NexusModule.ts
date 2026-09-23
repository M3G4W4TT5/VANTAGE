import type { AppModule } from '../registry/AppRegistry';
import { NexusView } from './NexusView';

export const nexusModule: AppModule = {
  manifest: { id: 'nexus', name: 'NEXUS — Data Manager', version: '0.1.0', platformApiVersion: 1,
    entryView: 'NexusView', stateSchemaVersion: 1, kind: 'system-tool', workspaceRequired: false,
    branding: { dark: '/brand/nexus-wordmark-white.svg', light: '/brand/nexus-wordmark-black.svg', alt: 'NEXUS' },
    navigation: { label: 'NEXUS — Data Manager', order: 10 }, acceptedEntityKinds: [], actions: [], searchProviders: [] },
  SystemView: NexusView, actions: [], searchProviders: [],
  serializeState: state => state, restoreState: state => state as Record<string, unknown>,
};

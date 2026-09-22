import type { AppModule } from '../registry/AppRegistry';
import { SettingsView } from './SettingsView';

export const settingsModule: AppModule = {
  manifest: { id: 'settings', name: 'Settings', version: '0.1.0', platformApiVersion: 1, entryView: 'SettingsView', stateSchemaVersion: 1,
    kind: 'system-tool', workspaceRequired: false,
    branding: { dark: '/brand/vantage-mark-white.svg', light: '/brand/vantage-mark-black.svg', alt: 'Settings' },
    navigation: { label: 'Settings', order: 20 }, acceptedEntityKinds: [], actions: [], searchProviders: [] },
  SystemView: SettingsView, actions: [], searchProviders: [],
  serializeState: state => state, restoreState: state => state as Record<string, unknown>,
};

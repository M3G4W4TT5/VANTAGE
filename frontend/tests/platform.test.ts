import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { ContextBus } from '../src/platform/context/ContextBus';
import { AppRegistry } from '../src/platform/registry/AppRegistry';
import { AircraftChannel } from '../src/platform/data/AircraftChannel';
import { aircraftFixture } from './fixtures/aircraft';
import type { AppModule, HostServices } from '../src/platform/registry/AppRegistry';
import type { Context, ContextEvent } from '../src/platform/contracts';

const context = (paneId: string): Context => ({ schemaVersion: 1, workspaceId: 'workspace', paneId,
  selection: { entityIds: [], observationIds: [] }, area: null, time: { mode: 'live', cursor: null, from: null, to: null },
  filters: {}, layerIds: [], linkGroupId: 'comparison' });

describe('platform context and registered app lifecycle', () => {
  it('propagates only linked fields, rejects repeats and disposes the test app without changing another pane', () => {
    const states: Record<string, Context> = { left: context('left'), right: context('right') };
    const bus = new ContextBus(id => states[id], (id, patch) => { states[id] = { ...states[id], ...patch }; },
      () => [{ paneIds: ['left', 'right'], fields: ['selection', 'area'] }]);
    const received: ContextEvent[] = [];
    let disposed = 0;
    const host: HostServices = { getState: () => ({}), updateState: () => {}, getContext: () => states.right, subscribe: fn => bus.subscribe('right', fn),
      changeContext: patch => bus.change('right', patch), notify: () => {} };
    const harness: AppModule = {
      manifest: { id: 'test-only', name: 'Test app', version: '1.0.0', platformApiVersion: 1, entryView: 'Harness', stateSchemaVersion: 1,
        kind: 'app', workspaceRequired: true, branding: { dark: '/test.svg', light: '/test.svg', alt: 'Test app' },
        navigation: { label: 'Test app', order: 20 },
        acceptedEntityKinds: [], actions: [], searchProviders: [] },
      View: () => null, actions: [], searchProviders: [], serializeState: state => state, restoreState: () => ({}),
      mount: services => { const unsubscribe = services.subscribe(event => received.push(event)); return () => { disposed++; unsubscribe(); }; },
    };
    const registry = new AppRegistry(); const unregister = registry.register(harness); const unmount = registry.mount('test-only', host);
    const area = { type: 'Polygon', coordinates: [[[10, 54], [11, 54], [11, 55], [10, 54]]] };
    bus.change('left', { selection: { entityIds: ['record'], observationIds: ['observation'] }, area,
      time: { mode: 'paused', cursor: '2026-09-21T12:00:00Z', from: null, to: null } });
    expect(states.right.selection.entityIds).toEqual(['record']); expect(states.right.area).toEqual(area);
    expect(states.right.time.mode).toBe('live'); expect(received).toHaveLength(1);
    bus.receive(received[0]); expect(received).toHaveLength(1);
    bus.change('right', { time: { mode: 'paused', cursor: '2026-09-20T12:00:00Z', from: null, to: null } });
    expect(states.left.time.cursor).toBe('2026-09-21T12:00:00Z');
    unregister(); unmount(); expect(disposed).toBe(1); expect(bus.listenerCount).toBe(0);
    bus.change('left', { selection: { entityIds: ['next'], observationIds: [] } });
    expect(states.right.selection.entityIds).toEqual(['next']); bus.dispose();
  });

  it('keeps platform data and saved state available to an independent consumer after ATLAS is unregistered', () => {
    const channel = new AircraftChannel({ longitude: 12, latitude: 58, radiusNm: 250 });
    channel.accept(aircraftFixture());
    const savedState = { selectedObservation: 'obs:fixture-0', filters: { query: 'TEST01' } };
    const originalState = structuredClone(savedState);
    const host: HostServices = { getState: () => savedState, updateState: () => {}, getContext: () => context('test'),
      changeContext: () => {}, subscribe: () => () => {}, notify: () => {} };
    let atlasUpdates = 0; let independentUpdates = 0;
    const module = (id: string, receive: () => void): AppModule => ({
      manifest: { id, name: id, version: '1.0.0', platformApiVersion: 1, entryView: 'TestView', stateSchemaVersion: 1,
        kind: id === 'atlas' ? 'app' : 'system-tool', workspaceRequired: id === 'atlas',
        branding: { dark: '/test.svg', light: '/test.svg', alt: id }, navigation: { label: id, order: id === 'atlas' ? 20 : 10 },
        acceptedEntityKinds: ['aircraft'], actions: [], searchProviders: [] },
      View: () => null, actions: [], searchProviders: [], serializeState: state => structuredClone(state), restoreState: () => savedState,
      mount: () => channel.subscribe(receive),
    });
    const registry = new AppRegistry();
    const unregisterAtlas = registry.register(module('atlas', () => atlasUpdates++));
    const unregisterConsumer = registry.register(module('independent-consumer', () => independentUpdates++));
    expect(registry.list().map(app => app.manifest.id)).toEqual(['independent-consumer', 'atlas']);
    const unmountAtlas = registry.mount('atlas', host); const unmountConsumer = registry.mount('independent-consumer', host);
    unregisterAtlas(); unmountAtlas();
    expect(registry.get('atlas')).toBeUndefined();
    expect(channel.getSnapshot().records[0].observation.id).toBe('obs:fixture-0');
    expect(host.getState()).toEqual(originalState);
    channel.accept(aircraftFixture(1, false));
    expect(atlasUpdates).toBe(0); expect(independentUpdates).toBe(1);
    expect(channel.getSnapshot().records[0].observation.id).toBe('obs:fixture-1');
    unregisterConsumer(); unmountConsumer(); channel.accept(aircraftFixture(2, false));
    expect(independentUpdates).toBe(1); expect(host.getState()).toEqual(originalState);
  });

  it('rejects platform imports of apps and imports between apps while preserving permitted contracts', async () => {
    const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) });
    const lint = async (filePath: string, source: string) => (await eslint.lintText(source, { filePath }))[0].messages
      .filter(message => message.ruleId === 'boundaries/independent');
    expect(await lint('src/platform/example.ts', "import '../apps/atlas/atlasModule';")).toHaveLength(1);
    expect(await lint('src/platform/example.ts', "type State = import('../apps/atlas/atlasModule').AtlasState;")).toHaveLength(1);
    expect(await lint('src/apps/independent/example.ts', "export * from '../atlas/atlasModule';")).toHaveLength(1);
    expect(await lint('src/apps/independent/example.ts', "void import('../atlas/atlasModule');")).toHaveLength(1);
    expect(await lint('src/apps/atlas/example.ts', "import '../../platform/contracts'; import './atlasModule';")).toHaveLength(0);
    expect(await lint('src/main.tsx', "import './apps/atlas/atlasModule';")).toHaveLength(0);
  });
});

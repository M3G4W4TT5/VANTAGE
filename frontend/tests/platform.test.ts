import { describe, expect, it } from 'vitest';
import { ContextBus } from '../src/platform/context/ContextBus';
import { AppRegistry } from '../src/platform/registry/AppRegistry';
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
});

import { afterEach, expect, test, vi } from 'vitest';
import { VantageClient } from '../src/api/generated/client';
import { SessionService } from '../src/platform/session/SessionService';
import { WorkspaceService } from '../src/platform/workspaces/WorkspaceService';
import type { Workspace } from '../src/platform/contracts';

const active: SessionService[] = [];
afterEach(() => { active.splice(0).forEach(session => session.clear()); vi.useRealTimers(); });
const fixture = (ownerId: string, id = 'fixture-workspace'): Workspace => ({ id, ownerId, name: 'Saved work', revision: 1, schemaVersion: 1,
  createdAt: '2026-09-22T12:00:00Z', updatedAt: '2026-09-22T12:00:00Z', linkGroups: [], appStates: { shell: { theme: 'dark', activePaneId: 'pane' } },
  panes: [{ id: 'pane', appId: 'test-only', stateSchemaVersion: 1, state: {}, context: { schemaVersion: 1, workspaceId: id, paneId: 'pane',
    selection: { entityIds: [], observationIds: [] }, area: null, time: { mode: 'live', cursor: null, from: null, to: null }, layerIds: [], filters: {}, linkGroupId: null } }] });
const memoryStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
};
async function setup(ownerId: string, workspace: Workspace, storage: ReturnType<typeof memoryStorage>, update?: () => Promise<Response>) {
  const send = vi.fn<typeof fetch>(async (input, init) => {
    if (input === '/api/v1/session') return Response.json({ schemaVersion: 1, authenticated: true,
      user: { id: ownerId, displayName: 'Test operator', canUseData: true }, expiresAt: new Date(Date.now() + 60000).toISOString(), csrfToken: 'fixture-csrf', sessionKey: 'fixture-session' });
    if (init?.method === 'PUT' && update) return update();
    if (input === '/api/v1/workspaces') return Response.json([{ id: workspace.id, ownerId, name: workspace.name, revision: 1, updatedAt: workspace.updatedAt }]);
    return Response.json(workspace);
  });
  const session = new SessionService(send, 'http://localhost'); active.push(session); await session.refresh();
  const store = new WorkspaceService(ownerId, new VantageClient('', { fetch: session.fetch }), session, storage);
  return { session, store, send };
}

test('migrates the legacy workspace selector only after that workspace is accessible to the current owner', async () => {
  const storage = memoryStorage(); storage.setItem('vantage.workspace', 'legacy-workspace');
  const first = await setup('owner-a', fixture('owner-a', 'a-workspace'), storage);
  await first.store.start();
  expect(first.store.getSnapshot().document?.ownerId).toBe('owner-a');
  expect(storage.getItem('vantage.workspace.owner-a')).toBe('a-workspace');
  expect(storage.getItem('vantage.workspace')).toBe('legacy-workspace');
  const second = await setup('owner-b', fixture('owner-b', 'legacy-workspace'), storage);
  await second.store.start();
  expect(storage.getItem('vantage.workspace.owner-b')).toBe('legacy-workspace');
  expect(storage.getItem('vantage.workspace')).toBeNull();
  expect(storage.getItem('vantage.workspace.owner-a')).toBe('a-workspace');
  first.store.dispose(); second.store.dispose();
});

test('sign-out clears saved/draft state and a late save cannot restore the prior owner cache', async () => {
  const storage = memoryStorage(); const workspace = fixture('owner-a');
  let complete!: (value: Response) => void;
  const { store, session } = await setup('owner-a', workspace, storage, () => new Promise<Response>(resolve => { complete = resolve; }));
  const release = store.acquire(); await store.start();
  store.update(document => ({ ...document, name: 'Unsaved name' }));
  const saving = store.save(); await Promise.resolve();
  session.clear();
  expect(store.getSnapshot()).toEqual({ document: null, list: [], busy: false, dirty: false, error: null });
  complete(Response.json({ ...workspace, name: 'Unsaved name', revision: 2 })); await saving;
  expect(store.getSnapshot().document).toBeNull(); expect(store.getSnapshot().list).toEqual([]);
  expect(() => store.update(document => document)).toThrow('session'); release();
});

test('effect cleanup/reacquisition preserves a live workspace, while final unmount clears it', async () => {
  vi.useFakeTimers();
  const { store } = await setup('owner-a', fixture('owner-a'), memoryStorage());
  const first = store.acquire(); first(); const second = store.acquire();
  await store.start(); vi.advanceTimersByTime(1);
  expect(store.getSnapshot().document?.id).toBe('fixture-workspace');
  second(); vi.advanceTimersByTime(1);
  expect(store.getSnapshot().document).toBeNull(); expect(store.getSnapshot().list).toEqual([]);
});

test('rejects a returned workspace whose owner differs from the authenticated internal user', async () => {
  const { store, session } = await setup('owner-a', fixture('owner-b'), memoryStorage());
  const release = store.acquire(); await store.start();
  expect(session.getSnapshot().session).toBeNull(); expect(store.getSnapshot().document).toBeNull(); release();
});

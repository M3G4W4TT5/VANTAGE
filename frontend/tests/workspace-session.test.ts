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
async function setup(ownerId: string, workspace: Workspace | null, storage: ReturnType<typeof memoryStorage>, update?: () => Promise<Response>) {
  const send = vi.fn<typeof fetch>(async (input, init) => {
    if (input === '/api/v1/session') return Response.json({ schemaVersion: 1, authenticated: true,
      user: { id: ownerId, displayName: 'Test operator', canUseData: true }, expiresAt: new Date(Date.now() + 60000).toISOString(), csrfToken: 'fixture-csrf', sessionKey: 'fixture-session' });
    if (init?.method === 'PUT' && update) return update();
    if (input === '/api/v1/workspaces') return Response.json(workspace ? [{ id: workspace.id, ownerId, name: workspace.name, revision: 1, updatedAt: workspace.updatedAt }] : []);
    return workspace ? Response.json(workspace) : Response.json({ code: 'not_found' }, { status: 404 });
  });
  const session = new SessionService(send, 'http://localhost'); active.push(session); await session.refresh();
  const store = new WorkspaceService(ownerId, new VantageClient('', { fetch: session.fetch }), session, storage);
  return { session, store, send };
}

async function setupStateful(ownerId: string, initial: Workspace[]) {
  const saved = new Map(initial.map(workspace => [workspace.id, structuredClone(workspace)]));
  const storage = memoryStorage();
  let nextId = 1;
  const conflict = () => Response.json({ code: 'revision_conflict', message: 'This workspace changed elsewhere. Reload it before saving again.' }, { status: 409 });
  const send = vi.fn<typeof fetch>(async (input, init) => {
    if (input === '/api/v1/session') return Response.json({ schemaVersion: 1, authenticated: true,
      user: { id: ownerId, displayName: 'Test operator', canUseData: true }, expiresAt: new Date(Date.now() + 60000).toISOString(), csrfToken: 'fixture-csrf', sessionKey: 'fixture-session' });
    const url = new URL(String(input), 'http://localhost');
    const method = init?.method ?? 'GET';
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[3];
    if (url.pathname === '/api/v1/workspaces' && method === 'GET') return Response.json([...saved.values()].map(workspace => ({
      id: workspace.id, ownerId: workspace.ownerId, name: workspace.name, revision: workspace.revision, updatedAt: workspace.updatedAt,
    })));
    if (url.pathname === '/api/v1/workspaces' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { name: string };
      const created = { ...fixture(ownerId, `created-${nextId++}`), name: body.name };
      saved.set(created.id, created);
      return Response.json(created, { status: 201 });
    }
    const workspace = saved.get(id);
    if (!workspace) return Response.json({ code: 'not_found', message: 'Workspace not found.' }, { status: 404 });
    if (parts[4] === 'duplicate' && method === 'POST') {
      const body = JSON.parse(String(init?.body)) as { name: string; revision: number };
      if (body.revision !== workspace.revision) return conflict();
      const copy = structuredClone(workspace); copy.id = `copy-${nextId++}`; copy.name = body.name; copy.revision = 1;
      copy.panes = copy.panes.map(pane => ({ ...pane, context: { ...pane.context, workspaceId: copy.id } }));
      saved.set(copy.id, copy);
      return Response.json(copy, { status: 201 });
    }
    if (method === 'GET') return Response.json(workspace);
    if (method === 'PUT') {
      const body = JSON.parse(String(init?.body)) as Workspace;
      if (body.revision !== workspace.revision) return conflict();
      const updated = { ...structuredClone(workspace), ...structuredClone(body), revision: workspace.revision + 1 };
      saved.set(id, updated);
      return Response.json(updated);
    }
    if (method === 'DELETE') {
      if (Number(url.searchParams.get('revision')) !== workspace.revision) return conflict();
      saved.delete(id);
      return new Response(null, { status: 204 });
    }
    return Response.json({ code: 'unexpected_request' }, { status: 405 });
  });
  const session = new SessionService(send, 'http://localhost'); active.push(session); await session.refresh();
  const store = new WorkspaceService(ownerId, new VantageClient('', { fetch: session.fetch }), session, storage);
  return { store, saved, storage, send };
}

test('Home startup lists available workspaces without opening or creating one, including an empty account', async () => {
  for (const workspace of [fixture('owner-a'), null]) {
    const { store, send } = await setup('owner-a', workspace, memoryStorage());
    await store.start();
    expect(store.getSnapshot().document).toBeNull();
    expect(store.getSnapshot().list).toHaveLength(workspace ? 1 : 0);
    expect(send.mock.calls.slice(1).map(([input, init]) => [input, init?.method])).toEqual([['/api/v1/workspaces', 'GET']]);
    store.dispose();
  }
});

test('opens a selected workspace explicitly and remembers only that owner’s accessible destination', async () => {
  const storage = memoryStorage(); storage.setItem('vantage.workspace.owner-b', 'b-workspace');
  const { store, send } = await setup('owner-a', fixture('owner-a', 'a-workspace'), storage);
  await store.start();
  expect(store.preferredId()).toBeNull();
  await store.open('a-workspace');
  expect(store.getSnapshot().document?.id).toBe('a-workspace');
  expect(store.preferredId()).toBe('a-workspace');
  expect(storage.getItem('vantage.workspace.owner-a')).toBe('a-workspace');
  expect(storage.getItem('vantage.workspace.owner-b')).toBe('b-workspace');
  expect(send.mock.calls.some(([input, init]) => input === '/api/v1/workspaces/a-workspace' && init?.method === 'GET')).toBe(true);
  store.dispose();
});

test('migrates the legacy workspace selector only after that workspace is accessible to the current owner', async () => {
  const storage = memoryStorage(); storage.setItem('vantage.workspace', 'legacy-workspace');
  const first = await setup('owner-a', fixture('owner-a', 'a-workspace'), storage);
  await first.store.start();
  expect(first.store.getSnapshot().document).toBeNull();
  expect(first.store.preferredId()).toBeNull();
  await first.store.open('a-workspace');
  expect(storage.getItem('vantage.workspace.owner-a')).toBe('a-workspace');
  expect(storage.getItem('vantage.workspace')).toBe('legacy-workspace');
  const second = await setup('owner-b', fixture('owner-b', 'legacy-workspace'), storage);
  await second.store.start();
  expect(second.store.getSnapshot().document).toBeNull();
  expect(second.store.preferredId()).toBe('legacy-workspace');
  expect(storage.getItem('vantage.workspace.owner-b')).toBe('legacy-workspace');
  expect(storage.getItem('vantage.workspace')).toBeNull();
  expect(storage.getItem('vantage.workspace.owner-a')).toBe('a-workspace');
  first.store.dispose(); second.store.dispose();
});

test('sign-out clears saved/draft state and a late save cannot restore the prior owner cache', async () => {
  const storage = memoryStorage(); const workspace = fixture('owner-a');
  let complete!: (value: Response) => void;
  const { store, session } = await setup('owner-a', workspace, storage, () => new Promise<Response>(resolve => { complete = resolve; }));
  const release = store.acquire(); await store.start(); await store.open(workspace.id);
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
  await store.start(); await store.open('fixture-workspace'); vi.advanceTimersByTime(1);
  expect(store.getSnapshot().document?.id).toBe('fixture-workspace');
  second(); vi.advanceTimersByTime(1);
  expect(store.getSnapshot().document).toBeNull(); expect(store.getSnapshot().list).toEqual([]);
});

test('rejects a returned workspace whose owner differs from the authenticated internal user', async () => {
  const { store, session } = await setup('owner-a', fixture('owner-b'), memoryStorage());
  const release = store.acquire(); await store.start(); await store.open('fixture-workspace');
  expect(session.getSnapshot().session).toBeNull(); expect(store.getSnapshot().document).toBeNull(); release();
});

test('explicit creation from an empty Home opens and lists the new workspace', async () => {
  const { store, saved, send } = await setupStateful('owner-a', []);
  await store.start();
  expect(store.getSnapshot().list).toEqual([]);
  await store.create('First workspace');
  expect(store.getSnapshot().document).toMatchObject({ id: 'created-1', name: 'First workspace', ownerId: 'owner-a' });
  expect(store.getSnapshot().list).toHaveLength(1);
  expect(store.preferredId()).toBe('created-1');
  expect(saved.get('created-1')?.name).toBe('First workspace');
  expect(send.mock.calls.filter(([input, init]) => input === '/api/v1/workspaces' && init?.method === 'POST')).toHaveLength(1);
  store.dispose();
});

test('renaming another saved workspace leaves the open workspace draft untouched', async () => {
  const current = fixture('owner-a', 'current'); const other = fixture('owner-a', 'other');
  const { store, saved } = await setupStateful('owner-a', [current, other]);
  await store.start(); await store.open(current.id);
  store.update(document => ({ ...document, name: 'Current draft' }));
  await store.rename(other.id, ' Renamed other ');
  expect(store.getSnapshot().document?.name).toBe('Current draft');
  expect(store.getSnapshot().dirty).toBe(true);
  expect(store.getSnapshot().error).toBeNull();
  expect(store.getSnapshot().list.find(workspace => workspace.id === other.id)).toMatchObject({ name: 'Renamed other', revision: 2 });
  expect(saved.get(current.id)?.name).toBe('Saved work');
  expect(saved.get(other.id)?.name).toBe('Renamed other');
  store.dispose();
});

test('duplicates the selected saved workspace and opens a copy with its own context', async () => {
  const current = fixture('owner-a', 'current'); const selected = fixture('owner-a', 'selected');
  const { store, saved, send } = await setupStateful('owner-a', [current, selected]);
  await store.start(); await store.open(current.id);
  await store.duplicate('Selected copy', selected.id);
  expect(store.getSnapshot().document).toMatchObject({ id: 'copy-1', name: 'Selected copy', revision: 1 });
  expect(store.getSnapshot().document?.panes[0].context.workspaceId).toBe('copy-1');
  expect(store.getSnapshot().list).toHaveLength(3);
  expect(saved.get(selected.id)?.name).toBe('Saved work');
  expect(send.mock.calls.some(([input, init]) => input === '/api/v1/workspaces/selected/duplicate' && init?.method === 'POST')).toBe(true);
  store.dispose();
});

test('deleting the last workspace returns Home to an empty list without creating a replacement', async () => {
  const { store, saved, storage, send } = await setupStateful('owner-a', [fixture('owner-a')]);
  await store.start(); await store.open('fixture-workspace');
  expect(store.preferredId()).toBe('fixture-workspace');
  await store.delete('fixture-workspace');
  expect(store.getSnapshot()).toMatchObject({ document: null, list: [], dirty: false, error: null });
  expect(store.preferredId()).toBeNull();
  expect(saved.size).toBe(0);
  expect(send.mock.calls.filter(([input, init]) => input === '/api/v1/workspaces' && init?.method === 'POST')).toHaveLength(0);
  expect(storage.getItem('vantage.workspace.owner-a')).toBeNull();
  store.dispose();
});

test('a stale Save reports the revision conflict and retains the unsaved draft', async () => {
  const workspace = fixture('owner-a');
  const { store, saved } = await setupStateful('owner-a', [workspace]);
  await store.start(); await store.open(workspace.id);
  store.update(document => ({ ...document, name: 'Keep this draft' }));
  saved.set(workspace.id, { ...workspace, revision: 2 });
  await store.save();
  expect(store.getSnapshot().document).toMatchObject({ id: workspace.id, name: 'Keep this draft', revision: 1 });
  expect(store.getSnapshot().dirty).toBe(true);
  expect(store.getSnapshot().error).toContain('changed elsewhere');
  expect(saved.get(workspace.id)).toMatchObject({ name: 'Saved work', revision: 2 });
  store.dispose();
});

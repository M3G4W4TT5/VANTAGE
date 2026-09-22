import { VantageClient, ApiException } from '../../api/generated/client';
import type { UpdateWorkspaceRequest, WorkspaceSummaryDto } from '../../api/generated/client';
import { readWorkspace } from '../contracts';
import type { Workspace } from '../contracts';
import { SessionAccessError, SessionService, sessionBoundary, sessionService } from '../session/SessionService';

export const client = new VantageClient('', { fetch: sessionService.fetch });
type WorkspaceApi = Pick<VantageClient, 'workspaces_List' | 'workspaces_Get' | 'workspaces_Create' | 'workspaces_Update' | 'workspaces_Delete' | 'workspaces_Duplicate'>;
export function errorMessage(error: unknown): string {
  if (error instanceof ApiException) {
    try { const body = JSON.parse(error.response); if (typeof body.message === 'string') return body.message; } catch { /* retain a safe fallback */ }
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return error instanceof Error ? error.message : 'The operation failed. Please retry.';
}
export class WorkspaceService {
  private listeners = new Set<() => void>();
  private state: { document: Workspace | null; list: WorkspaceSummaryDto[]; busy: boolean; dirty: boolean; error: string | null } =
    { document: null, list: [], busy: false, dirty: false, error: null };
  private editVersion = 0;
  private boot?: Promise<void>;
  private disposed = false;
  private cancellation = new AbortController();
  private releaseSession?: () => void;
  private releaseTimer?: ReturnType<typeof setTimeout>;
  private references = 0;
  private boundary: string | null;
  constructor(private ownerId: string, private api: WorkspaceApi = client, private sessions: SessionService = sessionService,
    private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) { this.boundary = sessionBoundary(sessions.getSnapshot().session); }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<typeof this.state>) { if (this.disposed) return; this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  private assertActive() { if (this.disposed) throw new SessionAccessError(); this.sessions.assertCurrent(this.boundary); }
  // Delay normal unmount disposal by one turn so React StrictMode's effect replay can reacquire safely.
  acquire() {
    this.assertActive(); clearTimeout(this.releaseTimer); this.references++;
    this.releaseSession ??= this.sessions.onInvalidate(() => this.dispose());
    let released = false;
    return () => { if (released || this.disposed) return; released = true; if (--this.references === 0) this.releaseTimer = setTimeout(() => this.dispose(), 0); };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.cancellation.abort(); clearTimeout(this.releaseTimer); this.releaseSession?.(); this.releaseSession = undefined;
    this.editVersion++; this.boot = undefined; this.references = 0;
    this.state = { document: null, list: [], busy: false, dirty: false, error: null };
    this.listeners.forEach(fn => fn()); this.listeners.clear();
  }
  async refresh() { this.assertActive(); const list = await this.api.workspaces_List(this.cancellation.signal); this.assertActive(); this.set({ list }); }
  start() {
    return this.boot ??= this.perform(async () => {
      await this.refresh();
      const key = `vantage.workspace.${this.ownerId}`;
      let savedId = this.storage.getItem(key);
      const legacy = this.storage.getItem('vantage.workspace');
      if (legacy && this.state.list.some(workspace => workspace.id === legacy)) {
        if (!savedId) { savedId = legacy; this.storage.setItem(key, legacy); }
        this.storage.removeItem('vantage.workspace');
      }
      const id = this.state.list.find(w => w.id === savedId)?.id ?? this.state.list[0]?.id;
      this.accept(id ? await this.api.workspaces_Get(id, this.cancellation.signal) : await this.api.workspaces_Create({ name: 'My observatory' }, this.cancellation.signal));
      await this.refresh();
    });
  }
  async retry() { this.boot = undefined; await this.start(); }
  update(edit: (document: Workspace) => Workspace) {
    this.assertActive();
    if (!this.state.document) return;
    const document = edit(structuredClone(this.state.document));
    readWorkspace(document);
    this.editVersion++; this.set({ document, dirty: true });
  }
  private accept(value: unknown) {
    this.assertActive();
    const document = readWorkspace(value);
    if (document.ownerId !== this.ownerId) { this.sessions.clear('Workspace access changed. Sign in again to continue.'); throw new SessionAccessError(); }
    this.storage.setItem(`vantage.workspace.${this.ownerId}`, document.id);
    this.editVersion++; this.set({ document, dirty: false, error: null });
  }
  private async perform(action: () => Promise<void>) {
    if (this.state.busy || this.disposed) return;
    this.set({ busy: true, error: null });
    try { this.assertActive(); await action(); } catch (error) { this.set({ error: errorMessage(error) }); }
    finally { this.set({ busy: false }); }
  }
  async save() {
    await this.perform(async () => {
      const doc = this.state.document;
      if (!doc) return;
      const version = this.editVersion;
      const saved = readWorkspace(await this.api.workspaces_Update(doc.id, doc as unknown as UpdateWorkspaceRequest, this.cancellation.signal));
      this.assertActive();
      if (saved.ownerId !== this.ownerId) { this.sessions.clear('Workspace access changed. Sign in again to continue.'); throw new SessionAccessError(); }
      if (version === this.editVersion) this.accept(saved);
      else this.set({ document: { ...this.state.document!, revision: saved.revision, updatedAt: saved.updatedAt } });
      await this.refresh();
    });
  }
  async open(id: string) { await this.perform(async () => this.accept(await this.api.workspaces_Get(id, this.cancellation.signal))); }
  async create(name: string) { await this.perform(async () => { this.accept(await this.api.workspaces_Create({ name }, this.cancellation.signal)); await this.refresh(); }); }
  async duplicate(name: string) {
    await this.perform(async () => {
      const doc = this.state.document; if (!doc) return;
      this.accept(await this.api.workspaces_Duplicate(doc.id, { name, revision: doc.revision }, this.cancellation.signal)); await this.refresh();
    });
  }
  async delete() {
    await this.perform(async () => {
      const doc = this.state.document; if (!doc) return;
      await this.api.workspaces_Delete(doc.id, doc.revision, this.cancellation.signal);
      await this.refresh();
      this.accept(this.state.list[0]?.id ? await this.api.workspaces_Get(this.state.list[0].id, this.cancellation.signal) : await this.api.workspaces_Create({ name: 'My observatory' }, this.cancellation.signal));
      await this.refresh();
    });
  }
}

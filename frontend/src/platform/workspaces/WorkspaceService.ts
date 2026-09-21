import { VantageClient, ApiException } from '../../api/generated/client';
import type { UpdateWorkspaceRequest, WorkspaceSummaryDto } from '../../api/generated/client';
import { readWorkspace } from '../contracts';
import type { Workspace } from '../contracts';

export const client = new VantageClient('');
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
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private set(patch: Partial<typeof this.state>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  async refresh() { this.set({ list: await client.workspaces_List() }); }
  start() {
    return this.boot ??= this.perform(async () => {
      await this.refresh();
      const savedId = localStorage.getItem('vantage.workspace');
      const id = this.state.list.find(w => w.id === savedId)?.id ?? this.state.list[0]?.id;
      this.accept(id ? await client.workspaces_Get(id) : await client.workspaces_Create({ name: 'My observatory' }));
      await this.refresh();
    });
  }
  async retry() { this.boot = undefined; await this.start(); }
  update(edit: (document: Workspace) => Workspace) {
    if (!this.state.document) return;
    const document = edit(structuredClone(this.state.document));
    readWorkspace(document);
    this.editVersion++; this.set({ document, dirty: true });
  }
  private accept(value: unknown) {
    const document = readWorkspace(value);
    localStorage.setItem('vantage.workspace', document.id);
    this.editVersion++; this.set({ document, dirty: false, error: null });
  }
  private async perform(action: () => Promise<void>) {
    if (this.state.busy) return;
    this.set({ busy: true, error: null });
    try { await action(); } catch (error) { this.set({ error: errorMessage(error) }); }
    finally { this.set({ busy: false }); }
  }
  async save() {
    await this.perform(async () => {
      const doc = this.state.document;
      if (!doc) return;
      const version = this.editVersion;
      const saved = readWorkspace(await client.workspaces_Update(doc.id, doc as unknown as UpdateWorkspaceRequest));
      if (version === this.editVersion) this.accept(saved);
      else this.set({ document: { ...this.state.document!, revision: saved.revision, updatedAt: saved.updatedAt } });
      await this.refresh();
    });
  }
  async open(id: string) { await this.perform(async () => this.accept(await client.workspaces_Get(id))); }
  async create(name: string) { await this.perform(async () => { this.accept(await client.workspaces_Create({ name })); await this.refresh(); }); }
  async duplicate(name: string) {
    await this.perform(async () => {
      const doc = this.state.document; if (!doc) return;
      this.accept(await client.workspaces_Duplicate(doc.id, { name, revision: doc.revision })); await this.refresh();
    });
  }
  async delete() {
    await this.perform(async () => {
      const doc = this.state.document; if (!doc) return;
      await client.workspaces_Delete(doc.id, doc.revision);
      await this.refresh();
      this.accept(this.state.list[0]?.id ? await client.workspaces_Get(this.state.list[0].id) : await client.workspaces_Create({ name: 'My observatory' }));
      await this.refresh();
    });
  }
}

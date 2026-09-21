import type { Context, ContextEvent, ContextField } from '../contracts';
import { validateContract } from '../contracts';

/** User context only. Observations use a separate subscription channel in stage two. */
export class ContextBus {
  private listeners = new Map<string, Set<(event: ContextEvent) => void>>();
  private revisions = new Map<string, number>();
  private seen = new Set<string>();
  constructor(private getContext: (paneId: string) => Context | undefined,
    private apply: (paneId: string, patch: Partial<Context>) => void,
    private links: () => { paneIds: string[]; fields: ContextField[] }[]) {}

  subscribe(paneId: string, listener: (event: ContextEvent) => void) {
    const set = this.listeners.get(paneId) ?? new Set();
    set.add(listener); this.listeners.set(paneId, set);
    return () => { set.delete(listener); if (!set.size) this.listeners.delete(paneId); };
  }
  change(paneId: string, patch: Partial<Pick<Context, ContextField>>) {
    const current = this.getContext(paneId);
    if (!current) return;
    const eventId = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    this.receive({ schemaVersion: 1, eventId, originPaneId: paneId,
      linkGroupId: current.linkGroupId, revision: (this.revisions.get(paneId) ?? 0) + 1,
      changedFields: Object.keys(patch) as ContextField[], context: { ...current, ...patch } });
  }
  receive(event: ContextEvent) {
    validateContract<ContextEvent>('ContextChanged', event);
    const current = this.getContext(event.originPaneId);
    if (!current || current.workspaceId !== event.context.workspaceId || current.paneId !== event.context.paneId ||
      current.linkGroupId !== event.linkGroupId || this.seen.has(event.eventId) || event.revision <= (this.revisions.get(event.originPaneId) ?? 0)) return;
    this.seen.add(event.eventId);
    if (this.seen.size > 4096) this.seen.delete(this.seen.values().next().value!);
    this.revisions.set(event.originPaneId, event.revision);
    const deliver = (id: string, fields: ContextField[]) => {
      const patch = Object.fromEntries(fields.map(field => [field, structuredClone(event.context[field])])) as Partial<Context>;
      this.apply(id, patch);
      this.listeners.get(id)?.forEach(listener => listener({ ...event, changedFields: fields }));
    };
    deliver(event.originPaneId, event.changedFields);
    const group = this.links().find(g => g.paneIds.includes(event.originPaneId));
    if (!group) return;
    const fields = event.changedFields.filter(field => group.fields.includes(field));
    if (fields.length) group.paneIds.filter(id => id !== event.originPaneId).forEach(id => deliver(id, fields));
  }
  disposePane(id: string) { this.listeners.delete(id); }
  dispose() { this.listeners.clear(); this.revisions.clear(); this.seen.clear(); }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

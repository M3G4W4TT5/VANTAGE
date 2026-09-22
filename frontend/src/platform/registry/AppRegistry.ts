import type { ComponentType } from 'react';
import type { Context, ContextEvent, Pane, Selection } from '../contracts';
import { validateContract } from '../contracts';

export type HostServices = {
  getState(): Record<string, unknown>;
  updateState(state: Record<string, unknown>): void;
  getContext(): Context;
  changeContext(patch: Partial<Pick<Context, 'selection' | 'area' | 'time' | 'filters' | 'layerIds'>>): void;
  subscribe(listener: (event: ContextEvent) => void): () => void;
  notify(message: string): void;
};
export type AppViewProps = { pane: Pane; host: HostServices; updateState(state: Record<string, unknown>): void };
export type AppAction = { id: string; label: string; acceptedKinds: string[]; requiredCapabilities: string[];
  run(selection: Selection, context: Context, host: HostServices): void };
export type AppModule = {
  manifest: { id: string; name: string; version: string; platformApiVersion: number; entryView: string;
    kind: 'app' | 'system-tool'; workspaceRequired: boolean;
    branding: { dark: string; light: string; alt: string }; navigation: { label: string; order: number };
    stateSchemaVersion: number; acceptedEntityKinds: string[]; actions: Omit<AppAction, 'run'>[]; searchProviders: string[] };
  View: ComponentType<AppViewProps>;
  actions: AppAction[];
  searchProviders: { id: string; search(text: string): { id: string; label: string; kind: string }[] }[];
  mount?(host: HostServices): () => void;
  activate?(host: HostServices): void;
  deactivate?(host: HostServices): void;
  serializeState(state: Record<string, unknown>): Record<string, unknown>;
  restoreState(state: unknown): Record<string, unknown>;
};
export class AppRegistry {
  private modules = new Map<string, AppModule>();
  private mounts = new Map<string, Set<() => void>>();
  register(module: AppModule) {
    validateContract('AppManifest', module.manifest);
    if (module.manifest.platformApiVersion !== 1) throw new Error(`${module.manifest.name} needs an unsupported platform version.`);
    if (this.modules.has(module.manifest.id)) throw new Error('App is already registered.');
    this.modules.set(module.manifest.id, module);
    return () => { this.mounts.get(module.manifest.id)?.forEach(dispose => dispose()); this.mounts.delete(module.manifest.id); this.modules.delete(module.manifest.id); };
  }
  mount(id: string, host: HostServices) {
    const module = this.get(id);
    if (!module) throw new Error('App is not registered.');
    const cleanup = module.mount?.(host);
    module.activate?.(host);
    let closed = false;
    const dispose = () => { if (closed) return; closed = true; module.deactivate?.(host); cleanup?.(); this.mounts.get(id)?.delete(dispose); };
    const mounts = this.mounts.get(id) ?? new Set(); mounts.add(dispose); this.mounts.set(id, mounts);
    return dispose;
  }
  get(id: string) { return this.modules.get(id); }
  list() { return [...this.modules.values()].sort((left, right) => left.manifest.navigation.order - right.manifest.navigation.order ||
    left.manifest.navigation.label.localeCompare(right.manifest.navigation.label)); }
  search(text: string) { return this.list().flatMap(app => app.searchProviders.flatMap(provider =>
    provider.search(text).map(result => ({ ...result, appId: app.manifest.id })))); }
}

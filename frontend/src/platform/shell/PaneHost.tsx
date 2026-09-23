import { useEffect, useMemo } from 'react';
import { NonIdealState } from '@blueprintjs/core';
import type { Pane } from '../contracts';
import type { AppModule, AppRegistry, HostServices } from '../registry/AppRegistry';
import type { ContextBus } from '../context/ContextBus';
import type { WorkspaceService } from '../workspaces/WorkspaceService';

export function PaneHost({ pane, module, registry, bus, workspaces, notify, openSystemTool }: {
  pane: Pane; module: AppModule | undefined; registry: AppRegistry; bus: ContextBus; workspaces: WorkspaceService; notify(message: string): void;
  openSystemTool?(id: string, referenceId?: string): void;
}) {
  const host = useMemo<HostServices>(() => ({
    getState: () => workspaces.getSnapshot().document!.panes.find(p => p.id === pane.id)!.state,
    updateState: state => workspaces.update(doc => ({ ...doc, panes: doc.panes.map(p => p.id === pane.id ? { ...p, state: module!.serializeState(state) } : p) })),
    getContext: () => workspaces.getSnapshot().document!.panes.find(p => p.id === pane.id)!.context,
    changeContext: patch => bus.change(pane.id, patch),
    subscribe: listener => bus.subscribe(pane.id, listener), notify, openSystemTool,
  }), [pane.id, module, bus, workspaces, notify, openSystemTool]);
  useEffect(() => {
    if (!module) return;
    const dispose = registry.mount(module.manifest.id, host);
    return () => { dispose(); bus.disposePane(pane.id); };
  }, [module, registry, host, bus, pane.id]);
  if (!module || !module.View || module.manifest.stateSchemaVersion !== pane.stateSchemaVersion)
    return <NonIdealState title="App unavailable" description="This pane needs an app or state version that is not installed. Its saved state is preserved." />;
  const state = module.restoreState(pane.state);
  const View = module.View;
  return <View pane={{ ...pane, state }} host={host} updateState={host.updateState} />;
}

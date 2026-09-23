import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Button, Dialog, DialogBody, DialogFooter, FormGroup, HTMLSelect, InputGroup, Menu, MenuItem, NonIdealState, PopoverNext, Spinner } from '@blueprintjs/core';
import type { PersonalPreferencesDto } from '../../api/generated/client';
import type { AppRegistry, HostServices } from '../registry/AppRegistry';
import { ContextBus } from '../context/ContextBus';
import { client, errorMessage, WorkspaceService } from '../workspaces/WorkspaceService';
import { PaneHost } from './PaneHost';
import { PaneBoundary } from '../ui/PaneBoundary';
import type { AuthenticatedSession } from '../session/SessionService';
import { SignOutForm } from '../session/SignOutForm';
import { HomeView } from './HomeView';
import { setDisplayTimeZone } from '../ui/format';
import styles from './VantageShell.module.css';

type Surface = { kind: 'home' } | { kind: 'workspace' } | { kind: 'system'; id: string; referenceId?: string };
type DialogKind = 'new' | 'rename' | 'duplicate' | 'delete' | 'switch' | 'choose-workspace' | 'unsaved' | 'system-unsaved' | 'search' | null;
type Theme = 'dark' | 'light';

export function VantageShell({ registry, workspaces, session }: { registry: AppRegistry; workspaces: WorkspaceService; session: AuthenticatedSession }) {
  const { document: doc, list, busy, dirty, error } = useSyncExternalStore(workspaces.subscribe, workspaces.getSnapshot);
  const [booting, setBooting] = useState(true);
  const [surface, setSurface] = useState<Surface>({ kind: 'home' });
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [targetId, setTargetId] = useState('');
  const [launchAppId, setLaunchAppId] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [pendingSystemAction, setPendingSystemAction] = useState<(() => void) | null>(null);
  const [systemDirty, setSystemDirty] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [preferences, setPreferences] = useState<PersonalPreferencesDto | null>(null);
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  const notify = useCallback((message: string) => setNotice(message), []);
  useEffect(() => { void workspaces.start().finally(() => setBooting(false)); }, [workspaces]);
  useEffect(() => {
    const abort = new AbortController();
    void client.personalPreferences_Get(abort.signal).then(value => { setPreferences(value); setPreferenceError(''); },
      reason => { if (!abort.signal.aborted) setPreferenceError(errorMessage(reason)); });
    return () => abort.abort();
  }, []);
  const theme: Theme = preferences?.theme === 'light' ? 'light' : 'dark';
  setDisplayTimeZone(preferences?.timeZone ?? 'UTC');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.classList.toggle('bp6-dark', theme === 'dark');
  }, [theme]);
  const changePreferences = async (patch: { theme?: Theme; defaultRegion?: string; timeZone?: string }) => {
    if (!preferences || preferenceBusy) return;
    setPreferenceBusy(true); setPreferenceError('');
    try { setPreferences(await client.personalPreferences_Update({ theme: patch.theme ?? preferences.theme,
      defaultRegion: patch.defaultRegion ?? preferences.defaultRegion, timeZone: patch.timeZone ?? preferences.timeZone,
      revision: preferences.revision })); }
    catch (reason) { setPreferenceError(errorMessage(reason)); }
    finally { setPreferenceBusy(false); }
  };
  const changeTheme = (value: Theme) => { if (preferences?.theme !== value) void changePreferences({ theme: value }); };
  const workspaceId = doc?.id;
  const bus = useMemo(() => new ContextBus(
    id => workspaces.getSnapshot().document?.id === workspaceId ? workspaces.getSnapshot().document?.panes.find(p => p.id === id)?.context : undefined,
    (id, patch) => workspaces.update(document => ({ ...document, panes: document.panes.map(p => p.id === id ? { ...p, context: { ...p.context, ...patch } } : p) })),
    () => workspaces.getSnapshot().document?.linkGroups ?? [],
  ), [workspaces, workspaceId]);
  useEffect(() => () => bus.dispose(), [bus]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setDialog('search'); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && surface.kind === 'workspace' && workspaces.getSnapshot().dirty) {
        event.preventDefault(); void workspaces.save();
      }
    };
    const leave = (event: BeforeUnloadEvent) => { if (workspaces.getSnapshot().dirty || systemDirty) event.preventDefault(); };
    window.addEventListener('keydown', key); window.addEventListener('beforeunload', leave);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', leave); };
  }, [workspaces, surface.kind, systemDirty]);
  const activePane = doc?.panes.find(p => p.id === doc.appStates.shell.activePaneId) ?? doc?.panes[0];
  const activeApp = activePane ? registry.get(activePane.appId) : undefined;
  const duplicatePane = () => {
    if (!activePane || !activeApp || !doc || doc.panes.length >= 8) return;
    workspaces.update(document => {
      const id = `${activePane.appId}-${crypto.randomUUID().slice(0, 8)}`;
      const copy = structuredClone(activePane);
      copy.id = id; copy.context.paneId = id; copy.context.linkGroupId = null;
      return { ...document, panes: [...document.panes, copy],
        appStates: { ...document.appStates, shell: { ...document.appStates.shell, activePaneId: id } } };
    });
  };
  const closePane = () => {
    if (!activePane || !doc || doc.panes.length <= 1) return;
    workspaces.update(document => {
      const panes = document.panes.filter(pane => pane.id !== activePane.id);
      const linkGroups = document.linkGroups.map(group => ({ ...group, paneIds: group.paneIds.filter(id => id !== activePane.id) }))
        .filter(group => group.paneIds.length >= 2);
      return { ...document, panes: panes.map(pane => ({ ...pane, context: { ...pane.context,
        linkGroupId: linkGroups.find(group => group.paneIds.includes(pane.id))?.id ?? null } })), linkGroups,
        appStates: { ...document.appStates, shell: { ...document.appStates.shell, activePaneId: panes[0].id } } };
    });
  };
  const activeSystem = surface.kind === 'system' ? registry.get(surface.id) : undefined;
  const wordmarkColour = theme === 'dark' ? 'white' : 'black';
  const systemTools = registry.list().filter(module => module.manifest.kind === 'system-tool' &&
    !module.manifest.workspaceRequired && module.SystemView);
  const changeSurface = useCallback((action: () => void) => {
    if (surface.kind === 'system' && systemDirty) { setPendingSystemAction(() => action); setDialog('system-unsaved'); }
    else { setSystemDirty(false); action(); }
  }, [surface.kind, systemDirty]);
  const showSystem = useCallback((id: string, referenceId?: string) => {
    const tool = registry.get(id);
    if (tool?.SystemView && !tool.manifest.workspaceRequired && !(surface.kind === 'system' && surface.id === id && !referenceId))
      changeSurface(() => setSurface({ kind: 'system', id, referenceId }));
  }, [registry, surface, changeSurface]);

  const openWorkspace = async (id: string, requiredAppId?: string) => {
    if (doc?.id !== id) await workspaces.open(id);
    const next = workspaces.getSnapshot().document;
    if (workspaces.getSnapshot().error || next?.id !== id) return;
    if (requiredAppId && !next.panes.some(p => p.appId === requiredAppId)) {
      notify('This workspace has no pane for that app. Its saved state is preserved.');
      return;
    }
    setDialog(null); setSurface({ kind: 'workspace' });
  };
  const guard = (action: () => Promise<void>) => {
    if (!workspaces.getSnapshot().dirty) { void action(); return; }
    setPendingAction(() => action); setDialog('unsaved');
  };
  const continueAfterDraft = async (save: boolean) => {
    if (!pendingAction) return;
    if (save) await workspaces.save();
    else if (doc) await workspaces.open(doc.id);
    if (workspaces.getSnapshot().error) return;
    const action = pendingAction; setPendingAction(null); setDialog(null);
    await action();
  };
  const openDialog = (kind: DialogKind, id = doc?.id ?? '') => {
    setTargetId(id);
    const sourceName = list.find(w => w.id === id)?.name ?? doc?.name ?? '';
    setName(kind === 'duplicate' ? sourceName + ' copy' : kind === 'rename' ? sourceName : '');
    setDialog(kind);
  };
  const submit = async () => {
    if (dialog === 'new') await workspaces.create(name);
    if (dialog === 'rename') await workspaces.rename(targetId, name);
    if (dialog === 'duplicate') await workspaces.duplicate(name, targetId);
    if (dialog === 'delete') await workspaces.delete(targetId);
    if (dialog === 'switch') await workspaces.open(targetId);
    if (workspaces.getSnapshot().error) return;
    if (dialog === 'new' || dialog === 'duplicate' || dialog === 'switch') setSurface({ kind: 'workspace' });
    if (dialog === 'delete' && doc?.id === targetId) setSurface({ kind: 'home' });
    setDialog(null);
  };
  const searchResults = surface.kind === 'workspace' && search.trim() ? registry.search(search) : [];
  const systemView = activeSystem?.SystemView;
  const skipTarget = surface.kind === 'workspace' ? '#workspace' : surface.kind === 'system' ? '#' + surface.id : '#home';
  return <div className={styles.shell}>
    <a className={styles.skip} href={skipTarget}>Skip to content</a>
    <header className={styles.header}>
      <button className={styles.brandButton} onClick={() => changeSurface(() => setSurface({ kind: 'home' }))} aria-label="VANTAGE Home">
        <span className={styles.brand}>
          <img className={styles.vantageMark} src={'/brand/vantage-mark-' + wordmarkColour + '.svg'} alt="" />
          <img className={styles.vantageWordmark} src={'/brand/vantage-wordmark-' + wordmarkColour + '.svg'} alt="VANTAGE" />
        </span>
      </button>
      <span className={styles.slash}>/</span>
      {surface.kind === 'workspace' && activeApp
        ? <img className={styles.appWordmark} src={activeApp.manifest.branding[theme]} alt={activeApp.manifest.branding.alt} />
        : surface.kind === 'system' && activeSystem ? <img className={styles.systemWordmark} src={activeSystem.manifest.branding[theme]}
          alt={activeSystem.manifest.branding.alt} /> : <strong className={styles.appName}>{surface.kind === 'home' ? 'Home' : 'Unavailable app'}</strong>}
      {surface.kind !== 'home' && <Button minimal icon="home" onClick={() => changeSurface(() => setSurface({ kind: 'home' }))}>Home</Button>}
      <nav className={styles.systemNav} aria-label="System tools">{systemTools.map(tool => <Button key={tool.manifest.id} minimal small
        active={surface.kind === 'system' && surface.id === tool.manifest.id} onClick={() => showSystem(tool.manifest.id)}>
        {tool.manifest.navigation.label}</Button>)}</nav>
      <Button minimal icon="search" className={styles.searchButton} onClick={() => setDialog('search')}>Search <kbd>⌘ / Ctrl K</kbd></Button>
      <div className={styles.workspaceControls}>
        {surface.kind === 'workspace' && <>
          <HTMLSelect aria-label="Workspace" value={doc?.id ?? ''} disabled={busy || !list.length}
            options={list.map(w => ({ value: w.id ?? '', label: w.name ?? 'Unnamed' }))}
            onChange={e => guard(() => openWorkspace(e.target.value))} />
          <PopoverNext placement="bottom-end" content={<Menu aria-label="Workspace actions">
            <MenuItem text="New workspace" icon="add" disabled={busy} onClick={() => guard(async () => openDialog('new'))} />
            <MenuItem text="Rename workspace" icon="edit" disabled={busy || !doc} onClick={() => guard(async () => openDialog('rename'))} />
            <MenuItem text="Duplicate workspace" icon="duplicate" disabled={busy || !doc} onClick={() => guard(async () => openDialog('duplicate'))} />
            <MenuItem text="Reload saved workspace" icon="refresh" disabled={busy || !doc} onClick={() => openDialog('switch')} />
            <MenuItem text="Delete workspace" icon="trash" disabled={busy || !doc} onClick={() => guard(async () => openDialog('delete'))} />
          </Menu>}><Button minimal icon="more" aria-label="Workspace actions" /></PopoverNext>
          <span className={styles.saveStatus} role="status">{busy ? 'Working…' : dirty ? 'Unsaved' : doc ? 'Saved' : ''}</span>
          <Button minimal icon="floppy-disk" disabled={busy || !dirty} onClick={() => void workspaces.save()}>Save</Button>
        </>}
        {surface.kind === 'home' && dirty && <span className={styles.saveStatus} role="status">Unsaved work in {doc?.name}</span>}
        <Button minimal icon={theme === 'dark' ? 'flash' : 'moon'} aria-label={'Use ' + (theme === 'dark' ? 'light' : 'dark') + ' theme'}
          disabled={!preferences || preferenceBusy} onClick={() => void changeTheme(theme === 'dark' ? 'light' : 'dark')} />
        <span className={styles.account} title={session.user.displayName}>{session.user.displayName}</span>
        <SignOutForm csrfToken={session.csrfToken} />
      </div>
    </header>
    {(error || preferenceError) && <div className={styles.error} role="alert">
      <span>{error || preferenceError}</span>
      {error && <Button minimal onClick={() => {
        if (doc) openDialog('switch', doc.id); else void workspaces.retry();
      }}>Reload saved state</Button>}
      {preferenceError && <Button minimal onClick={() => void client.personalPreferences_Get().then(value => { setPreferences(value); setPreferenceError(''); }, reason => setPreferenceError(errorMessage(reason)))}>Reload preferences</Button>}
    </div>}
    {notice && <div className={styles.notice} role="status">{notice}<Button minimal icon="cross" aria-label="Dismiss notification" onClick={() => setNotice('')} /></div>}
    {surface.kind === 'home' && <HomeView registry={registry} workspaces={list} currentWorkspaceId={doc?.id ?? null}
      busy={busy || booting} session={session} theme={theme} themeDisabled={!preferences || preferenceBusy}
      onOpenWorkspace={id => { if (id === doc?.id) void openWorkspace(id); else guard(() => openWorkspace(id)); }}
      onCreateWorkspace={() => guard(async () => openDialog('new'))}
      onDuplicateWorkspace={id => guard(async () => openDialog('duplicate', id))}
      onRenameWorkspace={id => { if (id === doc?.id) guard(async () => openDialog('rename', id)); else openDialog('rename', id); }}
      onDeleteWorkspace={id => { if (id === doc?.id) guard(async () => openDialog('delete', id)); else openDialog('delete', id); }}
      onLaunchApp={id => { setLaunchAppId(id); setDialog('choose-workspace'); }}
      onOpenSystem={showSystem}
      onThemeChange={value => void changeTheme(value)} />}
    {surface.kind === 'system' && systemView && (() => {
      const View = systemView;
      return <View session={session} theme={theme} themeDisabled={!preferences || preferenceBusy}
        onThemeChange={value => void changeTheme(value)} onDirtyChange={setSystemDirty}
        defaultRegion={preferences?.defaultRegion} timeZone={preferences?.timeZone}
        onDisplayPreferenceChange={patch => void changePreferences(patch)}
        focusReferenceId={surface.kind === 'system' ? surface.referenceId : undefined} />;
    })()}
    {surface.kind === 'workspace' && (!doc ? <div className={styles.loading}><NonIdealState icon={<Spinner size={24} />} title="Opening workspace" /></div> : <>
      <nav className={styles.panes} aria-label="Workspace panes">{doc.panes.length > 1 && doc.panes.map(p => <Button minimal key={p.id} active={p.id === activePane?.id}
        onClick={() => workspaces.update(document => ({ ...document, appStates: { ...document.appStates, shell: { ...document.appStates.shell, activePaneId: p.id } } }))}>
        {registry.get(p.appId)?.manifest.name ?? p.appId} · {p.id}</Button>)}
        {activeApp?.View && <Button small minimal disabled={doc.panes.length >= 8} onClick={duplicatePane}>Duplicate pane</Button>}
        {doc.panes.length > 1 && <Button small minimal onClick={closePane}>Close current pane</Button>}
      </nav>
      {activePane && <PaneBoundary key={doc.id + '/' + activePane.id}><PaneHost pane={activePane} module={activeApp} registry={registry} bus={bus} workspaces={workspaces} notify={notify} openSystemTool={showSystem} /></PaneBoundary>}
    </>)}
    <Dialog isOpen={dialog !== null} onClose={() => { setDialog(null); setPendingAction(null); setPendingSystemAction(null); }}
      title={dialog === 'search' ? 'Search' : dialog === 'choose-workspace' ? 'Choose a workspace' :
        dialog === 'unsaved' ? 'Unsaved workspace changes' : dialog === 'system-unsaved' ? 'Unsaved connection draft' : dialog === 'switch' ? 'Reload saved workspace?' :
          (dialog ? dialog[0].toUpperCase() + dialog.slice(1) : '') + ' workspace'}>
      <DialogBody>
        {['new', 'rename', 'duplicate'].includes(dialog ?? '') && <FormGroup label="Workspace name" labelFor="workspace-name">
          <InputGroup id="workspace-name" autoFocus maxLength={120} value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) void submit(); }} /></FormGroup>}
        {dialog === 'delete' && <p>Delete “{list.find(w => w.id === targetId)?.name}” and its saved layout? This cannot be undone. Other workspaces remain available.</p>}
        {dialog === 'switch' && <p>{dirty ? 'Discard your unsaved changes and open the stored version?' : 'Open the latest stored version of this workspace?'}</p>}
        {dialog === 'unsaved' && <p>Save this workspace before leaving, or discard its unsaved changes. Your saved work remains available.</p>}
        {dialog === 'system-unsaved' && <p>Leaving NEXUS will discard its unsaved connection draft. The saved connection remains available.</p>}
        {dialog === 'choose-workspace' && <>
          <p>Select the workspace where {registry.get(launchAppId)?.manifest.name ?? 'the app'} should open.</p>
          <div className={styles.searchResults}>{list.map(w => w.id && <Button fill minimal alignText="left" key={w.id} icon="projects"
            onClick={() => { if (w.id === doc?.id) void openWorkspace(w.id!, launchAppId); else guard(() => openWorkspace(w.id!, launchAppId)); }}>{w.name}</Button>)}</div>
          {!list.length && <p>No workspaces yet. Create one to launch the app.</p>}
        </>}
        {dialog === 'search' && <>
          <InputGroup leftIcon="search" aria-label="Search records and workspaces" placeholder="Record name, ID or workspace…" autoFocus value={search} onChange={e => setSearch(e.target.value)} />
          <p className={styles.help}>Search saved workspaces. Use the active view’s filters to find live records.</p>
          <div className={styles.searchResults}>
            {list.filter(w => search.trim() && w.name?.toLowerCase().includes(search.toLowerCase())).map(w => <Button key={w.id} fill minimal alignText="left" icon="projects"
              onClick={() => { if (!w.id) return; changeSurface(() => {
                if (w.id === doc?.id) void openWorkspace(w.id!); else guard(() => openWorkspace(w.id!));
              }); }}>{w.name}</Button>)}
            {searchResults.map(result => <Button fill minimal alignText="left" key={result.appId + '/' + result.id} icon="search-around" onClick={() => {
              const target = doc?.panes.find(p => p.appId === result.appId); const app = registry.get(result.appId);
              if (!target || !app) { notify('Open a compatible app pane to inspect this record.'); return; }
              const host: HostServices = {
                getState: () => workspaces.getSnapshot().document!.panes.find(p => p.id === target.id)!.state,
                updateState: state => workspaces.update(document => ({ ...document, panes: document.panes.map(p => p.id === target.id ? { ...p, state: app.serializeState(state) } : p) })),
                getContext: () => workspaces.getSnapshot().document!.panes.find(p => p.id === target.id)!.context,
                changeContext: patch => bus.change(target.id, patch), subscribe: fn => bus.subscribe(target.id, fn), notify,
              };
              app.actions.find(action => action.acceptedKinds.includes(result.kind))?.run({ entityIds: [result.id], observationIds: [] }, target.context, host);
              workspaces.update(document => ({ ...document, appStates: { ...document.appStates, shell: { ...document.appStates.shell, activePaneId: target.id } } }));
              setDialog(null);
            }}>{result.label}</Button>)}
          </div>
          {search && !searchResults.length && !list.some(w => w.name?.toLowerCase().includes(search.toLowerCase())) && <p role="status">No matching local records.</p>}
        </>}
        {error && <p className={styles.dialogError} role="alert">{error}</p>}
      </DialogBody>
      <DialogFooter actions={<>
        <Button onClick={() => { setDialog(null); setPendingAction(null); setPendingSystemAction(null); }}>Cancel</Button>
        {dialog === 'unsaved' && <>
          <Button onClick={() => void continueAfterDraft(false)}>Discard and continue</Button>
          <Button intent="primary" disabled={busy} onClick={() => void continueAfterDraft(true)}>Save and continue</Button>
        </>}
        {dialog === 'system-unsaved' && <Button intent="warning" onClick={() => {
          const action = pendingSystemAction; setPendingSystemAction(null); setDialog(null); setSystemDirty(false); action?.();
        }}>Discard draft and leave</Button>}
        {dialog === 'choose-workspace' && <Button intent="primary" onClick={() => guard(async () => openDialog('new'))}>Create workspace</Button>}
        {dialog !== 'unsaved' && dialog !== 'system-unsaved' && dialog !== 'choose-workspace' && dialog !== 'search' && <Button intent={dialog === 'delete' ? 'danger' : 'primary'}
          disabled={busy || (['new', 'rename', 'duplicate'].includes(dialog ?? '') && !name.trim())} onClick={() => void submit()}>
          {dialog === 'delete' ? 'Delete workspace' : dialog === 'switch' ? 'Reload' : 'Save workspace'}</Button>}
      </>} />
    </Dialog>
  </div>;
}

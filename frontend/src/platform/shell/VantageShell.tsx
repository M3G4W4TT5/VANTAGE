import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Button, Dialog, DialogBody, DialogFooter, FormGroup, HTMLSelect, InputGroup, Menu, MenuItem, NonIdealState, PopoverNext, Spinner } from '@blueprintjs/core';
import type { AppRegistry, HostServices } from '../registry/AppRegistry';
import { ContextBus } from '../context/ContextBus';
import { WorkspaceService } from '../workspaces/WorkspaceService';
import { PaneHost } from './PaneHost';
import { PaneBoundary } from '../ui/PaneBoundary';
import styles from './VantageShell.module.css';

type DialogKind = 'new' | 'rename' | 'duplicate' | 'delete' | 'switch' | 'search' | 'settings' | null;
export function VantageShell({ registry, workspaces }: { registry: AppRegistry; workspaces: WorkspaceService }) {
  const { document: doc, list, busy, dirty, error } = useSyncExternalStore(workspaces.subscribe, workspaces.getSnapshot);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [name, setName] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const notify = useCallback((message: string) => setNotice(message), []);
  useEffect(() => { void workspaces.start(); }, [workspaces]);
  const workspaceId = doc?.id;
  const bus = useMemo(() => new ContextBus(
    id => workspaces.getSnapshot().document?.id === workspaceId ? workspaces.getSnapshot().document?.panes.find(p => p.id === id)?.context : undefined,
    (id, patch) => workspaces.update(document => ({ ...document, panes: document.panes.map(p => p.id === id ? { ...p, context: { ...p.context, ...patch } } : p) })),
    () => workspaces.getSnapshot().document?.linkGroups ?? [],
  ), [workspaces, workspaceId]);
  useEffect(() => () => bus.dispose(), [bus]);
  const theme = doc?.appStates.shell.theme ?? 'dark';
  useEffect(() => { document.documentElement.dataset.theme = theme; document.body.classList.toggle('bp6-dark', theme === 'dark'); }, [theme]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setDialog('search'); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void workspaces.save(); }
    };
    const leave = (event: BeforeUnloadEvent) => { if (workspaces.getSnapshot().dirty) event.preventDefault(); };
    window.addEventListener('keydown', key); window.addEventListener('beforeunload', leave);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', leave); };
  }, [workspaces]);
  const openDialog = (kind: DialogKind) => { setName(kind === 'duplicate' ? `${doc?.name ?? ''} copy` : kind === 'rename' ? doc?.name ?? '' : ''); setDialog(kind); };
  const submit = async () => {
    if (dialog === 'new') await workspaces.create(name);
    if (dialog === 'rename') { workspaces.update(document => ({ ...document, name: name.trim() })); await workspaces.save(); }
    if (dialog === 'duplicate') await workspaces.duplicate(name);
    if (dialog === 'delete') await workspaces.delete();
    if (dialog === 'switch') await workspaces.open(pendingId);
    if (!workspaces.getSnapshot().error) setDialog(null);
  };
  const searchResults = search.trim() ? registry.search(search) : [];
  const activePane = doc?.panes.find(p => p.id === doc.appStates.shell.activePaneId);
  const activeApp = activePane ? registry.get(activePane.appId) : undefined;
  return <div className={styles.shell}>
    <a className={styles.skip} href="#workspace">Skip to workspace</a>
    <header className={styles.header}>
      <div className={styles.brand}><img src={`/brand/vantage-mark-${theme === 'dark' ? 'white' : 'black'}.svg`} alt="" /><span>VANTAGE</span></div>
      <span className={styles.slash}>/</span><strong className={styles.appName}>{activeApp?.manifest.name ?? 'Workspace'}</strong>
      <Button minimal icon="search" className={styles.searchButton} onClick={() => setDialog('search')}>Search <kbd>⌘ / Ctrl K</kbd></Button>
      <div className={styles.workspaceControls}>
        <HTMLSelect aria-label="Workspace" value={doc?.id ?? ''} disabled={busy || !list.length} options={[...(!doc ? [{ value: '', label: 'Choose workspace' }] : []), ...list.map(w => ({ value: w.id ?? '', label: w.name ?? 'Unnamed' }))]}
          onChange={e => { if (dirty) { setPendingId(e.target.value); setDialog('switch'); } else void workspaces.open(e.target.value); }} />
        <PopoverNext placement="bottom-end" content={<Menu aria-label="Workspace actions">
          <MenuItem text="New workspace" icon="add" disabled={busy || dirty} onClick={() => openDialog('new')} />
          <MenuItem text="Rename workspace" icon="edit" disabled={busy || !doc} onClick={() => openDialog('rename')} />
          <MenuItem text="Duplicate workspace" icon="duplicate" disabled={busy || dirty || !doc} onClick={() => openDialog('duplicate')} />
          <MenuItem text="Reload saved workspace" icon="refresh" disabled={busy || !doc} onClick={() => { if (doc) { setPendingId(doc.id); setDialog('switch'); } }} />
          <MenuItem text="Delete workspace" icon="trash" disabled={busy || !doc} onClick={() => openDialog('delete')} />
        </Menu>}><Button minimal icon="more" aria-label="Workspace actions" /></PopoverNext>
        <span className={styles.saveStatus} role="status">{busy ? 'Working…' : dirty ? 'Unsaved' : doc ? 'Saved' : ''}</span>
        <Button minimal icon="floppy-disk" disabled={busy || !dirty} onClick={() => void workspaces.save()}>Save</Button>
        <Button minimal icon={theme === 'dark' ? 'flash' : 'moon'} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`} disabled={!doc}
          onClick={() => workspaces.update(document => ({ ...document, appStates: { ...document.appStates, shell: { ...document.appStates.shell, theme: theme === 'dark' ? 'light' : 'dark' } } }))} />
        <Button minimal icon="cog" aria-label="Settings" onClick={() => setDialog('settings')} />
      </div>
    </header>
    {error && <div className={styles.error} role="alert"><span>{error}</span><Button minimal onClick={() => {
      if (doc) { setPendingId(doc.id); setDialog('switch'); } else void workspaces.retry();
    }}>Reload saved state</Button></div>}
    {notice && <div className={styles.notice} role="status">{notice}<Button minimal icon="cross" aria-label="Dismiss notification" onClick={() => setNotice('')} /></div>}
    {!doc ? <div className={styles.loading}>{busy ? <NonIdealState icon={<Spinner size={24} />} title="Opening workspace" description="Loading your saved configuration." /> :
      <NonIdealState title="Workspace storage unavailable" description="Start PostgreSQL, apply the migrations and retry. Existing data is preserved."
        action={<Button onClick={() => void workspaces.retry()}>Retry</Button>} />}</div> : <>
      {doc.panes.length > 1 && <nav className={styles.panes} aria-label="Workspace panes">{doc.panes.map(p => <Button minimal key={p.id} active={p.id === activePane?.id}
        onClick={() => workspaces.update(document => ({ ...document, appStates: { ...document.appStates, shell: { ...document.appStates.shell, activePaneId: p.id } } }))}>{registry.get(p.appId)?.manifest.name ?? p.appId} · {p.id}</Button>)}</nav>}
      {activePane && <PaneBoundary key={`${doc.id}/${activePane.id}`}><PaneHost pane={activePane} module={activeApp} registry={registry} bus={bus} workspaces={workspaces} notify={notify} /></PaneBoundary>}
    </>}
    <Dialog isOpen={dialog !== null} onClose={() => setDialog(null)} title={dialog === 'search' ? 'Search this workspace' : dialog === 'settings' ? 'Workspace settings' :
      dialog === 'switch' ? 'Reload saved workspace?' : `${dialog ? dialog[0].toUpperCase() + dialog.slice(1) : ''} workspace`}>
      <DialogBody>
        {['new', 'rename', 'duplicate'].includes(dialog ?? '') && <FormGroup label="Workspace name" labelFor="workspace-name"><InputGroup id="workspace-name" autoFocus maxLength={120} value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) void submit(); }} /></FormGroup>}
        {dialog === 'delete' && <p>Delete “{doc?.name}” and its saved layout? This cannot be undone. Other workspaces remain available.</p>}
        {dialog === 'switch' && <p>{dirty ? 'Discard your unsaved changes and open the stored version?' : 'Open the latest stored version of this workspace?'}</p>}
        {dialog === 'settings' && <><p>Appearance and pane settings are stored with this workspace. Use Save to keep changes.</p><dl className={styles.settings}><dt>Appearance</dt><dd>{theme}</dd><dt>Workspace revision</dt><dd>{doc?.revision ?? '—'}</dd><dt>Data mode</dt><dd>Bundled demo fixtures</dd><dt>AI providers</dt><dd>Unconfigured · no provider calls</dd></dl></>}
        {dialog === 'search' && <><InputGroup leftIcon="search" aria-label="Search records and workspaces" placeholder="Record name, ID or workspace…" autoFocus value={search} onChange={e => setSearch(e.target.value)} />
          <p className={styles.help}>Local demo records and saved workspaces. No external lookup.</p>
          <div className={styles.searchResults}>{list.filter(w => search.trim() && w.name?.toLowerCase().includes(search.toLowerCase())).map(w => <Button key={w.id} fill minimal alignText="left" icon="projects" onClick={() => {
            if (!w.id) return; if (dirty) { setPendingId(w.id); setDialog('switch'); } else { void workspaces.open(w.id); setDialog(null); }
          }}>{w.name}</Button>)}
          {searchResults.map(result => <Button fill minimal alignText="left" key={`${result.appId}/${result.id}`} icon="search-around" onClick={() => {
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
          }}>{result.label}</Button>)}</div>
          {search && !searchResults.length && !list.some(w => w.name?.toLowerCase().includes(search.toLowerCase())) && <p role="status">No matching local records.</p>}</>}
        {error && <p className={styles.dialogError} role="alert">{error}</p>}
      </DialogBody>
      <DialogFooter actions={<><Button onClick={() => setDialog(null)}>{dialog === 'settings' || dialog === 'search' ? 'Close' : 'Cancel'}</Button>
        {dialog !== 'settings' && dialog !== 'search' && <Button intent={dialog === 'delete' ? 'danger' : 'primary'} disabled={busy || (['new', 'rename', 'duplicate'].includes(dialog ?? '') && !name.trim())} onClick={() => void submit()}>
          {dialog === 'delete' ? 'Delete workspace' : dialog === 'switch' ? 'Reload' : 'Save workspace'}</Button>}</>} />
    </Dialog>
  </div>;
}

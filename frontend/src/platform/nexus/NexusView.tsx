import { useEffect, useState } from 'react';
import { Button, Callout, Checkbox, Dialog, DialogBody, DialogFooter, FormGroup, HTMLSelect, InputGroup, Spinner } from '@blueprintjs/core';
import type { ConnectionDto, ConnectionImpactDto, ConnectionStatusDto, ConnectionTemplateDto,
  ConnectionTestDto, ConnectorTypeDto, WorkspaceSummaryDto } from '../../api/generated/client';
import type { SystemViewProps } from '../registry/AppRegistry';
import { client, errorMessage } from '../workspaces/WorkspaceService';
import { utc } from '../ui/format';
import { draftChanged, draftFromConnection, draftFromTemplate, validateDraft } from './nexusDraft';
import type { ConnectionDraft, SettingsSchema } from './nexusDraft';
import styles from './NexusView.module.css';

type Confirmation = { kind: 'discard'; action: () => void } | { kind: 'disable' | 'remove' | 'duplicate' };

function stateLabel(value: string | undefined): string {
  return ({ available: 'Available', not_checked: 'Not checked', setup_required: 'Setup required', rate_limited: 'Rate limited',
    healthy: 'Healthy', degraded: 'Degraded', offline: 'Offline', loading: 'Checking', mixed: 'Mixed',
    disabled: 'Disabled', removed: 'Removed', unavailable: 'Provider unavailable', error: 'Error' } as Record<string, string>)[value ?? ''] ?? 'Unknown';
}
function age(value: string | undefined, asOf: string | undefined): string {
  if (!value) return 'No cached data';
  const seconds = Math.max(0, Math.floor((Date.parse(asOf ?? new Date().toISOString()) - Date.parse(value)) / 1000));
  if (!Number.isFinite(seconds)) return 'Age unknown';
  if (seconds < 60) return 'Less than 1 minute old';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes old`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours old`;
  return `${Math.floor(seconds / 86400)} days old`;
}
function workspaceNames(ids: string[], workspaces: WorkspaceSummaryDto[]): string {
  if (!ids.length) return 'No current workspaces';
  return ids.map(id => workspaces.find(item => item.id === id)?.name ?? `Unavailable workspace (${id})`).join(', ');
}

export function NexusView({ onDirtyChange, focusReferenceId }: SystemViewProps) {
  const [connections, setConnections] = useState<ConnectionDto[]>([]);
  const [types, setTypes] = useState<ConnectorTypeDto[]>([]);
  const [templates, setTemplates] = useState<ConnectionTemplateDto[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummaryDto[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatusDto | null>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConnectionDraft | null>(null);
  const [baseline, setBaseline] = useState<ConnectionDraft | null>(null);
  const [schemaResult, setSchemaResult] = useState<{ type: string; schema: SettingsSchema | null; error: string } | null>(null);
  const [schemaRetry, setSchemaRetry] = useState(0);
  const [impactResult, setImpactResult] = useState<{ id: string; revision: number; value: ConnectionImpactDto | null } | null>(null);
  const [preview, setPreview] = useState<ConnectionTestDto | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importDocument, setImportDocument] = useState<unknown>(null);
  const [importName, setImportName] = useState('');
  const [credential, setCredential] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selected = connections.find(row => row.id === selectedId) ?? null;
  const connector = types.find(type => type.id === draft?.connectorTypeId);
  const dirty = draftChanged(draft, baseline);
  const schema = schemaResult && schemaResult.type === draft?.connectorTypeId ? schemaResult.schema : null;
  const schemaError = schemaResult && schemaResult.type === draft?.connectorTypeId ? schemaResult.error : '';
  const impact = impactResult?.id === selectedId && impactResult.revision === selected?.revision ? impactResult.value : null;
  const problems = draft ? validateDraft(draft, schema, workspaces.map(row => row.id ?? '')) : [];

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => {
    const abort = new AbortController();
    void Promise.all([client.connections_List(abort.signal), client.connections_Types(abort.signal),
      client.connections_Templates(abort.signal), client.workspaces_List(abort.signal)])
      .then(([rows, availableTypes, availableTemplates, owned]) => {
        setConnections(rows); setTypes(availableTypes); setTemplates(availableTemplates); setWorkspaces(owned);
        const first = rows.find(row => row.id === focusReferenceId) ?? rows[0];
        if (first) { const initial = draftFromConnection(first); setSelectedId(first.id ?? null); setDraft(initial); setBaseline(initial); }
        void Promise.allSettled(rows.filter(row => row.id).map(async row => {
          const status = await client.connections_Status(row.id!, abort.signal);
          if (!abort.signal.aborted) setStatuses(value => ({ ...value, [row.id!]: status }));
        }));
      })
      .catch(reason => { if (!abort.signal.aborted) setError(errorMessage(reason)); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [focusReferenceId]);
  useEffect(() => {
    if (!draft?.connectorTypeId) return;
    const abort = new AbortController();
    const type = draft.connectorTypeId;
    void client.connections_SettingsSchema(type, abort.signal)
      .then(async response => JSON.parse(await response.data.text()) as SettingsSchema)
      .then(value => { if (!abort.signal.aborted) setSchemaResult({ type, schema: value, error: '' }); })
      .catch(reason => { if (!abort.signal.aborted) setSchemaResult({ type, schema: null, error: errorMessage(reason) }); });
    return () => abort.abort();
  }, [draft?.connectorTypeId, schemaRetry]);
  useEffect(() => {
    if (!selectedId) return;
    const abort = new AbortController();
    const id = selectedId; const revision = selected?.revision ?? 0;
    void client.connections_Impact(id, abort.signal).then(value => { if (!abort.signal.aborted) setImpactResult({ id, revision, value }); },
      () => { if (!abort.signal.aborted) setImpactResult({ id, revision, value: null }); });
    return () => abort.abort();
  }, [selectedId, selected?.revision]);

  const choose = (row: ConnectionDto) => {
    const action = () => { const next = draftFromConnection(row); setSelectedId(row.id ?? null); setDraft(next);
      setBaseline(next); setPreview(null); setError(''); setCredential(''); };
    if (dirty) setConfirmation({ kind: 'discard', action }); else action();
  };
  const add = (template: ConnectionTemplateDto | null, type: ConnectorTypeDto) => {
    const chosen = template ?? templates.find(item => item.connectorTypeId === type.id);
    if (!chosen) { setError('The installed connector has no bundled versioned settings template.'); return; }
    const action = () => { setSelectedId(null); setDraft({ ...draftFromTemplate(chosen, type), templateId: template?.id ?? null });
      setBaseline(null); setPreview(null); setError(''); setCredential(''); };
    if (dirty) setConfirmation({ kind: 'discard', action }); else action();
  };
  const refreshStatuses = async (rows: ConnectionDto[]) => {
    const results = await Promise.allSettled(rows.filter(row => row.id).map(row => client.connections_Status(row.id!)));
    setStatuses(Object.fromEntries(rows.filter(row => row.id).map((row, index) =>
      [row.id!, results[index].status === 'fulfilled' ? results[index].value : null])));
  };
  const refresh = async () => {
    setBusy(true); setError('');
    try {
      const rows = await client.connections_List(); setConnections(rows); await refreshStatuses(rows);
      const latest = rows.find(row => row.id === selectedId);
      if (latest && !dirty) { const next = draftFromConnection(latest); setDraft(next); setBaseline(next); }
      if (selectedId && !rows.some(row => row.id === selectedId)) { setSelectedId(null); setDraft(null); setBaseline(null); }
      setNotice('Connections and local status refreshed. No collection was started.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const accept = async (row: ConnectionDto, message: string) => {
    const next = draftFromConnection(row);
    setConnections(previous => [...previous.filter(item => item.id !== row.id), row].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')));
    setSelectedId(row.id ?? null); setDraft(next); setBaseline(next); setPreview(null); setCredential('');
    setNotice(message); setError('');
    if (row.id) {
      try { const status = await client.connections_Status(row.id); setStatuses(value => ({ ...value, [row.id!]: status })); }
      catch { setStatuses(value => ({ ...value, [row.id!]: null })); }
    }
  };
  const save = async () => {
    if (!draft || problems.length || busy) return;
    setBusy(true); setError('');
    try {
      const settings = structuredClone(draft.settings);
      const scope = draft.scope; const workspaceId = scope === 'workspace' ? draft.workspaceId ?? undefined : undefined;
      const row = draft.id
        ? await client.connections_Update(draft.id, { name: draft.name.trim(), revision: draft.revision!, schemaVersion: draft.schemaVersion,
          settings, scope, workspaceId, enabled: draft.enabled })
        : await client.connections_Create({ name: draft.name.trim(), connectorTypeId: draft.connectorTypeId,
          templateId: draft.templateId ?? undefined, schemaVersion: draft.schemaVersion, settings, scope, workspaceId, enabled: draft.enabled });
      await accept(row, draft.id ? 'Connection saved. Its prior demand was released; authorized consumers may reconnect.' :
        'Connection added. Availability alone did not start collection.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const test = async () => {
    if (!draft || problems.length || busy) return;
    setBusy(true); setError(''); setPreview(null);
    try {
      const result = draft.id
        ? await client.connections_Test(draft.id, { revision: draft.revision!, schemaVersion: draft.schemaVersion, settings: draft.settings })
        : await client.connections_Preview({ connectorTypeId: draft.connectorTypeId, schemaVersion: draft.schemaVersion,
          settings: draft.settings });
      setPreview(result);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    if (!selected?.id || selected.revision === undefined) return;
    setBusy(true); setError('');
    try {
      const row = await client.connections_Update(selected.id, { name: selected.name, revision: selected.revision,
        schemaVersion: selected.schemaVersion, settings: selected.settings, scope: selected.scope,
        workspaceId: selected.workspaceId, enabled: false });
      await accept(row, 'Connection disabled. Demand for this connection was canceled; retained evidence remains.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!selected?.id || selected.revision === undefined) return;
    setBusy(true); setError('');
    try {
      await client.connections_Remove(selected.id, selected.revision);
      const row = await client.connections_Get(selected.id);
      await accept(row, 'Connection removed. Retained observations and references were preserved.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const duplicate = async () => {
    if (!selected?.id || selected.revision === undefined || !duplicateName.trim()) return;
    setBusy(true); setError('');
    try { await accept(await client.connections_Duplicate(selected.id, { name: duplicateName.trim(), revision: selected.revision }),
      'Connection duplicated. A copied credential, if needed, requires setup.'); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const saveCredential = async () => {
    if (!selected?.id || selected.revision === undefined || !credential || busy) return;
    setBusy(true); setError('');
    try { await accept(await client.connections_Credential(selected.id, { revision: selected.revision, value: credential }),
      'Credential submitted to protected backend storage. Test the connection explicitly.'); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setCredential(''); setBusy(false); }
  };
  const exportJson = async () => {
    setBusy(true); setError('');
    try {
      const portable = await client.connections_Export();
      const url = URL.createObjectURL(new Blob([JSON.stringify(portable, null, 2) + '\n'], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'vantage-connections-v1.json';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Versioned connection definitions exported without credentials.');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const readImport = async (file: File | undefined) => {
    setImportDocument(null); setImportName(''); setError('');
    if (!file) return;
    if (file.size > 131072) { setError('Import file exceeds the 128 KiB limit.'); return; }
    try {
      const value: unknown = JSON.parse(await file.text());
      if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 1 ||
        !('connections' in value) || !Array.isArray(value.connections) || !value.connections.length)
        throw new Error('Choose a version-1 connection export with at least one definition.');
      setImportDocument(value); setImportName(file.name);
    } catch (reason) { setError(errorMessage(reason)); }
  };
  const importJson = async () => {
    if (!importDocument || busy) return;
    setBusy(true); setError('');
    try {
      const result = await client.connections_Import(importDocument);
      const rows = await client.connections_List(); setConnections(rows); await refreshStatuses(rows);
      const added = result.connections?.[0];
      if (added) { const next = draftFromConnection(added); setSelectedId(added.id ?? null); setDraft(next); setBaseline(next); }
      setNotice(`${result.connections?.length ?? 0} connection definitions imported. Unresolved credentials require setup.`);
      setImportOpen(false); setImportDocument(null); setImportName('');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const status = selectedId ? statuses[selectedId] : undefined;
  const staleAfter = selected?.datasets?.[0]?.staleAfterSeconds;
  const cacheStale = !!status?.cachedRetrievedAt && !!status.asOf && !!staleAfter &&
    Date.parse(status.asOf) - Date.parse(status.cachedRetrievedAt) > staleAfter * 1000;
  const currentReach = impact?.workspaceIds ?? [];
  const proposedReach = draft?.scope === 'workspace' ? draft.workspaceId ? [draft.workspaceId] : [] : workspaces.map(row => row.id ?? '');
  const canEdit = !!draft && !selected?.removedAt;

  return <main id="nexus" className={styles.nexus}>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>SYSTEM TOOL / DATA MANAGER</p><h1>NEXUS</h1>
        <p>Manage reusable source connections and inspect their datasets. Opening this view does not start collection.</p></div>
      <div className={styles.headingActions}>
        <Button icon="refresh" minimal disabled={busy || loading} onClick={() => void refresh()}>Refresh</Button>
        <Button icon="import" minimal disabled={busy} onClick={() => {
          if (dirty) setConfirmation({ kind: 'discard', action: () => setImportOpen(true) });
          else setImportOpen(true);
        }}>Import JSON</Button>
        <Button icon="export" minimal disabled={busy || loading} onClick={() => void exportJson()}>Export JSON</Button>
      </div>
    </div>
    {error && <Callout intent="danger" role="alert" className={styles.alert}>{error}
      {(error.toLowerCase().includes('revision') || error.toLowerCase().includes('changed elsewhere')) &&
        <Button small onClick={() => void refresh()}>Refresh list; keep draft</Button>}</Callout>}
    {notice && <Callout intent="success" role="status" className={styles.alert}>{notice}</Callout>}
    {loading ? <div className={styles.loading} role="status"><Spinner size={20} /> Loading connections…</div> :
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Connection manager">
          <div className={styles.sectionTitle}><h2>Connections</h2><span>{connections.filter(row => !row.removedAt).length} active definitions</span></div>
          {connections.length ? <ul className={styles.list}>{connections.map(row => {
            const runtime = row.id ? statuses[row.id] : null;
            return <li key={row.id}><button type="button" className={`${styles.connection} ${selectedId === row.id ? styles.selected : ''}`}
              onClick={() => choose(row)} aria-current={selectedId === row.id ? 'true' : undefined}>
              <strong>{row.name || 'Unnamed connection'}</strong><span>{types.find(type => type.id === row.connectorTypeId)?.name ?? row.connectorTypeId}</span>
              <small>{row.scope === 'workspace' ? 'Workspace only' : 'Global availability'} · {stateLabel(runtime?.healthState ?? row.status)}</small>
            </button></li>;
          })}</ul> : <p className={styles.empty}>No connections. Add a versioned template or installed connector type.</p>}
          <div className={styles.addBlock}><h3>Add from template</h3>
            {templates.map(template => { const type = types.find(item => item.id === template.connectorTypeId);
              return type && <Button key={template.id} fill minimal alignText="left" icon="add" disabled={busy}
                onClick={() => add(template, type)}>{template.name} · v{template.version}</Button>; })}
            <h3>Add from connector type</h3>
            {types.map(type => <Button key={type.id} fill minimal alignText="left" icon="add" disabled={busy}
              onClick={() => add(null, type)}>{type.name} · v{type.version}</Button>)}
          </div>
        </aside>
        <div className={styles.detail}>
          {!draft ? <div className={styles.emptyDetail}>Select or add a connection to inspect datasets and configuration.</div> : <>
            <div className={styles.detailHeading}><div><p className={styles.eyebrow}>{draft.id ? 'CONNECTION / ' + draft.id : 'NEW CONNECTION'}</p>
              <h2>{selected?.name ?? (draft.name || 'New connection')}</h2></div>
              <div className={styles.detailActions}>
                {selected && !selected.removedAt && <>
                  <Button small icon="duplicate" disabled={busy} onClick={() => {
                    const action = () => { setDuplicateName((selected.name ?? '') + ' copy'); setConfirmation({ kind: 'duplicate' }); };
                    if (dirty) setConfirmation({ kind: 'discard', action }); else action();
                  }}>Duplicate</Button>
                  {selected.enabled && <Button small intent="warning" disabled={busy} onClick={() => {
                    const action = () => setConfirmation({ kind: 'disable' });
                    if (dirty) setConfirmation({ kind: 'discard', action }); else action();
                  }}>Disable</Button>}
                  <Button small intent="danger" disabled={busy} onClick={() => {
                    const action = () => setConfirmation({ kind: 'remove' });
                    if (dirty) setConfirmation({ kind: 'discard', action }); else action();
                  }}>Remove</Button>
                </>}
              </div>
            </div>
            {selected?.removedAt && <Callout intent="warning">This connection was removed. Its retained references and cache remain, but it cannot be edited or tested.</Callout>}
            {selected && draft.revision !== selected.revision && <Callout intent="warning" role="alert">The stored revision changed. Your draft is retained.
              <Button small onClick={() => { const next = draftFromConnection(selected); setDraft(next); setBaseline(next); setPreview(null); setError(''); }}>Reload stored connection</Button>
            </Callout>}
            {selected?.status === 'setup_required' && <Callout intent="warning">Imported or duplicated credentials are unresolved.
              {connector?.authenticationModes?.includes('bearer') ? ' Configure a supported credential before using this connection.' :
                ' This connector does not accept credentials; remove this definition and import a corrected secret-free one.'}</Callout>}
            <div className={styles.columns}>
              <section aria-labelledby="nexus-configuration" className={styles.panel}>
                <div className={styles.sectionTitle}><h3 id="nexus-configuration">Configuration</h3><span>{dirty ? 'Unsaved draft' : draft.id ? `Saved revision ${draft.revision}` : 'New draft'}</span></div>
                <ConnectionForm draft={draft} schema={schema} schemaError={schemaError} workspaces={workspaces}
                  disabled={!canEdit || busy} onChange={setDraft} />
                {problems.length > 0 && <ul className={styles.problems} role="alert">{problems.map(problem => <li key={problem}>{problem}</li>)}</ul>}
                {schemaError && <Button small onClick={() => setSchemaRetry(value => value + 1)}>Retry settings schema</Button>}
                <div className={styles.formActions}>
                  <Button intent="primary" icon="floppy-disk" disabled={!canEdit || busy || problems.length > 0 || !!draft.id && !dirty}
                    onClick={() => void save()}>Save connection</Button>
                  <Button icon="pulse" disabled={!canEdit || busy || problems.length > 0 || !draft.enabled || selected?.status === 'setup_required'}
                    onClick={() => void test()}>Test / preview</Button>
                  {draft.id && dirty && <Button minimal disabled={busy} onClick={() => {
                    if (selected) { const next = draftFromConnection(selected); setDraft(next); setBaseline(next); setError(''); setPreview(null); }
                  }}>Discard draft</Button>}
                </div>
                <p className={styles.note}>Test makes one bounded provider request and never saves observations. Save activates a new configuration revision.</p>
              </section>
              <div className={styles.facts}>
                <section aria-labelledby="nexus-status" className={styles.panel}>
                  <h3 id="nexus-status">Status</h3>
                  {!draft.id ? <p>Save the connection to inspect local runtime and cache state.</p> : !status ?
                    <p>Status unavailable. Use Refresh to retry; this does not start collection.</p> : <dl className={styles.factsList}>
                      <dt>Connection health</dt><dd><strong>{stateLabel(status.healthState)}</strong><span>{status.healthMessage}</span></dd>
                      <dt>Active demand</dt><dd>{status.activeConsumers ?? 0} consumers across {status.activeOperations ?? 0} shared operations</dd>
                      <dt>Cached data age</dt><dd>{status.cachedRetrievedAt && staleAfter ? cacheStale ? 'Stale cache · ' : 'Within freshness threshold · ' : ''}
                        {age(status.cachedRetrievedAt, status.asOf)}{status.cachedRetrievedAt &&
                        <span>Latest retrieval {utc(status.cachedRetrievedAt)} · {status.cachedRecords ?? 0} cached records</span>}</dd>
                      <dt>Provider adapter</dt><dd>{status.providerAvailable ? 'Installed locally; reachability unverified here' : 'Unavailable locally'}</dd>
                    </dl>}
                  <p className={styles.note}>Health reflects active collection only. Cached age is the latest stored retrieval, independent of source health or event time.</p>
                </section>
                <section aria-labelledby="nexus-availability" className={styles.panel}>
                  <h3 id="nexus-availability">Availability and impact</h3>
                  <dl className={styles.factsList}>
                    <dt>Current reach</dt><dd>{selected ? workspaceNames(currentReach, workspaces) : 'New connection'}</dd>
                    <dt>Draft reach</dt><dd>{workspaceNames(proposedReach, workspaces)}</dd>
                  </dl>
                  <p className={styles.note}>Global means available across your owned workspaces; workspace only limits availability to one. Server authorization still applies. These are potential consumers, not confirmed saved layer dependencies.</p>
                  <p className={styles.note}>Editing, disabling or removing a shared connection ends its current demand. Other connections and their consumers continue. Retained observations and evidence keep their original provenance.</p>
                </section>
              </div>
            </div>
            <section aria-labelledby="nexus-datasets" className={styles.panel}>
              <div className={styles.sectionTitle}><h3 id="nexus-datasets">Datasets</h3><span>{selected?.datasets?.length ?? 0} available definitions</span></div>
              {selected?.datasets?.length ? selected.datasets.map(dataset => <div className={styles.dataset} key={dataset.id}>
                <h4>{dataset.productId} <span>· {dataset.domain}</span></h4>
                <dl className={styles.factsList}>
                  <dt>Coverage</dt><dd>{dataset.coverage}</dd><dt>Capabilities</dt><dd>{dataset.capabilities?.join(', ') || 'None declared'}</dd>
                  <dt>Operations</dt><dd>{dataset.allowedOperations?.join(', ') || 'None declared'}</dd>
                  <dt>Attribution</dt><dd>{dataset.attribution}</dd><dt>Provider cadence</dt><dd>{dataset.pollSeconds} seconds; result limit {connector?.resultLimit ?? 'unknown'}; cache is stale after {dataset.staleAfterSeconds} seconds</dd>
                  <dt>Availability</dt><dd>{stateLabel(dataset.availability)}</dd>
                </dl>
              </div>) : <p className={styles.note}>Dataset definitions appear after the connection is saved.</p>}
            </section>
            {preview && <section aria-labelledby="nexus-preview" className={styles.panel} role="status">
              <h3 id="nexus-preview">Explicit test / preview</h3><p><strong>{stateLabel(preview.state)}</strong> · {preview.message}</p>
              <p>{preview.valid ? `${preview.previewCount ?? 0} normalized records parsed. No observations were saved.` : 'No configuration was changed.'}</p>
              {preview.problems?.length ? <ul>{preview.problems.map(problem => <li key={problem}>{problem}</li>)}</ul> : null}
              {preview.previewRows?.length ? <div className={styles.tableWrap}><table><thead><tr><th>Record</th><th>Label</th><th>Source time</th><th>Location WGS84</th></tr></thead><tbody>
                {preview.previewRows.map(row => <tr key={row.id}><td>{row.id}</td><td>{row.label}</td><td>{row.sourceTime ? utc(row.sourceTime) : 'Unknown'}</td>
                  <td>{row.longitude === undefined || row.longitude === null || row.latitude === undefined || row.latitude === null ? 'Unknown' : `${row.longitude.toFixed(3)}, ${row.latitude.toFixed(3)}`}</td></tr>)}
              </tbody></table></div> : null}
            </section>}
            {connector?.authenticationModes?.includes('bearer') && selected && !selected.removedAt && <section aria-labelledby="nexus-credential" className={styles.panel}>
              <h3 id="nexus-credential">Credential</h3><p>Stored credentials are write only. Export includes a setup marker, never the secret.</p>
              <FormGroup label="Replace bearer credential" labelFor="nexus-secret"><InputGroup id="nexus-secret" type="password" autoComplete="new-password"
                value={credential} onChange={event => setCredential(event.target.value)} /></FormGroup>
              <Button disabled={!credential || busy || dirty} onClick={() => void saveCredential()}>Save credential</Button>
              {dirty && <p className={styles.note}>Save or discard the configuration draft before changing its credential.</p>}
            </section>}
          </>}
        </div>
      </div>}
    <Dialog isOpen={confirmation !== null} onClose={() => setConfirmation(null)} title={confirmation?.kind === 'discard' ? 'Discard unsaved connection draft?' :
      confirmation?.kind === 'disable' ? 'Disable connection?' : confirmation?.kind === 'remove' ? 'Remove connection?' : 'Duplicate connection'}>
      <DialogBody>
        {confirmation?.kind === 'discard' && <p>Unsaved connection changes will be lost. The saved configuration stays in place.</p>}
        {confirmation?.kind === 'disable' && <p>Disable “{selected?.name}”? Active demand for this connection ends. Other connections continue, and retained data remains.</p>}
        {confirmation?.kind === 'remove' && <p>Remove “{selected?.name}”? It will be unavailable to consumers. Retained observations and references remain; this action cannot be undone here.</p>}
        {confirmation?.kind === 'duplicate' && <FormGroup label="New connection name" labelFor="nexus-duplicate-name">
          <InputGroup id="nexus-duplicate-name" autoFocus maxLength={120} value={duplicateName} onChange={event => setDuplicateName(event.target.value)} /></FormGroup>}
      </DialogBody>
      <DialogFooter actions={<><Button onClick={() => setConfirmation(null)}>Cancel</Button><Button intent={confirmation?.kind === 'remove' ? 'danger' : 'primary'}
        disabled={busy || confirmation?.kind === 'duplicate' && !duplicateName.trim()} onClick={() => {
          const action = confirmation; setConfirmation(null);
          if (action?.kind === 'discard') { setDraft(baseline); action.action(); }
          if (action?.kind === 'disable') void disable();
          if (action?.kind === 'remove') void remove();
          if (action?.kind === 'duplicate') void duplicate();
        }}>{confirmation?.kind === 'discard' ? 'Discard draft' : confirmation?.kind === 'disable' ? 'Disable' : confirmation?.kind === 'remove' ? 'Remove' : 'Duplicate'}</Button></>} />
    </Dialog>
    <Dialog isOpen={importOpen} onClose={() => { setImportOpen(false); setImportDocument(null); }} title="Import versioned connection JSON">
      <DialogBody><p>Import creates new definitions. Credentials are unresolved until configured separately. Import does not start collection.</p>
        <FormGroup label="JSON file" labelFor="nexus-import-file"><input id="nexus-import-file" type="file" accept=".json,application/json"
          onChange={event => void readImport(event.target.files?.[0])} /></FormGroup>
        {importDocument !== null && <p role="status">Ready: {importName} · {(importDocument as { connections: unknown[] }).connections.length} definitions · schema v1</p>}
        {error && <p role="alert" className={styles.importError}>{error}</p>}
      </DialogBody>
      <DialogFooter actions={<><Button onClick={() => setImportOpen(false)}>Cancel</Button>
        <Button intent="primary" disabled={!importDocument || busy} onClick={() => void importJson()}>Import definitions</Button></>} />
    </Dialog>
  </main>;
}

function ConnectionForm({ draft, schema, schemaError, workspaces, disabled, onChange }: {
  draft: ConnectionDraft; schema: SettingsSchema | null; schemaError: string; workspaces: WorkspaceSummaryDto[];
  disabled: boolean; onChange: (value: ConnectionDraft) => void;
}) {
  const change = (patch: Partial<ConnectionDraft>) => onChange({ ...draft, ...patch });
  return <div className={styles.form}>
    <FormGroup label="Name" labelFor="nexus-name"><InputGroup id="nexus-name" maxLength={120} value={draft.name} disabled={disabled}
      onChange={event => change({ name: event.target.value })} /></FormGroup>
    <div className={styles.twoFields}>
      <FormGroup label="Connector type" labelFor="nexus-type"><InputGroup id="nexus-type" value={draft.connectorTypeId} readOnly /></FormGroup>
      <FormGroup label="Definition version" labelFor="nexus-version"><InputGroup id="nexus-version"
        value={`Schema v${draft.schemaVersion}${draft.templateId ? ` · ${draft.templateId}` : ' · connector default'}`} readOnly /></FormGroup>
    </div>
    <FormGroup label="Availability scope" labelFor="nexus-scope">
      <HTMLSelect id="nexus-scope" fill value={draft.scope} disabled={disabled} onChange={event => change({
        scope: event.target.value as 'global' | 'workspace', workspaceId: event.target.value === 'global' ? null : draft.workspaceId,
      })} options={[{ value: 'global', label: 'Global across my workspaces' }, { value: 'workspace', label: 'One workspace only' }]} />
    </FormGroup>
    {draft.scope === 'workspace' && <FormGroup label="Workspace" labelFor="nexus-workspace"><HTMLSelect id="nexus-workspace" fill
      value={draft.workspaceId ?? ''} disabled={disabled} onChange={event => change({ workspaceId: event.target.value || null })}
      options={[{ value: '', label: 'Choose a workspace' }, ...workspaces.map(row => ({ value: row.id ?? '', label: row.name ?? row.id ?? '' }))]} /></FormGroup>}
    <Checkbox label="Enabled after Save" checked={draft.enabled} disabled={disabled} onChange={event => change({ enabled: event.currentTarget.checked })} />
    <fieldset className={styles.settings}><legend>Connector settings · {schema?.title ?? 'loading schema'}</legend>
      {schemaError && <p role="alert">{schemaError}</p>}
      {schema && !Object.keys(schema.properties ?? {}).length && <p>No configurable settings are declared.</p>}
      {Object.entries(schema?.properties ?? {}).map(([key, field]) => {
        const label = field.title ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, letter => letter.toUpperCase());
        const value = draft.settings[key]; const id = `nexus-setting-${key}`;
        const update = (next: unknown) => change({ settings: { ...draft.settings, [key]: next } });
        return <FormGroup key={key} label={label} labelFor={id} helperText={field.readOnly ? 'Provider cadence is fixed for this connection.' : field.description}>
          {field.type === 'boolean' ? <Checkbox id={id} checked={value === true} disabled={disabled || field.readOnly}
            onChange={event => update(event.currentTarget.checked)} /> : field.enum ?
              <HTMLSelect id={id} fill value={String(value ?? '')} disabled={disabled || field.readOnly}
                options={field.enum.map(option => ({ value: String(option), label: String(option) }))}
                onChange={event => update(field.type === 'number' || field.type === 'integer' ? Number(event.target.value) : event.target.value)} /> :
              <InputGroup id={id} type={field.type === 'integer' || field.type === 'number' ? 'number' : 'text'}
                min={field.minimum} max={field.maximum} value={value === undefined ? '' : String(value)}
                readOnly={field.readOnly} disabled={disabled} onChange={event => update(field.type === 'integer' || field.type === 'number' ? Number(event.target.value) : event.target.value)} />}
        </FormGroup>;
      })}
    </fieldset>
  </div>;
}

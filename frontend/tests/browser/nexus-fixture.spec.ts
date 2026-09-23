import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

// This exercises the built NEXUS interface with a fixture cookie boundary and no provider credentials.
test.use({ storageState: { cookies: [], origins: [] } });

test('NEXUS manages connections without starting collection on open', async ({ page }, info) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(10000);
  const now = new Date().toISOString();
  const workspace = { id: 'owned-workspace', name: 'North desk', ownerId: 'fixture-owner', revision: 1, updatedAt: now };
  const connectorTypes = [
    { id: 'adsb-lol', version: 1, name: 'ADSB.lol aircraft', domain: 'aircraft', capabilities: ['bounded_query', 'live_subscription', 'local_cache'],
      authenticationModes: ['none'], settingsSchemaUrl: '/api/v1/connections/connector-types/adsb-lol/settings-schema',
      coverage: 'Public receiver coverage is incomplete.', attribution: 'ADSB.lol contributors', pollSeconds: 30, resultLimit: 500, sourceId: 'adsb-lol' },
    { id: 'usgs-earthquakes', version: 1, name: 'USGS Earthquakes', domain: 'earthquake', capabilities: ['current_catalog', 'live_subscription', 'local_cache'],
      authenticationModes: ['none'], settingsSchemaUrl: '/api/v1/connections/connector-types/usgs-earthquakes/settings-schema',
      coverage: 'Worldwide reported M2.5+ events.', attribution: 'U.S. Geological Survey', pollSeconds: 60, resultLimit: 1000, sourceId: 'usgs-earthquakes' },
  ];
  const templates = connectorTypes.map(type => ({ id: `${type.id}-default`, version: 1, connectorTypeId: type.id,
    name: type.name, schemaVersion: 1, settings: { pollSeconds: type.pollSeconds } }));
  const makeConnection = (id: string, name: string, type = connectorTypes[0], extra: Record<string, unknown> = {}) => ({
    id, name, connectorTypeId: type.id, templateId: `${type.id}-default`, templateVersion: 1, schemaVersion: 1,
    scope: 'global', workspaceId: null, enabled: true, revision: 1, settings: { pollSeconds: type.pollSeconds },
    hasCredential: false, status: 'available', createdAt: now, updatedAt: now, removedAt: null,
    datasets: [{ id: `${id}:${type.domain === 'aircraft' ? 'positions' : 'events'}`, connectionId: id,
      productId: type.domain === 'aircraft' ? 'positions' : 'events', sourceId: type.sourceId, domain: type.domain,
      capabilities: type.capabilities, coverage: type.coverage, attribution: type.attribution,
      allowedOperations: ['subscribe', 'local_cache'], pollSeconds: type.pollSeconds,
      staleAfterSeconds: type.domain === 'aircraft' ? 900 : 180, availability: 'available' }], ...extra,
  });
  let rows = [makeConnection('legacy-aircraft', 'Aircraft north'), makeConnection('legacy-earthquakes', 'Earthquakes', connectorTypes[1])];
  let preference = { schemaVersion: 1, theme: 'dark', revision: 1, updatedAt: now };
  let previewRequests = 0;
  let workspaceReads = 0;
  let collectionRequests = 0;
  let nextId = 1;
  const unexpected: string[] = [];
  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, json: body });
  await page.route('**/api/v1/**', async route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname; const method = request.method();
    if (path === '/api/v1/session') return json(route, 200, { schemaVersion: 1, authenticated: true,
      user: { id: 'fixture-owner', displayName: 'Fixture operator', canUseData: true },
      expiresAt: '2099-01-01T00:00:00Z', csrfToken: 'fixture-csrf', sessionKey: 'fixture-session' });
    if (path === '/api/v1/preferences') {
      if (method === 'GET') return json(route, 200, preference);
      if (method === 'PUT') { const body = request.postDataJSON() as { theme: string }; preference = { ...preference, theme: body.theme, revision: preference.revision + 1 }; return json(route, 200, preference); }
    }
    if (path === '/api/v1/workspaces') return json(route, 200, [workspace]);
    if (path.startsWith('/api/v1/workspaces/')) { workspaceReads++; return json(route, 503, { message: 'NEXUS should not open a workspace.' }); }
    if (path === '/api/v1/connections/connector-types') return json(route, 200, connectorTypes);
    if (path.endsWith('/settings-schema')) {
      const type = connectorTypes.find(item => path.includes(`/${item.id}/`));
      if (!type) return json(route, 404, { message: 'No schema.' });
      return route.fulfill({ status: 200, contentType: 'application/schema+json', body: JSON.stringify({ title: `${type.name} settings v1`,
        type: 'object', required: ['pollSeconds'], properties: { pollSeconds: { type: 'integer', readOnly: true,
          minimum: type.pollSeconds, maximum: 3600 } } }) });
    }
    if (path === '/api/v1/connections/templates') return json(route, 200, templates);
    if (path === '/api/v1/connections/export') return json(route, 200, { schemaVersion: 1, connections: rows.filter(row => !row.removedAt).map(row => ({
      schemaVersion: 1, connectorTypeId: row.connectorTypeId, name: row.name, scope: row.scope, workspaceId: row.workspaceId,
      enabled: row.enabled, settings: row.settings, requiresCredential: row.hasCredential })) });
    if (path === '/api/v1/connections/import' && method === 'POST') {
      const body = request.postDataJSON() as { schemaVersion: number; connections: { name: string; connectorTypeId: string; requiresCredential: boolean }[] };
      if (body.schemaVersion !== 1 || !body.connections?.length) return json(route, 400, { message: 'Invalid import.' });
      const imported = body.connections.map(item => makeConnection(`imported-${nextId++}`, item.name,
        connectorTypes.find(type => type.id === item.connectorTypeId) ?? connectorTypes[0],
        { hasCredential: item.requiresCredential, status: item.requiresCredential ? 'setup_required' : 'available' }));
      rows = [...rows, ...imported]; return json(route, 200, { connections: imported, rejected: 0, problems: [] });
    }
    if (path === '/api/v1/connections/preview' && method === 'POST') {
      previewRequests++; return json(route, 200, { valid: true, state: 'healthy', message: 'Normalized fixture response; no observations saved.',
        problems: [], previewCount: 1, testedAt: now, previewRows: [{ id: 'record-1', label: 'Fixture aircraft',
          sourceTime: now, retrievedAt: now, longitude: 12, latitude: 58 }] });
    }
    if (path === '/api/v1/connections' && method === 'GET') return json(route, 200, rows);
    if (path === '/api/v1/connections' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = makeConnection(`added-${nextId++}`, String(body.name), connectorTypes.find(type => type.id === body.connectorTypeId) ?? connectorTypes[0], body);
      rows = [...rows, created]; return json(route, 201, created);
    }
    const match = path.match(/^\/api\/v1\/connections\/([^/]+)(?:\/(status|impact|test|duplicate))?$/);
    if (match) {
      const id = match[1]; const action = match[2]; const found = rows.find(row => row.id === id);
      if (!found) return json(route, 404, { message: 'Not found.' });
      if (action === 'status' && method === 'GET') return json(route, 200, { connectionId: id,
        healthState: found.enabled ? found.hasCredential ? 'setup_required' : 'not_checked' : 'disabled',
        healthMessage: !found.enabled ? 'Connection disabled; no new collection is allowed.' : found.hasCredential ?
          'A credential must be configured before collection is available.' : 'No active demand. Provider health not checked.',
        activeOperations: 0, activeConsumers: 0, providerAvailable: true,
        cachedRetrievedAt: id === 'legacy-aircraft' ? now : null, cachedRecords: id === 'legacy-aircraft' ? 12 : 0, asOf: now });
      if (action === 'impact' && method === 'GET') return json(route, 200, { connectionId: id, revision: found.revision,
        workspaceIds: found.scope === 'global' ? [workspace.id] : found.workspaceId ? [found.workspaceId] : [],
        effect: 'Editing or disabling ends current demand.' });
      if (action === 'test' && method === 'POST') { previewRequests++; return json(route, 200, { valid: true, state: 'healthy',
        message: 'Normalized fixture response; no observations saved.', problems: [], previewCount: 0, testedAt: now, previewRows: [] }); }
      if (action === 'duplicate' && method === 'POST') {
        const body = request.postDataJSON() as { name: string; revision: number };
        if (body.revision !== found.revision) return json(route, 409, { message: 'Connection changed elsewhere.' });
        const copy = makeConnection(`copy-${nextId++}`, body.name, connectorTypes.find(type => type.id === found.connectorTypeId)!,
          { settings: found.settings, scope: found.scope, workspaceId: found.workspaceId });
        rows = [...rows, copy]; return json(route, 201, copy);
      }
      if (!action && method === 'GET') return json(route, 200, found);
      if (!action && method === 'PUT') {
        const body = request.postDataJSON() as { revision: number; name: string; scope: string; workspaceId: string | null; enabled: boolean };
        if (body.revision !== found.revision) return json(route, 409, { code: 'revision_conflict', message: 'Connection changed elsewhere. Reload before saving.' });
        const updated = { ...found, ...body, revision: found.revision + 1, status: body.enabled ? 'available' : 'disabled', updatedAt: now };
        rows = rows.map(row => row.id === id ? updated : row); return json(route, 200, updated);
      }
      if (!action && method === 'DELETE') {
        if (Number(url.searchParams.get('revision')) !== found.revision) return json(route, 409, { message: 'Connection changed elsewhere.' });
        rows = rows.map(row => row.id === id ? { ...row, enabled: false, status: 'removed', revision: row.revision + 1, removedAt: now } : row);
        return route.fulfill({ status: 204 });
      }
    }
    if (path.startsWith('/api/v1/aircraft') || path.startsWith('/api/v1/earthquakes')) collectionRequests++;
    unexpected.push(`${method} ${path}`); return json(route, 503, { message: 'Missing fixture route.' });
  });
  await page.route('**/hubs/**', route => { collectionRequests++; return route.fulfill({ status: 503 }); });
  await page.routeWebSocket('**/hubs/**', socket => { collectionRequests++; socket.close(); });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await page.getByRole('region', { name: 'System' }).getByRole('button', { name: 'Open NEXUS — Data Manager' }).click();
  await expect(page.getByRole('heading', { name: 'NEXUS', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'NEXUS' })).toHaveAttribute('src', '/brand/nexus-wordmark-white.svg');
  await expect(page.getByText('No active demand. Provider health not checked.')).toBeVisible();
  await expect(page.getByText('12 cached records')).toBeVisible();
  expect(previewRequests).toBe(0); expect(collectionRequests).toBe(0); expect(workspaceReads).toBe(0);
  await page.screenshot({ path: info.outputPath('nexus-dark-desktop.png'), animations: 'disabled' });

  const name = page.getByRole('textbox', { name: 'Name', exact: true });
  await name.fill('  ');
  await expect(page.getByRole('alert').getByText('Name must contain 1–120 characters.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save connection' })).toBeDisabled();
  await name.fill('Aircraft regional');
  await page.getByRole('combobox', { name: 'Availability scope' }).selectOption('workspace');
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).selectOption(workspace.id);
  await expect(page.getByRole('combobox', { name: 'Workspace', exact: true })).toHaveValue(workspace.id);
  await page.getByRole('button', { name: 'Save connection' }).click();
  await expect(page.getByText('Saved revision 2')).toBeVisible();
  expect(rows[0].name).toBe('Aircraft regional'); expect(rows[0].workspaceId).toBe(workspace.id);
  await name.fill('Should stay a draft');
  rows = rows.map(row => row.id === 'legacy-aircraft' ? { ...row, revision: 3 } : row);
  await page.getByRole('button', { name: 'Save connection' }).click();
  await expect(name).toHaveValue('Should stay a draft');
  await expect(page.getByRole('alert').getByText('Connection changed elsewhere. Reload before saving.')).toBeVisible();
  await page.getByRole('button', { name: 'Refresh list; keep draft' }).click();
  await expect(page.getByText('The stored revision changed. Your draft is retained.')).toBeVisible();
  await page.getByRole('button', { name: 'Reload stored connection' }).click();
  await expect(name).toHaveValue('Aircraft regional');
  await name.fill('Unsaved draft');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Unsaved connection draft' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(name).toHaveValue('Unsaved draft');
  await page.getByRole('button', { name: 'Import JSON' }).click();
  await expect(page.getByRole('dialog', { name: 'Discard unsaved connection draft?' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Discard unsaved connection draft?' }).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog', { name: 'Discard unsaved connection draft?' })).toBeHidden();
  await expect(name).toHaveValue('Unsaved draft');
  await page.getByRole('button', { name: /Search/ }).click();
  await page.getByRole('dialog', { name: 'Search' }).getByRole('textbox', { name: 'Search records and workspaces' }).fill('North');
  await page.getByRole('dialog', { name: 'Search' }).getByRole('button', { name: 'North desk' }).click();
  await expect(page.getByRole('dialog', { name: 'Unsaved connection draft' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Unsaved connection draft' }).getByRole('button', { name: 'Cancel' }).click();
  await expect(name).toHaveValue('Unsaved draft');
  expect(workspaceReads).toBe(0);
  await page.locator('#nexus').getByRole('button', { name: 'Discard draft', exact: true }).click();
  await expect(name).toHaveValue('Aircraft regional');

  await page.getByRole('button', { name: /ADSB.lol aircraft · v1/ }).first().click();
  await expect(page.getByText('Unsaved draft')).toBeVisible();
  await page.getByRole('button', { name: 'Test / preview' }).click();
  await expect(page.getByRole('heading', { name: 'Explicit test / preview' })).toBeVisible();
  await expect(page.getByText('Fixture aircraft')).toBeVisible();
  expect(previewRequests).toBe(1); expect(rows).toHaveLength(2);
  await page.getByRole('button', { name: 'Save connection' }).click();
  await expect(page.getByText('Saved revision 1')).toBeVisible();
  expect(rows).toHaveLength(3);
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await page.getByRole('dialog', { name: 'Duplicate connection' }).getByRole('button', { name: 'Duplicate' }).click();
  expect(rows).toHaveLength(4);
  await page.getByRole('button', { name: 'Disable', exact: true }).click();
  await page.getByRole('dialog', { name: 'Disable connection?' }).getByRole('button', { name: 'Disable' }).click();
  await expect(page.getByText('Connection disabled; no new collection is allowed.')).toBeVisible();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.getByRole('dialog', { name: 'Remove connection?' }).getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('This connection was removed.')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('vantage-connections-v1.json');
  const exportText = JSON.stringify(rows.filter(row => !row.removedAt).map(row => ({ name: row.name, settings: row.settings })));
  expect(exportText).not.toContain('fixture-csrf');
  await page.getByRole('button', { name: 'Import JSON' }).click();
  await page.getByRole('dialog', { name: 'Import versioned connection JSON' }).locator('input[type=file]').setInputFiles({
    name: 'connections.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 1,
      connections: [{ schemaVersion: 1, connectorTypeId: 'adsb-lol', name: 'Imported needs setup', scope: 'global',
        workspaceId: null, enabled: true, settings: { pollSeconds: 30 }, requiresCredential: true }] })) });
  await page.getByRole('dialog').getByRole('button', { name: 'Import definitions' }).click();
  await expect(page.getByText('Imported or duplicated credentials are unresolved.', { exact: false })).toBeVisible();
  expect(rows).toHaveLength(5);
  expect(collectionRequests).toBe(0); expect(workspaceReads).toBe(0); expect(unexpected).toEqual([]);

  await page.getByRole('button', { name: 'Use light theme' }).click();
  await expect(page.getByRole('img', { name: 'NEXUS' })).toHaveAttribute('src', '/brand/nexus-wordmark-black.svg');
  await page.screenshot({ path: info.outputPath('nexus-light-desktop.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('nexus-light-narrow.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Refresh' }).focus();
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});

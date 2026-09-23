import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';
import { aircraftFixture } from '../fixtures/aircraft';
import { earthquakeFixture } from '../fixtures/earthquakes';

// Credential-free UI contract: no Keycloak, live provider or application database.
test.use({ storageState: { cookies: [], origins: [] } });

test('ATLAS groups, full-area list, independent map, source settings and saved pane state', async ({ page }, info) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(10000);
  const now = new Date().toISOString();
  const ownerId = 'fixture-owner'; const id = 'atlas-workspace';
  const initial = {
    id, ownerId, name: 'Composed layers', revision: 1, schemaVersion: 1, createdAt: now, updatedAt: now,
    linkGroups: [], appStates: { shell: { theme: 'dark', activePaneId: 'atlas-1' } },
    panes: [{ id: 'atlas-1', appId: 'atlas', stateSchemaVersion: 2,
      state: { schemaVersion: 2, viewMode: 'list', showMap: false, showList: true, mapListRatio: .55,
        timelineOpen: false, hiddenMapRecordIds: [] as string[], resultsOpen: false, sidebarOpen: true, inspectorOpen: false,
        sidebarWidth: 280, inspectorWidth: 360, sort: 'label', expandedDetails: false,
        camera: { longitude: 12, latitude: 58, height: 2400000 }, mapMode: '2d', basemapId: 'natural-earth',
        focusedLayerId: 'aircraft-1', selectedLayerId: null as string | null, resultScope: 'focused',
        layers: [
          { id: 'aircraft-1', domain: 'aircraft', connectionId: 'legacy-aircraft', datasetId: 'legacy-aircraft:positions',
            visible: true, participating: true, appearance: { opacity: 1, sizeScale: 1 },
            query: { longitude: 12, latitude: 58, radiusNm: 250 }, filters: { query: '', freshness: 'all' } },
          { id: 'earthquakes-1', domain: 'earthquakes', connectionId: 'legacy-earthquakes', datasetId: 'legacy-earthquakes:events',
            visible: false, participating: false, appearance: { opacity: 1, sizeScale: 1 },
            filters: { query: '', minimumMagnitude: null as number | null, maxAgeHours: null as number | null, sort: 'occurred' } },
        ] },
      context: { schemaVersion: 1, workspaceId: id, paneId: 'atlas-1', selection: { entityIds: [] as string[], observationIds: [] as string[] },
        area: null, time: { mode: 'live', cursor: null, from: null, to: null },
        layerIds: ['aircraft-1'], filters: {}, linkGroupId: null as string | null } }],
  };
  let saved = structuredClone(initial);
  let preference = { schemaVersion: 1, theme: 'dark', defaultRegion: 'northern-europe', timeZone: 'UTC', revision: 1, updatedAt: now };
  const connections = [
    { id: 'legacy-aircraft', name: 'Aircraft', connectorTypeId: 'adsb-lol', status: 'available', enabled: true, revision: 1,
      schemaVersion: 1, settings: { pollSeconds: 30 }, scope: 'global', datasets: [
        { id: 'legacy-aircraft:positions', connectionId: 'legacy-aircraft', domain: 'aircraft', availability: 'available',
          coverage: 'Fixture area', attribution: 'Synthetic aircraft fixture' }] },
    { id: 'legacy-earthquakes', name: 'Earthquakes', connectorTypeId: 'usgs-earthquakes', status: 'available', enabled: true, revision: 1,
      schemaVersion: 1, settings: { pollSeconds: 60 }, scope: 'global', datasets: [
        { id: 'legacy-earthquakes:events', connectionId: 'legacy-earthquakes', domain: 'earthquake', availability: 'available',
          coverage: 'Fixture feed', attribution: 'Synthetic earthquake fixture' }] },
    { id: 'backup-aircraft', name: 'Aircraft backup', connectorTypeId: 'adsb-lol', status: 'available', enabled: true, revision: 1,
      schemaVersion: 1, settings: { pollSeconds: 30 }, scope: 'global', datasets: [
        { id: 'backup-aircraft:positions', connectionId: 'backup-aircraft', domain: 'aircraft', availability: 'available',
          coverage: 'Fixture backup area', attribution: 'Synthetic backup fixture' }] },
  ];
  const unexpected: string[] = [];
  let aircraftStarts = 0; let earthquakeStarts = 0;
  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, json: body });
  await page.route('**/api/v1/**', route => {
    const request = route.request(); const path = new URL(request.url()).pathname; const method = request.method();
    if (path === '/api/v1/session') return json(route, 200, { schemaVersion: 1, authenticated: true,
      user: { id: ownerId, displayName: 'Fixture operator', canUseData: true },
      expiresAt: '2099-01-01T00:00:00Z', csrfToken: 'fixture-csrf', sessionKey: 'fixture-session' });
    if (path === '/api/v1/preferences') {
      if (method === 'GET') return json(route, 200, preference);
      const body = request.postDataJSON() as { theme: string; defaultRegion?: string; timeZone?: string };
      preference = { ...preference, ...body, revision: preference.revision + 1 };
      return json(route, 200, preference);
    }
    if (path === '/api/v1/workspaces' && method === 'GET')
      return json(route, 200, [{ id, name: saved.name, ownerId, revision: saved.revision, updatedAt: saved.updatedAt }]);
    if (path === '/api/v1/workspaces/' + id && method === 'GET') return json(route, 200, saved);
    if (path === '/api/v1/workspaces/' + id && method === 'PUT') {
      const body = request.postDataJSON() as typeof saved;
      if (body.revision !== saved.revision) return json(route, 409, { message: 'Workspace changed elsewhere.' });
      saved = { ...body, id, ownerId, revision: saved.revision + 1, updatedAt: now };
      return json(route, 200, saved);
    }
    if (path === '/api/v1/connections/connector-types') return json(route, 200, [
      { id: 'adsb-lol', name: 'Aircraft', version: 1, domain: 'aircraft', capabilities: ['live_subscription'], authenticationModes: ['none'] },
      { id: 'usgs-earthquakes', name: 'Earthquakes', version: 1, domain: 'earthquake', capabilities: ['live_subscription'], authenticationModes: ['none'] },
    ]);
    if (path === '/api/v1/connections/templates') return json(route, 200, []);
    if (path.endsWith('/settings-schema')) return route.fulfill({ status: 200, contentType: 'application/schema+json',
      body: JSON.stringify({ type: 'object', required: ['pollSeconds'], properties: { pollSeconds: { type: 'integer', readOnly: true, minimum: 1 } } }) });
    if (path.endsWith('/status')) return json(route, 200, { connectionId: path.split('/').at(-2), healthState: 'not_checked',
      healthMessage: 'No active demand.', activeOperations: 0, activeConsumers: 0, providerAvailable: true,
      cachedRetrievedAt: null, cachedRecords: 0, asOf: now });
    if (path.endsWith('/impact')) return json(route, 200, { connectionId: path.split('/').at(-2), revision: 1,
      workspaceIds: [id], effect: 'Editing ends demand.' });
    if (path === '/api/v1/connections' && method === 'GET') return json(route, 200, connections);
    unexpected.push(method + ' ' + path);
    return json(route, 503, { message: 'Missing fixture route.' });
  });
  await page.route('**/hubs/observations/negotiate**', route => json(route, 200, {
    connectionId: 'fixture', connectionToken: 'fixture', negotiateVersion: 1,
    availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
  }));
  await page.routeWebSocket('**/hubs/observations**', socket => socket.onMessage(message => {
    for (const part of message.toString().split('\x1e').filter(Boolean)) {
      const request = JSON.parse(part) as { protocol?: string; type?: number; target?: string; invocationId?: string };
      if (request.protocol) socket.send('{}\x1e');
      if (request.type !== 4 || !request.invocationId) continue;
      if (request.target === 'AircraftConnection') {
        aircraftStarts++; socket.send(JSON.stringify({ type: 2, invocationId: request.invocationId, item: aircraftFixture() }) + '\x1e');
      }
      if (request.target === 'EarthquakeConnection') {
        earthquakeStarts++;
        const batch = earthquakeFixture(); batch.upserts[0].observation.geometry = { type: 'Point', coordinates: [15, 60] };
        batch.health = { ...batch.health, state: 'rate_limited', message: 'Fixture HTTP 429. Retaining the last available observations.' };
        const unlocated = structuredClone(batch.upserts[0]);
        unlocated.entity.id += '-unlocated'; unlocated.entity.label = 'UNLOCATED EVENT';
        unlocated.observation.id += '-unlocated'; unlocated.observation.entityId = unlocated.entity.id;
        unlocated.observation.geometry = null; unlocated.observation.provenance.rawRef = unlocated.observation.id;
        unlocated.observation.provenance.sourceRecordId += '-unlocated';
        batch.upserts.push(unlocated); batch.completeness.returned = 2;
        socket.send(JSON.stringify({ type: 2, invocationId: request.invocationId, item: batch }) + '\x1e');
      }
    }
  }));
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());

  await page.goto('/');
  await page.getByRole('button', { name: 'Open Composed layers', exact: true }).click();
  const openGroupMenu = async (name: string) => {
    await page.getByRole('group', { name: `${name} group; open options with Shift+F10` }).click({ button: 'right' });
    return page.getByRole('menu', { name: `${name} group options` });
  };
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toContainText('TEST01');
  expect(aircraftStarts).toBe(1); expect(earthquakeStarts).toBe(0);
  await page.getByLabel('Aircraft legend, focus to show').hover();
  await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 1200 });
  await page.mouse.move(700, 400);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.getByLabel('Aircraft legend, focus to show').focus();
  await expect(page.getByRole('tooltip')).toContainText('Recent');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tab', { name: 'Tools' })).toHaveCount(0);
  await expect(page.getByLabel('Result scope')).toHaveCount(0);
  await expect(page.getByLabel('Table', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show Earthquakes' }).click();
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('TEST EPICENTRE');
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('UNLOCATED EVENT');
  expect(earthquakeStarts).toBe(1);
  await expect(page.getByRole('button', { name: 'Messages, unread' })).toBeVisible();
  await page.getByRole('button', { name: 'Messages, unread' }).click();
  await expect(page.getByText(/Fixture HTTP 429. Retaining the last available observations/)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Messages', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Focus/ })).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toContainText('TEST01');
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('TEST EPICENTRE');
  await page.getByRole('button', { name: 'Hide all Aircraft records on map' }).click();
  await expect(page.getByRole('button', { name: 'Show TEST01 on map' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Show TEST01 on map' }).click();
  await expect(page.getByRole('button', { name: 'Hide TEST01 on map' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('TEST EPICENTRE');
  await page.getByRole('button', { name: 'Hide TEST EPICENTRE on map' }).click();
  await expect(page.getByRole('button', { name: 'Show TEST EPICENTRE on map' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Show UNLOCATED EVENT on map' })).toBeDisabled();
  await page.getByRole('table', { name: 'Aircraft records' }).getByRole('button', { name: 'TEST01', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'TEST01', exact: true })).toBeVisible();
  await page.getByRole('table', { name: 'Earthquakes records' }).getByRole('button', { name: 'TEST EPICENTRE', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'TEST EPICENTRE', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hide Earthquakes' }).click();
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toContainText('TEST01');
  // Cross the channel's 200ms release grace: hidden active layers must retain their snapshot and stream.
  await page.waitForTimeout(350);
  await (await openGroupMenu('Earthquakes')).getByRole('menuitem', { name: 'Settings' }).click();
  await page.getByRole('dialog', { name: 'Group settings · Earthquakes' }).getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('button', { name: 'Show Earthquakes' })).toBeVisible();
  await page.getByRole('button', { name: 'Show Earthquakes' }).click();
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('TEST EPICENTRE', { timeout: 1000 });
  await expect(page.getByRole('heading', { name: 'TEST EPICENTRE', exact: true })).toBeVisible();
  expect(earthquakeStarts).toBe(1);
  const menu = await openGroupMenu('Earthquakes');
  expect(await menu.getByRole('menuitem').allTextContents()).toEqual(['Filters', 'Actions', 'Settings', 'Delete group']);
  await menu.getByRole('menuitem', { name: 'Filters' }).click();
  const editor = page.getByRole('dialog', { name: 'Filters · Earthquakes' });
  await expect(editor.getByRole('tab', { name: 'Filters' })).toHaveCount(0);
  await editor.getByLabel('Minimum magnitude').selectOption('5');
  await editor.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('TEST EPICENTRE');
  await (await openGroupMenu('Earthquakes')).getByRole('menuitem', { name: 'Filters' }).click();
  await editor.getByLabel('Minimum magnitude').selectOption('5');
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toHaveCount(0);
  await expect(page.getByText('No cached records match this group’s filters.')).toBeVisible();
  await (await openGroupMenu('Earthquakes')).getByRole('menuitem', { name: 'Filters' }).click();
  await editor.getByLabel('Minimum magnitude').selectOption('4');
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('TEST EPICENTRE');
  await (await openGroupMenu('Earthquakes')).getByRole('menuitem', { name: 'Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Group settings · Earthquakes' });
  await expect(settings.getByRole('tab', { name: 'Sources' })).toBeVisible();
  await expect(settings.getByRole('tab', { name: 'Appearance' })).toBeVisible();
  await expect(settings.getByRole('tab', { name: 'Filters' })).toHaveCount(0);
  await expect.poll(() => settings.evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThan(850);
  expect(await settings.getByRole('tablist').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('atlas-group-settings-dark.png'), animations: 'disabled' });
  await settings.getByRole('button', { name: 'Discard' }).click();
  await (await openGroupMenu('Earthquakes')).getByRole('menuitem', { name: 'Actions' }).click();
  const actions = page.getByRole('dialog', { name: 'Actions · Earthquakes' });
  await expect(actions.getByRole('button', { name: 'Draw earlier' })).toBeVisible();
  await actions.getByRole('button', { name: 'Discard' }).click();
  await page.getByRole('group', { name: 'Earthquakes group; open options with Shift+F10' }).focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menu', { name: 'Earthquakes group options' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Earthquakes group options' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Add group' }).click();
  const add = page.getByRole('dialog', { name: 'Add group' });
  await add.getByLabel('Group name').fill('Watch aircraft');
  await add.getByRole('checkbox').first().check();
  await add.getByRole('checkbox').last().check();
  await add.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('table', { name: 'Watch aircraft records' })).toContainText('TEST01');
  await expect(page.getByRole('table', { name: 'Watch aircraft records' }).locator('tbody tr')).toHaveCount(2);
  expect(aircraftStarts).toBe(2);
  await (await openGroupMenu('Watch aircraft')).getByRole('menuitem', { name: 'Delete group' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Delete group · Watch aircraft' });
  await expect(confirmation).toContainText('Stored observations and NEXUS connections remain.');
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('table', { name: 'Watch aircraft records' })).toBeVisible();
  await (await openGroupMenu('Watch aircraft')).getByRole('menuitem', { name: 'Delete group' }).click();
  await confirmation.getByRole('button', { name: 'Delete group' }).click();
  await expect(page.getByRole('table', { name: 'Watch aircraft records' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const map = page.getByRole('region', { name: 'ATLAS composed map' });
  await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toBeVisible();
  const canvas = map.locator('.cesium-widget canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.evaluate(element => element.setAttribute('data-fixture-viewer', 'stable'));
  await page.getByRole('button', { name: 'Hide Aircraft', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toHaveCount(0);
  await expect(map.locator('canvas[data-fixture-viewer="stable"]')).toHaveCount(1);
  await expect(map).toHaveAttribute('data-ready', 'true');
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Show Aircraft', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toContainText('TEST01', { timeout: 1000 });
  expect(aircraftStarts).toBe(2);
  await expect(map.locator('canvas[data-fixture-viewer="stable"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hide TEST01 on map' }).click();
  await expect(map.locator('canvas[data-fixture-viewer="stable"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show TEST01 on map' }).click();
  await expect(map.locator('canvas[data-fixture-viewer="stable"]')).toHaveCount(1);
  await expect(page.getByRole('separator', { name: 'Map and list split' })).toBeVisible();
  const split = page.getByRole('separator', { name: 'Map and list split' });
  const ratio = Number(await split.getAttribute('aria-valuenow'));
  await split.focus(); await page.keyboard.press('ArrowRight');
  await expect(split).toHaveAttribute('aria-valuenow', String(ratio + 5));
  await expect(page.getByRole('button', { name: '2D', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '3D', exact: true })).toBeVisible();
  const terrain = page.getByRole('button', { name: 'Terrain', exact: true });
  const terrainMenu = page.getByRole('menu', { name: 'Terrain options' });
  await expect(terrain).toBeVisible();
  await expect(terrainMenu).toHaveCount(0);
  await terrain.click();
  await expect(terrainMenu.getByRole('menuitemradio')).toHaveCount(2);
  await terrain.click();
  await expect(terrainMenu).toHaveCount(0);
  await terrain.click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(terrainMenu).toHaveCount(0);
  await page.getByRole('button', { name: 'Map tools' }).click();
  await expect(page.getByRole('button', { name: 'Search this area' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Search this area' })).toBeDisabled();
  await expect(page.getByText('Select an aircraft record to change its group’s queried area.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Find a place/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('table', { name: 'Aircraft records' }).getByRole('button', { name: 'TEST01', exact: true }).click();
  await page.getByRole('button', { name: 'Map tools' }).click();
  await expect(page.getByRole('button', { name: 'Search this area' })).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.getByRole('table', { name: 'Earthquakes records' }).getByRole('button', { name: 'TEST EPICENTRE', exact: true }).click();
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await expect(page.getByText(/No replay or recording is active/)).toBeVisible();
  await page.getByRole('button', { name: 'Collapse timeline' }).click();
  await expect(page.getByText(/No replay or recording is active/)).toHaveCount(0);
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('region', { name: 'ATLAS composed map' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toHaveCount(0);
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('region', { name: 'ATLAS composed map' })).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: info.outputPath('atlas-map-list-dark.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.screenshot({ path: info.outputPath('atlas-map-list-light.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Use dark theme' }).click();

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(saved.panes[0].state.layers).toHaveLength(2);
  expect(saved.panes[0].state.focusedLayerId).toBe('earthquakes-1');
  expect(saved.panes[0].state.hiddenMapRecordIds).toHaveLength(1);
  expect(saved.panes[0].state.hiddenMapGroupIds).toEqual(['aircraft-1']);
  expect(saved.panes[0].state.shownMapRecordIds).toHaveLength(1);
  expect(saved.panes[0].state.showMap).toBe(true);
  expect(saved.panes[0].state.showList).toBe(true);
  expect(JSON.stringify(saved)).not.toContain('TEST EPICENTRE');
  await page.reload();
  await page.getByRole('button', { name: 'Open Composed layers', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('TEST EPICENTRE');
  await expect(page.getByRole('button', { name: 'Show TEST EPICENTRE on map' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'ATLAS composed map' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide Vehicles & satellites' }).click();
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toBeVisible();
  await page.getByRole('button', { name: 'Show Vehicles & satellites' }).click();
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toBeVisible();
  await page.getByRole('tab', { name: 'Sources' }).click();
  await expect(page.getByText('not checked', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add as layer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Configure Earthquakes in NEXUS' })).toHaveCount(0);
  await page.getByRole('group', { name: 'Earthquakes source; open options with Shift+F10' }).click({ button: 'right' });
  const sourceMenu = page.getByRole('menu', { name: 'Earthquakes source options' });
  await expect(sourceMenu.getByRole('menuitem')).toHaveText('Configure in NEXUS');
  await expect(page.getByRole('region', { name: 'ATLAS composed map' })).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: info.outputPath('atlas-sources-dark.png'), animations: 'disabled' });
  await sourceMenu.getByRole('menuitem', { name: 'Configure in NEXUS' }).click();
  await expect(page.getByRole('heading', { name: 'NEXUS', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Earthquakes', exact: true })).toBeVisible();
  expect(unexpected).toEqual([]);
});

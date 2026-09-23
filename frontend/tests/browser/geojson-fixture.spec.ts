import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';
import { aircraftFixture } from '../fixtures/aircraft';
import { earthquakeFixture } from '../fixtures/earthquakes';
import { geoJsonFixture, geoJsonRecord } from '../fixtures/geojson';

test.use({ storageState: { cookies: [], origins: [] } });

test('NEXUS-configured GeoJSON joins composed ATLAS with shared demand, List, map and both themes', async ({ page }, info) => {
  test.setTimeout(120000); page.setDefaultTimeout(10000);
  const now = new Date().toISOString(); const workspaceId = 'geo-workspace';
  let preference = { schemaVersion: 1, theme: 'dark', defaultRegion: 'northern-europe', timeZone: 'UTC', revision: 1, updatedAt: now };
  let saved = { id: workspaceId, ownerId: 'fixture-owner', name: 'GeoJSON review', revision: 1, schemaVersion: 1,
    createdAt: now, updatedAt: now, linkGroups: [], appStates: { shell: { theme: 'dark', activePaneId: 'atlas-1' } },
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
            visible: true, participating: true, appearance: { opacity: 1, sizeScale: 1 },
            filters: { query: '', minimumMagnitude: null as number | null, maxAgeHours: null as number | null, sort: 'occurred' } },
        ] },
      context: { schemaVersion: 1, workspaceId, paneId: 'atlas-1', selection: { entityIds: [] as string[], observationIds: [] as string[] },
        area: null, time: { mode: 'live', cursor: null, from: null, to: null }, layerIds: ['aircraft-1', 'earthquakes-1'],
        filters: {}, linkGroupId: null as string | null } }],
  };
  const type = { id: 'http-geojson', version: 1, name: 'HTTP GeoJSON FeatureCollection', domain: 'geojson',
    capabilities: ['current_catalog', 'live_subscription', 'local_cache', 'point_line_polygon'], authenticationModes: ['none', 'bearer'],
    settingsSchemaUrl: '/api/v1/connections/connector-types/http-geojson/settings-schema', coverage: 'Declared fixture scope',
    attribution: 'Fixture publisher', pollSeconds: 120, resultLimit: 500, sourceId: 'configured-geojson' };
  const settings = { endpoint: 'https://one.example.org/current.geojson', sourceId: 'fixture.one', sourceName: 'Fixture one',
    attribution: 'Original synthetic fixture', termsUrl: 'https://one.example.org/terms', coverage: 'Synthetic fixture area',
    identityProperty: '', labelProperty: 'name', sourceTimeProperty: '', validFromProperty: '', validToProperty: '',
    authentication: 'none', pollSeconds: 120 };
  const template = { id: 'http-geojson-default', version: 1, connectorTypeId: type.id, name: type.name,
    schemaVersion: 1, settings };
  const schema = { title: 'HTTP GeoJSON FeatureCollection settings v1', type: 'object', required: Object.keys(settings),
    properties: Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, { type: typeof value === 'number' ? 'integer' : 'string',
      title: ({ endpoint: 'HTTPS FeatureCollection URL', sourceId: 'Stable source ID', sourceName: 'Source name',
        attribution: 'Attribution', termsUrl: 'Source terms URL', coverage: 'Declared coverage', identityProperty: 'Identity property',
        labelProperty: 'Label property', sourceTimeProperty: 'Source time property', validFromProperty: 'Valid from property',
        validToProperty: 'Valid to property', authentication: 'Backend authentication', pollSeconds: 'Polling cadence' } as Record<string, string>)[key],
      ...(key === 'authentication' ? { enum: ['none', 'bearer'] } : {}), ...(key === 'pollSeconds' ? { readOnly: true } : {}) }])),
  };
  const existing = (id: string, name: string, domain: string, productId: string, sourceId: string, cadence: number) => ({
    id, name, connectorTypeId: domain === 'aircraft' ? 'adsb-lol' : 'usgs-earthquakes', schemaVersion: 1, revision: 1,
    enabled: true, scope: 'global', workspaceId: null, settings: { pollSeconds: cadence }, status: 'available',
    hasCredential: false, createdAt: now, updatedAt: now, removedAt: null,
    datasets: [{ id: `${id}:${productId}`, connectionId: id, productId, sourceId, domain, availability: 'available',
      coverage: 'Synthetic fixtures', attribution: 'Original synthetic fixture', capabilities: ['live_subscription'],
      allowedOperations: ['subscribe'], pollSeconds: cadence, staleAfterSeconds: cadence * 3 }] });
  const connections: Record<string, unknown>[] = [existing('legacy-aircraft', 'Aircraft', 'aircraft', 'positions', 'adsb-lol', 30),
    existing('legacy-earthquakes', 'Earthquakes', 'earthquake', 'events', 'usgs-earthquakes', 60)];
  let previews = 0; const starts = { 'fixture.one': 0, 'fixture.two': 0 }; const unexpected: string[] = [];
  let completeFirstFeed: (() => void) | undefined;
  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, json: body });
  await page.route('**/api/v1/**', route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname; const method = request.method();
    if (path === '/api/v1/session') return json(route, 200, { schemaVersion: 1, authenticated: true,
      user: { id: 'fixture-owner', displayName: 'Fixture operator', canUseData: true },
      expiresAt: '2099-01-01T00:00:00Z', csrfToken: 'fixture-csrf', sessionKey: 'fixture-session' });
    if (path === '/api/v1/preferences') {
      if (method === 'GET') return json(route, 200, preference);
      preference = { ...preference, ...request.postDataJSON(), revision: preference.revision + 1 }; return json(route, 200, preference);
    }
    if (path === '/api/v1/workspaces' && method === 'GET') return json(route, 200, [
      { id: workspaceId, name: saved.name, ownerId: saved.ownerId, revision: saved.revision, updatedAt: saved.updatedAt }]);
    if (path === `/api/v1/workspaces/${workspaceId}` && method === 'GET') return json(route, 200, saved);
    if (path === `/api/v1/workspaces/${workspaceId}` && method === 'PUT') {
      saved = { ...request.postDataJSON(), id: workspaceId, ownerId: saved.ownerId, revision: saved.revision + 1, updatedAt: now };
      return json(route, 200, saved);
    }
    if (path === '/api/v1/connections/connector-types') return json(route, 200, [type]);
    if (path === '/api/v1/connections/templates') return json(route, 200, [template]);
    if (path.endsWith('/settings-schema')) return route.fulfill({ status: 200, contentType: 'application/schema+json', body: JSON.stringify(schema) });
    if (path === '/api/v1/connections' && method === 'GET') return json(route, 200, connections);
    if (path === '/api/v1/connections' && method === 'POST') {
      const body = request.postDataJSON(); const id = `geo-${connections.length - 1}`;
      const created = { ...body, id, revision: 1, status: 'available', hasCredential: false, createdAt: now, updatedAt: now,
        removedAt: null, datasets: [{ id: `${id}:features`, connectionId: id, productId: 'features', sourceId: body.settings.sourceId,
          domain: 'geojson', availability: 'available', coverage: body.settings.coverage, attribution: body.settings.attribution,
          capabilities: type.capabilities, allowedOperations: ['catalog', 'subscribe', 'local_cache'], pollSeconds: 120, staleAfterSeconds: 360 }] };
      connections.push(created); return json(route, 201, created);
    }
    if (path === '/api/v1/connections/preview' && method === 'POST') {
      previews++; const draft = request.postDataJSON(); return json(route, 200, { valid: true, state: 'healthy', message: 'Complete fixture FeatureCollection parsed.',
        problems: [], previewCount: 4, testedAt: now, previewRows: [{ id: 'TEST POINT', label: 'TEST POINT', sourceTime: null,
          retrievedAt: now, longitude: 12, latitude: 58, geometryType: 'Point' }, { id: 'TEST UNKNOWN', label: 'TEST UNKNOWN',
          sourceTime: null, retrievedAt: now, longitude: null, latitude: null, geometryType: 'None (List only)' }],
        sourceId: draft.settings.sourceId });
    }
    if (path.endsWith('/status')) return json(route, 200, { connectionId: path.split('/').at(-2), healthState: 'not_checked',
      healthMessage: 'No active demand.', activeOperations: 0, activeConsumers: 0, providerAvailable: true,
      cachedRetrievedAt: null, cachedRecords: 0, asOf: now });
    if (path.endsWith('/impact')) return json(route, 200, { connectionId: path.split('/').at(-2), revision: 1,
      workspaceIds: [workspaceId], effect: 'Editing ends current demand.' });
    unexpected.push(`${method} ${path}`); return json(route, 503, { message: 'Missing fixture route.' });
  });
  await page.route('**/hubs/observations/negotiate**', route => json(route, 200, {
    connectionId: 'fixture', connectionToken: 'fixture', negotiateVersion: 1,
    availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text', 'Binary'] }],
  }));
  await page.routeWebSocket('**/hubs/observations**', socket => socket.onMessage(message => {
    for (const part of message.toString().split('\x1e').filter(Boolean)) {
      const request = JSON.parse(part) as { protocol?: string; type?: number; target?: string; invocationId?: string; arguments?: string[] };
      if (request.protocol) socket.send('{}\x1e');
      if (request.type !== 4 || !request.invocationId) continue;
      if (request.target === 'AircraftConnection') socket.send(JSON.stringify({ type: 2, invocationId: request.invocationId, item: aircraftFixture() }) + '\x1e');
      if (request.target === 'EarthquakeConnection') socket.send(JSON.stringify({ type: 2, invocationId: request.invocationId, item: earthquakeFixture() }) + '\x1e');
      if (request.target === 'GeoJsonConnection') {
        const sourceId = request.arguments?.[0] === 'geo-1' ? 'fixture.one' : 'fixture.two'; starts[sourceId as keyof typeof starts]++;
        if (sourceId === 'fixture.one') completeFirstFeed = () =>
          socket.send(JSON.stringify({ type: 3, invocationId: request.invocationId }) + '\x1e');
        const records = sourceId === 'fixture.one' ? [
          geoJsonRecord('TEST POINT', { type: 'Point', coordinates: [12, 58] }, sourceId),
          geoJsonRecord('TEST LINE', { type: 'LineString', coordinates: [[12, 58], [13, 59]] }, sourceId),
          geoJsonRecord('TEST AREA', { type: 'Polygon', coordinates: [[[12, 58], [13, 58], [13, 59], [12, 58]]] }, sourceId),
          geoJsonRecord('TEST UNKNOWN', null, sourceId),
        ] : [geoJsonRecord('SECOND FEED', { type: 'MultiPoint', coordinates: [[14, 58], [15, 59]] }, sourceId)];
        socket.send(JSON.stringify({ type: 2, invocationId: request.invocationId, item: geoJsonFixture(records, sourceId) }) + '\x1e');
      }
    }
  }));
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.goto('/');
  await page.getByRole('region', { name: 'System' }).getByRole('button', { name: 'Open NEXUS — Data Manager' }).click();
  expect(await page.getByRole('button', { name: '', exact: true }).count()).toBe(0);
  await page.getByRole('button', { name: /HTTP GeoJSON FeatureCollection · v1/ }).first().click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Operator feed one');
  await page.getByRole('button', { name: 'Test / preview' }).click();
  await expect(page.getByRole('heading', { name: 'Explicit test / preview' })).toBeVisible();
  await expect(page.getByText('None (List only)')).toBeVisible();
  expect(previews).toBe(1); expect(starts['fixture.one']).toBe(0);
  await page.getByRole('button', { name: 'Save connection' }).click();
  await expect(page.getByText('Saved revision 1')).toBeVisible();
  await page.getByRole('button', { name: /HTTP GeoJSON FeatureCollection · v1/ }).first().click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Operator feed two');
  await page.getByRole('textbox', { name: 'HTTPS FeatureCollection URL' }).fill('https://two.example.org/current.geojson');
  await page.getByRole('textbox', { name: 'Stable source ID' }).fill('fixture.two');
  await page.getByRole('textbox', { name: 'Source terms URL' }).fill('https://two.example.org/terms');
  await page.getByRole('button', { name: 'Test / preview' }).click();
  await page.getByRole('button', { name: 'Save connection' }).click();
  await expect(page.getByText('Saved revision 1')).toBeVisible();
  expect(connections).toHaveLength(4); expect(starts['fixture.two']).toBe(0);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Open GeoJSON review', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Aircraft records' })).toContainText('TEST01');
  await expect(page.getByRole('table', { name: 'Earthquakes records' })).toContainText('TEST EPICENTRE');
  await page.getByRole('button', { name: 'Add group' }).click();
  const editor = page.getByRole('dialog', { name: 'Add group' });
  await editor.getByLabel('Group name').fill('Operator features');
  await editor.getByLabel('Type').selectOption('geojson');
  await editor.getByRole('checkbox', { name: /Operator feed one/ }).check();
  await editor.getByRole('checkbox', { name: /Operator feed two/ }).check();
  await editor.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('table', { name: 'Operator features records' })).toContainText('TEST POINT');
  await expect(page.getByRole('table', { name: 'Operator features records' })).toContainText('SECOND FEED');
  await expect(page.getByRole('button', { name: 'Show TEST UNKNOWN on map' })).toBeDisabled();
  expect(await page.getByRole('button', { name: '', exact: true }).count()).toBe(0);
  expect(await page.locator('img:not([alt])').count()).toBe(0);
  expect(starts).toEqual({ 'fixture.one': 1, 'fixture.two': 1 });
  await page.getByRole('table', { name: 'Operator features records' }).getByRole('button', { name: 'TEST UNKNOWN', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'TEST UNKNOWN' })).toBeVisible();
  await expect(page.getByText('Unknown · off map')).toBeVisible();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  const map = page.getByRole('region', { name: 'ATLAS composed map' });
  await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  const canvas = map.locator('.cesium-widget canvas').first(); await canvas.evaluate(element => element.setAttribute('data-geo-viewer', 'stable'));
  await page.getByRole('button', { name: 'Hide Feeds & reports' }).click();
  await expect(page.getByRole('table', { name: 'Operator features records' })).toHaveCount(0);
  await expect(map.locator('canvas[data-geo-viewer="stable"]')).toHaveCount(1);
  const reshowStarted = Date.now();
  await page.getByRole('button', { name: 'Show Feeds & reports' }).click();
  await expect(page.getByRole('table', { name: 'Operator features records' })).toContainText('TEST POINT', { timeout: 1000 });
  console.log(`Fixture GeoJSON category re-show: ${Date.now() - reshowStarted} ms including browser automation`);
  expect(starts).toEqual({ 'fixture.one': 1, 'fixture.two': 1 });
  await page.getByRole('group', { name: 'Operator features group; open options with Shift+F10' }).focus();
  await page.keyboard.press('Shift+F10');
  await page.getByRole('menu', { name: 'Operator features group options' }).getByRole('menuitem', { name: 'Actions' }).click();
  await page.getByRole('dialog', { name: 'Actions · Operator features' }).getByRole('button', { name: 'Copy group' }).click();
  await page.getByRole('button', { name: 'Save copy' }).click();
  await expect(page.getByRole('table', { name: 'Operator features copy records' })).toContainText('TEST LINE');
  expect(starts).toEqual({ 'fixture.one': 1, 'fixture.two': 1 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: info.outputPath('geojson-atlas-dark.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await page.screenshot({ path: info.outputPath('geojson-atlas-light.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Open GeoJSON review', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Operator features copy records' })).toContainText('TEST LINE');
  await expect(map).toHaveAttribute('data-ready', 'true');
  expect(completeFirstFeed).toBeDefined();
  completeFirstFeed!();
  await expect(page.getByRole('button', { name: 'Messages, unread' })).toBeVisible();
  await page.getByRole('button', { name: 'Messages, unread' }).click();
  await expect(page.getByText('GeoJSON · The observation subscription ended. Check the connection in NEXUS; retrying.')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Operator features records' })).toContainText('TEST POINT');
  expect(unexpected).toEqual([]);
});

import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import type { WebSocketRoute } from '@playwright/test';
import type { EarthquakeBatch } from '../../src/platform/data/EarthquakeChannel';
import { earthquakeFixture } from '../fixtures/earthquakes';
import { aircraftFixture } from '../fixtures/aircraft';
const tile = readFileSync('node_modules/cesium/Build/Cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg');

test('earthquake surface picking, shared grid/list/inspector, revisions and explicit Save restoration', async ({ page, request }, info) => {
  test.setTimeout(120000); // Two software-WebGL modes and selected screenshots.
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/jpeg', body: tile }));
  let batch = earthquakeFixture(); let quakeSocket: WebSocketRoute; let invocation = ''; let subscriptions = 0;
  const send = (value: EarthquakeBatch) => quakeSocket.send(JSON.stringify({ type: 2, invocationId: invocation, item: value }) + '\x1e');
  await page.route('**/api/v1/earthquakes/entities/*/observations?*', route => route.fulfill({ json: batch.upserts }));
  await page.routeWebSocket('**/hubs/observations*', socket => socket.onMessage(message => {
    for (const part of message.toString().split('\x1e').filter(Boolean)) {
      const data = JSON.parse(part);
      if (data.protocol) socket.send('{}\x1e');
      if (data.type === 4 && data.target === 'Earthquakes') { quakeSocket = socket; invocation = data.invocationId; subscriptions++; send(batch); }
      if (data.type === 4 && data.target === 'Aircraft') socket.send(JSON.stringify({ type: 2, invocationId: data.invocationId, item: aircraftFixture() }) + '\x1e');
    }
  }));
  const workspace = await (await request.post('/api/v1/workspaces', { data: { name: 'Earthquake browser verification' } })).json();
  workspace.panes[0].state.liveView = 'earthquakes'; workspace.panes[0].state.basemapId = 'natural-earth';
  expect((await request.put(`/api/v1/workspaces/${workspace.id}`, { data: workspace })).status()).toBe(200);
  await page.addInitScript(id => { if (location.protocol.startsWith('http')) localStorage.setItem('vantage.workspace', id); }, workspace.id);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const external: string[] = []; page.on('request', r => { if (r.url().startsWith('https://')) external.push(r.url()); });
  try {
    await page.goto('/');
    const map = page.getByRole('region', { name: 'Earthquake map' });
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await expect(page.getByLabel('Magnitude legend')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'healthy · Past day' })).toBeVisible();
    const canvas = map.locator('canvas').first(); const bounds = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
    const inspector = page.getByRole('complementary', { name: 'Record inspector' });
    await expect(inspector.getByRole('heading', { name: 'TEST EPICENTRE', exact: true })).toBeVisible();
    await expect(inspector).toContainText('123.4 km');
    await page.getByRole('button', { name: 'Supporting details' }).click();
    await expect(inspector).toContainText('fixture-event/v1');
    await expect(inspector).toContainText('obs:quake-0');
    await page.getByRole('button', { name: /^Earthquakes 1 .*mappable/ }).click();
    const grid = page.getByLabel('Virtualised earthquake results'); await expect(grid).toContainText('Magnitude');
    await page.screenshot({ path: info.outputPath('earthquake-selection-dark.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'List', exact: true }).click();
    const table = page.getByRole('table', { name: 'Earthquake results' });
    for (const label of ['Magnitude type', 'Depth · km', 'Occurred · UTC', 'Source updated · UTC', 'Version retrieved · UTC', 'Provenance · source / event ID'])
      await expect(table.getByRole('columnheader', { name: label, exact: true })).toBeVisible();
    await table.getByRole('button', { name: 'TEST EPICENTRE', exact: true }).click();
    await page.getByLabel('Minimum magnitude').selectOption('4');
    await page.getByLabel('Sort events').selectOption('magnitude');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
    batch = earthquakeFixture(1, false, 5.2); batch.upserts[0].observation.properties.sourceUpdatedAt = new Date(Date.now() + 1000).toISOString();
    send(batch); await expect(table).toContainText('5.2'); await expect(inspector).toContainText('Revised since selection');
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
    const late = earthquakeFixture(2, false, 2.8); late.upserts[0].observation.properties.sourceUpdatedAt = new Date(Date.now() - 60000).toISOString();
    send(late); await expect(table).toContainText('5.2');
    const previous = subscriptions; batch = { ...batch, sequence: 4, reset: true }; send({ ...batch, reset: false });
    await expect.poll(() => subscriptions).toBeGreaterThan(previous);
    await page.getByRole('button', { name: 'Zoom to event' }).click();
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await page.getByRole('button', { name: 'Use light theme' }).click();
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await page.screenshot({ path: info.outputPath('earthquake-globe-light.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'List', exact: true }).click();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
    const saved = await (await request.get(`/api/v1/workspaces/${workspace.id}`)).json();
    expect(saved.panes[0].state.earthquakeCamera).toEqual({ longitude: 12, latitude: 58, height: 750000 });
    expect(saved.panes[0].context.selection.observationIds).toEqual(['obs:quake-0']);
    await page.reload(); await expect(table).toContainText('5.2'); await expect(inspector).toContainText('TEST EPICENTRE');
    await expect(page.getByLabel('Minimum magnitude')).toHaveValue('4'); await expect(page.getByLabel('Sort events')).toHaveValue('magnitude');
    await page.getByRole('button', { name: 'Aircraft', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Aircraft results' })).toContainText('TEST01');
    await page.getByRole('button', { name: 'Earthquakes', exact: true }).click();
    await expect(inspector).toContainText('TEST EPICENTRE'); await expect(page.getByLabel('Minimum magnitude')).toHaveValue('4');
    expect(errors).toEqual([]); expect(external.every(url => url.startsWith('https://tile.openstreetmap.org/'))).toBe(true);
  } finally {
    await page.goto('about:blank').catch(() => {});
    const saved = await (await request.get(`/api/v1/workspaces/${workspace.id}`)).json();
    await request.delete(`/api/v1/workspaces/${workspace.id}?revision=${saved.revision}`);
  }
});

test('earthquake loading, partial, stale, unavailable and empty feed states remain distinct', async ({ page, request }) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/jpeg', body: tile }));
  const workspace = await (await request.post('/api/v1/workspaces', { data: { name: 'Earthquake states verification' } })).json();
  workspace.panes[0].state.liveView = 'earthquakes'; workspace.panes[0].state.viewMode = 'list';
  expect((await request.put(`/api/v1/workspaces/${workspace.id}`, { data: workspace })).status()).toBe(200);
  await page.addInitScript(id => { if (location.protocol.startsWith('http')) localStorage.setItem('vantage.workspace', id); }, workspace.id);
  let socket: WebSocketRoute; let invocation = '';
  const initial = earthquakeFixture(); initial.upserts = []; initial.health.state = 'loading'; initial.completeness.feedGeneratedAt = null; initial.completeness.feedRetrievedAt = null;
  const send = (value: EarthquakeBatch) => socket.send(JSON.stringify({ type: 2, invocationId: invocation, item: value }) + '\x1e');
  await page.routeWebSocket('**/hubs/observations*', ws => { socket = ws; ws.onMessage(message => {
    for (const part of message.toString().split('\x1e').filter(Boolean)) {
      const parsed = JSON.parse(part); if (parsed.protocol) ws.send('{}\x1e');
      if (parsed.type === 4 && parsed.target === 'Earthquakes') { invocation = parsed.invocationId; send(initial); }
    }
  }); });
  try {
    await page.goto('/'); await expect(page.getByRole('status').filter({ hasText: 'Waiting for the first earthquake snapshot' })).toBeVisible();
    await expect.poll(() => invocation).not.toBe('');
    const partial = earthquakeFixture(1, false); partial.health.state = 'degraded'; partial.completeness.rejectedCount = 1;
    send(partial); await expect(page.getByRole('status').filter({ hasText: 'partial · Past day' })).toBeVisible();
    const stale = earthquakeFixture(2, false); stale.completeness.feedGeneratedAt = new Date(Date.now() - 600000).toISOString();
    send(stale); await expect(page.getByRole('status').filter({ hasText: 'Feed generation is overdue' })).toBeVisible();
    const unavailable = earthquakeFixture(3, false); unavailable.upserts = []; unavailable.health.state = 'offline'; unavailable.health.message = 'Source unavailable. Keeping the last successful snapshot.';
    send(unavailable); await expect(page.getByRole('status').filter({ hasText: 'Source unavailable' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Earthquake results' })).toContainText('TEST EPICENTRE');
    const empty = earthquakeFixture(4, false); empty.upserts = []; empty.removals = ['quake-fixture:event1']; empty.completeness.returned = 0; empty.completeness.providerCount = 0;
    send(empty); await expect(page.getByRole('status').filter({ hasText: 'No events were returned' })).toBeVisible();
  } finally {
    await page.goto('about:blank').catch(() => {});
    const saved = await (await request.get(`/api/v1/workspaces/${workspace.id}`)).json();
    await request.delete(`/api/v1/workspaces/${workspace.id}?revision=${saved.revision}`);
  }
});

test('globe hides far-side markers and badges while map results remain available', async ({ page, request }, info) => {
  test.setTimeout(120000);
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/jpeg', body: tile }));
  const batch = earthquakeFixture(); batch.upserts[0].observation.properties.depthKilometres = null;
  await page.routeWebSocket('**/hubs/observations*', ws => ws.onMessage(message => {
    for (const part of message.toString().split('\x1e').filter(Boolean)) {
      const value = JSON.parse(part); if (value.protocol) ws.send('{}\x1e');
      if (value.type === 4) ws.send(JSON.stringify({ type: 2, invocationId: value.invocationId, item: batch }) + '\x1e');
    }
  }));
  const workspace = await (await request.post('/api/v1/workspaces', { data: { name: 'Globe occlusion verification' } })).json();
  Object.assign(workspace.panes[0].state, { liveView: 'earthquakes', mapMode: '3d', basemapId: 'natural-earth',
    earthquakeCamera: { longitude: -168, latitude: -58, height: 2400000 }, resultsOpen: false });
  await request.put(`/api/v1/workspaces/${workspace.id}`, { data: workspace });
  await page.addInitScript(id => { if (location.protocol.startsWith('http')) localStorage.setItem('vantage.workspace', id); }, workspace.id);
  try {
    await page.goto('/'); const map = page.getByRole('region', { name: 'Earthquake map' });
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    const canvas = map.locator('canvas').first(); const bounds = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
    await expect(page.getByRole('complementary', { name: 'Record inspector' })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('far-side-hidden.png'), animations: 'disabled' });
    const drawer = page.getByRole('button', { name: /^Earthquakes 1 .*mappable/ });
    await expect(drawer).toHaveAttribute('aria-expanded', 'false'); await drawer.click();
    await expect(drawer).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: 'TEST EPICENTRE', exact: true }).click();
    await page.getByRole('button', { name: 'Zoom to event' }).click();
    await page.getByRole('button', { name: 'Close inspector' }).click(); await drawer.click();
    const near = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: near.width / 2, y: near.height / 2 } });
    await expect(page.getByRole('heading', { name: 'TEST EPICENTRE', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('near-side-selected-badge.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'List', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Map projection' })).toHaveCount(0);
    await expect(page.getByRole('table', { name: 'Earthquake results' })).toContainText('TEST EPICENTRE');
  } finally {
    await page.goto('about:blank').catch(() => {});
    const saved = await (await request.get(`/api/v1/workspaces/${workspace.id}`)).json();
    await request.delete(`/api/v1/workspaces/${workspace.id}?revision=${saved.revision}`);
  }
});

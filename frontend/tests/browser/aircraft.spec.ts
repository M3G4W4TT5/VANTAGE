import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import type { WebSocketRoute } from '@playwright/test';
import type { AircraftBatch } from '../../src/platform/data/AircraftChannel';
import { aircraftFixture } from '../fixtures/aircraft';
// Reuse one bundled 256px tile to exercise the tile pipeline without hitting a public server.
const tileFixture = readFileSync('node_modules/cesium/Build/Cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg');

test('aircraft map, list, evidence, manual save and snapshot recovery', async ({ page, request }, info) => {
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/jpeg', body: tileFixture }));
  const response = await request.post('/api/v1/workspaces', { data: { name: 'Aircraft browser verification' } });
  expect(response.status()).toBe(201); const workspace = await response.json();
  workspace.panes[0].state.basemapId = 'natural-earth';
  expect((await request.put(`/api/v1/workspaces/${workspace.id}`, { data: workspace })).status()).toBe(200);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const external: string[] = []; page.on('request', r => { if (!r.url().startsWith('data:') && !r.url().startsWith(new URL(info.project.use.baseURL!).origin)) external.push(r.url()); });
  let socket: WebSocketRoute; let invocation = ''; let subscriptions = 0; let reset = aircraftFixture();
  const send = (batch: AircraftBatch) => socket.send(JSON.stringify({ type: 2, invocationId: invocation, item: batch }) + '\x1e');
  await page.routeWebSocket('**/hubs/observations*', ws => {
    socket = ws;
    ws.onMessage(message => {
      for (const part of message.toString().split('\x1e').filter(Boolean)) {
        const parsed = JSON.parse(part);
        if (parsed.protocol) ws.send('{}\x1e');
        if (parsed.type === 4) { invocation = parsed.invocationId; subscriptions++; send(reset); }
      }
    });
  });
  await page.addInitScript(id => { if (location.protocol.startsWith('http')) localStorage.setItem('vantage.workspace', id); }, workspace.id);
  try {
    await page.goto('/');
    const map = page.getByRole('region', { name: 'Aircraft map' });
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
    await page.screenshot({ path: info.outputPath('aircraft-map-dark.png'), animations: 'disabled' });
    // The known fixture is at the initial camera centre; this exercises actual Cesium picking.
    const canvas = map.locator('canvas').first(); const box = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
    await expect(page.getByRole('heading', { name: 'TEST01', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Supporting details' }).click();
    await expect(page.getByRole('complementary', { name: 'Record inspector' })).toContainText('fixture-provider-address/v1');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
    send(aircraftFixture(1, false, 110));
    await expect(page.getByRole('complementary', { name: 'Record inspector' })).toContainText('110.0 m/s');
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
    reset = aircraftFixture(3, true, 120); const before = subscriptions;
    send(aircraftFixture(3, false, 120));
    await expect.poll(() => subscriptions).toBeGreaterThan(before);
    await expect(page.getByRole('complementary', { name: 'Record inspector' })).toContainText('120.0 m/s');
    await page.getByRole('button', { name: 'Use light theme' }).click();
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await page.screenshot({ path: info.outputPath('aircraft-globe-light.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'List', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Aircraft results' })).toContainText('TEST01');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'TEST01', exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Aircraft results' })).toBeVisible();
    expect(errors).toEqual([]); expect(external.every(url => url.startsWith('https://tile.openstreetmap.org/'))).toBe(true);
  } finally {
    if (!page.isClosed()) await page.goto('about:blank').catch(() => {});
    const saved = await (await request.get(`/api/v1/workspaces/${workspace.id}`)).json();
    await request.delete(`/api/v1/workspaces/${workspace.id}?revision=${saved.revision}`);
  }
});


test('offline place search, detailed basemap fallback and saved camera', async ({ page, request }, info) => {
  test.setTimeout(90000); // Several full globe rebuilds using the container's software renderer.
  let unavailable = false;
  await page.route('https://tile.openstreetmap.org/**', route => unavailable ? route.abort() : route.fulfill({
    contentType: 'image/jpeg', body: tileFixture,
  }));
  await page.routeWebSocket('**/hubs/observations*', ws => ws.onMessage(message => {
    for (const part of message.toString().split('\x1e').filter(Boolean)) {
      const parsed = JSON.parse(part);
      if (parsed.protocol) ws.send('{}\x1e');
      if (parsed.type === 4) ws.send(JSON.stringify({ type: 2, invocationId: parsed.invocationId, item: aircraftFixture() }) + '\x1e');
    }
  }));
  const response = await request.post('/api/v1/workspaces', { data: { name: 'Place and basemap verification' } });
  expect(response.status()).toBe(201); const workspace = await response.json();
  await page.addInitScript(id => { if (location.protocol.startsWith('http')) localStorage.setItem('vantage.workspace', id); }, workspace.id);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('/');
    const map = page.getByRole('region', { name: 'Aircraft map' });
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await page.getByLabel('Find a place').fill('Copenhagen');
    await page.getByRole('button', { name: 'København Denmark · approximate' }).click();
    await expect(page.getByRole('region', { name: 'Place search' })).toContainText('Centred on København');
    await expect(page.getByRole('complementary', { name: 'Filters' })).toContainText('Query centre 58.00° N, 12.00° E');
    await page.getByLabel('Basemap', { exact: true }).selectOption('natural-earth');
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
    const saved = await (await request.get(`/api/v1/workspaces/${workspace.id}`)).json();
    expect(saved.panes[0].state.camera.longitude).toBeCloseTo(12.56154, 3);
    expect(saved.panes[0].state.camera.latitude).toBeCloseTo(55.68051, 3);
    expect(saved.panes[0].state.aircraftQuery.longitude).toBe(12);
    await page.reload();
    await expect(page.getByLabel('Basemap', { exact: true })).toHaveValue('natural-earth');
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    unavailable = true;
    await page.getByLabel('Basemap', { exact: true }).selectOption('openstreetmap');
    await expect(page.getByRole('status').filter({ hasText: 'Detailed tiles are unavailable' })).toBeVisible();
    await expect(map).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    // With external tiles failing, the bundled index still resolves an accent-folded name.
    await page.getByLabel('Find a place').fill('Goteborg');
    await expect(page.getByRole('button', { name: /Göteborg Sweden/ })).toBeVisible();
    await page.screenshot({ path: info.outputPath('offline-places-dark.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Use light theme' }).click();
    await page.screenshot({ path: info.outputPath('offline-places-light.png'), animations: 'disabled' });
    expect(errors).toEqual([]);
  } finally {
    if (!page.isClosed()) await page.goto('about:blank').catch(() => {});
    const saved = await (await request.get(`/api/v1/workspaces/${workspace.id}`)).json();
    await request.delete(`/api/v1/workspaces/${workspace.id}?revision=${saved.revision}`);
  }
});

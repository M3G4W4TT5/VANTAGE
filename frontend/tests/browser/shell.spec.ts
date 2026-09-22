import { readFileSync } from 'node:fs';
import { test, expect } from './authenticated';
import { aircraftFixture } from '../fixtures/aircraft';
import { openWorkspaceFromHome, setPersonalTheme } from './navigation';
const tile = readFileSync('node_modules/cesium/Build/Cesium/Assets/Textures/NaturalEarthII/0/0/0.jpg');
let workspaceId: string;
let originalTheme: 'dark' | 'light' | null = null;
test.beforeEach(async ({ page, request }) => {
  originalTheme = null;
  const result = await request.post('/api/v1/workspaces', { data: { name: 'Browser review' } });
  expect(result.status()).toBe(201); const workspace = await result.json(); workspaceId = workspace.id;
  // Legacy demo settings still load, but only live domain presentation is available.
  workspace.panes[0].state.dataMode = 'demo'; workspace.panes[0].state.viewMode = 'list';
  workspace.panes[0].context.filters.query = 'obsolete demo filter';
  await request.put(`/api/v1/workspaces/${workspaceId}`, { data: workspace });
  originalTheme = await setPersonalTheme(request, 'dark');
  await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/jpeg', body: tile }));
  await page.routeWebSocket('**/hubs/observations*', ws => ws.onMessage(message => {
    for (const part of message.toString().split('\x1e').filter(Boolean)) {
      const value = JSON.parse(part); if (value.protocol) ws.send('{}\x1e');
      if (value.type === 4) ws.send(JSON.stringify({ type: 2, invocationId: value.invocationId, item: aircraftFixture() }) + '\x1e');
    }
  }));
});
test.afterEach(async ({ page, request }) => {
  await page.goto('about:blank').catch(() => {});
  const saved = await request.get(`/api/v1/workspaces/${workspaceId}`);
  if (saved.ok()) await request.delete(`/api/v1/workspaces/${workspaceId}?revision=${(await saved.json()).revision}`);
  if (originalTheme) await setPersonalTheme(request, originalTheme);
});
test('live shell, drag/keyboard resizing, themed overlays and Save restoration', async ({ page, request }, info) => {
  await openWorkspaceFromHome(page, 'Browser review');
  const vantageWordmark = page.getByRole('img', { name: 'VANTAGE' });
  const atlasWordmark = page.getByRole('img', { name: 'ATLAS' });
  await expect(vantageWordmark).toHaveAttribute('src', '/brand/vantage-wordmark-white.svg');
  await expect(atlasWordmark).toHaveAttribute('src', '/brand/atlas-wordmark-white.svg');
  await expect(page.getByRole('table', { name: 'Aircraft results' })).toContainText('TEST01');
  await expect(page.getByRole('button', { name: /Demo collection|Northern Europe|Accessible list|^Results$/ })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Map projection' })).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(0);
  const handle = page.getByRole('separator', { name: 'Filters width' }); const bounds = (await handle.boundingBox())!;
  await page.mouse.move(bounds.x + 4, bounds.y + 100); await page.mouse.down();
  await page.mouse.move(bounds.x + 64, bounds.y + 100, { steps: 6 }); await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-valuenow', '340');
  await page.getByRole('button', { name: 'TEST01', exact: true }).click();
  const inspector = page.getByRole('separator', { name: 'Inspector width' });
  await inspector.focus(); await page.keyboard.press('ArrowLeft');
  await expect(inspector).toHaveAttribute('aria-valuenow', '370');
  await page.screenshot({ path: info.outputPath('live-list-dark.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await expect(vantageWordmark).toHaveAttribute('src', '/brand/vantage-wordmark-black.svg');
  await expect(atlasWordmark).toHaveAttribute('src', '/brand/atlas-wordmark-black.svg');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  const saved = await (await request.get(`/api/v1/workspaces/${workspaceId}`)).json();
  expect(saved.panes[0].state.sidebarWidth).toBe(340); expect(saved.panes[0].state.inspectorWidth).toBe(370);
  expect(saved.panes[0].state.dataMode).toBe('live');
  await page.getByRole('button', { name: 'Workspace actions' }).click();
  await expect(page.getByRole('menuitem', { name: 'New workspace' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('live-list-light-portal.png'), animations: 'disabled' });
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Workspace actions' })).toBeFocused();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(vantageWordmark).toHaveAttribute('src', '/brand/vantage-wordmark-black.svg');
  await page.getByRole('button', { name: 'Open Browser review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'TEST01', exact: true })).toBeVisible();
  await expect(handle).toHaveAttribute('aria-valuenow', '340'); await expect(inspector).toHaveAttribute('aria-valuenow', '370');
});
test('Home separates destinations; Settings and personal theme work without opening a workspace', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  for (const area of ['Workspaces', 'Apps', 'System', 'Account'])
    await expect(page.getByRole('region', { name: area })).toBeVisible();
  await expect(page.getByRole('button', { name: /NEXUS/i })).toHaveCount(0);
  await expect(page.getByRole('table', { name: 'Aircraft results' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose workspace for ATLAS' }).click();
  await expect(page.getByRole('dialog', { name: 'Choose a workspace' })).toContainText('Browser review');
  await page.getByRole('dialog').getByRole('button', { name: 'Browser review', exact: true }).click();
  await expect(page.getByRole('img', { name: 'ATLAS' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  const savedBefore = await (await request.get(`/api/v1/workspaces/${workspaceId}`)).json();
  await page.getByRole('region', { name: 'System' }).getByRole('button', { name: 'Open Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Aircraft results' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('light');
  await expect(page.getByRole('img', { name: 'VANTAGE' })).toHaveAttribute('src', '/brand/vantage-wordmark-black.svg');
  const savedAfter = await (await request.get(`/api/v1/workspaces/${workspaceId}`)).json();
  expect(savedAfter.revision).toBe(savedBefore.revision);
  expect(savedAfter.appStates).toEqual(savedBefore.appStates);
  expect((await (await request.get('/api/v1/preferences')).json()).theme).toBe('light');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light');
  await page.getByRole('button', { name: 'Open Browser review', exact: true }).click();
  await expect(page.getByRole('img', { name: 'ATLAS' })).toHaveAttribute('src', '/brand/atlas-wordmark-black.svg');
});
test('narrow live views, reduced motion and keyboard workspace search', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await openWorkspaceFromHome(page, 'Browser review'); await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('button', { name: 'TEST01', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'TEST01', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('narrow-inspector.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Close inspector' }).click(); await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search records and workspaces' }).fill('Browser review');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Browser review', exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await page.setViewportSize({ width: 960, height: 540 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('failed saves preserve the current draft and show a recoverable error', async ({ page }) => {
  await openWorkspaceFromHome(page, 'Browser review'); await expect(page.getByRole('table', { name: 'Aircraft results' })).toContainText('TEST01');
  await page.getByRole('textbox', { name: 'Filter aircraft' }).fill('TEST');
  await page.route('**/api/v1/workspaces/*', async route => route.request().method() === 'PUT' ?
    route.fulfill({ status: 503, json: { code: 'storage_unavailable', message: 'Workspace storage is unavailable.', retryable: true } }) : route.continue());
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Workspace storage is unavailable');
  await expect(page.getByRole('textbox', { name: 'Filter aircraft' })).toHaveValue('TEST');
  await page.getByRole('button', { name: 'Reload saved state' }).click();
  await expect(page.getByRole('dialog')).toContainText('Discard your unsaved changes');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Filter aircraft' })).toHaveValue('TEST');
});

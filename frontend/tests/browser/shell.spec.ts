import { test, expect } from '@playwright/test';

let workspaceId: string;
test.beforeEach(async ({ page, request }) => {
  await expect.poll(async () => {
    try { return (await (await request.get('/api/v1/health')).json()).status === 'ready'; } catch { return false; }
  }, { timeout: 45000 }).toBe(true);
  const result = await request.post('/api/v1/workspaces', { data: { name: 'Browser review' } });
  expect(result.status()).toBe(201);
  const workspace = await result.json(); workspaceId = workspace.id;
  workspace.panes[0].state.dataMode = 'demo';
  workspace.panes[0].context.layerIds = ['demo-aircraft', 'demo-vessels', 'demo-places'];
  await request.put(`/api/v1/workspaces/${workspaceId}`, { data: workspace });
  await page.addInitScript(id => localStorage.setItem('vantage.workspace', id), workspaceId);
});
test.afterEach(async ({ request }) => {
  const saved = await request.get(`/api/v1/workspaces/${workspaceId}`);
  if (saved.ok()) await request.delete(`/api/v1/workspaces/${workspaceId}?revision=${(await saved.json()).revision}`);
});

test('workspace, selection and themed Blueprint controls remain usable and restore', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Explore the demo collection' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record type', exact: true })).toHaveCSS('background-color', 'rgb(27, 34, 42)');
  await page.screenshot({ path: info.outputPath('dark-overview.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Open results', exact: true }).click();
  await page.getByRole('button', { name: 'Demo flight 01', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo flight 01' })).toBeVisible();
  await page.getByRole('button', { name: 'Supporting details' }).click();
  await page.screenshot({ path: info.outputPath('dark-selected.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Use light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Record type', exact: true })).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('button', { name: 'Record type', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'All types', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('light-selection-portal.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Record type', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Change pane time' }).click();
  await page.getByRole('combobox', { name: 'Pane date UTC' }).click();
  await expect(page.locator('.rdp-day_selected')).toHaveCSS('background-color', 'rgb(36, 95, 173)');
  await expect(page.locator('.rdp-day_selected')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: info.outputPath('light-calendar.png'), animations: 'disabled' });
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('heading', { name: 'Demo flight 01' })).toBeVisible();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Demo results' })).toBeVisible();
  const secondRecord = page.getByRole('button', { name: 'Demo flight 02', exact: true });
  const speed = page.getByRole('table', { name: 'Demo results' }).getByRole('row').filter({ has: secondRecord }).getByRole('cell').nth(2);
  const initialSpeed = await speed.textContent();
  await page.getByRole('button', { name: 'Preview demo updates' }).click();
  await secondRecord.focus();
  await expect.poll(() => speed.textContent()).not.toBe(initialSpeed);
  await expect(secondRecord).toBeFocused();
  await page.getByRole('button', { name: 'Stop demo updates' }).click();
  await expect(page.getByRole('heading', { name: 'Demo flight 01' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('narrow layouts, reduced motion and keyboard search expose the same records', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Demo results' })).toBeVisible();
  await page.getByRole('button', { name: 'Demo flight 01', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo flight 01' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('narrow-inspector.png'), animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search records and workspaces' }).fill('Demo vessel 02');
  await page.getByRole('dialog').getByRole('button', { name: 'Demo vessel 02', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo vessel 02' })).toBeVisible();
  await page.setViewportSize({ width: 960, height: 540 });
  // Half of the desktop CSS viewport exercises the reflow of 200% desktop zoom.
  await expect(page.getByRole('button', { name: 'Close inspector' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Preview demo updates' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('zoom-200.png'), animations: 'disabled' });
});

test('failed saves preserve the current draft and show a recoverable error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Filter demo records' }).fill('vessel');
  await page.route('**/api/v1/workspaces/*', async route => route.request().method() === 'PUT' ?
    route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'storage_unavailable', message: 'Workspace storage is unavailable.', retryable: true }) }) : route.continue());
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Workspace storage is unavailable');
  await expect(page.getByRole('textbox', { name: 'Filter demo records' })).toHaveValue('vessel');
  await expect(page.getByRole('status').filter({ hasText: /^Unsaved$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Reload saved state' }).click();
  await expect(page.getByRole('dialog')).toContainText('Discard your unsaved changes');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Filter demo records' })).toHaveValue('vessel');
});

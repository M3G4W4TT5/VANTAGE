import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

// This browser slice uses no Keycloak cookie, application database or live connector.
test.use({ storageState: { cookies: [], origins: [] } });

test('fixture-only Home, Settings, ATLAS state and sign-out with an unsaved draft', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const ownerId = 'fixture-owner';
  const workspaceId = 'fixture-workspace';
  const now = '2026-09-22T12:00:00Z';
  let workspace = {
    id: workspaceId, ownerId, name: 'Fixture workspace', revision: 1, schemaVersion: 1,
    createdAt: now, updatedAt: now, linkGroups: [], appStates: { shell: { theme: 'dark', activePaneId: 'atlas-1' } },
    panes: [{ id: 'atlas-1', appId: 'atlas', stateSchemaVersion: 1,
      state: { schemaVersion: 1, viewMode: 'list', resultsOpen: false, sidebarOpen: true, inspectorOpen: false,
        sidebarWidth: 280, inspectorWidth: 360, sort: 'label', expandedDetails: false, dataMode: 'live',
        aircraftQuery: { longitude: 12, latitude: 58, radiusNm: 250 }, mapMode: '2d' },
      context: { schemaVersion: 1, workspaceId, paneId: 'atlas-1',
        selection: { entityIds: [], observationIds: [] }, area: null,
        time: { mode: 'live', cursor: null, from: null, to: null }, layerIds: ['aircraft'], filters: {}, linkGroupId: null } }],
  };
  let preference = { schemaVersion: 1, theme: 'dark', revision: 0, updatedAt: null as string | null };
  let workspaceReads = 0;
  let signedOut = false;
  let logoutPosts = 0;
  const unexpectedRequests: string[] = [];
  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, json: body });

  await page.route('**/api/v1/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (path === '/api/v1/session' && method === 'GET')
      return signedOut ? json(route, 200, { schemaVersion: 1, authenticated: false,
        user: null, expiresAt: null, csrfToken: null, sessionKey: null }) : json(route, 200, { schemaVersion: 1, authenticated: true,
        user: { id: ownerId, displayName: 'Fixture operator', canUseData: true },
        expiresAt: '2099-01-01T00:00:00Z', csrfToken: 'fixture-csrf', sessionKey: 'fixture-session' });
    if (path === '/api/v1/preferences') {
      if (method === 'GET') return json(route, 200, preference);
      if (method === 'PUT') {
        const body = request.postDataJSON() as { theme: string; revision: number };
        if (body.revision !== preference.revision) return json(route, 409, { code: 'revision_conflict', message: 'Preferences changed elsewhere.' });
        if (body.theme !== 'dark' && body.theme !== 'light') return json(route, 400, { code: 'invalid_theme', message: 'Invalid theme.' });
        preference = { schemaVersion: 1, theme: body.theme, revision: preference.revision + 1, updatedAt: now };
        return json(route, 200, preference);
      }
    }
    if (path === '/api/v1/health' && method === 'GET') return json(route, 200, { status: 'ready', storage: 'ready', contractVersion: 1 });
    if (path === '/api/v1/workspaces' && method === 'GET')
      return json(route, 200, [{ id: workspace.id, ownerId, name: workspace.name, revision: workspace.revision, updatedAt: workspace.updatedAt }]);
    if (path === `/api/v1/workspaces/${workspaceId}`) {
      if (method === 'GET') { workspaceReads++; return json(route, 200, workspace); }
      if (method === 'PUT') {
        const body = request.postDataJSON() as typeof workspace;
        if (body.revision !== workspace.revision) return json(route, 409, { code: 'revision_conflict', message: 'Workspace changed elsewhere.' });
        workspace = { ...body, id: workspaceId, ownerId, revision: workspace.revision + 1, updatedAt: now };
        return json(route, 200, workspace);
      }
    }
    unexpectedRequests.push(`${method} ${path}`);
    return json(route, 503, { code: 'fixture_missing', message: 'No fixture for this request.' });
  });
  // A failed fixture transport leaves the pane usable without a real SignalR negotiation.
  await page.route('**/hubs/**', route => route.fulfill({ status: 503, json: { message: 'Fixture live service unavailable.' } }));
  await page.routeWebSocket('**/hubs/**', socket => socket.close());
  await page.route('**/auth/logout', async route => {
    logoutPosts++;
    // The real backend may wait for provider revocation before redirecting.
    await new Promise(resolve => setTimeout(resolve, 500));
    signedOut = true;
    return route.fulfill({ status: 303, headers: { location: '/' }, body: '' });
  });
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.route('http://localhost:8180/**', route => route.abort());

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  for (const area of ['Workspaces', 'Apps', 'System', 'Account'])
    await expect(page.getByRole('region', { name: area })).toBeVisible();
  await expect(page.getByRole('button', { name: /NEXUS/i })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark');
  await expect(page.getByRole('img', { name: 'VANTAGE' })).toHaveAttribute('src', '/brand/vantage-wordmark-white.svg');
  expect(workspaceReads).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('home-dark-narrow.png'), animations: 'disabled' });

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByRole('region', { name: 'System' }).getByRole('button', { name: 'Open Settings' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('ready', { exact: true })).toHaveCount(2);
  expect(workspaceReads).toBe(0);
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('light');
  await expect(page.getByRole('img', { name: 'VANTAGE' })).toHaveAttribute('src', '/brand/vantage-wordmark-black.svg');
  expect(preference.theme).toBe('light');
  expect(workspace.revision).toBe(1);
  expect(workspace.appStates.shell.theme).toBe('dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('settings-light-narrow.png'), animations: 'disabled' });

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light');
  await page.getByRole('button', { name: 'Choose workspace for ATLAS' }).click();
  await expect(page.getByRole('dialog', { name: 'Choose a workspace' })).toContainText('Fixture workspace');
  await page.getByRole('dialog').getByRole('button', { name: 'Fixture workspace', exact: true }).click();
  await expect.poll(() => workspaceReads).toBe(1);
  await expect(page.getByRole('img', { name: 'ATLAS' })).toHaveAttribute('src', '/brand/atlas-wordmark-black.svg');
  const aircraftFilter = page.getByRole('textbox', { name: 'Filter aircraft' });
  await expect(aircraftFilter).toBeVisible();
  await aircraftFilter.fill('draft only');
  await expect(page.getByRole('status').filter({ hasText: /^Unsaved$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /Unsaved work in Fixture workspace/ })).toBeVisible();
  await page.getByRole('button', { name: 'Open Fixture workspace', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Unsaved workspace changes' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Filter aircraft' })).toHaveValue('draft only');
  expect(workspace.revision).toBe(1);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: /^Saved$/ })).toBeVisible();
  expect(workspace.revision).toBe(2);
  expect(workspace.panes[0].context.filters).toEqual({ query: 'draft only' });
  expect(preference.theme).toBe('light');
  expect(unexpectedRequests).toEqual([]);

  // Desktop is the primary review target; retain narrow checks above as a layout guard.
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('atlas-light-desktop.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('dark');
  await expect(page.getByRole('img', { name: 'VANTAGE' })).toHaveAttribute('src', '/brand/vantage-wordmark-white.svg');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('home-dark-desktop.png'), animations: 'disabled' });
  await page.getByRole('region', { name: 'System' }).getByRole('button', { name: 'Open Settings' }).click();
  await expect(page.getByText('ready', { exact: true })).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('light');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('settings-light-desktop.png'), animations: 'disabled' });
  expect(workspace.revision).toBe(2);
  expect(unexpectedRequests).toEqual([]);

  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Open Fixture workspace', exact: true }).click();
  await page.getByRole('textbox', { name: 'Filter aircraft' }).fill('keep unsaved');
  await expect(page.getByRole('status').filter({ hasText: /^Unsaved$/ })).toBeVisible();
  page.once('dialog', async dialog => { expect(dialog.type()).toBe('beforeunload'); await dialog.dismiss(); });
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page.getByRole('textbox', { name: 'Filter aircraft' })).toHaveValue('keep unsaved');
  expect(logoutPosts).toBe(0);

  page.once('dialog', async dialog => { expect(dialog.type()).toBe('beforeunload'); await dialog.accept(); });
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect.poll(() => logoutPosts).toBe(1);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(page.getByText('Signing out')).toHaveCount(0);
});

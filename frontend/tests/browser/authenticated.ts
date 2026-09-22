import { test as base, expect } from '@playwright/test';

// A real-provider setup supplies an ephemeral protected cookie state; never bypass application authentication.
export const test = base.extend({
  request: async ({ playwright, baseURL, storageState }, runFixture) => {
    if (!process.env.PLAYWRIGHT_STORAGE_STATE) throw new Error('Run the real-provider verification setup before authenticated browser regressions.');
    const context = await playwright.request.newContext({ baseURL, storageState });
    const response = await context.get('/api/v1/session');
    const session = await response.json();
    expect(session.authenticated).toBe(true);
    const currentState = await context.storageState();
    await context.dispose();
    const authorized = await playwright.request.newContext({ baseURL, storageState: currentState,
      extraHTTPHeaders: { 'X-VANTAGE-CSRF': session.csrfToken } });
    await runFixture(authorized); await authorized.dispose();
  },
});
export { expect };

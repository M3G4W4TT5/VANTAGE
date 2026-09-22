import { expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

export async function openWorkspaceFromHome(page: Page, name: string) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Open ${name}`, exact: true }).click();
  await expect(page.getByRole('img', { name: 'ATLAS' })).toBeVisible();
}

type Theme = 'dark' | 'light';
export async function setPersonalTheme(request: APIRequestContext, theme: Theme): Promise<Theme> {
  const response = await request.get('/api/v1/preferences');
  expect(response.ok()).toBe(true);
  const current = await response.json() as { theme: Theme; revision: number };
  if (current.theme !== theme) {
    const changed = await request.put('/api/v1/preferences', { data: { theme, revision: current.revision } });
    expect(changed.ok()).toBe(true);
  }
  return current.theme;
}

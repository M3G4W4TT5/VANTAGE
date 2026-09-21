import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1, timeout: 45000,
  expect: { timeout: 10000 }, reporter: [['list'], ['html', { open: 'never' }]],
  // The Linux test container has no host GPU. Select its software WebGL renderer explicitly.
  use: { launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] }, baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173', trace: { mode: 'retain-on-failure', screenshots: false }, screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } }],
});

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const settings = JSON.parse(readFileSync(new URL('../backend/Vantage.Api/appsettings.Development.local.json', import.meta.url), 'utf8'));
const result = spawnSync('dotnet', ['test', 'tests/Vantage.Api.Tests', '--no-restore'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, VANTAGE_TEST_CONNECTION: process.env.VANTAGE_TEST_CONNECTION ?? settings.ConnectionStrings.Vantage },
});
process.exit(result.status ?? 1);

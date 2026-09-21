import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(new URL('../contracts/openapi/', import.meta.url), { recursive: true });
const run = (args, cwd = root) => {
  const result = spawnSync('dotnet', args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run(['run', '--project', 'backend/Vantage.Api', '--no-launch-profile', '--', '--export-openapi', `${root}contracts/openapi/v1.json`]);
run(['nswag', 'run', 'nswag.json'], `${root}contracts`);

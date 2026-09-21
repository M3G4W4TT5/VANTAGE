import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const env = new URL('../infra/.env', import.meta.url);
if (!existsSync(env)) writeFileSync(env,
  `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nVANTAGE_DB_PORT=54329\nVANTAGE_HTTP_PORT=5080\n`, { mode: 0o600, flag: 'wx' });
const content = readFileSync(env, 'utf8');
const password = /^POSTGRES_PASSWORD=(.+)$/m.exec(content)?.[1];
const port = /^VANTAGE_DB_PORT=(\d+)$/m.exec(content)?.[1] ?? '54329';
if (!password || !/^[a-f0-9]{64}$/.test(password)) throw new Error('Local configuration needs a generated hexadecimal database password. Existing files were preserved.');
const settings = new URL('../backend/Vantage.Api/appsettings.Development.local.json', import.meta.url);
if (!existsSync(settings)) writeFileSync(settings, JSON.stringify({
  ConnectionStrings: { Vantage: `Host=127.0.0.1;Port=${port};Database=vantage;Username=vantage;Password=${password}` },
}, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log('Local configuration is ready. Existing files were preserved; credentials were not printed.');

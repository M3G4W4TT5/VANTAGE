import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { provisionKeycloak } from './provision-keycloak.mjs';
const env = new URL('../infra/.env', import.meta.url);
if (!existsSync(env)) writeFileSync(env,
  `POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nVANTAGE_DB_PORT=54329\nVANTAGE_HTTP_PORT=5080\n`, { mode: 0o600, flag: 'wx' });
let content = readFileSync(env, 'utf8');
// Stable ownership is provisioned explicitly before migration, never inferred at login.
for (const [key, value] of Object.entries({ VANTAGE_OWNER_ID: randomUUID(), VANTAGE_OWNER_SUBJECT: randomUUID(),
  VANTAGE_IDENTITY_ISSUER: 'http://localhost:8180/realms/vantage',
  KEYCLOAK_DB_PASSWORD: randomBytes(32).toString('hex'), VANTAGE_OIDC_CLIENT_SECRET: randomBytes(32).toString('hex'),
  VANTAGE_APP_DB_PASSWORD: randomBytes(32).toString('hex'),
  VANTAGE_CONNECTION_KEY: randomBytes(32).toString('base64') })) {
  if (!new RegExp(`^${key}=`, 'm').test(content)) content += `${key}=${value}\n`;
}
writeFileSync(env, content, { mode: 0o600 });
chmodSync(env, 0o600);
const value = key => new RegExp(`^${key}=(.+)$`, 'm').exec(content)?.[1];
const password = /^POSTGRES_PASSWORD=(.+)$/m.exec(content)?.[1];
const port = /^VANTAGE_DB_PORT=(\d+)$/m.exec(content)?.[1] ?? '54329';
if (!password || !/^[a-f0-9]{64}$/.test(password)) throw new Error('Local configuration needs a generated hexadecimal database password. Existing files were preserved.');
const settings = new URL('../backend/Vantage.Api/appsettings.Development.local.json', import.meta.url);
if (!existsSync(settings)) writeFileSync(settings, JSON.stringify({
  ConnectionStrings: { Vantage: `Host=127.0.0.1;Port=${port};Database=vantage;Username=vantage;Password=${password}` },
}, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
const configuration = JSON.parse(readFileSync(settings, 'utf8'));
configuration.ConnectionStrings.VantageRuntime ??= `Host=127.0.0.1;Port=${port};Database=vantage;Username=vantage_app;Password=${value('VANTAGE_APP_DB_PASSWORD')}`;
configuration.Identity ??= {};
configuration.Connections ??= {};
configuration.Connections.EncryptionKey ??= value('VANTAGE_CONNECTION_KEY');
configuration.Sources ??= {};
configuration.Sources.Aircraft ??= { Provider: value('VANTAGE_AIRCRAFT_PROVIDER') ?? 'adsb-lol' };
configuration.Sources.AdsbLol ??= { Enabled: value('VANTAGE_ADSB_ENABLED') !== 'false',
  PollSeconds: Number(value('VANTAGE_ADSB_POLL_SECONDS') ?? 30) };
configuration.Sources.Earthquakes ??= { Provider: value('VANTAGE_EARTHQUAKE_PROVIDER') ?? 'usgs-earthquakes' };
configuration.Sources.Usgs ??= { Enabled: value('VANTAGE_USGS_ENABLED') !== 'false',
  PollSeconds: Number(value('VANTAGE_USGS_POLL_SECONDS') ?? 60) };
configuration.Identity.InitialOperator ??= { Id: value('VANTAGE_OWNER_ID'), Subject: value('VANTAGE_OWNER_SUBJECT'),
  Issuer: value('VANTAGE_IDENTITY_ISSUER'), DisplayName: 'Operator' };
if (configuration.Identity.InitialOperator.Id !== value('VANTAGE_OWNER_ID') ||
    configuration.Identity.InitialOperator.Subject !== value('VANTAGE_OWNER_SUBJECT') ||
    configuration.Identity.InitialOperator.Issuer !== value('VANTAGE_IDENTITY_ISSUER'))
  throw new Error('Local settings and Compose initial-operator mappings differ. Preserve both files and verify the intended identity before migrating.');
for (const [key, setting] of Object.entries({ Authority: value('VANTAGE_IDENTITY_ISSUER'),
  MetadataAddress: 'http://localhost:8180/realms/vantage/.well-known/openid-configuration',
  IntrospectionEndpoint: 'http://localhost:8180/realms/vantage/protocol/openid-connect/token/introspect',
  RevocationEndpoint: 'http://localhost:8180/realms/vantage/protocol/openid-connect/revoke',
  ClientId: 'vantage', ClientSecret: value('VANTAGE_OIDC_CLIENT_SECRET'), PublicOrigin: 'http://127.0.0.1:5080',
  AllowLoopbackHttp: true, SessionMinutes: 30, CheckIntervalSeconds: 15, ProviderTimeoutSeconds: 3 }))
  configuration.Identity[key] ??= setting;
provisionKeycloak(Object.fromEntries(['VANTAGE_OWNER_SUBJECT', 'VANTAGE_OIDC_CLIENT_SECRET'].map(key => [key, value(key)])));
writeFileSync(settings, JSON.stringify(configuration, null, 2) + '\n', { mode: 0o600 });
chmodSync(settings, 0o600);
console.log('Local configuration and protected Keycloak bootstrap files are ready. Existing settings and secrets were preserved; credentials were not printed.');

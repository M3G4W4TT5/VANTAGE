import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

// Called by init-local. This writes local bootstrap material only; it never modifies a running realm.
export function provisionKeycloak(values, directory = new URL('../infra/keycloak/.local/', import.meta.url)) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const credentialsFile = new URL('credentials.json', directory);
  const credentials = existsSync(credentialsFile) ? JSON.parse(readFileSync(credentialsFile, 'utf8')) : {
    bootstrapAdminUsername: 'vantage-bootstrap',
    bootstrapAdminPassword: `Vtg!2${randomBytes(24).toString('hex')}`,
    operatorUsername: 'operator',
    operatorTemporaryPassword: `Vtg!2${randomBytes(24).toString('hex')}`,
  };
  const importDirectory = new URL('import/', directory);
  mkdirSync(importDirectory, { recursive: true, mode: 0o700 });
  chmodSync(importDirectory, 0o700);
  const realmFile = new URL('vantage-realm.json', importDirectory);
  if (!existsSync(realmFile)) {
    const realm = JSON.parse(readFileSync(new URL('../infra/keycloak/realm-template.json', import.meta.url), 'utf8'));
    realm.clients[0].secret = values.VANTAGE_OIDC_CLIENT_SECRET;
    // Email is optional in the imported user profile; preserve absent email instead of inventing one.
    realm.users = [{ id: values.VANTAGE_OWNER_SUBJECT, username: credentials.operatorUsername, enabled: true,
      firstName: 'VANTAGE', lastName: 'Operator', requiredActions: ['UPDATE_PASSWORD', 'CONFIGURE_TOTP'],
      credentials: [{ type: 'password', value: credentials.operatorTemporaryPassword, temporary: true }] }];
    writeFileSync(realmFile, JSON.stringify(realm, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  } else {
    const realm = JSON.parse(readFileSync(realmFile, 'utf8'));
    if (realm.users.find(user => user.username === 'operator')?.id !== values.VANTAGE_OWNER_SUBJECT ||
        realm.clients.find(client => client.clientId === 'vantage')?.secret !== values.VANTAGE_OIDC_CLIENT_SECRET)
      throw new Error('Existing Keycloak bootstrap mapping differs from local configuration. Preserve the files and verify identity recovery before changing it.');
  }
  if (!existsSync(credentialsFile)) writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  const bootstrap = new URL('bootstrap.env', directory);
  if (!existsSync(bootstrap)) writeFileSync(bootstrap,
    `KC_BOOTSTRAP_ADMIN_USERNAME=${credentials.bootstrapAdminUsername}\nKC_BOOTSTRAP_ADMIN_PASSWORD=${credentials.bootstrapAdminPassword}\n`, { mode: 0o600, flag: 'wx' });
  for (const file of [credentialsFile, realmFile, bootstrap]) chmodSync(file, 0o600);
}

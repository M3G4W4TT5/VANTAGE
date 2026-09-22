// Real Keycloak protocol/enrollment verification. No screenshots, traces, videos or credential logging.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { createHmac } from 'node:crypto';
const account = JSON.parse(readFileSync(process.env.VANTAGE_AUTH_ACCOUNT ?? '/verification/account.json', 'utf8'));
const adminCredentials = JSON.parse(readFileSync(process.env.VANTAGE_ADMIN_CREDENTIALS ?? '/run/admin-credentials.json', 'utf8'));
const app = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5080';
const idp = 'http://localhost:8180';
const output = process.env.VANTAGE_AUTH_STATE ?? '/verification/state.json';
const evidence = []; let stage = 'launch';
function assert(value, message) { if (!value) { const error = new Error(message); error.name = 'VerificationAssertion'; throw error; } }
function totp(secret) {
  // Keycloak 26.7.4's hidden totpSecret is the raw UTF-8 secret, before TotpBean's QR/base32 encoding.
  const key = Buffer.from(secret, 'utf8');
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', key).update(counter).digest(); const offset = digest[19] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}
async function waitNextCode(secret, previous) {
  while (totp(secret) === previous) await new Promise(resolve => setTimeout(resolve, 500));
}
let adminToken;
async function admin(path, method = 'GET', body) {
  if (!adminToken) {
    const response = await fetch(idp + '/realms/master/protocol/openid-connect/token', { method: 'POST', body: new URLSearchParams({
      client_id: 'admin-cli', grant_type: 'password', username: adminCredentials.bootstrapAdminUsername, password: adminCredentials.bootstrapAdminPassword }) });
    assert(response.ok, 'Admin access unavailable'); adminToken = (await response.json()).access_token;
  }
  const response = await fetch(idp + '/admin/realms/vantage/' + path, { method,
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert(response.ok, 'Provider administration failed'); return response.status === 204 ? null : response.json();
}
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'] });
let secret; let lastCode;
let activePage;
let lastNavigation;
async function newContext() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // No automated traversal of public basemap servers.
  await context.route('https://tile.openstreetmap.org/**', route => route.abort());
  return context;
}
async function password(page) {
  activePage = page;
  page.on('response', response => {
    if (response.request().isNavigationRequest()) lastNavigation = { status: response.status(), path: new URL(response.url()).pathname };
  });
  const phase = stage;
  stage = phase + ': login redirect';
  const authorizationRequest = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.origin === idp && url.pathname === '/realms/vantage/protocol/openid-connect/auth';
  });
  await page.goto(app + '/auth/login');
  stage = phase + ': password form';
  const authorization = new URL((await authorizationRequest).url());
  // ASP.NET uses PAR when advertised: code/PKCE parameters are pushed directly to Keycloak,
  // and the browser carries only an opaque request URI. The provider's S256 requirement is checked below.
  const pushed = authorization.searchParams.get('request_uri')?.startsWith('urn:ietf:params:oauth:request_uri:');
  const direct = authorization.searchParams.get('response_type') === 'code' &&
    authorization.searchParams.get('code_challenge_method') === 'S256' && authorization.searchParams.get('code_challenge')?.length > 20;
  assert(authorization.origin === idp && (pushed || direct), 'Authorization request did not use PAR or code plus S256 PKCE');
  await page.locator('#username').fill(account.username); await page.locator('#password').fill(account.password);
  await page.locator('#kc-login').click();
  stage = phase + ': password submitted';
}
async function finishCode(page) {
  if (lastCode) await waitNextCode(secret, lastCode);
  lastCode = totp(secret); await page.locator('input[name="otp"], input[name="totp"]').fill(lastCode);
  stage += ': TOTP submission';
  await page.locator('input[type="submit"],button[type="submit"]').last().click();
  await page.waitForURL(url => url.origin === new URL(app).origin && url.pathname === '/', { timeout: 20000 });
  // Let the UI's initial session request establish its CSRF cookie before the harness makes one.
  await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor({ timeout: 15000 });
  const session = await (await page.request.get(app + '/api/v1/session')).json();
  assert(session.authenticated && session.user.id === account.userId, 'Real sign-in did not establish authorized session');
  return session;
}
try {
  stage = 'temporary account reset';
  const clients = await admin('clients?clientId=vantage');
  assert(clients.length === 1 && !clients[0].publicClient && clients[0].standardFlowEnabled &&
    clients[0].attributes['pkce.code.challenge.method'] === 'S256', 'Provider client must require confidential code plus S256 PKCE');
  assert(account.username.startsWith('verification-') && account.userId.startsWith('verification-'), 'Only disposable accounts may be tested');
  await admin('users/' + account.subject + '/logout', 'POST');
  for (const credential of await admin('users/' + account.subject + '/credentials'))
    if (credential.type === 'otp') await admin('users/' + account.subject + '/credentials/' + credential.id, 'DELETE');
  await admin('users/' + account.subject, 'PUT', { requiredActions: ['CONFIGURE_TOTP'] });
  stage = 'anonymous protection';
  const anonymous = await newContext(); const anonymousPage = await anonymous.newPage();
  for (const path of ['/api/v1/workspaces','/api/v1/aircraft','/api/v1/earthquakes','/api/v1/earthquakes/observations/unknown'])
    assert((await anonymous.request.get(app + path)).status() === 401, 'Anonymous API accessible');
  assert((await anonymous.request.post(app + '/hubs/observations/negotiate?negotiateVersion=1')).status() === 401, 'Anonymous live connection accessible');
  await anonymousPage.goto(app); await anonymousPage.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  evidence.push('Anonymous UI, REST, evidence and live negotiation denied.'); await anonymous.close();

  stage = 'real enrollment';
  const context = await newContext(); const page = await context.newPage(); await password(page);
  await page.locator('input[name="totpSecret"]').waitFor({ state: 'attached', timeout: 15000 });
  secret = await page.locator('input[name="totpSecret"]').inputValue();
  assert(secret.length > 10, 'Provider did not offer TOTP enrollment');
  if (await page.locator('input[name="userLabel"]').count()) await page.locator('input[name="userLabel"]').fill('Temporary protocol verification');
  const session = await finishCode(page);
  assert((await page.request.get(app + '/api/v1/workspaces')).ok(), 'Protected workspace read failed');
  assert((await page.request.post(app + '/api/v1/workspaces', { data: { name: 'Rejected without CSRF' } })).status() === 400, 'CSRF omission accepted');
  const stored = await context.storageState();
  assert(stored.cookies.some(cookie => cookie.name === 'vantage.session' && cookie.httpOnly && cookie.sameSite === 'Lax'), 'Protected session cookie missing');
  assert(stored.cookies.every(cookie => !cookie.name.includes('token')), 'Unexpected token cookie');
  evidence.push('Real Keycloak password plus provider TOTP enrollment reached protected application; session cookie is HttpOnly; CSRF omission rejected.');

  stage = 'local logout';
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  stage = 'local logout redirect';
  // Without id_token_hint, Keycloak may ask the user to confirm its own sign-out.
  await page.waitForURL(url => url.origin === idp || (url.origin === new URL(app).origin && url.pathname === '/'), { timeout: 15000 });
  assert(!page.url().includes('id_token_hint='), 'Logout exposed an ID token');
  if (page.url().startsWith(idp)) {
    const confirm = page.getByRole('button', { name: /log ?out|sign ?out/i });
    if (await confirm.count()) await confirm.first().click();
  }
  const replay = await browser.newContext({ storageState: stored });
  assert((await replay.request.get(app + '/api/v1/workspaces')).status() === 401, 'Logged-out cookie replay accepted');
  await replay.close(); await context.close(); evidence.push('Native sign-out invalidated copied cookie; provider logout URL contained no ID token.');

  stage = 'fresh required TOTP and revocation';
  const fresh = await newContext(); const freshPage = await fresh.newPage(); await password(freshPage);
  await freshPage.locator('input[name="otp"]').waitFor({ timeout: 15000 });
  await freshPage.locator('input[name="otp"]').fill('not-a-code'); await freshPage.locator('#kc-login').click();
  assert(new URL(freshPage.url()).origin === idp, 'Invalid TOTP granted access');
  const freshSession = await finishCode(freshPage);
  await freshPage.evaluate(async csrf => {
    const negotiation = await (await fetch('/hubs/observations/negotiate?negotiateVersion=1', { method: 'POST', headers: { 'X-VANTAGE-CSRF': csrf } })).json();
    window.verificationLive = { started: false, closedAt: null };
    const socket = new WebSocket(location.origin.replace('http', 'ws') + '/hubs/observations?id=' + encodeURIComponent(negotiation.connectionToken));
    let heartbeat;
    socket.onopen = () => {
      socket.send('{"protocol":"json","version":1}\u001e');
      heartbeat = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send('{"type":6}\u001e'); }, 5000);
    };
    socket.onmessage = event => {
      for (const part of event.data.split('\u001e').filter(Boolean)) {
        const value = JSON.parse(part);
        if (!('type' in value)) socket.send('{"type":4,"invocationId":"live-proof","target":"Earthquakes","arguments":[]}\u001e');
        if (value.type === 2) window.verificationLive.started = true;
      }
    };
    socket.onclose = () => { clearInterval(heartbeat); window.verificationLive.closedAt = Date.now(); };
  }, freshSession.csrfToken);
  await freshPage.waitForFunction(() => window.verificationLive.started, null, { timeout: 15000 });
  // A revocation test is meaningful only after healthy provider checks demonstrably keep the session alive.
  stage = 'healthy session across provider checks';
  for (let check = 0; check < 4; check++) {
    await new Promise(resolve => setTimeout(resolve, 8000));
    assert((await fresh.request.get(app + '/api/v1/workspaces')).status() === 200, 'Healthy provider session failed periodic validation');
    assert(await freshPage.evaluate(() => window.verificationLive.closedAt === null), 'Healthy live subscription closed');
  }
  evidence.push('Healthy real-provider session and live socket survived two scheduled backend introspection checks.');
  stage = 'provider revocation';
  const revokedAt = Date.now(); await admin('users/' + account.subject + '/logout', 'POST');
  await freshPage.waitForFunction(() => window.verificationLive.closedAt !== null, null, { timeout: 25000 });
  const closedAt = await freshPage.evaluate(() => window.verificationLive.closedAt);
  assert(closedAt - revokedAt <= 25000, 'Provider revocation exceeded cleanup bound');
  assert((await fresh.request.get(app + '/api/v1/workspaces')).status() === 401, 'Revoked session remained usable');
  evidence.push(`Fresh password sign-in required TOTP; invalid code rejected. Real provider revocation closed protected live socket in ${closedAt - revokedAt} ms.`);
  await fresh.close();

  stage = 'regression session';
  const regression = await newContext(); const regressionPage = await regression.newPage(); await password(regressionPage); await finishCode(regressionPage);
  const state = await regression.storageState(); state.origins = [];
  writeFileSync(output, JSON.stringify(state), { mode: 0o600 }); chmodSync(output, 0o600);
  await regression.close();
  writeFileSync('/verification/live-result.json', JSON.stringify({ passed: true, date: new Date().toISOString(), evidence,
    limitation: 'Disposable provider account used. Operator must enroll their own authenticator; this test does not establish physical-device enrollment or recovery acceptance.' }, null, 2) + '\n', { mode: 0o600 });
  for (const result of evidence) console.log('PASS: ' + result);
  console.log('Ephemeral regression cookie state ready; no tokens or enrollment material included in results.');
} catch (error) {
  // Deliberately omit stack, URL, page markup and field values because they can contain enrollment material.
  console.error(`FAIL: real-provider verification at ${stage} (${error.name}). No auth artifacts captured.`);
  if (error.name === 'VerificationAssertion') console.error(error.message);
  if (activePage) console.error('Safe form diagnostics: ' + JSON.stringify(await activePage.locator('input,button').evaluateAll(elements => elements.map(element => ({ tag: element.tagName, name: element.getAttribute('name'), type: element.getAttribute('type'), id: element.id })))));
  if (activePage) console.error('Safe location: ' + new URL(activePage.url()).origin + new URL(activePage.url()).pathname + '; title: ' + await activePage.title());
  console.error('Navigation status: ' + JSON.stringify(lastNavigation));
  if (activePage && new URL(activePage.url()).pathname === '/auth/logout') {
    try { console.error('Application error code: ' + JSON.parse(await activePage.locator('body').innerText()).code); } catch { /* Never dump arbitrary response content. */ }
  }
  process.exitCode = 1;
} finally { secret = undefined; adminToken = undefined; await browser.close(); }

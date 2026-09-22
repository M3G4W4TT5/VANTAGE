import { afterEach, expect, test, vi } from 'vitest';
import { SessionAccessError, SessionService, readSession } from '../src/platform/session/SessionService';
import { SessionHttpClient } from '../src/platform/session/SessionHttpClient';
import { aircraftChannel, clearAircraftChannels } from '../src/platform/data/AircraftChannel';
import { earthquakeChannel, clearEarthquakeChannel } from '../src/platform/data/EarthquakeChannel';
import { aircraftFixture } from './fixtures/aircraft';
import { earthquakeFixture } from './fixtures/earthquakes';

const authenticated = (sessionKey = 'fixture-session', canUseData = true) => ({ schemaVersion: 1, authenticated: true,
  user: { id: 'fixture-user', displayName: 'Test operator', canUseData }, expiresAt: new Date(Date.now() + 60000).toISOString(), csrfToken: 'fixture-csrf', sessionKey });
const services: SessionService[] = [];
function service(send: typeof fetch) { const session = new SessionService(send, 'http://localhost'); services.push(session); return session; }
afterEach(() => { services.splice(0).forEach(session => session.clear()); clearAircraftChannels(); clearEarthquakeChannel(); vi.useRealTimers(); });

test('validates identity, permission, expiry and public session nonce before authorizing a session', () => {
  expect(readSession(authenticated()).authenticated).toBe(true);
  expect(() => readSession({ ...authenticated(), sessionKey: null })).toThrow();
  expect(() => readSession({ ...authenticated(), expiresAt: 'yesterday' })).toThrow();
  expect(() => readSession({ ...authenticated(), user: { id: 'fixture-user', displayName: 'Test operator' } })).toThrow();
  expect(() => readSession({ schemaVersion: 1, authenticated: false, user: authenticated().user })).toThrow();
});

test('gates requests, sends CSRF on REST mutations and SignalR negotiation, and never sends it off origin', async () => {
  const sent: { path: string; options?: RequestInit }[] = [];
  const session = service(async (input, options) => {
    sent.push({ path: input.toString(), options });
    return Response.json(input === '/api/v1/session' ? authenticated() : {});
  });
  await expect(session.fetch('/api/v1/workspaces')).rejects.toBeInstanceOf(SessionAccessError);
  expect(sent).toHaveLength(0);
  await session.refresh();
  await session.fetch('/api/v1/workspaces');
  await session.fetch('/api/v1/workspaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  await new SessionHttpClient(session).send({ method: 'POST', url: 'http://localhost/hubs/observations/negotiate?negotiateVersion=1' });
  expect(new Headers(sent[1].options?.headers).has('X-VANTAGE-CSRF')).toBe(false);
  expect(new Headers(sent[2].options?.headers).get('X-VANTAGE-CSRF')).toBe('fixture-csrf');
  expect(new Headers(sent[3].options?.headers).get('X-VANTAGE-CSRF')).toBe('fixture-csrf');
  expect(sent.slice(1).every(request => request.options?.credentials === 'same-origin')).toBe(true);
  await expect(session.fetch('https://example.com/api/external', { method: 'POST' })).rejects.toThrow('local application origin');
  expect(sent).toHaveLength(4);
});

test('rejects a delayed response body after a same-user new session and cancels outstanding requests', async () => {
  let active = authenticated(); let body!: ReadableStreamDefaultController<Uint8Array>; let signal: AbortSignal | null | undefined;
  const session = service(async (input, options) => {
    if (input === '/api/v1/session') return Response.json(active);
    signal = options?.signal;
    return new Response(new ReadableStream<Uint8Array>({ start(controller) { body = controller; } }));
  });
  await session.refresh();
  const result = session.fetch('/api/v1/workspaces');
  const rejection = expect(result).rejects.toBeInstanceOf(SessionAccessError);
  await Promise.resolve();
  active = authenticated('replacement-session'); await session.refresh();
  expect(signal?.aborted).toBe(true);
  body.enqueue(new TextEncoder().encode('[]')); body.close(); await rejection;
  expect(session.getSnapshot().session?.sessionKey).toBe('replacement-session');
});

test('denied operations, changed data permissions and provider failure all release prior access', async () => {
  let active = authenticated(); let unavailable = false;
  const session = service(async input => {
    if (unavailable) throw new Error('offline');
    return input === '/api/v1/session' ? Response.json(active) : new Response(null, { status: 403 });
  });
  await session.refresh(); const cleanup = vi.fn(); session.onInvalidate(cleanup);
  active = authenticated('fixture-session', false); await session.refresh();
  expect(cleanup).toHaveBeenCalledTimes(1); expect(session.getSnapshot().session?.user.canUseData).toBe(false);
  await expect(session.fetch('/api/v1/earthquakes')).rejects.toBeInstanceOf(SessionAccessError);
  expect(session.getSnapshot().session).toBeNull(); expect(cleanup).toHaveBeenCalledTimes(2);
  unavailable = true; await session.refresh();
  expect(session.getSnapshot().status).toBe('unavailable'); expect(session.getSnapshot().session).toBeNull();
});

test('a sign-out invalidates an in-flight bootstrap and expiry clears access without waiting for a poll', async () => {
  let resolve!: (response: Response) => void;
  const pendingSession = service(() => new Promise<Response>(done => { resolve = done; }));
  const pending = pendingSession.refresh(); pendingSession.clear('Signing out…', 'signing-out');
  resolve(Response.json(authenticated())); await pending;
  expect(pendingSession.getSnapshot().status).toBe('signing-out'); expect(pendingSession.getSnapshot().session).toBeNull();
  vi.useFakeTimers();
  const session = service(async () => Response.json({ ...authenticated(), expiresAt: new Date(Date.now() + 1000).toISOString() }));
  await session.refresh(); const cleanup = vi.fn(); session.onInvalidate(cleanup);
  vi.advanceTimersByTime(1001);
  expect(cleanup).toHaveBeenCalledTimes(1); expect(session.getSnapshot().session).toBeNull();
});

test('session checks time out closed and old observation caches reject late delivery', async () => {
  vi.useFakeTimers();
  const session = service(() => new Promise<Response>(() => {}));
  void session.refresh(); vi.advanceTimersByTime(5001);
  expect(session.getSnapshot().status).toBe('unavailable');
  const aircraft = aircraftChannel({ longitude: 12, latitude: 58, radiusNm: 250 }); const earthquakes = earthquakeChannel();
  aircraft.accept(aircraftFixture()); earthquakes.accept(earthquakeFixture());
  clearAircraftChannels(); clearEarthquakeChannel();
  expect(aircraft.getSnapshot().records).toEqual([]); expect(earthquakes.getSnapshot().records).toEqual([]);
  expect(() => aircraft.accept(aircraftFixture(1, false))).toThrow('released');
  expect(() => earthquakes.accept(earthquakeFixture(1, false))).toThrow('released');
  expect(aircraftChannel({ longitude: 12, latitude: 58, radiusNm: 250 })).not.toBe(aircraft);
  expect(earthquakeChannel()).not.toBe(earthquakes);
});

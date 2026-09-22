export type SessionUser = { id: string; displayName: string; canUseData: boolean };
export type AuthenticatedSession = { schemaVersion: 1; authenticated: true; user: SessionUser; expiresAt: string; csrfToken: string; sessionKey: string };
type SessionResponse = AuthenticatedSession | { schemaVersion: 1; authenticated: false; user: null; expiresAt: null; csrfToken: null; sessionKey: null };
export type SessionSnapshot = { status: 'loading' | 'ready' | 'signed-out' | 'unavailable' | 'signing-out'; session: AuthenticatedSession | null; message: string | null };
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
export function readSession(value: unknown): SessionResponse {
  if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 1 || !('authenticated' in value)) throw new Error('Invalid session response.');
  const candidate = value as Record<string, unknown>;
  if (candidate.authenticated === false && candidate.user === null && candidate.expiresAt === null && candidate.csrfToken === null && candidate.sessionKey === null)
    return candidate as SessionResponse;
  const user = candidate.user as Record<string, unknown> | null;
  if (candidate.authenticated !== true || !user || !nonempty(user.id) || !nonempty(user.displayName) || typeof user.canUseData !== 'boolean' ||
    !nonempty(candidate.sessionKey) || !nonempty(candidate.csrfToken) || !nonempty(candidate.expiresAt) || !Number.isFinite(Date.parse(candidate.expiresAt))) throw new Error('Invalid session response.');
  return candidate as AuthenticatedSession;
}
export const sessionBoundary = (session: AuthenticatedSession | null) => session ? JSON.stringify([session.user.id, session.sessionKey, session.user.canUseData]) : null;
export class SessionAccessError extends Error { constructor() { super('Your session or access has changed. Sign in again to continue.'); } }

// The only browser credential is the HttpOnly cookie. CSRF and this public session nonce remain in memory.
export class SessionService {
  private state: SessionSnapshot = { status: 'loading', session: null, message: null };
  private listeners = new Set<() => void>();
  private cleanups = new Set<() => void>();
  private requests = new Set<AbortController>();
  private revision = 0;
  private refreshPromise?: Promise<void>;
  private refreshController?: AbortController;
  private expiryTimer?: ReturnType<typeof setTimeout>;
  constructor(private send: typeof fetch = (...args) => globalThis.fetch(...args),
    private origin = typeof location === 'undefined' ? 'http://localhost' : location.origin) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  onInvalidate = (cleanup: () => void) => { this.cleanups.add(cleanup); return () => { this.cleanups.delete(cleanup); }; };
  private publish(state: SessionSnapshot) { this.state = state; this.listeners.forEach(listener => listener()); }
  private invalidate() {
    this.revision++; clearTimeout(this.expiryTimer);
    this.refreshController?.abort(); this.refreshController = undefined; this.refreshPromise = undefined;
    this.requests.forEach(controller => controller.abort()); this.requests.clear();
    [...this.cleanups].forEach(cleanup => cleanup());
  }
  clear(message = 'Your session has ended. Sign in to continue.', status: 'signed-out' | 'unavailable' | 'signing-out' = 'signed-out') {
    this.invalidate(); this.publish({ status, session: null, message });
  }
  assertCurrent(boundary: string | null) {
    if (!boundary || this.state.status !== 'ready' || sessionBoundary(this.state.session) !== boundary) throw new SessionAccessError();
    if (Date.parse(this.state.session!.expiresAt) <= Date.now()) { this.clear(); throw new SessionAccessError(); }
  }
  refresh = () => {
    if (this.state.status === 'signing-out') return Promise.resolve();
    if (this.refreshPromise) return this.refreshPromise;
    const controller = new AbortController(); this.refreshController = controller;
    const revision = this.revision;
    const timeout = setTimeout(() => {
      if (revision === this.revision) this.clear('The session service is unavailable. Retry when it is reachable.', 'unavailable');
    }, 5000);
    const task = (async () => {
      try {
        const response = await this.send('/api/v1/session', { credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal });
        if (!response.ok) throw new Error('Session service unavailable.');
        const session = readSession(await response.json());
        if (controller.signal.aborted || revision !== this.revision) return;
        if (!session.authenticated || Date.parse(session.expiresAt) <= Date.now()) { this.clear(); return; }
        if (sessionBoundary(session) !== sessionBoundary(this.state.session)) this.invalidate();
        this.publish({ status: 'ready', session, message: null });
        clearTimeout(this.expiryTimer);
        this.expiryTimer = setTimeout(() => this.clear(), Math.min(Date.parse(session.expiresAt) - Date.now(), 2147483647));
      } catch {
        if (!controller.signal.aborted && revision === this.revision) this.clear('The session service is unavailable. Retry when it is reachable.', 'unavailable');
      } finally { clearTimeout(timeout); }
    })();
    this.refreshPromise = task;
    void task.finally(() => { if (this.refreshPromise === task) this.refreshPromise = undefined; });
    return task;
  };
  fetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const boundary = sessionBoundary(this.state.session); this.assertCurrent(boundary);
    const revision = this.revision; const session = this.state.session!;
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url ?? input.toString(), this.origin);
    if (url.origin !== this.origin || !(url.pathname.startsWith('/api/') || url.pathname.startsWith('/hubs/'))) throw new Error('Protected requests must use the local application origin.');
    const headers = new Headers(init.headers ?? request?.headers);
    const method = (init.method ?? request?.method ?? 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('X-VANTAGE-CSRF', session.csrfToken);
    const controller = new AbortController(); this.requests.add(controller);
    const callerSignal = init.signal ?? request?.signal;
    const abort = () => controller.abort();
    if (callerSignal?.aborted) controller.abort(); else callerSignal?.addEventListener('abort', abort, { once: true });
    try {
      const response = await this.send(input, { ...init, headers, signal: controller.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
      if (controller.signal.aborted || revision !== this.revision) throw new SessionAccessError();
      if (response.status === 401 || response.status === 403) { this.clear('Your session or access has changed. Sign in again to continue.'); throw new SessionAccessError(); }
      // Hold the guard through body consumption, including a response that arrives after cancellation.
      const bytes = await response.arrayBuffer();
      if (controller.signal.aborted || revision !== this.revision) throw new SessionAccessError();
      this.assertCurrent(boundary);
      return new Response([204, 205, 304].includes(response.status) ? null : bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
    } finally { this.requests.delete(controller); callerSignal?.removeEventListener('abort', abort); }
  };
}
export const sessionService = new SessionService();

import { AbortError, HttpClient, HttpError, HttpResponse, TimeoutError } from '@microsoft/signalr';
import type { HttpRequest } from '@microsoft/signalr';
import { SessionService, sessionService } from './SessionService';

// SignalR negotiation and fallback transports use the same CSRF/session boundary as REST.
export class SessionHttpClient extends HttpClient {
  constructor(private session: SessionService = sessionService) { super(); }
  async send(request: HttpRequest): Promise<HttpResponse> {
    if (request.abortSignal?.aborted) throw new AbortError();
    if (!request.url || !request.method) throw new Error('SignalR request is incomplete.');
    const controller = new AbortController();
    let timedOut = false;
    if (request.abortSignal) request.abortSignal.onabort = () => controller.abort();
    const timeout = request.timeout ? setTimeout(() => { timedOut = true; controller.abort(); }, request.timeout) : undefined;
    const headers = new Headers(request.headers);
    if (request.content) headers.set('Content-Type', typeof request.content === 'string' ? 'text/plain;charset=UTF-8' : 'application/octet-stream');
    try {
      const response = await this.session.fetch(request.url, { method: request.method, headers, body: request.content || undefined, signal: controller.signal });
      if (!response.ok) throw new HttpError('The live service request failed.', response.status);
      const content = request.responseType === 'arraybuffer' ? await response.arrayBuffer() : await response.text();
      return new HttpResponse(response.status, response.statusText, content);
    } catch (error) {
      if (timedOut) throw new TimeoutError();
      if (request.abortSignal?.aborted) throw new AbortError();
      throw error;
    } finally { clearTimeout(timeout); if (request.abortSignal) request.abortSignal.onabort = null; }
  }
}

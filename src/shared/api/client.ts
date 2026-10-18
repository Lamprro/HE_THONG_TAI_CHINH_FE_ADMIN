import { authHeaders, authCredentials, sessionExpired } from './access';
import { safeText } from '../utils/format';
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class ApiError extends Error {
  constructor(message: string, public kind: 'http' | 'network' | 'timeout' | 'empty', public status?: number, public runId?: string, public upstreamStatus?: number) { super(message); }
}

export async function requestJson<T>(base: string, path: string, method = 'GET', payload?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), method === 'GET' ? 8000 : 180000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}${path}`, { method, signal: controller.signal, credentials: authCredentials(), headers: { Accept: 'application/json', ...authHeaders(), ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    if (!response.ok) {
      if (response.status === 401) sessionExpired();
      let message = response.status === 401 ? 'Session expired or authentication required.' : response.status === 403 ? 'You do not have permission for this action.' : `Server returned HTTP ${response.status}.`;
      let runId: string | undefined, upstreamStatus: number | undefined;
      try { const error = await response.json(); if (response.status !== 401 && response.status !== 403 && typeof error.message === 'string') message = safeText(error.message).slice(0, 1000); if (typeof error.runId === 'string' && /^[a-f0-9-]{36}$/i.test(error.runId)) runId = error.runId; if (typeof error.upstreamStatus === 'number') upstreamStatus = error.upstreamStatus; } catch { /* Keep the safe HTTP fallback. */ }
      throw new ApiError(message, 'http', response.status, runId, upstreamStatus);
    }
    if (response.status === 204) throw new ApiError('The server returned an empty response.', 'empty');
    const body = await response.text();
    if (!body.trim()) throw new ApiError('The server returned an empty response.', 'empty');
    try { return JSON.parse(body) as T; }
    catch { throw new ApiError('The server returned invalid JSON.', 'empty'); }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new ApiError(method === 'GET' ? 'Request timed out.' : 'Request timed out. The operation may still complete. Refresh the history before attempting it again.', 'timeout');
    throw new ApiError(method === 'GET' ? 'Unable to connect to the server. Check the Java backend and browser access.' : 'Connection lost. The operation outcome is unknown. Refresh the history before attempting it again.', 'network');
  } finally { window.clearTimeout(timer); }
}
export const getJson = <T>(base: string, path: string) => requestJson<T>(base, path);

export async function getHealth<T>(base: string, path: string): Promise<{ data: T; latencyMs: number; checkedAt: string }> {
  const start = performance.now();
  const data = await getJson<T>(base, path);
  return { data, latencyMs: Math.round(performance.now() - start), checkedAt: new Date().toISOString() };
}

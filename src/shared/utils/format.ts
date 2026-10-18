export const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }) : '—';
export const duration = (start?: string | null, finish?: string | null) => {
  if (!start) return '—';
  if (!finish) return 'In progress / unknown';
  const seconds = Math.max(0, Math.round((new Date(finish).getTime() - new Date(start).getTime()) / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
};
export function safeText(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]').replace(/((?:api[_-]?key|token|password|secret|authorization|credential)\s*[:=]\s*)[^\s,;"}]+/gi, '$1[REDACTED]');
}
export function safeUrl(raw: string | null) {
  if (!raw) return '—';
  try { const url = new URL(raw); if (!['http:', 'https:'].includes(url.protocol)) return '[URL unavailable]'; url.username = ''; url.password = ''; url.search = ''; url.hash = ''; return url.toString(); }
  catch { return '[URL unavailable]'; }
}
export function safeObject(value: unknown): string {
  if (value == null) return '—';
  const scrub = (obj: unknown): unknown => Array.isArray(obj) ? obj.map(scrub) : obj && typeof obj === 'object' ? Object.fromEntries(Object.entries(obj).map(([key, val]) => [key, /token|secret|password|api.?key|authorization|cookie|credential|private|connection/i.test(key) ? '[REDACTED]' : scrub(val)])) : typeof obj === 'string' ? safeText(obj) : obj;
  return JSON.stringify(scrub(value), null, 2);
}

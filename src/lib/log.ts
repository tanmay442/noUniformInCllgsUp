import type { Context } from 'hono';
import type { AppBindings } from '../types';

function requestMeta(c: Context<AppBindings>) {
  return {
    request_id: c.get('requestId'),
    path: c.req.path,
    method: c.req.method,
  };
}

export function logError(c: Context<AppBindings>, err: unknown) {
  const message = err instanceof Error ? err.message : 'unknown_error';
  console.error(JSON.stringify({ type: 'error', ...requestMeta(c), message }));
}

export function logInfo(c: Context<AppBindings>, event: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ type: 'info', event, ...requestMeta(c), ...data }));
}

export function logWorker(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ type: 'worker', event, ...data }));
}
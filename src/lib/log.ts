import type { Context } from 'hono';

export function logError(c: Context, err: unknown) {
  const message = err instanceof Error ? err.message : 'unknown_error';

  console.error('[request_error]', {
    request_id: c.get('requestId'),
    path: c.req.path,
    method: c.req.method,
    message,
  });
}

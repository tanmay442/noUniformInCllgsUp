import type { Context } from 'hono';
import type { AppBindings } from '../types';

type HeaderRecord = Record<string, string>;

export function jsonSuccess<T extends Record<string, unknown>>(
  c: Context<AppBindings>,
  payload: T,
  status = 200,
  headers?: HeaderRecord,
) {
  return c.newResponse(
    JSON.stringify({
      ok: true,
      ...payload,
      request_id: c.get('requestId'),
    }),
    status as never,
    {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  );
}

export function jsonError(
  c: Context<AppBindings>,
  status: number,
  code: string,
  message: string,
) {
  return c.newResponse(
    JSON.stringify({
      ok: false,
      error: {
        code,
        message,
      },
      request_id: c.get('requestId'),
    }),
    status as never,
    {
      'content-type': 'application/json; charset=utf-8',
    },
  );
}

export function cacheControl(ttlSeconds: number, staleWhileRevalidate = ttlSeconds): string {
  return `public, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleWhileRevalidate}`;
}

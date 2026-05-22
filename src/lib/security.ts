import type { Context, MiddlewareHandler } from 'hono';

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();

  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Frame-Options', 'DENY');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; base-uri 'self'; form-action 'self'");
};

export function isSameOrigin(c: Context): boolean {
  const origin = c.req.header('origin');
  if (!origin) {
    return false;
  }

  try {
    return origin === new URL(c.req.url).origin;
  } catch {
    return false;
  }
}

export function buildVotedCookie(): string {
  return '__Host-Voted=true; Max-Age=31536000; Path=/; Secure; HttpOnly; SameSite=Strict';
}

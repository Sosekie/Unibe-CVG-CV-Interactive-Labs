import type { Env } from './env';

export function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function configuredOrigins(env: Pick<Env, 'ALLOWED_ORIGINS'>): string[] {
  return env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
}

/** Returns the origin if the course site or a local preview may call the API from it. */
export function allowedOrigin(origin: string | null, env: Pick<Env, 'ALLOWED_ORIGINS'>): string | null {
  if (!origin) return null;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  if (configuredOrigins(env).includes(origin)) return origin;
  if (url.protocol === 'http:' && isLocalHost(url.hostname)) return origin;
  return null;
}

/** Sign-in may only send its token back to a page of the course site or to a local preview. */
export function allowedReturnUrl(value: string | null, env: Pick<Env, 'ALLOWED_ORIGINS' | 'SITE_PATH'>): URL | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  url.hash = '';
  if (url.protocol === 'https:' && configuredOrigins(env).includes(url.origin) && url.pathname.startsWith(env.SITE_PATH)) return url;
  if (url.protocol === 'http:' && isLocalHost(url.hostname)) return url;
  return null;
}

export function corsHeaders(origin: string | null, env: Pick<Env, 'ALLOWED_ORIGINS'>): Headers {
  const headers = new Headers({ Vary: 'Origin' });
  const allowed = allowedOrigin(origin, env);
  if (allowed) {
    headers.set('Access-Control-Allow-Origin', allowed);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
  }
  return headers;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function redirect(location: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...extraHeaders },
  });
}

export function withHeaders(response: Response, headers: Headers): Response {
  const result = new Response(response.body, response);
  headers.forEach((value, key) => result.headers.set(key, value));
  return result;
}

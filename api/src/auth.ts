import type { Env } from './env';
import { allowedReturnUrl, isLocalHost, json, redirect } from './http';

// Teacher sign-in with GitHub. The API never stores GitHub tokens: after the
// OAuth exchange it only keeps the login name in a short signed session token.
// The token travels back to the course page in the URL fragment and is sent
// as a Bearer header; it is checked against TEACHERS on every request.

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_MS = 12 * 60 * 60 * 1000;
const STATE_MS = 10 * 60 * 1000;
const STATE_COOKIE = 'cv_labs_oauth';

export type Session = { k: 'session'; login: string; exp: number };
export type SignInState = { k: 'state'; nonce: string; returnTo: string; exp: number };

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function signingSecret(env: Pick<Env, 'SESSION_SECRET' | 'GITHUB_CLIENT_SECRET'>): string | null {
  return env.SESSION_SECRET || env.GITHUB_CLIENT_SECRET || null;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode('cv-labs-session-v1:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signToken(payload: Session | SignInState, secret: string): Promise<string> {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
  return body + '.' + base64url(new Uint8Array(signature));
}

async function readToken(token: string, kind: 'session' | 'state', secret: string, now: number): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    if (!(await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64url(parts[1]), encoder.encode(parts[0])))) return null;
    const payload = JSON.parse(decoder.decode(fromBase64url(parts[0]))) as Record<string, unknown> | null;
    if (!payload || payload.k !== kind || typeof payload.exp !== 'number' || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifySession(token: string, secret: string, now = Date.now()): Promise<Session | null> {
  const payload = await readToken(token, 'session', secret, now);
  return payload && typeof payload.login === 'string' ? (payload as Session) : null;
}

export async function verifyState(token: string, secret: string, now = Date.now()): Promise<SignInState | null> {
  const payload = await readToken(token, 'state', secret, now);
  return payload && typeof payload.nonce === 'string' && typeof payload.returnTo === 'string' ? (payload as SignInState) : null;
}

export function isTeacher(login: string, env: Pick<Env, 'TEACHERS'>): boolean {
  const teachers = env.TEACHERS.split(',').map((name) => name.trim().toLowerCase()).filter(Boolean);
  return teachers.includes(login.toLowerCase());
}

/** The signed-in teacher's login, or null. */
export async function requireTeacher(request: Request, env: Env): Promise<string | null> {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('Authorization') ?? '');
  const secret = signingSecret(env);
  if (!match || !secret) return null;
  const session = await verifySession(match[1], secret);
  return session && isTeacher(session.login, env) ? session.login : null;
}

function withFragment(url: URL, params: Record<string, string>): string {
  const target = new URL(url.toString());
  target.hash = new URLSearchParams(params).toString();
  return target.toString();
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

function newSession(login: string, secret: string): Promise<string> {
  return signToken({ k: 'session', login, exp: Date.now() + SESSION_MS }, secret);
}

export async function handleSignIn(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const returnTo = allowedReturnUrl(url.searchParams.get('return_to'), env);
  if (!returnTo) return json({ error: 'Invalid return address.' }, 400);
  const secret = signingSecret(env);
  if (env.DEV_TEACHER_LOGIN && secret && isLocalHost(url.hostname)) {
    return redirect(withFragment(returnTo, { teacher_token: await newSession(env.DEV_TEACHER_LOGIN, secret), login: env.DEV_TEACHER_LOGIN }));
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !secret) return redirect(withFragment(returnTo, { teacher_error: 'not_configured' }));

  const nonce = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const state = await signToken({ k: 'state', nonce, returnTo: returnTo.toString(), exp: Date.now() + STATE_MS }, secret);
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', new URL('/auth/callback', url).toString());
  authorize.searchParams.set('state', state);
  authorize.searchParams.set('allow_signup', 'false');
  return redirect(authorize.toString(), {
    'Set-Cookie': `${STATE_COOKIE}=${nonce}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${STATE_MS / 1000}`,
  });
}

async function githubLogin(code: string, redirectUri: string, env: Env): Promise<string | null> {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'cv-labs-api' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
  });
  if (!tokenResponse.ok) return null;
  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token?: string };
  if (!accessToken) return null;
  const userResponse = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'cv-labs-api', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!userResponse.ok) return null;
  const { login } = (await userResponse.json()) as { login?: unknown };
  return typeof login === 'string' ? login : null;
}

export async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const secret = signingSecret(env);
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !secret) return json({ error: 'Teacher sign-in is not configured.' }, 503);
  const state = await verifyState(url.searchParams.get('state') ?? '', secret);
  const returnTo = state ? allowedReturnUrl(state.returnTo, env) : null;
  if (!state || !returnTo) return json({ error: 'This sign-in link has expired. Start again from the teacher page.' }, 400);

  const clearCookie = { 'Set-Cookie': `${STATE_COOKIE}=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0` };
  const fail = (reason: string, extra: Record<string, string> = {}) => redirect(withFragment(returnTo, { teacher_error: reason, ...extra }), clearCookie);
  if (readCookie(request, STATE_COOKIE) !== state.nonce) return fail('state');
  if (url.searchParams.get('error')) return fail('denied');
  const code = url.searchParams.get('code');
  if (!code) return fail('github');
  const login = await githubLogin(code, new URL('/auth/callback', url).toString(), env);
  if (!login) return fail('github');
  if (!isTeacher(login, env)) return fail('not_allowed', { login });
  return redirect(withFragment(returnTo, { teacher_token: await newSession(login, secret), login }), clearCookie);
}

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { getPlatformProxy } from 'wrangler';
import { signToken } from '../src/auth';
import type { Env } from '../src/env';
import { allowedOrigin, allowedReturnUrl } from '../src/http';
import worker from '../src/index';
import { tutorials } from '../src/tutorials';

// Runs the Worker against a temporary local D1 database with both migrations applied.
const SITE = 'https://sosekie.github.io';
const TEACHER_PAGE = `${SITE}/Unibe-CVG-CV-Interactive-Labs/tutorial-04/teacher/`;
const API = 'https://cv-labs-api.example.workers.dev';
let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
let env: Env;

function call(path: string, init: RequestInit = {}, overrides: Partial<Env> = {}) {
  return worker.fetch(new Request(API + path, init), { ...env, ...overrides });
}

async function teacherToken(login: string, exp = Date.now() + 60_000) {
  return signToken({ k: 'session', login, exp }, 'test-secret');
}

function sqlStatements(sql: string): string[] {
  return sql.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').split(/;\s*(?:\n|$)/).map((statement) => statement.trim()).filter(Boolean);
}

before(async () => {
  proxy = await getPlatformProxy<Env>({ configPath: 'wrangler.json', persist: false });
  env = { ...proxy.env, SESSION_SECRET: 'test-secret' };
  for (const file of readdirSync('migrations').sort()) {
    for (const statement of sqlStatements(readFileSync(`migrations/${file}`, 'utf8'))) await env.DB.prepare(statement).run();
  }
});

after(async () => {
  await proxy.dispose();
});

describe('student endpoints', () => {
  test('state lists every question with the imported totals and releases', async () => {
    const response = await call('/v1/tutorials/tutorial-04/state?voter=student-a');
    assert.equal(response.status, 200);
    const { questions } = (await response.json()) as { questions: Record<string, { votes: number; hasVoted: boolean; published: boolean }> };
    assert.deepEqual(Object.keys(questions), [...tutorials['tutorial-04']]);
    assert.deepEqual(questions['t04-integration-plane'], { votes: 1, hasVoted: false, published: true });
    assert.ok(Object.values(questions).every((question) => question.published));
  });

  test('a browser votes once per question', async () => {
    const vote = (voterId: string, questionId = 't04-stereo-count') => call('/v1/tutorials/tutorial-04/votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, voterId }) });
    assert.deepEqual(await (await vote('student-a')).json(), { votes: 1 });
    assert.deepEqual(await (await vote('student-a')).json(), { votes: 1 });
    assert.deepEqual(await (await vote('student-b')).json(), { votes: 2 });
    assert.deepEqual(await (await vote('student-a', 't04-integration-plane')).json(), { votes: 2 });
    const state = async (voter: string) => ((await (await call(`/v1/tutorials/tutorial-04/state?voter=${voter}`)).json()) as { questions: Record<string, { votes: number; hasVoted: boolean }> }).questions;
    const a = await state('student-a');
    assert.deepEqual([a['t04-stereo-count'], a['t04-integration-plane'], a['t04-stereo-solve'].hasVoted], [{ votes: 2, hasVoted: true, published: true }, { votes: 2, hasVoted: true, published: true }, false]);
    assert.equal((await state('student-c'))['t04-stereo-count'].hasVoted, false);
  });

  test('vote totals always match the individual votes', async () => {
    const { results } = await env.DB.prepare(
      'SELECT t.tutorial, t.question_id, t.votes, (SELECT COUNT(*) FROM votes v WHERE v.tutorial = t.tutorial AND v.question_id = t.question_id) AS counted FROM vote_totals t',
    ).all<{ votes: number; counted: number }>();
    assert.ok(results.length >= 13);
    for (const row of results) assert.equal(row.votes, row.counted);
  });

  test('invalid votes and unknown tutorials are rejected', async () => {
    const post = (body: unknown, tutorial = 'tutorial-04') => call(`/v1/tutorials/${tutorial}/votes`, { method: 'POST', body: JSON.stringify(body) });
    assert.equal((await post({ questionId: 't02-camera-fov', voterId: 'student-a' })).status, 400);
    assert.equal((await post({ questionId: 't04-stereo-count', voterId: 'not valid!' })).status, 400);
    assert.equal((await post({ questionId: 't04-stereo-count' })).status, 400);
    assert.equal((await post({ questionId: 't04-stereo-count', voterId: 'student-a' }, 'tutorial-99')).status, 404);
    assert.equal((await call('/v1/tutorials/tutorial-04/state', { method: 'DELETE' })).status, 405);
  });
});

describe('teacher endpoints', () => {
  test('need a valid session of a listed teacher', async () => {
    const get = (authorization?: string) => call('/v1/tutorials/tutorial-04/teacher', { headers: authorization ? { Authorization: authorization } : {} });
    assert.equal((await get()).status, 401);
    assert.equal((await get('Bearer ' + (await teacherToken('someone-else')))).status, 401);
    assert.equal((await get('Bearer ' + (await teacherToken('Sosekie', Date.now() - 1)))).status, 401);
    const state = await signToken({ k: 'state', nonce: 'n', returnTo: TEACHER_PAGE, exp: Date.now() + 60_000 }, 'test-secret');
    assert.equal((await get('Bearer ' + state)).status, 401);
    const forged = await signToken({ k: 'session', login: 'Sosekie', exp: Date.now() + 60_000 }, 'other-secret');
    assert.equal((await get('Bearer ' + forged)).status, 401);

    const response = await get('Bearer ' + (await teacherToken('sosekie')));
    assert.equal(response.status, 200);
    const body = (await response.json()) as { login: string; questions: Record<string, { votes: number; published: boolean }> };
    assert.equal(body.login, 'sosekie');
    assert.deepEqual(body.questions['t04-integration-plane'], { votes: 2, published: true });
  });

  test('publish and hide one answer or all answers', async () => {
    const headers = { Authorization: 'Bearer ' + (await teacherToken('Sosekie')), 'Content-Type': 'application/json' };
    const put = (body: unknown) => call('/v1/tutorials/tutorial-04/teacher', { method: 'PUT', headers, body: JSON.stringify(body) });
    const published = async () => {
      const { questions } = (await (await call('/v1/tutorials/tutorial-04/state')).json()) as { questions: Record<string, { published: boolean }> };
      return Object.values(questions).filter((question) => question.published).length;
    };
    assert.equal((await put({ questionId: 't04-stereo-solve', published: false })).status, 200);
    assert.equal(await published(), 5);
    assert.equal((await put({ scope: 'all', published: false })).status, 200);
    assert.equal(await published(), 0);
    assert.equal((await put({ scope: 'all', published: true })).status, 200);
    assert.equal(await published(), 6);
    assert.equal((await put({ questionId: 't01-unknown', published: true })).status, 400);
    assert.equal((await put({ scope: 'all', published: 'yes' })).status, 400);
    const row = await env.DB.prepare("SELECT updated_by FROM releases WHERE tutorial = 'tutorial-04' AND question_id = 't04-stereo-solve'").first<{ updated_by: string }>();
    assert.equal(row?.updated_by, 'Sosekie');
  });
});

describe('cross-origin access', () => {
  test('only the course site and local previews get CORS headers', async () => {
    const preflight = (origin: string) => call('/v1/tutorials/tutorial-04/votes', { method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal((await preflight(SITE)).headers.get('Access-Control-Allow-Origin'), SITE);
    assert.equal((await preflight('http://localhost:3000')).headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000');
    assert.equal((await preflight('https://example.com')).headers.get('Access-Control-Allow-Origin'), null);
    assert.equal(allowedOrigin('https://sosekie.github.io.example.com', env), null);
    assert.equal(allowedOrigin('https://sosekie.github.io/', env), null);
  });

  test('sign-in only returns to course pages and local previews', () => {
    assert.equal(allowedReturnUrl(TEACHER_PAGE + '#old', env)?.toString(), TEACHER_PAGE);
    assert.equal(allowedReturnUrl('http://127.0.0.1:4173/teacher/', env)?.toString(), 'http://127.0.0.1:4173/teacher/');
    assert.equal(allowedReturnUrl(`${SITE}/other-repository/`, env), null);
    assert.equal(allowedReturnUrl('https://user:pass@sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/', env), null);
    assert.equal(allowedReturnUrl('javascript:alert(1)', env), null);
    assert.equal(allowedReturnUrl('https://localhost/Unibe-CVG-CV-Interactive-Labs/', env), null);
  });
});

describe('GitHub sign-in', () => {
  const github = { GITHUB_CLIENT_ID: 'client-id', GITHUB_CLIENT_SECRET: 'client-secret', SESSION_SECRET: 'test-secret' };

  test('rejects unknown return addresses and explains a missing configuration', async () => {
    assert.equal((await call('/auth/signin?return_to=' + encodeURIComponent('https://example.com/'))).status, 400);
    const response = await call('/auth/signin?return_to=' + encodeURIComponent(TEACHER_PAGE));
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Location'), TEACHER_PAGE + '#teacher_error=not_configured');
  });

  test('sends teachers to GitHub with a signed state and a matching cookie', async () => {
    const response = await call('/auth/signin?return_to=' + encodeURIComponent(TEACHER_PAGE), {}, github);
    const location = new URL(response.headers.get('Location') ?? '');
    assert.equal(location.origin + location.pathname, 'https://github.com/login/oauth/authorize');
    assert.equal(location.searchParams.get('client_id'), 'client-id');
    assert.equal(location.searchParams.get('redirect_uri'), API + '/auth/callback');
    const nonce = /cv_labs_oauth=([^;]+)/.exec(response.headers.get('Set-Cookie') ?? '')?.[1];
    assert.ok(nonce && location.searchParams.get('state'));
  });

  test('completes the GitHub callback for listed teachers only', async () => {
    const start = await call('/auth/signin?return_to=' + encodeURIComponent(TEACHER_PAGE), {}, github);
    const state = new URL(start.headers.get('Location') ?? '').searchParams.get('state') ?? '';
    const cookie = 'cv_labs_oauth=' + /cv_labs_oauth=([^;]+)/.exec(start.headers.get('Set-Cookie') ?? '')?.[1];
    const callback = (query: string, headers: Record<string, string> = { Cookie: cookie }) => call('/auth/callback?' + query, { headers }, github);

    assert.equal((await callback('code=c&state=forged')).status, 400);
    assert.match((await callback(`code=c&state=${state}`, {})).headers.get('Location') ?? '', /#teacher_error=state$/);
    assert.match((await callback(`error=access_denied&state=${state}`)).headers.get('Location') ?? '', /#teacher_error=denied$/);

    const realFetch = globalThis.fetch;
    let login = 'Sosekie';
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url === 'https://github.com/login/oauth/access_token') return Response.json({ access_token: 'gho_test' });
      if (url === 'https://api.github.com/user') return Response.json({ login });
      return new Response('unexpected', { status: 500 });
    }) as typeof fetch;
    try {
      const success = new URL((await callback(`code=c&state=${state}`)).headers.get('Location') ?? '');
      assert.equal(success.origin + success.pathname, TEACHER_PAGE);
      const fragment = new URLSearchParams(success.hash.slice(1));
      assert.equal(fragment.get('login'), 'Sosekie');
      globalThis.fetch = realFetch;
      const teacher = await call('/v1/tutorials/tutorial-04/teacher', { headers: { Authorization: 'Bearer ' + fragment.get('teacher_token') } });
      assert.equal(teacher.status, 200);

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input instanceof Request ? input.url : input);
        return url.includes('access_token') ? Response.json({ access_token: 'gho_test' }) : Response.json({ login });
      }) as typeof fetch;
      login = 'a-student';
      assert.match((await callback(`code=c&state=${state}`)).headers.get('Location') ?? '', /#teacher_error=not_allowed&login=a-student$/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test('local development can sign in without GitHub, but only on localhost', async () => {
    const devEnv = { DEV_TEACHER_LOGIN: 'Sosekie' };
    const local = await worker.fetch(new Request('http://127.0.0.1:8787/auth/signin?return_to=' + encodeURIComponent('http://127.0.0.1:4173/teacher/')), { ...env, ...devEnv });
    assert.match(local.headers.get('Location') ?? '', /^http:\/\/127\.0\.0\.1:4173\/teacher\/#teacher_token=/);
    const remote = await call('/auth/signin?return_to=' + encodeURIComponent(TEACHER_PAGE), {}, devEnv);
    assert.equal(remote.headers.get('Location'), TEACHER_PAGE + '#teacher_error=not_configured');
  });
});

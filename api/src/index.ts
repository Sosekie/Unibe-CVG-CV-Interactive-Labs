import { handleCallback, handleSignIn, requireTeacher } from './auth';
import type { Env } from './env';
import { corsHeaders, json, withHeaders } from './http';
import { questionIds } from './tutorials';

// Votes and answer releases for the static course labs on GitHub Pages.
//   GET  /v1/tutorials/:tutorial/state?voter=ID   vote counts, own votes, released answers
//   POST /v1/tutorials/:tutorial/votes            { questionId, voterId }
//   GET  /v1/tutorials/:tutorial/teacher          teacher view (Bearer token)
//   PUT  /v1/tutorials/:tutorial/teacher          { questionId | scope: "all", published }
//   GET  /auth/signin?return_to=URL, /auth/callback, GET /v1/me

type QuestionState = { votes: number; hasVoted: boolean; published: boolean };
type TeacherState = { votes: number; published: boolean };

const VOTER_ID = /^[A-Za-z0-9_-]{1,80}$/;

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Students poll this every few seconds, so it reads one row per question plus
// the voter's own votes (index votes_by_voter) instead of every vote.
async function loadState(env: Env, tutorial: string, ids: readonly string[], voterId: string) {
  const [totals, mine, releases] = await env.DB.batch<{ id: string; votes?: number; published?: number }>([
    env.DB.prepare('SELECT question_id AS id, votes FROM vote_totals WHERE tutorial = ?1').bind(tutorial),
    env.DB.prepare('SELECT question_id AS id FROM votes WHERE tutorial = ?1 AND voter_id = ?2').bind(tutorial, voterId),
    env.DB.prepare('SELECT question_id AS id, published FROM releases WHERE tutorial = ?1').bind(tutorial),
  ]);
  const questions: Record<string, QuestionState> = {};
  for (const id of ids) questions[id] = { votes: 0, hasVoted: false, published: false };
  for (const row of totals.results) if (questions[row.id]) questions[row.id].votes = row.votes ?? 0;
  for (const row of mine.results) if (questions[row.id]) questions[row.id].hasVoted = true;
  for (const row of releases.results) if (questions[row.id]) questions[row.id].published = row.published === 1;
  return questions;
}

async function studentState(request: Request, env: Env, tutorial: string, ids: readonly string[]) {
  const voter = new URL(request.url).searchParams.get('voter') ?? '';
  return json({ questions: await loadState(env, tutorial, ids, VOTER_ID.test(voter) ? voter : '') });
}

async function vote(request: Request, env: Env, tutorial: string, ids: readonly string[]) {
  const body = await readJson(request);
  const questionId = typeof body?.questionId === 'string' ? body.questionId : '';
  const voterId = typeof body?.voterId === 'string' ? body.voterId : '';
  if (!ids.includes(questionId) || !VOTER_ID.test(voterId)) return json({ error: 'Invalid vote.' }, 400);
  // One transaction: record the vote, then recount this question.
  await env.DB.batch([
    env.DB.prepare('INSERT INTO votes (tutorial, question_id, voter_id) VALUES (?1, ?2, ?3) ON CONFLICT DO NOTHING').bind(tutorial, questionId, voterId),
    env.DB.prepare(
      'INSERT INTO vote_totals (tutorial, question_id, votes) SELECT ?1, ?2, COUNT(*) FROM votes WHERE tutorial = ?1 AND question_id = ?2 ' +
        'ON CONFLICT (tutorial, question_id) DO UPDATE SET votes = excluded.votes',
    ).bind(tutorial, questionId),
  ]);
  const row = await env.DB.prepare('SELECT votes FROM vote_totals WHERE tutorial = ?1 AND question_id = ?2').bind(tutorial, questionId).first<{ votes: number }>();
  return json({ votes: row?.votes ?? 0 });
}

async function teacherState(env: Env, tutorial: string, ids: readonly string[], login: string) {
  const state = await loadState(env, tutorial, ids, '');
  const questions: Record<string, TeacherState> = {};
  for (const [id, { votes, published }] of Object.entries(state)) questions[id] = { votes, published };
  return json({ login, questions });
}

async function release(request: Request, env: Env, tutorial: string, ids: readonly string[], login: string) {
  const body = await readJson(request);
  const published = body?.published;
  const targets = body?.scope === 'all' ? ids : typeof body?.questionId === 'string' && ids.includes(body.questionId) ? [body.questionId] : [];
  if (!targets.length || typeof published !== 'boolean') return json({ error: 'Invalid question update.' }, 400);
  const statement = env.DB.prepare(
    'INSERT INTO releases (tutorial, question_id, published, updated_by, updated_at) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP) ' +
      'ON CONFLICT (tutorial, question_id) DO UPDATE SET published = excluded.published, updated_by = excluded.updated_by, updated_at = excluded.updated_at',
  );
  await env.DB.batch(targets.map((id) => statement.bind(tutorial, id, published ? 1 : 0, login)));
  return json({ ok: true });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  if (pathname === '/' && method === 'GET') return json({ service: 'cv-labs-api', ok: true });
  if (pathname === '/auth/signin' && method === 'GET') return handleSignIn(request, env);
  if (pathname === '/auth/callback' && method === 'GET') return handleCallback(request, env);
  if (pathname === '/v1/me' && method === 'GET') {
    const login = await requireTeacher(request, env);
    return login ? json({ login }) : json({ error: 'Teacher sign-in required.' }, 401);
  }

  const match = /^\/v1\/tutorials\/([a-z0-9-]+)\/(state|votes|teacher)$/.exec(pathname);
  const ids = match ? questionIds(match[1]) : null;
  if (!match || !ids) return json({ error: 'Not found.' }, 404);
  const [, tutorial, resource] = match;

  if (resource === 'state' && method === 'GET') return studentState(request, env, tutorial, ids);
  if (resource === 'votes' && method === 'POST') return vote(request, env, tutorial, ids);
  if (resource === 'teacher' && (method === 'GET' || method === 'PUT')) {
    const login = await requireTeacher(request, env);
    if (!login) return json({ error: 'Teacher sign-in required.' }, 401);
    return method === 'GET' ? teacherState(env, tutorial, ids, login) : release(request, env, tutorial, ids, login);
  }
  return json({ error: 'Method not allowed.' }, 405);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request.headers.get('Origin'), env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      return withHeaders(await route(request, env), cors);
    } catch (error) {
      console.error(error);
      return withHeaders(json({ error: 'The course server could not complete the request.' }, 500), cors);
    }
  },
} satisfies ExportedHandler<Env>;

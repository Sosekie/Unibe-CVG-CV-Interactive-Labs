import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

let schemaSetup: Promise<unknown> | null = null;

export function getDb() {
  if (!env.DB) {
    throw new Error(
      'Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.',
    );
  }

  return drizzle(env.DB, { schema });
}

export async function ensureDatabaseSchema() {
  if (!env.DB) getDb();
  schemaSetup ??= (async () => {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY NOT NULL,
      group_name TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      prompt TEXT NOT NULL,
      answer TEXT NOT NULL,
      answer_published INTEGER DEFAULT 1 NOT NULL,
      sort_order INTEGER NOT NULL
    )`).run();
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      question_id TEXT NOT NULL,
      voter_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`).run();
    await env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS votes_question_voter_unique
      ON votes (question_id, voter_id)`).run();
  })();
  await schemaSetup;
}

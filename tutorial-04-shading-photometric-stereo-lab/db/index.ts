import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getDb() {
  if (!env.DB) throw new Error('Cloudflare D1 binding DB is unavailable.');
  return drizzle(env.DB, { schema });
}

let schemaReady: Promise<unknown> | null = null;
export function ensureDatabaseSchema() {
  if (!env.DB) throw new Error('Cloudflare D1 binding DB is unavailable.');
  schemaReady ??= env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY NOT NULL, group_name TEXT NOT NULL, difficulty TEXT NOT NULL, prompt TEXT NOT NULL, answer TEXT NOT NULL, answer_published INTEGER DEFAULT 0 NOT NULL, sort_order INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS votes (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, question_id TEXT NOT NULL, voter_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL, FOREIGN KEY (question_id) REFERENCES questions(id) ON UPDATE no action ON DELETE cascade)'),
    env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS votes_question_voter_unique ON votes (question_id, voter_id)'),
  ]);
  return schemaReady;
}

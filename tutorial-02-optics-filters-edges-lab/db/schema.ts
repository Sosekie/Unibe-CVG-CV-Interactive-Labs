import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  groupName: text('group_name').notNull(),
  difficulty: text('difficulty').notNull(),
  prompt: text('prompt').notNull(),
  answer: text('answer').notNull(),
  answerPublished: integer('answer_published', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull(),
});

export const votes = sqliteTable(
  'votes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    voterId: text('voter_id').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex('votes_question_voter_unique').on(table.questionId, table.voterId)],
);

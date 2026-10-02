import { asc, eq, inArray } from 'drizzle-orm';
import { ensureDatabaseSchema, getDb } from '@/db';
import { questions, votes } from '@/db/schema';
import { tutorialQuestions } from '@/lib/question-bank';

export { tutorialQuestions };

export const tutorialQuestionIds = tutorialQuestions.map((question) => question.id);

export async function ensureTutorialQuestions() {
  await ensureDatabaseSchema();
  const db = getDb();
  await db.insert(questions).values(tutorialQuestions.map((question) => ({ ...question }))).onConflictDoNothing();
  for (const question of tutorialQuestions) await db.update(questions).set({ groupName: question.groupName, difficulty: question.difficulty, prompt: question.prompt, answer: question.answer, sortOrder: question.sortOrder }).where(eq(questions.id, question.id));
}

export async function getStudentQuestions(voterId?: string) {
  await ensureTutorialQuestions();
  const db = getDb();
  const [questionRows, voteRows] = await Promise.all([
    db.select().from(questions).where(inArray(questions.id, tutorialQuestionIds)).orderBy(asc(questions.sortOrder)),
    db.select({ questionId: votes.questionId, voterId: votes.voterId }).from(votes).where(inArray(votes.questionId, tutorialQuestionIds)),
  ]);
  return questionRows.map((question) => {
    const matching = voteRows.filter((vote) => vote.questionId === question.id);
    return { id: question.id, groupName: question.groupName, difficulty: question.difficulty, prompt: question.prompt, sortOrder: question.sortOrder, votes: matching.length, hasVoted: voterId ? matching.some((vote) => vote.voterId === voterId) : false, answerPublished: question.answerPublished, ...(question.answerPublished ? { answer: question.answer } : {}) };
  });
}

export async function getTeacherQuestions() {
  await ensureTutorialQuestions();
  const db = getDb();
  const [questionRows, voteRows] = await Promise.all([
    db.select().from(questions).where(inArray(questions.id, tutorialQuestionIds)).orderBy(asc(questions.sortOrder)),
    db.select({ questionId: votes.questionId }).from(votes).where(inArray(votes.questionId, tutorialQuestionIds)),
  ]);
  return questionRows.map((question) => ({ ...question, votes: voteRows.filter((vote) => vote.questionId === question.id).length })).sort((a, b) => b.votes - a.votes || a.sortOrder - b.sortOrder);
}

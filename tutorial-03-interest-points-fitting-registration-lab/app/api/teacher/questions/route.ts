import { eq, inArray } from 'drizzle-orm';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { questions } from '@/db/schema';
import { TEACHER_EMAIL } from '@/lib/teacher';
import { getTeacherQuestions, tutorialQuestionIds, tutorialQuestions } from '@/lib/tutorial-questions';

export const dynamic = 'force-dynamic';

async function verifyTeacher() {
  const user = await getChatGPTUser();
  return Boolean(TEACHER_EMAIL && user?.email.toLowerCase() === TEACHER_EMAIL);
}

export async function GET() {
  if (!(await verifyTeacher())) return Response.json({ error: 'Teacher sign-in required.' }, { status: 401 });
  try {
    return Response.json({ questions: await getTeacherQuestions() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not load questions.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await verifyTeacher())) return Response.json({ error: 'Teacher sign-in required.' }, { status: 401 });
  const payload = await request.json().catch(() => null) as { scope?: string; questionId?: string; published?: boolean } | null;
  const questionId = payload?.questionId?.trim();
  const isAllQuestions = payload?.scope === 'all';
  const isSingleQuestion = typeof questionId === 'string' && tutorialQuestions.some((question) => question.id === questionId);
  if ((!isAllQuestions && !isSingleQuestion) || typeof payload?.published !== 'boolean') {
    return Response.json({ error: 'Invalid question update.' }, { status: 400 });
  }
  try {
    await getDb().update(questions).set({ answerPublished: payload.published }).where(
      isAllQuestions ? inArray(questions.id, tutorialQuestionIds) : eq(questions.id, questionId as string),
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Could not update the question.' }, { status: 500 });
  }
}

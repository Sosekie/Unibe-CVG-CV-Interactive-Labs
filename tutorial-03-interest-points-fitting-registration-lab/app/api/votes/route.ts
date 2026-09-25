import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { votes } from '@/db/schema';
import { ensureTutorialQuestions, tutorialQuestions } from '@/lib/tutorial-questions';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const payload = await request.json() as { questionId?: string; voterId?: string };
    const questionId = payload.questionId?.trim();
    const voterId = payload.voterId?.trim();
    if (!tutorialQuestions.some((question) => question.id === questionId) || !voterId || voterId.length > 80) return Response.json({ error: 'Invalid vote.' }, { status: 400 });
    await ensureTutorialQuestions();
    await getDb().insert(votes).values({ questionId: questionId as string, voterId }).onConflictDoNothing();
    const rows = await getDb().select({ id: votes.id }).from(votes).where(eq(votes.questionId, questionId as string));
    return Response.json({ votes: rows.length });
  } catch { return Response.json({ error: 'Could not submit vote.' }, { status: 500 }); }
}

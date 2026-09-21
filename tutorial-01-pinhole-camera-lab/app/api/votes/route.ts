import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { votes } from "@/db/schema";
import { ensureTutorialQuestions, tutorialQuestions } from "@/lib/tutorial-questions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { questionId?: string; voterId?: string };
    const questionId = payload.questionId?.trim();
    const voterId = payload.voterId?.trim();
    const questionExists = tutorialQuestions.some((question) => question.id === questionId);

    if (!questionExists || !voterId || voterId.length > 80) {
      return Response.json({ error: "Invalid vote." }, { status: 400 });
    }

    await ensureTutorialQuestions();
    const db = getDb();
    await db
      .insert(votes)
      .values({ questionId, voterId })
      .onConflictDoNothing();

    const countRows = await db.select({ id: votes.id }).from(votes).where(eq(votes.questionId, questionId));
    return Response.json({ votes: countRows.length });
  } catch {
    return Response.json({ error: "Could not submit vote." }, { status: 500 });
  }
}

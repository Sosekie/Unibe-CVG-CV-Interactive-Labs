import { eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { questions } from "@/db/schema";
import { ensureTutorialQuestions, getTeacherQuestions, tutorialQuestionIds } from "@/lib/tutorial-questions";
import { parsePublicationChange } from "@/lib/answer-publication";
import { DISCUSSION_CONVENTION } from "@/lib/discussion-convention";

export const dynamic = "force-dynamic";

const TEACHER_EMAIL = process.env.TEACHER_EMAIL?.toLowerCase();

async function verifyTeacher() {
  const user = await getChatGPTUser();
  return Boolean(TEACHER_EMAIL && user?.email.toLowerCase() === TEACHER_EMAIL);
}

export async function GET() {
  if (!(await verifyTeacher())) {
    return Response.json({ error: "Teacher sign-in required." }, { status: 401 });
  }
  try {
    return Response.json({ convention: DISCUSSION_CONVENTION, questions: await getTeacherQuestions() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not load questions." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await verifyTeacher())) {
    return Response.json({ error: "Teacher sign-in required." }, { status: 401 });
  }

  const payload = parsePublicationChange(await request.json().catch(() => null), tutorialQuestionIds);
  if (!payload) {
    return Response.json({ error: "Invalid question update." }, { status: 400 });
  }

  try {
    await ensureTutorialQuestions();
    // One update publishes the full set together, without changing any votes.
    await getDb().update(questions).set({ answerPublished: payload.published }).where(
      "scope" in payload ? inArray(questions.id, tutorialQuestionIds) : eq(questions.id, payload.questionId),
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not update the question." }, { status: 500 });
  }
}

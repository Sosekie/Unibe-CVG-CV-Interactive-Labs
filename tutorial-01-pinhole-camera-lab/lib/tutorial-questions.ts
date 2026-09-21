import { asc, eq, inArray } from "drizzle-orm";
import { ensureDatabaseSchema, getDb } from "@/db";
import { questions, votes } from "@/db/schema";
import { releasedAnswerFields, tutorialAnswers } from "@/lib/tutorial-answers";
import type { DiscussionQuestion } from "@/lib/answer-types";

export const tutorialQuestions = [
  {
    id: "tutorial01-straight-lines",
    prompt: "Show that perspective projection maps straight lines in 3D space to straight lines on the 2D image plane.",
    answer: "The projectable points of a 3D line are collinear in the image. Write the line as P(t) = P₀ + tV and project with (x, y) = f(X/Z, Y/Z). Eliminating t gives a linear equation ax + by + c = 0, but the projected points need not cover the entire image line. If the line passes through the camera centre, its projectable points collapse to a single image point.",
    sortOrder: 1,
  },
  {
    id: "tutorial01-intersections",
    prompt: "Show that the intersection of two 3D lines is mapped by perspective projection to the intersection of their 2D image lines.",
    answer: "If the 3D lines share a visible point P, the unique projection p of P belongs to both projected lines. Therefore their image lines intersect at p, apart from degenerate cases at the camera centre or outside the projection domain.",
    sortOrder: 2,
  },
  {
    id: "tutorial01-intersection-converse",
    prompt: "Show that the converse is not true in general: two image lines may intersect even when their corresponding 3D lines do not.",
    answer: "Perspective projection is not one-to-one: distinct 3D points on the same camera ray have the same image point. Thus two skew 3D lines can have intersecting images even though the lines do not intersect in 3D. Parallel lines and their vanishing-point limits are discussed in Q07.",
    sortOrder: 3,
  },
  {
    id: "tutorial01-angles",
    prompt: "Show that angles are not preserved under perspective projection.",
    answer: "For example, let two short line segments meet at P = (0, 0, 2), with directions V = (1, 0, 1) and W = (1, 1, −1). Their 3D dot product is zero, so the angle is 90°. On the metric tutorial image plane their line directions are (1, 0) and (1, 1), making 45°. Thus perspective projection does not preserve angles in general, although particular angles can be preserved in special configurations.",
    sortOrder: 4,
  },
  {
    id: "tutorial01-lengths",
    prompt: "Show that lengths are not preserved under perspective projection.",
    answer: "Image scale depends on depth. For a vertical segment of height H whose endpoints have the same positive depth Z, its full projected height is |h′| = fH/Z. The same 3D length therefore projects to different image lengths at different depths. If the endpoints have different depths, project them separately.",
    sortOrder: 5,
  },
  {
    id: "tutorial01-horizon-plane",
    prompt: "Determine the 3D plane that corresponds to the horizon.",
    answer: "Assume a level camera with Y vertical and tutorial image coordinates measured from the principal point. The horizontal plane through the camera centre is Y = 0, spanned by (1, 0, 0)ᵀ and (0, 0, 1)ᵀ, and projects to the horizon y = 0. More generally, the horizon is the vanishing line of the ground plane; its image position depends on camera orientation. For ground-plane normal N, the metric tutorial horizon satisfies Nₓx + Nᵧy + fN_z = 0.",
    sortOrder: 6,
  },
  {
    id: "tutorial01-vanishing-point",
    prompt: "Show that parallel lines in 3D space may converge to a vanishing point under perspective projection.",
    answer: "Parallel lines with direction V share the limit p∞ = f(Vₓ/V_z, Vᵧ/V_z) when V_z ≠ 0, so their projections converge to that point in the limit. If V_z = 0, there is no finite vanishing point; the projected lines are parallel or coincident, provided they have projectable points.",
    sortOrder: 7,
  },
] as const;

export const tutorialQuestionIds = tutorialQuestions.map((question) => question.id);

export type StudentQuestion = DiscussionQuestion;

export async function ensureTutorialQuestions() {
  const standaloneMode = process.env.CV_LAB_STANDALONE === "1";
  if (standaloneMode) await ensureDatabaseSchema();
  const db = getDb();
  await db.insert(questions).values(
    tutorialQuestions.map((question) => ({ ...question, answerPublished: standaloneMode })),
  ).onConflictDoNothing();
  // Keep publication state and vote history while refreshing canonical course text.
  for (const question of tutorialQuestions) {
    await db
      .update(questions)
      .set({ prompt: question.prompt, answer: question.answer, sortOrder: question.sortOrder })
      .where(eq(questions.id, question.id));
  }
}

export async function getStudentQuestions(voterId?: string): Promise<StudentQuestion[]> {
  await ensureTutorialQuestions();
  const db = getDb();
  const [questionRows, voteRows] = await Promise.all([
    db.select().from(questions).where(inArray(questions.id, tutorialQuestionIds)).orderBy(asc(questions.sortOrder)),
    db.select({ questionId: votes.questionId, voterId: votes.voterId }).from(votes).where(inArray(votes.questionId, tutorialQuestionIds)),
  ]);

  return questionRows.map((question) => {
    const matchingVotes = voteRows.filter((vote) => vote.questionId === question.id);
    return {
      id: question.id,
      prompt: question.prompt,
      sortOrder: question.sortOrder,
      votes: matchingVotes.length,
      hasVoted: voterId ? matchingVotes.some((vote) => vote.voterId === voterId) : false,
      answerPublished: question.answerPublished,
      ...releasedAnswerFields(question),
    };
  });
}

export async function getTeacherQuestions() {
  await ensureTutorialQuestions();
  const db = getDb();
  const [questionRows, voteRows] = await Promise.all([
    db.select().from(questions).where(inArray(questions.id, tutorialQuestionIds)).orderBy(asc(questions.sortOrder)),
    db.select({ questionId: votes.questionId }).from(votes).where(inArray(votes.questionId, tutorialQuestionIds)),
  ]);

  return questionRows.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    answer: question.answer,
    explanation: tutorialAnswers[question.id],
    answerPublished: question.answerPublished,
    sortOrder: question.sortOrder,
    votes: voteRows.filter((vote) => vote.questionId === question.id).length,
  })).sort((first, second) => second.votes - first.votes || first.sortOrder - second.sortOrder);
}

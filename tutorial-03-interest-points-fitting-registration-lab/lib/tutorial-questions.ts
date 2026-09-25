import { asc, eq, inArray } from 'drizzle-orm';
import { ensureDatabaseSchema, getDb } from '@/db';
import { questions, votes } from '@/db/schema';

export const tutorialQuestions = [
  {
    id: 't03-edges-scale', groupName: 'Edges', difficulty: 'Easy', sortOrder: 1,
    prompt: 'For an ideal intensity step smoothed by a Gaussian, how does increasing σ change the derivative response?',
    answer: 'For a step of contrast ΔI, the derivative after Gaussian smoothing is ΔI·Gσ(x). Its peak ΔI/(√(2π)σ) falls as 1/σ while its width grows with σ; the peak stays centred on the ideal edge.',
  },
  {
    id: 't03-edges-threshold', groupName: 'Edges', difficulty: 'Medium', sortOrder: 2,
    prompt: 'Why can a fixed gradient threshold miss a low-contrast or strongly smoothed edge?',
    answer: 'For a Gaussian-smoothed step, the maximum gradient is ΔI/(√(2π)σ). A fixed threshold T misses the edge when that peak is at or below T. Reducing contrast or increasing σ can cause this without removing the intensity step.',
  },
  {
    id: 't03-interest-harris', groupName: 'Interest Points', difficulty: 'Medium', sortOrder: 3,
    prompt: 'For the Tutorial 03 images, what are the Harris scores at (*) and (**), and why does halving image intensity divide every score by 16?',
    answer: 'Using the sheet’s central differences, 3×3 average and k=0.05, M(*)=[[4,−1],[−1,4]]/9 and M(**)=[[6,0],[0,0]]/9. Their scores are 59/405≈0.14568 and −1/45≈−0.02222. When I²=0.5I¹, M scales by 1/4 and R by 1/16, giving 59/6480 and −1/720.',
  },
  {
    id: 't03-interest-descriptor', groupName: 'Interest Points', difficulty: 'Easy', sortOrder: 4,
    prompt: 'What is the difference between an interest-point detector and a feature descriptor?',
    answer: 'A detector chooses repeatable image locations, optionally with scale or orientation. A descriptor encodes the neighborhood of each selected location for comparison across images. Normalising scale and orientation helps the same physical feature match after zoom or rotation.',
  },
  {
    id: 't03-fitting-line', groupName: 'Fitting', difficulty: 'Easy', sortOrder: 5,
    prompt: 'What least-squares line passes through (0,−7), (2,−1), and (4,5)?',
    answer: 'The normal equations for the three samples are [[20,6],[6,3]][c₁,c₀]ᵀ=[18,−3]ᵀ. Thus c₁=3 and c₀=−7, giving y=3x−7. All three samples lie on this line, so the sum of squared vertical residuals is zero.',
  },
  {
    id: 't03-fitting-prewitt', groupName: 'Fitting', difficulty: 'Medium', sortOrder: 6,
    prompt: 'Why do the two Prewitt masks recover the slopes of the least-squares plane fitted to a 3×3 intensity neighborhood?',
    answer: 'With local u rightward and v upward, the 3×3 plane-fit normal matrix is diag(6,6,9). Thus a=Σuz/6 and b=Σvz/6. In displayed row order, correlation uses Kx=[−1 0 1;−1 0 1;−1 0 1]/6 and Ky=[1 1 1;0 0 0;−1 −1 −1]/6. Convolution flips the signs unless adjusted.',
  },
  {
    id: 't03-registration-affine', groupName: 'Registration', difficulty: 'Easy', sortOrder: 7,
    prompt: 'What is the minimum number of point correspondences needed for a 2D affine transformation?',
    answer: 'A 2D affine map has six parameters and each point pair supplies two equations. Three pairs are the minimum, and the three source points must be non-collinear for a unique exact affine map. With more noisy pairs, solve the overdetermined system by least squares.',
  },
  {
    id: 't03-registration-homography', groupName: 'Registration', difficulty: 'Medium', sortOrder: 8,
    prompt: 'How is a homography estimated with DLT, and what is the minimum number of correspondences?',
    answer: 'Eliminating each point’s unknown scale gives two homogeneous equations per pair, stacked as Ah=0. With noisy pairs, normalise coordinates and take A’s right singular vector with the smallest singular value under ‖h‖=1. A homography has eight degrees of freedom up to scale, so four pairs in general position are the minimum.',
  },
] as const;

export const tutorialQuestionIds = tutorialQuestions.map((question) => question.id);

export async function ensureTutorialQuestions() {
  await ensureDatabaseSchema();
  const db = getDb();
  await db.insert(questions).values(tutorialQuestions.map((question) => ({ ...question }))).onConflictDoNothing();
  for (const question of tutorialQuestions) {
    await db.update(questions).set({ groupName: question.groupName, difficulty: question.difficulty, prompt: question.prompt, answer: question.answer, sortOrder: question.sortOrder }).where(eq(questions.id, question.id));
  }
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

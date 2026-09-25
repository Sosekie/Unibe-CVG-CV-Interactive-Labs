import { asc, eq, inArray } from 'drizzle-orm';
import { ensureDatabaseSchema, getDb } from '@/db';
import { questions, votes } from '@/db/schema';

export const tutorialQuestions = [
  {
    id: 't03-edges-scale', groupName: 'Edges', difficulty: 'Easy', sortOrder: 1,
    prompt: 'For an ideal intensity step smoothed by a Gaussian, how does increasing σ change the derivative response?',
    answer: 'The derivative is a Gaussian centered at the true step. Its peak is ΔI/(√(2π)σ), so increasing σ lowers the peak and widens the response while keeping its center at the edge. This is the localization-versus-noise trade-off of scale.',
  },
  {
    id: 't03-edges-threshold', groupName: 'Edges', difficulty: 'Medium', sortOrder: 2,
    prompt: 'Why can a fixed gradient threshold miss a low-contrast or strongly smoothed edge?',
    answer: 'An edge is reported only where |Iₓ| exceeds the threshold. Lower contrast reduces the whole response, and stronger smoothing lowers its peak in proportion to 1/σ. If the peak falls below the threshold, the edge disappears even though the underlying intensity step is still present.',
  },
  {
    id: 't03-interest-harris', groupName: 'Interest Points', difficulty: 'Medium', sortOrder: 3,
    prompt: 'For the Tutorial 03 images, what are the Harris scores at (*) and (**), and why does halving image intensity divide every score by 16?',
    answer: 'For I¹ with k=0.05, R(*)≈0.146 and R(**)≈−0.0222. For I²=0.5I¹, R(*)≈0.0091 and R(**)≈−0.00139. Gradients scale by α, the second-moment matrix by α², and both det(A) and tr(A)² by α⁴; α=0.5 therefore gives a factor of 1/16.',
  },
  {
    id: 't03-interest-descriptor', groupName: 'Interest Points', difficulty: 'Easy', sortOrder: 4,
    prompt: 'What is the difference between an interest-point detector and a feature descriptor?',
    answer: 'A detector chooses repeatable, distinctive image locations and often their scale/orientation. A descriptor converts the neighborhood around a detected point into a vector that can be compared or matched across images. The descriptor does not detect the point itself.',
  },
  {
    id: 't03-fitting-line', groupName: 'Fitting', difficulty: 'Easy', sortOrder: 5,
    prompt: 'What least-squares line passes through (0,−7), (2,−1), and (4,5)?',
    answer: 'The normal equations are [[20,6],[6,3]][c₁,c₀]ᵀ=[18,−3]ᵀ. Solving gives c₁=3 and c₀=−7, hence y=3x−7. These three samples happen to be exactly collinear.',
  },
  {
    id: 't03-fitting-prewitt', groupName: 'Fitting', difficulty: 'Medium', sortOrder: 6,
    prompt: 'Why do the two Prewitt masks recover the slopes of the least-squares plane fitted to a 3×3 intensity neighborhood?',
    answer: 'Centering x,y at the middle pixel makes the normal-equation matrix diagonal: diag(6,6,9). Thus a=(1/6)Σxz, b=(1/6)Σyz, and c=(1/9)Σz. The coefficient patterns multiplying z are precisely the normalized horizontal and vertical Prewitt masks, up to the chosen image-axis sign convention.',
  },
  {
    id: 't03-fitting-tls', groupName: 'Fitting', difficulty: 'Medium', sortOrder: 7,
    prompt: 'How is the total-least-squares line obtained from the centered point matrix?',
    answer: 'Center the points to form U=[xᵢ−x̄, yᵢ−ȳ]. The unit normal [a,b]ᵀ is the eigenvector of UᵀU with the smallest eigenvalue, and d=a x̄+bȳ. For the tutorial points one valid sign choice is [a,b]=[−3/√10,1/√10] and d=−7/√10.',
  },
  {
    id: 't03-registration-affine', groupName: 'Registration', difficulty: 'Easy', sortOrder: 8,
    prompt: 'What is the minimum number of point correspondences needed for a 2D affine transformation?',
    answer: 'An affine map has six unknown parameters and each point pair provides two equations, so three pairs are the minimum. The three source points must be non-collinear (and the correspondence configuration non-degenerate); three merely distinct collinear points do not determine a unique affine map.',
  },
  {
    id: 't03-registration-homography', groupName: 'Registration', difficulty: 'Medium', sortOrder: 9,
    prompt: 'How is a homography estimated with DLT, and what is the minimum number of correspondences?',
    answer: 'Eliminating the per-point scale yields two homogeneous equations per pair and a system Ah=0. Solve under ‖h‖=1 using the right singular vector of A with the smallest singular value. A homography has eight degrees of freedom up to any nonzero scale, so at least four correspondences in general position are required.',
  },
] as const;

export const tutorialQuestionIds = tutorialQuestions.map((question) => question.id);

export async function ensureTutorialQuestions() {
  await ensureDatabaseSchema();
  const standaloneMode = process.env.CV_LAB_STANDALONE === '1';
  const db = getDb();
  await db.insert(questions).values(
    tutorialQuestions.map((question) => ({ ...question, answerPublished: standaloneMode })),
  ).onConflictDoNothing();
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

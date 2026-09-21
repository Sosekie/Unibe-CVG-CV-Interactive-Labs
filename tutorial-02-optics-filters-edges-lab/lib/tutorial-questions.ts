import { asc, eq, inArray } from 'drizzle-orm';
import { ensureDatabaseSchema, getDb } from '@/db';
import { questions, votes } from '@/db/schema';

export const tutorialQuestions = [
  {
    id: 't02-camera-thickness', groupName: 'Camera Models', difficulty: 'Easy', sortOrder: 1,
    prompt: 'A camera has f = 50 mm and focuses an object at D = 5 m. What is the minimum camera thickness, and is the given aperture A = 2 cm needed?',
    answer: 'Use 1/D + 1/D′ = 1/f. This gives D′ = fD/(D−f) = 50.505 mm ≈ 5.05 cm, which lower-bounds the camera thickness. The aperture diameter is not needed for this calculation.',
  },
  {
    id: 't02-camera-blur', groupName: 'Camera Models', difficulty: 'Easy', sortOrder: 2,
    prompt: 'For f = 40 mm, aperture A = 2 cm, and a sensor 5 cm behind the lens, what blur diameter does an object at infinity produce?',
    answer: 'An object at infinity focuses at D′ = f = 4 cm. Similar triangles give B = A|D′s−D′|/D′ = 2·|5−4|/4 = 0.5 cm.',
  },
  {
    id: 't02-camera-fov', groupName: 'Camera Models', difficulty: 'Easy', sortOrder: 3,
    prompt: 'A 4 cm × 4 cm sensor sits behind a lens with f = 50 mm. What is the camera field of view?',
    answer: 'For either sensor dimension, FoV = 2 arctan(d/(2f)) = 2 arctan(4 cm/(2·5 cm)) ≈ 43.6°. The sensor is square, so the nominal horizontal and vertical FoVs match.',
  },
  {
    id: 't02-camera-events', groupName: 'Edges', difficulty: 'Medium', sortOrder: 7,
    prompt: 'Using constant brightness, explain why event cameras primarily trigger on moving edges.',
    answer: 'Let L = log I. Constant brightness gives Lt = −∇Lᵀv, so over a small interval ΔL ≈ −∇LᵀvΔt. A pixel emits an event when |ΔL| reaches C, with sign(ΔL) giving polarity. Uniform regions have ∇L = 0, and motion tangent to an edge has ∇Lᵀv ≈ 0; motion across an edge maximizes the response.',
  },
  {
    id: 't02-filter-repeat', groupName: 'Filters', difficulty: 'Medium', sortOrder: 5,
    prompt: 'Apply a 1×3 averaging filter twice to [a,b,c,d,e,f,g]. What is the final center value, and what single filter is equivalent?',
    answer: 'The final center is (b + 2c + 3d + 2e + f)/9. Away from boundaries, convolving [1,1,1]/3 with itself yields the equivalent 1×5 kernel [1,2,3,2,1]/9. Full-image equivalence requires operating on the extended signal through both passes and cropping only once at the end.',
  },
  {
    id: 't02-filter-kernel', groupName: 'Filters', difficulty: 'Medium', sortOrder: 6,
    prompt: 'Find the horizontal 1×3 convolution kernel that maps the given tutorial matrix I to I′ under one-value zero padding.',
    answer: 'Solving the equations row by row gives k = [0.25, 0.5, 0.25]. Because the operation is convolution, the kernel is flipped horizontally; here symmetry makes the flipped kernel identical.',
  },
] as const;

export const tutorialQuestionIds = tutorialQuestions.map((question) => question.id);

export type StudentQuestion = {
  id: string;
  groupName: string;
  difficulty: string;
  prompt: string;
  sortOrder: number;
  votes: number;
  hasVoted: boolean;
  answer?: string;
  answerPublished: boolean;
};

export async function ensureTutorialQuestions() {
  const standaloneMode = process.env.CV_LAB_STANDALONE === '1';
  if (standaloneMode) await ensureDatabaseSchema();
  const db = getDb();
  await db.insert(questions).values(
    tutorialQuestions.map((question) => ({ ...question, answerPublished: standaloneMode })),
  ).onConflictDoNothing();
  for (const question of tutorialQuestions) {
    await db.update(questions).set({
      groupName: question.groupName,
      difficulty: question.difficulty,
      prompt: question.prompt,
      answer: question.answer,
      sortOrder: question.sortOrder,
    }).where(eq(questions.id, question.id));
  }
}

export async function getStudentQuestions(voterId?: string): Promise<StudentQuestion[]> {
  await ensureTutorialQuestions();
  const db = getDb();
  const [questionRows, voteRows] = await Promise.all([
    db.select().from(questions).where(inArray(questions.id, tutorialQuestionIds)).orderBy(asc(questions.sortOrder)),
    db.select({ questionId: votes.questionId, voterId: votes.voterId }).from(votes).where(inArray(votes.questionId, tutorialQuestionIds)),
  ]);
  return tutorialQuestions.map((question) => {
    const storedQuestion = questionRows.find((row) => row.id === question.id);
    const matchingVotes = voteRows.filter((vote) => vote.questionId === question.id);
    const answerPublished = storedQuestion?.answerPublished ?? false;
    return {
      id: question.id,
      groupName: question.groupName,
      difficulty: question.difficulty,
      prompt: question.prompt,
      sortOrder: question.sortOrder,
      votes: matchingVotes.length,
      hasVoted: voterId ? matchingVotes.some((vote) => vote.voterId === voterId) : false,
      answerPublished,
      ...(answerPublished ? { answer: question.answer } : {}),
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
  return tutorialQuestions.map((question) => ({
    ...question,
    answerPublished: questionRows.find((row) => row.id === question.id)?.answerPublished ?? false,
    votes: voteRows.filter((vote) => vote.questionId === question.id).length,
  })).sort((first, second) => second.votes - first.votes || first.sortOrder - second.sortOrder);
}

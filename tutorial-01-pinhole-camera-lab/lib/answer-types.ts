export type PlotPoint = readonly [number, number];
export type AnswerPlot = {
  title: string;
  caption: string;
  bounds: readonly [number, number, number, number];
  axisLabels: readonly [string, string];
  lines: { points: PlotPoint[]; tone: "blue" | "orange" | "muted"; dashed?: boolean; label: string }[];
  points: { at: PlotPoint; label: string; below?: boolean }[];
};

export type AnswerExplanation = {
  conclusion: string;
  illustration: AnswerPlot;
  steps: { title: string; text: string; formula?: string }[];
  caveat: string;
  reflection: string;
};

export type DiscussionQuestion = {
  id: string;
  prompt: string;
  sortOrder: number;
  votes: number;
  hasVoted?: boolean;
  answerPublished: boolean;
  answer?: string;
  explanation?: AnswerExplanation;
};

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tutorials } from '../src/tutorials';
import { tutorialQuestions as questions01, tutorialSlug as slug01 } from '../../tutorial-01-pinhole-camera-lab/lib/question-bank';
import { tutorialQuestions as questions02, tutorialSlug as slug02 } from '../../tutorial-02-optics-filters-edges-lab/lib/question-bank';
import { tutorialQuestions as questions03, tutorialSlug as slug03 } from '../../tutorial-03-interest-points-fitting-registration-lab/lib/question-bank';
import { tutorialQuestions as questions04, tutorialSlug as slug04 } from '../../tutorial-04-shading-photometric-stereo-lab/lib/question-bank';

// The API only accepts the question ids registered in src/tutorials.ts. A lab
// whose question bank differs would show questions that cannot be voted on.
test('the API knows exactly the questions of every lab', () => {
  const labs: [string, readonly { id: string }[]][] = [[slug01, questions01], [slug02, questions02], [slug03, questions03], [slug04, questions04]];
  assert.deepEqual(labs.map(([slug]) => slug), Object.keys(tutorials));
  for (const [slug, questions] of labs) assert.deepEqual(questions.map((question) => question.id), [...tutorials[slug]], slug);
});

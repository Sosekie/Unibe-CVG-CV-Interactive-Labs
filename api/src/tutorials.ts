// Question ids per tutorial. The labs keep the prompts and answers in their own
// lib/question-bank.ts; this list only lets the API reject unknown ids.
// test/registry.test.ts checks that it matches the labs.
export const tutorials: Readonly<Record<string, readonly string[]>> = {
  'tutorial-01': [
    'tutorial01-straight-lines',
    'tutorial01-intersections',
    'tutorial01-intersection-converse',
    'tutorial01-angles',
    'tutorial01-lengths',
    'tutorial01-horizon-plane',
    'tutorial01-vanishing-point',
  ],
  'tutorial-02': [
    't02-camera-thickness',
    't02-camera-blur',
    't02-camera-fov',
    't02-camera-events',
    't02-filter-repeat',
    't02-filter-kernel',
  ],
  'tutorial-03': [
    't03-edges-scale',
    't03-edges-threshold',
    't03-interest-harris',
    't03-interest-descriptor',
    't03-fitting-line',
    't03-fitting-prewitt',
    't03-registration-affine',
    't03-registration-homography',
  ],
  'tutorial-04': [
    't04-integration-plane',
    't04-integration-test',
    't04-stereo-count',
    't04-stereo-solve',
    't04-reflectance-peak',
    't04-near-light-peak',
  ],
};

export function questionIds(tutorial: string): readonly string[] | null {
  return Object.hasOwn(tutorials, tutorial) ? tutorials[tutorial] : null;
}

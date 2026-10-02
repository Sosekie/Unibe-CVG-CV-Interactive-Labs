import type { ReactNode } from 'react';

// Released answers: numbered derivation steps, the result and a takeaway,
// following the Tutorial 04 solution sheet.
type Answer = { title: string; steps: { title: string; body: ReactNode; equation?: ReactNode }[]; takeaway: ReactNode; lab: string };

const answers: Record<string, Answer> = {
  't04-integration-plane': {
    title: 'The normal of a tilted plane',
    lab: 'Lab 01 · worksheet Q1(b)',
    steps: [
      { title: 'Read off the slopes', body: <p>For z = 2x − y + 3 the slopes are constant: zₓ = 2 and zᵧ = −1.</p> },
      { title: 'Use the convention of slide 9', body: <p>N = (p, q, 1) with p = −zₓ and q = −zᵧ.</p>, equation: <>p = −2, q = 1 · N = (−2, 1, 1)ᵀ · n = (−2, 1, 1)ᵀ / √6</> },
      { title: 'Check with slide 25', body: <p>Going back from the normal to the slopes gives the plane again.</p>, equation: <>∇z = −(n₁/n₃, n₂/n₃) = −(−2, 1) = (2, −1)</> },
    ],
    takeaway: <>The plane rises toward +x, so it faces the −x side: <b>a normal leans opposite to the uphill direction</b>. This is why p and zₓ have opposite signs.</>,
  },
  't04-integration-test': {
    title: 'Testing a slope field for integrability',
    lab: 'Lab 01 · worksheet Q1(c)',
    steps: [
      { title: 'Derive the condition', body: <p>For a smooth depth map the mixed derivatives agree, zₓᵧ = zᵧₓ. With p = −zₓ and q = −zᵧ the minus signs cancel.</p>, equation: <>pᵧ = −zₓᵧ = −zᵧₓ = qₓ</> },
      { title: 'Test (p, q) = (y, x)', body: <p>pᵧ = 1 and qₓ = 1, so the field is integrable. Integrating zₓ = −y and zᵧ = −x gives the surface.</p>, equation: <>z = −xy + C</> },
      { title: 'Test (p, q) = (y, 0)', body: <p>pᵧ = 1 but qₓ = 0, so no depth map has these slopes. Integrating zₓ = −y, zᵧ = 0 from (0, 0) to (1, 1) depends on the path.</p>, equation: <>via (1, 0): Δz = 0 · via (0, 1): Δz = −1</> },
    ],
    takeaway: <>A field with <b>pᵧ ≠ qₓ</b> is the slope field of no surface. Least squares then returns the closest integrable field, as lab 01 shows with the swirl slider.</>,
  },
  't04-stereo-count': {
    title: 'How many images, and which lights?',
    lab: 'Lab 02 · worksheet Q3',
    steps: [
      { title: 'Count unknowns and equations', body: <p>The scaled normal g = ρn has three unknown components. Each image gives one linear equation.</p>, equation: <>Iₖ = Lₖsₖᵀg · three images are the minimum</> },
      { title: 'State the condition', body: <p>The 3 × 3 matrix S must be invertible: the three light directions must not lie in one plane through the origin.</p> },
      { title: 'Check the given lights', body: <p>(0, 0, 1), (1, 0, 1)/√2 and (−1, 0, 1)/√2 all have a zero y-component, so they lie in the x-z plane and the second column of S is zero.</p>, equation: <>rank S = 2 · g + t(0, 1, 0) fits equally well</> },
    ],
    takeaway: <>These lights cannot recover n₂, and with it ρ. <b>Three lights are enough only if they are linearly independent.</b> Choose “Coplanar (Q3b)” in lab 02 to see the rank drop.</>,
  },
  't04-stereo-solve': {
    title: 'Solving for albedo and normal',
    lab: 'Lab 02 · worksheet Q4',
    steps: [
      { title: 'Write the system', body: <p>With the light directions as rows, Sg = I.</p>, equation: <>g₃ = 1/5 · (g₁ + g₃)/√2 = 3√2/10 · (g₂ + g₃)/√2 = 3√2/10</> },
      { title: 'Solve row by row', body: <p>The second row gives g₁ + g₃ = 3/5, so g₁ = 2/5; the third gives g₂ = 2/5.</p>, equation: <>g = (2/5, 2/5, 1/5)</> },
      { title: 'Split albedo and normal', body: <p>The length of g is the albedo; its direction is the normal.</p>, equation: <>ρ = ‖g‖ = 3/5 · n = g/ρ = (2/3, 2/3, 1/3)</> },
    ],
    takeaway: <><b>g is not a unit vector</b>: its length 3/5 is the albedo. Choose “Worksheet Q4” in lab 02 to reproduce these numbers.</>,
  },
  't04-reflectance-peak': {
    title: 'Brightest and black orientations',
    lab: 'Lab 03 · distant light · worksheet Q2(b)',
    steps: [
      { title: 'Write the reflectance map', body: <p>With n = (p, q, 1)/√(p² + q² + 1) and s = (1, 0, 1)/√2 (slide 10):</p>, equation: <>R(p, q) = (p + 1) / (√2 · √(p² + q² + 1))</> },
      { title: 'Find the maximum', body: <p>R = cos θᵢ ≤ 1, with equality only when n = s (slide 12).</p>, equation: <>R = 1 at (p, q) = (pₛ, qₛ) = (1, 0)</> },
      { title: 'Find the black orientations', body: <p>R = 0 where ppₛ + qqₛ + 1 = 0, here the line p = −1; there the light grazes the surface. For p &lt; −1 the surface faces away from the light.</p> },
    ],
    takeaway: <>The brightest orientation is <b>the one that points at the light</b>. Drag the white point onto the orange dot in lab 03 to see R reach 1.</>,
  },
  't04-near-light-peak': {
    title: 'The brightest point under a nearby light',
    lab: 'Lab 03 · nearby light · worksheet Q7(a)',
    steps: [
      { title: 'Light direction at each point', body: <p>For X = (x, y, 0) the light direction changes across the plane.</p>, equation: <>A − X = (5 − x, 5 − y, 10) · s = (A − X)/‖A − X‖</> },
      { title: 'Brightness', body: <p>With n = (0, 0, 1), only the third component of s matters.</p>, equation: <>B(x, y) = 10 / √((x − 5)² + (y − 5)² + 100)</> },
      { title: 'Maximum', body: <p>The distance is smallest, 10, at (5, 5), so B ≤ 1 with equality there.</p>, equation: <>brightest point (5, 5, 0) · B = 1</> },
    ],
    takeaway: <>Below the light, <b>s = n</b>: the rule of slide 12 applied to a light whose direction changes over the plane.</>,
  },
};

export function WorkedAnswer({ questionId, fallback }: { questionId: string; fallback: string }) {
  const answer = answers[questionId];
  if (!answer) return <div className="released-answer"><span>ANSWER</span><p>{fallback}</p></div>;
  return <div className="worked-answer">
    <div className="answer-title-row"><span>WORKED ANSWER</span><strong>{answer.title}</strong><small>{answer.lab}</small></div>
    <div className="answer-steps">{answer.steps.map((step, index) => <div className="answer-step" key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong>{step.body}{step.equation ? <div className="answer-equation">{step.equation}</div> : null}</div></div>)}</div>
    <div className="answer-takeaway"><span>TAKEAWAY</span><p>{answer.takeaway}</p></div>
  </div>;
}

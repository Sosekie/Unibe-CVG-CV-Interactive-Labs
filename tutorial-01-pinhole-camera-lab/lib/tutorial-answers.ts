// Loaded by the server question repository only. Unreleased explanations must
// never be imported by a client component or included in the student payload.
import type { AnswerExplanation } from "./answer-types";

export const tutorialAnswers: Record<string, AnswerExplanation> = {
  "tutorial01-straight-lines": {
    conclusion: "The projectable points of a 3D line are collinear in the image. If the line passes through the camera centre, its projectable points collapse to a single image point.",
    illustration: {
      title: "Different depths, one image line",
      caption: "For P(t) = (t, 1, 2 + t), the marked samples t = 0, 1, 2 all satisfy x + 2y = 1 after projection.",
      bounds: [-0.15, 0.8, -0.1, 0.7], axisLabels: ["x", "y"],
      lines: [{ points: [[-0.1, 0.55], [0.75, 0.125]], tone: "blue", label: "Projected line: x + 2y = 1" }],
      points: [{ at: [0, 0.5], label: "t = 0" }, { at: [1 / 3, 1 / 3], label: "t = 1" }, { at: [0.5, 0.25], label: "t = 2", below: true }],
    },
    steps: [
      { title: "Form a plane through the camera", text: "A 3D line that does not contain the camera centre and the camera centre O define a plane. Let n be its non-zero normal. Every point P on the line obeys n · P = 0." },
      { title: "Substitute the perspective equations", text: "With Z ≠ 0, divide by Z and use x = fX/Z and y = fY/Z. The result is a linear equation on the image plane.", formula: "nₓx + nᵧy + fn_z = 0" },
      { title: "Check the plotted example", text: "Here X = t, Y = 1 and Z = 2 + t. Substitution eliminates t directly.", formula: "x + 2y = t/(2+t) + 2/(2+t) = 1" },
    ],
    caveat: "The images need not cover the entire image line: the example approaches (1, 0) only as depth tends to infinity. Z = 0 has no finite image. A line through O collapses its projectable points to one point; a line entirely in Z = 0 has no finite projection.",
    reflection: "What happens if you move several points along the same ray from the camera?",
  },
  "tutorial01-intersections": {
    conclusion: "A shared, projectable 3D point remains shared by both image lines.",
    illustration: {
      title: "One 3D intersection gives one image point",
      caption: "L₁(t) = (1+t, 1, 2) and L₂(s) = (1, 1+s, 2) share P = (1, 1, 2). Both images pass through p = (½, ½).",
      bounds: [-0.2, 1.2, -0.2, 1.2], axisLabels: ["x", "y"],
      lines: [{ points: [[-0.1, 0.5], [1.1, 0.5]], tone: "blue", label: "Image of L₁: y = ½" }, { points: [[0.5, -0.1], [0.5, 1.1]], tone: "orange", label: "Image of L₂: x = ½" }],
      points: [{ at: [0.5, 0.5], label: "p = (½, ½)" }],
    },
    steps: [
      { title: "Start with the shared point", text: "Let P belong to both L₁ and L₂, with Z ≠ 0. Perspective projection assigns P a unique image p.", formula: "p = π(P) = (fX/Z, fY/Z)" },
      { title: "Preserve membership", text: "Because P is on L₁, p belongs to its image. The same argument applies to L₂. Thus both projected sets contain p.", formula: "P ∈ L₁ ∩ L₂  ⇒  π(P) ∈ π(L₁) ∩ π(L₂)" },
    ],
    caveat: "The image lines may coincide, or a line through the camera may collapse to a point. The safe statement is shared-point membership, not always a unique crossing of two distinct image lines.",
    reflection: "Does a shared image point guarantee that the original 3D points are the same? Compare Q03.",
  },
  "tutorial01-intersection-converse": {
    conclusion: "Perspective projection is not one-to-one: distinct 3D points on the same camera ray have the same image point. Thus two skew 3D lines can have intersecting images without meeting in 3D.",
    illustration: {
      title: "Same image crossing, different depths",
      caption: "L₁(t) = (t, 0, 1) and L₂(s) = (0, s, 2) never meet: their Z coordinates differ. Yet A = (0, 0, 1) and B = (0, 0, 2) both project to the origin.",
      bounds: [-1.2, 1.2, -1, 1], axisLabels: ["x", "y"],
      lines: [{ points: [[-1.1, 0], [1.1, 0]], tone: "blue", label: "L₁ at Z = 1 → horizontal image line" }, { points: [[0, -0.9], [0, 0.9]], tone: "orange", label: "L₂ at Z = 2 → vertical image line" }],
      points: [{ at: [0, 0], label: "π(A) = π(B)" }],
    },
    steps: [
      { title: "Prove the 3D lines do not meet", text: "Every point on L₁ has Z = 1. Every point on L₂ has Z = 2. No choice of t and s can make the 3D points equal." },
      { title: "Project both lines with f = 1", text: "Their images are the x and y axes, which intersect at (0, 0). The two 3D points responsible for that crossing lie on one camera ray.", formula: "π(L₁(t)) = (t, 0)    ·    π(L₂(s)) = (0, s/2)" },
    ],
    caveat: "This counterexample uses two distinct points at finite depths. Parallel lines and their vanishing-point limits are discussed in Q07. In an opaque scene, occlusion can hide a point behind another object.",
    reflection: "What additional information would distinguish A from B in the image?",
  },
  "tutorial01-angles": {
    conclusion: "A right angle in 3D can become 45° in the image. Perspective projection does not preserve angles in general.",
    illustration: {
      title: "A 90° angle becomes 45°",
      caption: "The 3D segments start at P = (0, 0, 2), with directions V = (1, 0, 1) and W = (1, 1, −1). Their image rays have directions (1, 0) and (1, 1). Equal x/y plot scales preserve the displayed 45°.",
      bounds: [-0.2, 1.25, -0.2, 1.25], axisLabels: ["x", "y"],
      lines: [{ points: [[0, 0], [1 / 3, 0]], tone: "blue", label: "Image of P → P + V" }, { points: [[0, 0], [1, 1]], tone: "orange", label: "Image of P → P + W" }],
      points: [{ at: [0, 0], label: "45°", below: true }, { at: [1 / 3, 0], label: "(⅓, 0)", below: true }, { at: [1, 1], label: "(1, 1)" }],
    },
    steps: [
      { title: "Verify the 3D right angle", text: "The two non-zero direction vectors are perpendicular because their dot product is zero.", formula: "V · W = 1×1 + 0×1 + 1×(−1) = 0" },
      { title: "Project the three endpoints", text: "Using f = 1, P maps to (0, 0), P + V = (1, 0, 3) maps to (⅓, 0), and P + W = (1, 1, 1) maps to (1, 1)." },
      { title: "Measure the image angle", text: "The angle between (1, 0) and (1, 1) is 45°. One valid counterexample disproves general preservation.", formula: "cos θ = 1/√2  ⇒  θ = 45°" },
    ],
    caveat: "Some angles are preserved in special configurations. This example uses metric image coordinates with equal axis scales; an additional unequal pixel scaling can change angles again.",
    reflection: "Would the angle be preserved if both directions lay in a plane parallel to the image plane?",
  },
  "tutorial01-lengths": {
    conclusion: "Equal 3D lengths can have unequal image lengths. Doubling depth halves the projected height.",
    illustration: {
      title: "Same height H = 1; twice the depth",
      caption: "Segment A joins (−1, 0, 2) to (−1, 1, 2). Segment B joins (2, 0, 4) to (2, 1, 4). Both are one unit tall in 3D; their image heights are ½ and ¼.",
      bounds: [-0.85, 0.85, -0.15, 0.75], axisLabels: ["x", "y"],
      lines: [{ points: [[-0.5, 0], [-0.5, 0.5]], tone: "blue", label: "A: Z = 2 → image height ½" }, { points: [[0.5, 0], [0.5, 0.25]], tone: "orange", label: "B: Z = 4 → image height ¼" }],
      points: [{ at: [-0.5, 0.5], label: "½" }, { at: [0.5, 0.25], label: "¼" }],
    },
    steps: [
      { title: "Subtract the projected endpoints", text: "For a vertical segment whose endpoints have the same depth Z > 0, their vertical image coordinates differ by f times the height divided by Z.", formula: "Δy = f(Y₂ − Y₁)/Z = fH/Z" },
      { title: "Change only the depth", text: "Keep f and H fixed. Moving the segment from Z to 2Z halves its image height.", formula: "h(2Z) = fH/(2Z) = ½ h(Z)" },
    ],
    caveat: "If the endpoints have different depths, project them separately. The formula fH/Z describes a segment at a common depth, not an arbitrarily tilted object.",
    reflection: "Could you determine an object’s real height from its image height alone? What else would you need?",
  },
  "tutorial01-horizon-plane": {
    conclusion: "For a level camera, the horizon comes from the horizontal plane through the camera centre: Y = 0.",
    illustration: {
      title: "Ground directions meet the horizon",
      caption: "With the ground at Y = −1 and a level camera, lines (−1, −1, Z) and (1, −1, Z) approach the same point (0, 0) as Z → ∞. Other ground directions give other points along y = 0.",
      bounds: [-1.35, 1.35, -1.25, 0.55], axisLabels: ["x", "y"],
      lines: [{ points: [[-1.25, 0], [1.25, 0]], tone: "muted", dashed: true, label: "Horizon: y = 0" }, { points: [[-1, -1], [0, 0]], tone: "blue", label: "Left ground line, extended to its vanishing point" }, { points: [[1, -1], [0, 0]], tone: "orange", label: "Right ground line, extended to its vanishing point" }],
      points: [{ at: [0, 0], label: "Vanishing point" }],
    },
    steps: [
      { title: "Back-project the horizon", text: "For a level camera, y = 0 implies Y = 0 for finite, projectable points. The rays through the horizon span the horizontal plane through O, parallel to the ground.", formula: "span{(1, 0, 0), (0, 0, 1)} = {P : Y = 0}" },
      { title: "Distinguish the plane from the ground", text: "The ground below the camera is not Y = 0. Its points at increasing depth approach the horizon in the image. Ground-parallel directions generate this vanishing line." },
      { title: "Allow the camera to tilt", text: "Let N be the ground-plane normal expressed in camera coordinates. Horizon rays have direction (x, y, f), perpendicular to N. The horizon moves when camera orientation changes.", formula: "Nₓx + Nᵧy + fN_z = 0" },
    ],
    caveat: "The formula y = 0 assumes a level camera and an origin at the principal point. It is not the horizon position for every camera orientation.",
    reflection: "When you tilt the camera upward, why does the horizon move in the image?",
  },
  "tutorial01-vanishing-point": {
    conclusion: "Parallel 3D lines share a vanishing point determined by their direction, when that direction has a non-zero depth component.",
    illustration: {
      title: "Different starting points, the same limit",
      caption: "Lines Pₐ(t) = (a + t, 0.5, 2 + t), for a = −1 and a = 1, share direction V = (1, 0, 1). Both image lines approach (1, 0). The dashed parts extend toward the limiting point.",
      bounds: [-0.8, 1.3, -0.3, 0.65], axisLabels: ["x", "y"],
      lines: [
        { points: [[-0.5, 0.25], [0.7, 0.05]], tone: "blue", label: "Line A, a = −1" },
        { points: [[0.5, 0.25], [0.9, 0.05]], tone: "orange", label: "Line B, a = 1" },
        { points: [[0.7, 0.05], [1, 0]], tone: "blue", dashed: true, label: "" },
        { points: [[0.9, 0.05], [1, 0]], tone: "orange", dashed: true, label: "" },
      ],
      points: [{ at: [1, 0], label: "p∞ = (1, 0)", below: true }],
    },
    steps: [
      { title: "Write a family of parallel lines", text: "The lines have different starting points P₀ but the same direction V. Project P₀ + tV.", formula: "p(t) = f((X₀+tVₓ)/(Z₀+tV_z), (Y₀+tVᵧ)/(Z₀+tV_z))" },
      { title: "Take the limit", text: "Divide each numerator and denominator by t. If V_z ≠ 0, the starting point disappears as |t| grows, so every line has the same limit.", formula: "p∞ = f(Vₓ/V_z, Vᵧ/V_z)" },
      { title: "Check the exception", text: "If V_z = 0, the direction is parallel to the image plane. There is no finite vanishing point; the projected lines are parallel or coincident, provided they have projectable points." },
    ],
    caveat: "Convergence is an image effect. The 3D lines remain parallel. A finite point on a line not passing through O does not reach the vanishing point at a finite depth.",
    reflection: "If you move a line sideways without changing its direction, does its vanishing point move?",
  },
};

export function releasedAnswerFields(question: { id: string; answer: string; answerPublished: boolean }) {
  return question.answerPublished ? { answer: question.answer, explanation: tutorialAnswers[question.id] } : {};
}

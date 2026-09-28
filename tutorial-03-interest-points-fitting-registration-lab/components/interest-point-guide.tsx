'use client';

import type { interestPointMetrics } from '@/lib/interest-points';

type Props = { metrics: ReturnType<typeof interestPointMetrics>; contrast: number; k: number };
const number = (value: number) => Math.abs(value) < 1e-8 ? '0' : value.toFixed(4);

function CurvaturePlot({ curvature, label }: { curvature: number; label: string }) {
  const path = Array.from({ length: 41 }, (_, i) => {
    const t = (i - 20) / 20;
    return `${i ? 'L' : 'M'}${120 + 90 * t} ${82 - 30 * curvature * t * t}`;
  }).join(' ');
  return <svg viewBox="0 0 240 145" role="img" aria-label={`${label}: signed curvature ${number(curvature)}`}>
    <line x1="20" y1="82" x2="220" y2="82" className="curvature-axis" />
    <line x1="120" y1="18" x2="120" y2="125" className="curvature-axis" />
    <path d={path} className="curvature-profile" />
    <text x="12" y="14">{label} = {number(curvature)}</text>
    <text x="190" y="101">position</text>
    <text x="12" y="136">quadratic term ½μt²</text>
  </svg>;
}

export function InterestPointGuide({ metrics, contrast, k }: Props) {
  const [[ixx, ixy], [, iyy]] = metrics.hessianTensor;
  const traceH = ixx + iyy;
  const gap = Math.sqrt((ixx - iyy) ** 2 + 4 * ixy ** 2);
  const mu1 = (traceH + gap) / 2;
  const mu2 = (traceH - gap) / 2;
  const curvatureMeaning = metrics.hessian < -1e-8 ? 'Opposite signs: saddle-like curvature.'
    : metrics.hessian > 1e-8 ? (traceH < 0 ? 'Both negative: cap-like curvature.' : 'Both positive: bowl-like curvature.')
    : 'At least one zero curvature: degenerate second-order test.';

  return <div className="interest-guide">
    <section aria-labelledby="harris-guide-title">
      <p className="section-kicker">FIRST DERIVATIVES · WINDOW DISPLACEMENT</p>
      <h3 id="harris-guide-title">What does Harris measure?</h3>
      <p>Imagine moving a small image window by δ = (δx, δy). A distinctive corner changes its appearance for a small move in every direction. Along a straight edge, the window can slide along the edge with little change.</p>
      <ol>
        <li><strong>Compare the original and shifted window.</strong><div className="guide-equation">E(δ) = avg<sub>W</sub> [I(x + δx, y + δy) − I(x, y)]²</div></li>
        <li><strong>Approximate a small displacement.</strong><div className="guide-equation">I(x + δx, y + δy) − I(x, y) ≈ Iₓδx + Iᵧδy<br />E(δ) ≈ δᵀAδ</div><p>A averages the outer products ∇I∇Iᵀ over the highlighted 3×3 window. Its eigenvalues λ₁, λ₂ measure sensitivity to displacement along two perpendicular principal directions. They are nonnegative.</p></li>
        <li><strong>Distinguish flat regions, edges and corners.</strong><ul><li>Both λ small: a flat region changes little in any direction.</li><li>One large, one small: an edge changes mainly across the edge.</li><li>Both large: a corner changes in every direction.</li></ul></li>
        <li><strong>Turn the matrix into one score.</strong><div className="guide-equation">R = det(A) − k·tr(A)²<br />= λ₁λ₂ − k(λ₁ + λ₂)²</div><p>Large positive R suggests a corner; negative R suggests an edge; values near zero have a weak response. A detector also needs a response threshold and local-maximum selection. R &gt; 0 alone does not guarantee a strong, useful feature.</p></li>
      </ol>
      <p><strong>Worksheet convention:</strong> the derivation above uses mathematical derivatives. The playground follows the sheet’s first-difference kernel [−1, 0, 1], without division by 2. Compared with unit-pixel central derivatives, this multiplies A by 4 and R by 16. It preserves the directional interpretation; use the same normalization when comparing numerical scores and thresholds.</p>
      <div className="guide-live"><strong>Your selected window</strong><p>λ₁ = {number(metrics.eigenvalues[0])}, λ₂ = {number(metrics.eigenvalues[1])}; R = {number(metrics.harris)} at k = {k.toFixed(3)}.</p></div>
      <p><strong>Try it:</strong> switch between (*) and (**). Watch the heatmap and eigenvalue point. Increase k: the trace penalty increases, so R decreases while A and its eigenvalues stay unchanged. Under I → αI, gradients scale by α, A and λ by α², and R by α⁴. Halving intensity divides R by 16; an absolute detection threshold may then reject the point.</p>
    </section>

    <section aria-labelledby="hessian-guide-title">
      <p className="section-kicker">SECOND DERIVATIVES · LOCAL CURVATURE</p>
      <h3 id="hessian-guide-title">What does the Hessian measure?</h3>
      <p>Think of image intensity as a height surface. First derivatives describe its slope; second derivatives describe how that slope changes. The Hessian collects this local curvature at one point.</p>
      <div className="guide-equation">H = [Iₓₓ, Iₓᵧ; Iₓᵧ, Iᵧᵧ]<br />det(H) = IₓₓIᵧᵧ − Iₓᵧ²</div>
      <p>Iₓₓ and Iᵧᵧ measure curvature along x and y. Iₓᵧ describes their coupling. For a smooth image the mixed derivatives agree. The worksheet uses these direct finite differences with image y pointing upward:</p>
      <div className="guide-equation">Iₓₓ = I(r,c+1) − 2I(r,c) + I(r,c−1)<br />Iᵧᵧ = I(r−1,c) − 2I(r,c) + I(r+1,c)<br />Iₓᵧ = [I(r−1,c+1) − I(r−1,c−1)<br /> − I(r+1,c+1) + I(r+1,c−1)] / 4</div>
      <p>The Hessian eigenvalues μ₁, μ₂ are signed curvatures along perpendicular principal directions. Unlike Harris eigenvalues, they can be negative.</p>
      <div className="guide-live"><strong>Your selected point · α = {contrast.toFixed(2)}</strong><div className="guide-equation">H = [{number(ixx)}, {number(ixy)}; {number(ixy)}, {number(iyy)}]<br />det(H) = {number(metrics.hessian)} · tr(H) = {number(traceH)}</div><div className="curvature-plots"><CurvaturePlot curvature={mu1} label="μ₁" /><CurvaturePlot curvature={mu2} label="μ₂" /></div><p>{curvatureMeaning} The curves show only the quadratic curvature term in I(p + δ) ≈ I(p) + ∇I(p)ᵀδ + ½δᵀHδ; constant brightness and linear slope are omitted.</p></div>
      <ul><li>det(H) &gt; 0: both curvatures have the same sign. At a stationary point (∇I = 0), negative trace means a local maximum; positive trace means a local minimum.</li><li>det(H) &lt; 0: curvatures have opposite signs. At a stationary point this is a saddle.</li><li>det(H) = 0: the second-order test is inconclusive.</li></ul>
      <p><strong>Try it:</strong> switch between (*) and (**), and inspect the matrix and the two curves. Scaling intensity by α scales H and μ by α, and det(H) by α². Harris k has no effect on H.</p>
      <p>Hessian-based feature detectors look for strong localized curvature responses, often blob-like structures, after smoothing and local-maximum selection. Multi-scale versions use scale-normalized derivatives. This worksheet is a single-scale finite-difference exercise; a positive determinant alone is neither proof of a corner nor proof of an intensity maximum.</p>
    </section>

    <div className="guide-comparison"><h3>Keep the two matrices separate</h3><p><strong>Harris A:</strong> averages products of first derivatives over a window; asks whether displacement changes the patch in every direction. <strong>Hessian H:</strong> contains second derivatives of intensity at a point; asks how the brightness surface bends. “Second-moment matrix” is another name for A, not for H.</p><p className="guide-sources">Further reading: <a href="https://docs.opencv.org/4.12.0/dd/d1a/group__imgproc__feature.html" target="_blank" rel="noreferrer">OpenCV: Harris response</a> · <a href="https://www.robots.ox.ac.uk/~vgg/research/affine/detectors.html" target="_blank" rel="noreferrer">Oxford VGG: Harris and Hessian detectors</a></p></div>
  </div>;
}

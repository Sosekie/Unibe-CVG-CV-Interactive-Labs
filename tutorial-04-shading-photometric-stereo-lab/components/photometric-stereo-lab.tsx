'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Concept, ConceptGuide, Eq, TryIt } from '@/components/concept-guide';
import { estimatePhotometricStereo, type LightSet, type Vector3 } from '@/lib/photometric';

const lightSets: { id: LightSet; label: string }[] = [
  { id: 'ring', label: 'Ring of lights' },
  { id: 'worksheet', label: 'Worksheet Q4' },
  { id: 'coplanar', label: 'Coplanar (Q3b)' },
];
const fmt = (value: number, digits = 3) => (Number.isFinite(value) ? value.toFixed(digits) : 'undefined');
const vec = (vector: Vector3 | null) => (vector ? `(${vector.map((value) => value.toFixed(3)).join(', ')})` : 'undefined');

function Hemisphere({ result }: { result: ReturnType<typeof estimatePhotometricStereo> }) {
  const cx = 200; const cy = 178; const radius = 140;
  const round1 = (value: number) => Math.round(value * 10) / 10;
  const toScreen = (vector: Vector3) => ({ x: round1(cx + vector[0] * radius), y: round1(cy - vector[1] * radius) });
  const rings = [30, 60].map((elevation) => ({ elevation, r: round1(radius * Math.cos(elevation * Math.PI / 180)) }));
  const truth = toScreen(result.normal);
  const estimate = result.estimatedNormal ? toScreen(result.estimatedNormal) : null;
  return <div className="hemisphere-wrap"><svg className="stereo-diagram" viewBox="0 0 400 360" aria-label="Light directions and normals seen from above">
    <defs><marker id="hemiAxis" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#7f97ab" /></marker></defs>
    <circle cx={cx} cy={cy} r={radius} className="hemi-disc" />
    {/* Elevation labels sit on the upper-left diagonal, away from the x-axis where ring lights often lie. */}
    {rings.map((ring) => <g key={ring.elevation}><circle cx={cx} cy={cy} r={ring.r} className="hemi-ring" /><text x={round1(cx - ring.r * Math.SQRT1_2 - 4)} y={round1(cy - ring.r * Math.SQRT1_2 - 4)} textAnchor="end" className="svg-label">{ring.elevation}°</text></g>)}
    <text x={round1(cx - radius * Math.SQRT1_2 - 4)} y={round1(cy - radius * Math.SQRT1_2 - 4)} textAnchor="end" className="svg-label">0° elevation</text>
    <line x1={cx - radius - 12} y1={cy} x2={cx + radius + 22} y2={cy} className="hemi-axis" markerEnd="url(#hemiAxis)" /><text x={cx + radius + 26} y={cy + 4} className="svg-label">x</text>
    <line x1={cx} y1={cy + radius + 12} x2={cx} y2={cy - radius - 18} className="hemi-axis" markerEnd="url(#hemiAxis)" /><text x={cx + 6} y={cy - radius - 18} className="svg-label">y</text>
    <circle cx={cx} cy={cy} r="2.5" fill="#7f97ab" /><text x={cx + 6} y={cy + 14} className="svg-label">straight up (90°)</text>
    {result.lights.map((light, index) => { const point = toScreen(light); return <g key={index}><line x1={cx} y1={cy} x2={point.x} y2={point.y} className="hemi-light-ray" /><circle cx={point.x} cy={point.y} r="7" className="hemi-light" /><text x={point.x + 9} y={point.y - 8} className="svg-label strong">s{index + 1}</text></g>; })}
    <circle cx={truth.x} cy={truth.y} r="9" className="hemi-true" />
    {estimate ? <circle cx={estimate.x} cy={estimate.y} r="5" className="hemi-estimate" /> : null}
  </svg>
  <div className="hemi-legend">
    <p><b>Seen from above.</b> A unit direction (x, y, z) is drawn at (x, y); the rings mark its elevation above the plane.</p>
    <ul>
      <li><i className="key light" />light direction sₖ (known)</li>
      <li><i className="key true" />true normal n</li>
      <li><i className="key estimate" />estimated normal</li>
    </ul>
    <dl>
      <dt>g = ρn</dt><dd>{vec(result.estimate as Vector3 | null)}</dd>
      <dt>ρ = ‖g‖</dt><dd>{fmt(result.estimatedAlbedo)} (true {result.albedo.toFixed(2)})</dd>
      <dt>n = g/‖g‖</dt><dd>{vec(result.estimatedNormal)}</dd>
    </dl>
    {result.rank < 3 ? <p className="hemi-warning">rank {result.rank} &lt; 3: no unique solution</p> : null}
  </div></div>;
}

export function PhotometricStereoLab() {
  const [set, setSet] = useState<LightSet>('ring');
  const [count, setCount] = useState(3);
  const [spread, setSpread] = useState(220);
  const [noise, setNoise] = useState(0);
  const [tilt, setTilt] = useState(28);
  const result = useMemo(() => estimatePhotometricStereo({ set, count, spread, noise, tilt }), [set, count, noise, spread, tilt]);
  const ring = set === 'ring';
  const conditionLabel = result.rank < 3 ? 'singular' : result.condition < 6 ? 'well-conditioned' : result.condition < 30 ? 'sensitive to noise' : 'nearly singular';

  return (
    <section className="lab-module" aria-labelledby="stereo-title">
      <div className="module-heading">
        <div><p className="section-kicker">PHOTOMETRIC STEREO · WORKSHEET Q3-Q5 · SLIDES 14-20</p><h2 id="stereo-title">Separate albedo from orientation</h2><p>Keep the camera and the object fixed and change only the known light. Each image adds one linear equation for the scaled normal g = ρn at every pixel.</p></div>
        <div className="model-callout"><strong>Minimum data</strong><span>Three images suffice only if the three light directions are linearly independent. More images give a least-squares estimate that is less sensitive to noise.</span></div>
      </div>
      <div className="lab-layout">
        <aside className="control-panel glass-panel">
          <fieldset className="segmented-choice"><legend>Light directions</legend>{lightSets.map((entry) => <button type="button" key={entry.id} className={set === entry.id ? 'active' : ''} aria-pressed={set === entry.id} onClick={() => setSet(entry.id)}>{entry.label}</button>)}</fieldset>
          <div className={ring ? 'control-block' : 'control-block disabled'}><div className="control-label"><span>Images / lights K</span><output>{ring ? count : 3}</output></div><Slider aria-label="Number of images" disabled={!ring} value={[ring ? count : 3]} min={3} max={6} step={1} onValueChange={(value) => setCount(Array.isArray(value) ? value[0] : value)} /></div>
          <div className={ring ? 'control-block' : 'control-block disabled'}><div className="control-label"><span>Azimuth spread of the ring</span><output>{spread.toFixed(0)}°</output></div><Slider aria-label="Azimuth spread of the light ring" disabled={!ring} value={[spread]} min={8} max={320} step={4} onValueChange={(value) => setSpread(Array.isArray(value) ? value[0] : value)} /><small className="control-note">{ring ? 'All ring lights sit 55° above the plane; the spread sets how far apart they are around the vertical.' : 'Fixed by the worksheet preset.'}</small></div>
          <div className={set === 'worksheet' ? 'control-block disabled' : 'control-block'}><div className="control-label"><span>True surface tilt</span><output>{set === 'worksheet' ? '70.5' : tilt.toFixed(0)}°</output></div><Slider aria-label="True surface tilt" disabled={set === 'worksheet'} value={[tilt]} min={0} max={55} step={1} onValueChange={(value) => setTilt(Array.isArray(value) ? value[0] : value)} /></div>
          <div className="control-block"><div className="control-label"><span>Measurement noise</span><output>{noise.toFixed(2)}</output></div><Slider aria-label="Measurement noise" value={[noise]} min={0} max={.18} step={.01} onValueChange={(value) => setNoise(Array.isArray(value) ? value[0] : value)} /><small className="control-note">A fixed, repeatable error pattern is added to the intensities.</small></div>
          <div className={result.rank === 3 && result.condition < 6 ? 'classification' : 'classification warning'}><span>Lighting matrix S</span><strong>rank {result.rank} / 3</strong><small>{conditionLabel} · κ(S) = {Number.isFinite(result.condition) ? result.condition.toFixed(1) : '∞'}</small></div>
        </aside>
        <div className="visual-panel glass-panel">
          <div className="diagram-toolbar"><span>KNOWN LIGHTS + UNKNOWN NORMAL · TOP VIEW</span><span>I = Sg · g = ρn</span></div>
          <Hemisphere result={result} />
          <div className="intensity-bars" aria-label="Measured intensities">{result.intensities.map((intensity, index) => <div key={index}><span>I{index + 1}</span><i><b style={{ width: `${Math.max(1, intensity * 100)}%` }} /></i><output>{intensity.toFixed(3)}</output></div>)}</div>
          <div className="metric-grid stereo-metrics"><article><span>Estimated albedo ρ</span><strong>{fmt(result.estimatedAlbedo)}</strong></article><article><span>Normal angular error</span><strong>{Number.isFinite(result.angularError) ? result.angularError.toFixed(2) + '°' : 'undefined'}</strong></article><article><span>Fit residual (RMS)</span><strong>{fmt(result.residual, 4)}</strong></article></div>
        </div>
      </div>
      <div className="formula-strip"><div><span>Per-pixel system (slide 15)</span><strong>I = Sg, rows of S = Lₖsₖᵀ, g = ρn</strong></div><div><span>Solve (slides 16-17)</span><strong>g = S⁻¹I, or g = (SᵀS)⁻¹SᵀI for K &gt; 3</strong></div><div><span>Split the factors (slide 16)</span><strong>ρ = ‖g‖ · n = g / ‖g‖</strong></div></div>
      <ConceptGuide kicker="BACKGROUND · SLIDES 7-8, 14-20, 25" title="What you need for this lab" intro="Photometric stereo is a small linear-algebra problem per pixel. These are the ideas it rests on.">
        <Concept title="Brightness is a dot product" slides="slides 7-8">
          <p>For unit vectors, the dot product is the cosine of the angle between them. A Lambertian point is brightest when its normal points at the light and dark when it faces away. The albedo ρ is the fraction of light the surface reflects; the viewing direction does not enter.</p>
          <Eq>I = ρL⟨n, s⟩ = ρL cos θ</Eq>
        </Concept>
        <Concept title="One image gives one equation" slides="slide 15">
          <p>Write g = ρn: three unknown numbers that hold both the albedo and the normal. Image k gives one linear equation in g. Stacking K images gives a K × 3 system.</p>
          <Eq>Iₖ = Lₖsₖᵀg, k = 1, …, K · I = Sg</Eq>
        </Concept>
        <Concept title="Linear independence and rank" slides="worksheet Q3">
          <p>The rank of S is the number of independent rows. Three directions are independent unless they lie in one plane through the origin. Then det S = 0 and one direction of g changes no intensity in any image, so it cannot be recovered. In the top view, three directions in one vertical plane lie on one straight line through the centre.</p>
        </Concept>
        <Concept title="Solving the system" slides="slides 16-17">
          <p>With three independent lights, invert S. With more lights, the equations cannot all hold exactly when there is noise; least squares minimises ‖Sg − I‖². Multiplying by Sᵀ gives the normal equations, solved by the pseudo-inverse. The length of g is the albedo; its direction is the normal.</p>
          <Eq>g = S⁻¹I · SᵀSg = SᵀI ⇒ g = (SᵀS)⁻¹SᵀI · ρ = ‖g‖, n = g / ρ</Eq>
        </Concept>
        <Concept title="Condition number κ(S)">
          <p>κ(S) is the ratio of the largest to the smallest singular value of S. Roughly, a relative error in the intensities can grow up to κ times in g. Lights that are nearly in one plane give a large κ; κ = ∞ means rank &lt; 3.</p>
          <Eq>κ(S) = σ_max / σ_min · current κ = {Number.isFinite(result.condition) ? result.condition.toFixed(1) : '∞'}</Eq>
        </Concept>
        <Concept title="Shadows and highlights" slides="slides 19-20">
          <p>A shadowed pixel reads I ≈ 0, although the linear model predicts a negative value there. Multiplying each equation by its own intensity turns shadowed rows into 0 = 0. Specular highlights and saturated pixels also break the Lambertian model and must be removed separately.</p>
        </Concept>
        <Concept title="Normals, not depth" slides="slide 25">
          <p>Photometric stereo returns a normal map and an albedo map. A depth map needs one more step: normal integration, as in lab 01.</p>
        </Concept>
        <TryIt>Choose Worksheet Q4: the intensities are those of the worksheet, and the solver returns ρ = 0.6 and n = (2/3, 2/3, 1/3). Choose Coplanar: all three lights lie on one line through the centre, the rank drops to 2 and no unique normal exists. Back in the ring, add noise and shrink the spread: κ grows and the normal error grows with it. Keep the noise and add images: with K = 6 the error is smaller than with K = 3.</TryIt>
      </ConceptGuide>
    </section>
  );
}

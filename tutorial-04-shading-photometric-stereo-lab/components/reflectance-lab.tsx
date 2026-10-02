'use client';

import { useMemo, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Concept, ConceptGuide, Eq, TryIt } from '@/components/concept-guide';
import { PLANE_SAMPLES, PLANE_SIZE, planeIllumination } from '@/lib/lighting';
import { EXTENT, ReflectanceMap } from '@/components/reflectance-map';
import { incidenceAngle, reflectance } from '@/lib/reflectance';

type View = 'distant' | 'near';
const pick = (value: number | readonly number[]) => (Array.isArray(value) ? value[0] : value) as number;

function DistantView() {
  const [ps, setPs] = useState(1);
  const [qs, setQs] = useState(0);
  const [p, setP] = useState(0);
  const [q, setQ] = useState(0);
  const value = reflectance(p, q, ps, qs);
  const theta = incidenceAngle(p, q, ps, qs);
  const worksheet = ps === 1 && qs === 0 && Math.abs(value - Math.SQRT1_2) < 1e-9;
  return <div className="lab-layout">
    <aside className="control-panel glass-panel">
      <div className="control-block"><div className="control-label"><span>Light pₛ</span><output>{ps.toFixed(1)}</output></div><Slider aria-label="Light direction p component" value={[ps]} min={-2} max={2} step={.1} onValueChange={(next) => setPs(Math.round(pick(next) * 10) / 10)} /></div>
      <div className="control-block"><div className="control-label"><span>Light qₛ</span><output>{qs.toFixed(1)}</output></div><Slider aria-label="Light direction q component" value={[qs]} min={-2} max={2} step={.1} onValueChange={(next) => setQs(Math.round(pick(next) * 10) / 10)} /><small className="control-note">The light direction is s ∝ (pₛ, qₛ, 1). (0, 0) means straight above.</small></div>
      <div className="control-block"><div className="control-label"><span>Orientation p</span><output>{p.toFixed(1)}</output></div><Slider aria-label="Surface orientation p" value={[p]} min={-EXTENT} max={EXTENT} step={.1} onValueChange={(next) => setP(Math.round(pick(next) * 10) / 10)} /></div>
      <div className="control-block"><div className="control-label"><span>Orientation q</span><output>{q.toFixed(1)}</output></div><Slider aria-label="Surface orientation q" value={[q]} min={-EXTENT} max={EXTENT} step={.1} onValueChange={(next) => setQ(Math.round(pick(next) * 10) / 10)} /><small className="control-note">Or click and drag the white point on the map.</small></div>
      <button type="button" className={worksheet ? 'preset-button active' : 'preset-button'} onClick={() => { setPs(1); setQs(0); setP(0); setQ(0); }}>Worksheet Q2: s ∝ (1, 0, 1), I = 1/√2</button>
      <div className={value > 0 ? 'classification' : 'classification warning'}><span>Brightness of the selected orientation</span><strong>R = {value.toFixed(3)}</strong><small>{value > 0 ? `θᵢ = ${theta.toFixed(1)}° between n and s. Every orientation on the orange curve gives the same R.` : 'This orientation faces away from the light: attached shadow, R = 0.'}</small></div>
    </aside>
    <div className="visual-panel glass-panel">
      <div className="diagram-toolbar"><span>REFLECTANCE MAP · GRADIENT SPACE (SLIDES 10-12)</span><span>ρ = L = 1</span></div>
      <div className="reflectance-wrap"><ReflectanceMap ps={ps} qs={qs} p={p} q={q} onPick={(nextP, nextQ) => { setP(nextP); setQ(nextQ); }} />
        <div className="reflectance-notes">
          <p><b>Each point (p, q)</b> is one surface orientation with normal N = (p, q, 1).</p>
          <p><b>Orange dot:</b> the light. The brightest orientation is n = s, at (pₛ, qₛ).</p>
          <p><b>Orange curve:</b> all orientations as bright as the white point. One image cannot tell them apart.</p>
          <p><b>Dashed line:</b> R = 0, where the light grazes the surface. Beyond it the surface faces away from the light.</p>
          {worksheet ? <p className="worksheet-note">Worksheet Q2: the curve is the parabola q² = 2p. (0, 0), (2, 2) and (2, −2) all give R = 1/√2.</p> : null}
        </div>
      </div>
      <div className="metric-grid"><article><span>Selected (p, q)</span><strong>({p.toFixed(1)}, {q.toFixed(1)})</strong></article><article><span>Brightest orientation</span><strong>({ps.toFixed(1)}, {qs.toFixed(1)}) · R = 1</strong></article><article><span>Incidence angle θᵢ</span><strong>{value > 0 ? `${theta.toFixed(1)}°` : '≥ 90° (shadow)'}</strong></article></div>
    </div>
  </div>;
}

function NearView() {
  const [lightX, setLightX] = useState(5);
  const [lightY, setLightY] = useState(5);
  const [height, setHeight] = useState(10);
  const [inverseSquare, setInverseSquare] = useState(false);
  const field = useMemo(() => planeIllumination(lightX, lightY, height, inverseSquare), [height, inverseSquare, lightX, lightY]);
  const step = PLANE_SIZE / (PLANE_SAMPLES - 1);
  const order = Array.from({ length: PLANE_SAMPLES }, (_, k) => PLANE_SAMPLES - 1 - k).flatMap((row) => Array.from({ length: PLANE_SAMPLES }, (_, column) => row * PLANE_SAMPLES + column));
  const marker = { left: `${(lightX / step + 0.5) / PLANE_SAMPLES * 100}%`, top: `${(PLANE_SAMPLES - 1 - lightY / step + 0.5) / PLANE_SAMPLES * 100}%` };
  const sketchX = (x: number) => 40 + x * 22;
  const sketchZ = (z: number) => 184 - z * 12;
  // Keep the normal arrow below the light, so a low light does not sit on top of it.
  const normalLength = Math.min(24, height * 12 - 14);
  const worksheet = lightX === 5 && lightY === 5 && height === 10;
  return <div className="lab-layout">
    <aside className="control-panel glass-panel">
      <div className="control-block"><div className="control-label"><span>Light x</span><output>{lightX.toFixed(1)}</output></div><Slider aria-label="Point light x position" value={[lightX]} min={0} max={PLANE_SIZE} step={.5} onValueChange={(next) => setLightX(pick(next))} /></div>
      <div className="control-block"><div className="control-label"><span>Light y</span><output>{lightY.toFixed(1)}</output></div><Slider aria-label="Point light y position" value={[lightY]} min={0} max={PLANE_SIZE} step={.5} onValueChange={(next) => setLightY(pick(next))} /></div>
      <div className="control-block"><div className="control-label"><span>Light height z</span><output>{height.toFixed(1)}</output></div><Slider aria-label="Point light height" value={[height]} min={1} max={12} step={.5} onValueChange={(next) => setHeight(pick(next))} /></div>
      <fieldset className="segmented-choice two"><legend>Brightness model</legend><button type="button" className={!inverseSquare ? 'active' : ''} aria-pressed={!inverseSquare} onClick={() => setInverseSquare(false)}>Worksheet: n·s(x)</button><button type="button" className={inverseSquare ? 'active' : ''} aria-pressed={inverseSquare} onClick={() => setInverseSquare(true)}>Extension: + 1/d²</button></fieldset>
      <button type="button" className={worksheet ? 'preset-button active' : 'preset-button'} onClick={() => { setLightX(5); setLightY(5); setHeight(10); }}>Worksheet Q7: light at (5, 5, 10)</button>
      <div className="classification"><span>Brightest surface point</span><strong>({field.brightest.x.toFixed(1)}, {field.brightest.y.toFixed(1)}, 0)</strong><small>directly below the light, where s = n = (0, 0, 1)</small></div>
    </aside>
    <div className="visual-panel glass-panel">
      <div className="diagram-toolbar"><span>PLANE z = 0 · BRIGHTNESS RELATIVE TO THE MAXIMUM</span><span>light = ({lightX.toFixed(1)}, {lightY.toFixed(1)}, {height.toFixed(1)})</span></div>
      <div className="light-map-wrap">
        <figure className="light-map-figure">
          <div className="light-map" style={{ gridTemplateColumns: `repeat(${PLANE_SAMPLES},1fr)` }}>{order.map((index) => { const cell = field.cells[index]; const level = Math.round(cell.relative * 255); return <i key={index} style={{ backgroundColor: `rgb(${level},${level},${level})` }} title={`(${cell.x.toFixed(1)}, ${cell.y.toFixed(1)}): B/Bmax = ${cell.relative.toFixed(3)}`} />; })}<b className="light-projection" style={marker} aria-label="Point directly below the light">×</b></div>
          <div className="gray-bar" aria-hidden="true" /><div className="heat-legend"><small>B/Bmax = 0 (black)</small><small>1 (white)</small></div>
          <figcaption>x runs from 0 (left) to 10 (right) and y from 0 (bottom) to 10 (top). The grey scale is fixed, like a camera image: a more uniform grey really means a more evenly lit plane.</figcaption>
        </figure>
        <div className="near-light-sketch"><svg viewBox="0 0 300 230" aria-label="Side view of the light above the plane"><line x1={sketchX(0)} x2={sketchX(PLANE_SIZE)} y1="184" y2="184" stroke="#7694aa" strokeWidth="2" /><line x1={sketchX(lightX)} y1={sketchZ(height)} x2={sketchX(lightX)} y2="184" stroke="#d98b3d" strokeDasharray="4 4" /><line x1={sketchX(lightX)} y1={sketchZ(height)} x2={sketchX(0)} y2="184" stroke="#e1a362" opacity=".6" /><line x1={sketchX(lightX)} y1={sketchZ(height)} x2={sketchX(PLANE_SIZE)} y2="184" stroke="#e1a362" opacity=".6" /><circle cx={sketchX(lightX)} cy={sketchZ(height)} r="9" fill="#d98b3d" />{normalLength >= 8 ? <line x1={sketchX(lightX)} y1="184" x2={sketchX(lightX)} y2={184 - normalLength} stroke="#2a94c2" strokeWidth="2.5" markerEnd="url(#planeNormal)" /> : null}<defs><marker id="planeNormal" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#2a94c2" /></marker></defs><text x={sketchX(0)} y="204" className="svg-label">x = 0</text><text x={sketchX(PLANE_SIZE)} y="204" textAnchor="end" className="svg-label">x = 10</text><text x={sketchX(lightX) + 12} y={sketchZ(height) + 4} className="svg-label">light</text>{normalLength >= 8 ? <text x={sketchX(lightX) + 6} y={190 - normalLength} className="svg-label">n</text> : null}</svg><p>Side view (x-z). The rays to the plane edges arrive at a slant, so ⟨n, s⟩ &lt; 1 there; below the light they arrive along n.</p></div>
      </div>
      <div className="metric-grid"><article><span>B(0, 0) / Bmax</span><strong>{field.cornerRatio.toFixed(3)}</strong></article><article><span>Darkest / brightest on the plane</span><strong>{(field.minimum / field.maximum).toFixed(3)}</strong></article><article><span>Model</span><strong>{inverseSquare ? 'n·s(x) / d(x)²' : 'n·s(x), L constant'}</strong></article></div>
    </div>
  </div>;
}

export function ReflectanceLab() {
  const [view, setView] = useState<View>('distant');
  return (
    <section className="lab-module" aria-labelledby="reflectance-title">
      <div className="module-heading">
        <div><p className="section-kicker">LIGHT &amp; REFLECTANCE · WORKSHEET Q2 AND Q7 · SLIDES 7-13</p><h2 id="reflectance-title">How the light direction sets brightness</h2><p>A distant light has the same direction everywhere: brightness then depends only on the surface orientation, which the reflectance map shows. A nearby light has a different direction at every surface point, so even a flat plane is not evenly lit.</p></div>
        <div className="model-callout"><strong>Single-image ambiguity</strong><span>One Lambertian intensity fixes the angle between n and s, not n itself. Every orientation on one iso-brightness curve gives the same value.</span></div>
      </div>
      <div className="view-switch" role="tablist" aria-label="Light model">
        <button type="button" role="tab" aria-selected={view === 'distant'} className={view === 'distant' ? 'active' : ''} onClick={() => setView('distant')}><strong>Distant light</strong><small>Reflectance map R(p, q)</small></button>
        <button type="button" role="tab" aria-selected={view === 'near'} className={view === 'near' ? 'active' : ''} onClick={() => setView('near')}><strong>Nearby light</strong><small>Flat plane, brightest point</small></button>
      </div>
      {view === 'distant' ? <DistantView /> : <NearView />}
      <div className="formula-strip"><div><span>Lambertian (slides 7-8)</span><strong>I = ρL max(0, nᵀs)</strong></div><div><span>Reflectance map (slides 10-11)</span><strong>R(p, q) = (ppₛ + qqₛ + 1) / (√(1+p²+q²) √(1+pₛ²+qₛ²))</strong></div><div><span>Nearby light (worksheet Q7)</span><strong>s(x) = (ℓ − x) / ‖ℓ − x‖</strong></div></div>
      <ConceptGuide kicker="BACKGROUND · SLIDES 7-14, 30" title="What you need for this lab" intro="Both views use the same Lambertian model. These are the ideas behind them.">
        <Concept title="The Lambertian model, term by term" slides="slides 7-8">
          <p>ρ is the albedo, the fraction of light the surface reflects; L is the light intensity; n is the unit surface normal; s is the unit vector from the surface toward the light. The viewing direction v does not appear: a Lambertian surface looks equally bright from every direction. Slide 8 fixes ρ = L = 1, so the brightness is simply ⟨n, s⟩.</p>
          <Eq>I = ρL⟨n, s⟩ = ρL cos θᵢ, for a point that faces the light</Eq>
        </Concept>
        <Concept title="Gradient space" slides="slide 10">
          <p>Every orientation that faces the camera can be written N = (p, q, 1). The tip of this vector lies on the plane z = 1 at the point (p, q), so each point of the (p, q) plane is one surface orientation. The light direction gets its own point (pₛ, qₛ) in the same way.</p>
        </Concept>
        <Concept title="The reflectance map" slides="slides 10-11">
          <p>Writing ⟨n, s⟩ in terms of p and q gives the brightness of every orientation under a given light. It depends only on the angle θᵢ between n and s.</p>
          <Eq>R(p, q) = (ppₛ + qqₛ + 1) / (√(1 + p² + q²) √(1 + pₛ² + qₛ²))</Eq>
        </Concept>
        <Concept title="Iso-brightness contours" slides="slides 11-12">
          <p>All normals at the same angle θᵢ from s form a cone around s. The cone meets the plane z = 1 in a curve of equal brightness: an ellipse for bright values, a hyperbola for dark ones and a parabola in between.</p>
        </Concept>
        <Concept title="Brightest and black orientations" slides="slide 12">
          <p>Since R = cos θᵢ ≤ 1, the maximum R = 1 occurs only for n = s, at (p, q) = (pₛ, qₛ). On the line ppₛ + qqₛ + 1 = 0 the light grazes the surface (θᵢ = 90°); beyond it the surface faces away from the light and is in attached shadow.</p>
        </Concept>
        <Concept title="Why one image is not enough" slides="slides 13-14, 30-34">
          <p>One pixel gives one number, but an orientation has two unknowns, p and q. Every orientation on the matching curve fits. Photometric stereo adds images under other lights: with three lights the curves meet in a single orientation (slide 14). Shape from shading keeps one image and adds assumptions instead: smoothness and the known normals on the occluding boundary (slides 30-34).</p>
        </Concept>
        <Concept title="Distant versus nearby light" slides="worksheet Q7">
          <p>A distant light has the same direction everywhere. A nearby light at ℓ has a different direction at every surface point x. On a flat plane the brightest point is where s = n, directly below the light. Real point sources also dim with distance as 1/d²; this extension goes beyond the slides, keeps the brightest point and increases the contrast.</p>
          <Eq>s(x) = (ℓ − x) / ‖ℓ − x‖</Eq>
        </Concept>
        <TryIt>Press the Worksheet Q2 button: the orange curve becomes the parabola q² = 2p, and (0, 0), (2, 2) and (2, −2) all look equally bright. Drag the white point onto the orange dot: R reaches 1. Move the light: the whole map moves with it. In the nearby view, lower the light: the bright spot shrinks. Switch on the 1/d² fall-off: the brightest point stays below the light, and B(0, 0)/Bmax for the worksheet light drops from 0.82 to 0.54.</TryIt>
      </ConceptGuide>
    </section>
  );
}

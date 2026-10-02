'use client';

import { useState, type ComponentType, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ReflectanceMap } from '@/components/reflectance-map';
import { lightMatrixStats, type Vector3 } from '@/lib/photometric';
import { reflectance } from '@/lib/reflectance';
import { normalFromSlopes } from '@/lib/shading';
import { clientPointToSvg } from '@/lib/svg-coordinates';
import { determinant3, nearLightBrightness, pathIntegrals, solveWorksheetLights } from '@/lib/worked-answers';

// Released answers in the form of Tutorials 02 and 03: an interactive figure that
// opens on the worksheet values, numbered steps that recompute while it changes,
// and a takeaway with the result of the solution sheet.

type AnswerProps = { questionId: string; fallback: string };
type Point = { x: number; y: number };
type SvgPointerEvent = ReactPointerEvent<SVGSVGElement>;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const snap = (value: number, step: number) => Math.round(value / step) * step;
// Rounded screen coordinates keep server and browser renderings identical.
const px = (value: number) => Math.round(value * 10) / 10;
// Fixed digits with a typographic minus; values that round to zero print as 0.
function fmt(value: number, digits = 3) {
  const text = (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits);
  return text.startsWith('-') ? `−${text.slice(1)}` : text;
}
function signed(value: number, digits = 1) {
  const text = fmt(value, digits);
  return text.startsWith('−') ? `− ${text.slice(1)}` : `+ ${text}`;
}

function AnswerFrame({ title, lab, takeaway, children }: { title: string; lab: string; takeaway: ReactNode; children: ReactNode }) {
  return <div className="worked-answer">
    <div className="answer-title-row"><span>WORKED ANSWER</span><strong>{title}</strong><small>{lab}</small></div>
    {children}
    <div className="answer-takeaway"><span>TAKEAWAY</span><p>{takeaway}</p></div>
  </div>;
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <div className="answer-step"><span>{number}</span><div><strong>{title}</strong>{children}</div></div>;
}

function Figure({ instruction, subtitle, children }: { instruction: string; subtitle: string; children: ReactNode }) {
  return <div className="interactive-figure"><div className="figure-heading"><span>{instruction}</span><b>{subtitle}</b></div>{children}</div>;
}

function Range({ label, value, min, max, step, digits = 2, onChange }: { label: string; value: number; min: number; max: number; step: number; digits?: number; onChange: (value: number) => void }) {
  return <label className="answer-range"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><output>{fmt(value, digits)}</output></label>;
}

function Choices({ options }: { options: { label: string; active: boolean; onClick: () => void }[] }) {
  return <div className="answer-choice">{options.map((option) => <button type="button" key={option.label} className={option.active ? 'active' : ''} aria-pressed={option.active} onClick={option.onClick}>{option.label}</button>)}</div>;
}

function Readout({ warning = false, title, children }: { warning?: boolean; title: ReactNode; children: ReactNode }) {
  return <div className={warning ? 'answer-readout muted' : 'answer-readout'}><strong>{title}</strong><span>{children}</span></div>;
}

// Horizontal bars; with centred = true, zero sits in the middle of the track.
function Bars({ bars, domain, centred = false }: { bars: { label: string; value: number; warm?: boolean }[]; domain: number; centred?: boolean }) {
  return <div className="answer-bars">{bars.map((bar) => {
    const share = Math.min(1, Math.abs(bar.value) / domain);
    const left = centred && bar.value < 0 ? 50 - 50 * share : centred ? 50 : 0;
    return <div key={bar.label}><span>{bar.label}</span><span className={centred ? 'answer-bar-track centred' : 'answer-bar-track'}><i className={bar.warm ? 'warm' : ''} style={{ left: `${px(left)}%`, width: `${px((centred ? 50 : 100) * share)}%` }} /></span><b>{fmt(bar.value)}</b></div>;
  })}</div>;
}

// Arrow with a drawn head, so no marker ids are shared between figures.
function Arrow({ from, to, tone, head = 9 }: { from: Point; to: Point; tone: 'blue' | 'warm' | 'grey'; head?: number }) {
  const dx = to.x - from.x; const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) return null;
  const ux = dx / length; const uy = dy / length;
  const size = Math.min(head, length * 0.7); const wing = size * 0.5;
  const base = { x: to.x - ux * size, y: to.y - uy * size };
  const points = [[to.x, to.y], [base.x - uy * wing, base.y + ux * wing], [base.x + uy * wing, base.y - ux * wing]].map(([x, y]) => `${px(x)},${px(y)}`).join(' ');
  return <g className={`answer-arrow ${tone}`}><line x1={px(from.x)} y1={px(from.y)} x2={px(base.x + ux)} y2={px(base.y + uy)} /><polygon points={points} /></g>;
}

function Handle({ at, warm = false, radius = 10, label, onStart }: { at: Point; warm?: boolean; radius?: number; label: string; onStart: (event: ReactPointerEvent<SVGGElement>) => void }) {
  return <g className={warm ? 'drag-handle warm' : 'drag-handle'} onPointerDown={onStart}>
    <title>{label}</title>
    <circle className="drag-hit" cx={px(at.x)} cy={px(at.y)} r={radius + 12} />
    <circle className="drag-dot" cx={px(at.x)} cy={px(at.y)} r={radius} />
  </g>;
}

// Dragging as in Tutorial 02: a handle starts the drag, the SVG captures the
// pointer, and every move arrives in SVG units.
function useDrag<Target extends string>(onMove: (target: Target, point: Point) => void) {
  const [target, setTarget] = useState<Target | null>(null);
  const start = (next: Target) => (event: ReactPointerEvent<SVGGElement>) => {
    event.preventDefault();
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    setTarget(next);
  };
  const stop = (event: SvgPointerEvent) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setTarget(null);
  };
  const svg = {
    onPointerMove: (event: SvgPointerEvent) => {
      if (!target) return;
      const point = clientPointToSvg(event.currentTarget, event.clientX, event.clientY);
      if (point) onMove(target, point);
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: () => setTarget(null),
  };
  return { start, svg };
}

// Q1: the normal of the plane z = zx x + zy y + 3 (worksheet Q1(b)).
function SlopeView({ axis, slope, onSlope }: { axis: 'x' | 'y'; slope: number; onSlope: (slope: number) => void }) {
  const centre = { x: 170, y: 148 };
  const unit = Math.hypot(1, slope);
  const along = [1 / unit, slope / unit];
  const normal = [-slope / unit, 1 / unit];
  // (horizontal, z) offsets from the centre in screen coordinates
  const at = (h: number, z: number) => ({ x: centre.x + h, y: centre.y - z });
  const end = at(104 * along[0], 104 * along[1]);
  const start = at(-104 * along[0], -104 * along[1]);
  const tangentLabel = at(38 * along[0] - 17 * normal[0], 38 * along[1] - 17 * normal[1]);
  const normalLabel = at(96 * normal[0], 96 * normal[1]);
  const square = [at(10 * along[0], 10 * along[1]), at(10 * (along[0] + normal[0]), 10 * (along[1] + normal[1])), at(10 * normal[0], 10 * normal[1])];
  const drag = useDrag<'slope'>((_, pointer) => {
    const dx = pointer.x - centre.x; const dz = centre.y - pointer.y;
    onSlope(snap(clamp(Math.abs(dx) < 1 ? Math.sign(dz) * 3 : dz / dx, -3, 3), 0.1));
  });
  const component = axis === 'x' ? 'p' : 'q';
  const index = axis === 'x' ? 'ₓ' : 'ᵧ';
  const lean = slope > 0.05 ? `rises toward +${axis}, so the normal leans toward −${axis}` : slope < -0.05 ? `falls toward +${axis}, so the normal leans toward +${axis}` : `is flat along ${axis}, so the normal has no ${axis}-lean`;
  return <div className="answer-view">
    <svg className="answer-svg draggable" viewBox="0 0 340 268" aria-label={`${axis}-z side view of the plane with slope z${index} = ${fmt(slope, 1)}`} {...drag.svg}>
      <text x="14" y="24" className="strong">{axis}–z view · z{index} = {fmt(slope, 1)} · {component} = {fmt(-slope, 1)}</text>
      <Arrow from={{ x: 20, y: 250 }} to={{ x: 58, y: 250 }} tone="grey" head={7} /><text x="62" y="254">{axis}</text>
      <Arrow from={{ x: 20, y: 250 }} to={{ x: 20, y: 212 }} tone="grey" head={7} /><text x="26" y="214">z</text>
      <line x1={px(start.x)} y1={px(start.y)} x2={px(end.x)} y2={px(end.y)} className="answer-surface" />
      <polyline points={square.map((corner) => `${px(corner.x)},${px(corner.y)}`).join(' ')} className="answer-right-angle" />
      <Arrow from={centre} to={at(70 * along[0], 70 * along[1])} tone="blue" />
      <Arrow from={centre} to={at(76 * normal[0], 76 * normal[1])} tone="warm" />
      <text x={px(tangentLabel.x)} y={px(tangentLabel.y + 4)} textAnchor="middle">P{index}</text>
      <text x={px(normalLabel.x)} y={px(normalLabel.y + 4)} textAnchor="middle" className="strong">({component}, 1)</text>
      <Handle at={end} label={`Drag to change the slope z${index}`} onStart={drag.start('slope')} />
    </svg>
    <p className="answer-caption">The surface {lean}.</p>
  </div>;
}

function PlaneNormalAnswer() {
  const [zx, setZx] = useState(2);
  const [zy, setZy] = useState(-1);
  const { p, q, n } = normalFromSlopes(zx, zy);
  const length = Math.hypot(p, q, 1);
  return <AnswerFrame title="The normal of a tilted plane" lab="Lab 01 · worksheet Q1(b)" takeaway={<>For the worksheet plane z = 2x − y + 3: <b>p = −2, q = 1 and n = (−2, 1, 1)ᵀ/√6 ≈ (−0.816, 0.408, 0.408)</b>. n₁ is negative because the plane rises toward +x and its normal leans the other way, which is why p and zₓ have opposite signs.</>}>
    <div className="answer-layout">
      <Figure instruction="DRAG THE TWO WHITE HANDLES" subtitle="Each side view tilts the plane in one direction; the orange vector is that view's part of N = (p, q, 1)">
        <div className="answer-figure-pair">
          <SlopeView axis="x" slope={zx} onSlope={setZx} />
          <SlopeView axis="y" slope={zy} onSlope={setZy} />
        </div>
        <Readout title={<>n = ({fmt(n[0])}, {fmt(n[1])}, {fmt(n[2])})</>}>plane z = {fmt(zx, 1)}x {signed(zy)}y + 3 · N = ({fmt(p, 1)}, {fmt(q, 1)}, 1) · ‖N‖ = {fmt(length)}</Readout>
        <Range label="Slope zₓ" value={zx} min={-3} max={3} step={0.1} digits={1} onChange={(value) => setZx(snap(value, 0.1))} />
        <Range label="Slope zᵧ" value={zy} min={-3} max={3} step={0.1} digits={1} onChange={(value) => setZy(snap(value, 0.1))} />
        <Choices options={[{ label: 'Worksheet plane z = 2x − y + 3', active: zx === 2 && zy === -1, onClick: () => { setZx(2); setZy(-1); } }]} />
      </Figure>
      <div className="answer-steps">
        <Step number={1} title="Read the slopes"><p>The plane z = {fmt(zx, 1)}x {signed(zy)}y + 3 has the same slopes everywhere.</p><div className="answer-equation">zₓ = {fmt(zx, 1)} · zᵧ = {fmt(zy, 1)}</div></Step>
        <Step number={2} title="Apply the convention of slide 9"><p>N = (p, q, 1) is orthogonal to both tangents Pₓ = (1, 0, zₓ) and Pᵧ = (0, 1, zᵧ).</p><div className="answer-equation">N·Pₓ = p + zₓ = 0 ⇒ p = −zₓ = <b>{fmt(p, 1)}</b><br />N·Pᵧ = q + zᵧ = 0 ⇒ q = −zᵧ = <b>{fmt(q, 1)}</b></div></Step>
        <Step number={3} title="Normalise"><div className="answer-equation">‖N‖ = √(p² + q² + 1) = {fmt(length)}<br />n = N/‖N‖ = <b>({fmt(n[0])}, {fmt(n[1])}, {fmt(n[2])})</b></div></Step>
        <Step number={4} title="Check with slide 25"><p>Going back from the normal to the slopes recovers the plane.</p><div className="answer-equation">∇z = −(n₁/n₃, n₂/n₃) = ({fmt(-n[0] / n[2], 1)}, {fmt(-n[1] / n[2], 1)}) = (zₓ, zᵧ)</div></Step>
      </div>
    </div>
  </AnswerFrame>;
}

// Q2: integrability of (p, q) = (y, k x) and two integration paths (worksheet Q1(c)).
function IntegrabilityAnswer() {
  const [k, setK] = useState(0);
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const origin = { x: 52, y: 292 }; const unit = 170;
  const X = (x: number) => px(origin.x + x * unit);
  const Y = (y: number) => px(origin.y - y * unit);
  const { viaX, viaY, gap, curl } = pathIntegrals(k, a, b);
  const integrable = Math.abs(curl) < 1e-9;
  const samples = [0.125, 0.375, 0.625, 0.875, 1.125, 1.375];
  const fieldScale = 30 / (1.375 * Math.hypot(1, k));
  const domain = Math.max(1, Math.ceil(Math.max(Math.abs(viaX), Math.abs(viaY)) - 1e-9));
  const drag = useDrag<'end'>((_, pointer) => {
    setA(snap(clamp((pointer.x - origin.x) / unit, 0.2, 1.5), 0.05));
    setB(snap(clamp((origin.y - pointer.y) / unit, 0.2, 1.5), 0.05));
  });
  const labelRight = a <= 1;
  return <AnswerFrame title="Testing a slope field for integrability" lab="Lab 01 · worksheet Q1(c)" takeaway={<><b>(y, x) passes</b>: pᵧ = qₓ = 1 and z = −xy + C. <b>(y, 0) fails</b>: from (0, 0) to (1, 1) the path through (1, 0) gives Δz = 0, the path through (0, 1) gives −1. Here the two paths always differ by (pᵧ − qₓ) times the area they enclose.</>}>
    <div className="answer-layout">
      <Figure instruction="DRAG THE END POINT · CHANGE k" subtitle="Grey arrows: the claimed slopes ∇z = −(p, q). Both paths run from (0, 0) to the handle.">
        <svg className="answer-svg draggable" viewBox="0 0 360 320" aria-label={`Slope field (y, ${fmt(k, 1)}x) with two integration paths to (${fmt(a, 2)}, ${fmt(b, 2)})`} {...drag.svg}>
          <rect x={X(0)} y={Y(b)} width={px(a * unit)} height={px(b * unit)} className="answer-loop" />
          {samples.flatMap((x) => samples.map((y) => {
            const gx = -y * fieldScale; const gy = -k * x * fieldScale;
            return <Arrow key={`${x}-${y}`} from={{ x: X(x) - gx / 2, y: Y(y) + gy / 2 }} to={{ x: X(x) + gx / 2, y: Y(y) - gy / 2 }} tone="grey" head={6} />;
          }))}
          <Arrow from={{ x: X(0), y: Y(0) }} to={{ x: X(1.62), y: Y(0) }} tone="grey" head={7} /><text x={X(1.62) + 6} y={Y(0) + 4}>x</text>
          <Arrow from={{ x: X(0), y: Y(0) }} to={{ x: X(0), y: Y(1.62) }} tone="grey" head={7} /><text x={X(0) + 7} y={Y(1.62) + 4}>y</text>
          {[0.5, 1, 1.5].map((tick) => <g key={tick}><text x={X(tick)} y={Y(0) + 19} textAnchor="middle">{tick}</text><text x={X(0) - 8} y={Y(tick) + 4} textAnchor="end">{tick}</text></g>)}
          <polyline points={`${X(0)},${Y(0)} ${X(a)},${Y(0)} ${X(a)},${Y(b)}`} className="answer-path warm" />
          <polyline points={`${X(0)},${Y(0)} ${X(0)},${Y(b)} ${X(a)},${Y(b)}`} className="answer-path blue" />
          <circle cx={X(0)} cy={Y(0)} r="4.5" className="answer-dot" />
          <Handle at={{ x: X(a), y: Y(b) }} label="Drag the end point" onStart={drag.start('end')} />
          <text x={labelRight ? X(a) + 16 : X(a) - 16} y={b > 1.3 ? Y(b) + 28 : Y(b) - 15} textAnchor={labelRight ? 'start' : 'end'} className="strong">({fmt(a, 2)}, {fmt(b, 2)})</text>
        </svg>
        <Bars centred domain={domain} bars={[{ label: `Δz via (${fmt(a, 2)}, 0)`, value: viaX, warm: true }, { label: `Δz via (0, ${fmt(b, 2)})`, value: viaY }]} />
        <Readout warning={!integrable} title={integrable ? 'Both paths agree: pᵧ = qₓ' : `The paths disagree by ${fmt(gap)}`}>pᵧ − qₓ = {fmt(curl, 1)} · enclosed area a·b = {fmt(a * b)} · gap = (pᵧ − qₓ)·a·b</Readout>
        <Range label="k in q = k·x" value={k} min={-1} max={2} step={0.1} digits={1} onChange={(value) => setK(snap(value, 0.1))} />
        <Range label="End point a" value={a} min={0.2} max={1.5} step={0.05} onChange={(value) => setA(snap(value, 0.05))} />
        <Range label="End point b" value={b} min={0.2} max={1.5} step={0.05} onChange={(value) => setB(snap(value, 0.05))} />
        <Choices options={[
          { label: '(p, q) = (y, x)', active: k === 1 && a === 1 && b === 1, onClick: () => { setK(1); setA(1); setB(1); } },
          { label: '(p, q) = (y, 0)', active: k === 0 && a === 1 && b === 1, onClick: () => { setK(0); setA(1); setB(1); } },
        ]} />
      </Figure>
      <div className="answer-steps">
        <Step number={1} title="State the condition"><p>A smooth depth map has zₓᵧ = zᵧₓ. With p = −zₓ and q = −zᵧ this becomes pᵧ = qₓ.</p><div className="answer-equation">p = y ⇒ pᵧ = 1<br />q = {fmt(k, 1)}·x ⇒ qₓ = {fmt(k, 1)}<br />pᵧ − qₓ = <b>{fmt(curl, 1)}</b> ⇒ {integrable ? 'integrable' : 'not integrable'}</div></Step>
        <Step number={2} title="Integrate along both paths"><p>The claimed slopes are zₓ = −y and zᵧ = {fmt(-k, 1)}·x. Both vanish on the first leg of each path (y = 0 or x = 0).</p><div className="answer-equation">via (a, 0): Δz = ∫₀ᵇ zᵧ(a, y) dy = ({fmt(-k * a, 2)})·{fmt(b, 2)} = <b>{fmt(viaX)}</b><br />via (0, b): Δz = ∫₀ᵃ zₓ(x, b) dx = ({fmt(-b, 2)})·{fmt(a, 2)} = <b>{fmt(viaY)}</b></div></Step>
        <Step number={3} title="Compare the two paths"><div className="answer-equation">gap = {fmt(viaX)} − ({fmt(viaY)}) = <b>{fmt(gap)}</b> = (pᵧ − qₓ)·a·b</div><p>Only pᵧ = qₓ makes every pair of paths agree. Otherwise no depth map has these slopes.</p></Step>
        <Step number={4} title="Recover the surface that passes"><p>For k = 1 the field (y, x) passes the test.</p><div className="answer-equation">zₓ = −y, zᵧ = −x ⇒ z = −xy + C</div></Step>
      </div>
    </div>
  </AnswerFrame>;
}

// Directions seen from above: the unit vector (x, y, z) is drawn at (x, y), so the
// centre is straight above and the rim is the horizon.
function TopView({ centre, radius, children }: { centre: Point; radius: number; children: ReactNode }) {
  const rings = [30, 60].map((elevation) => ({ elevation, r: px(radius * Math.cos(elevation * Math.PI / 180)) }));
  return <>
    <circle cx={centre.x} cy={centre.y} r={radius} className="hemi-disc" />
    {rings.map((ring) => <g key={ring.elevation}><circle cx={centre.x} cy={centre.y} r={ring.r} className="hemi-ring" /><text x={px(centre.x - ring.r * Math.SQRT1_2 - 3)} y={px(centre.y - ring.r * Math.SQRT1_2 - 3)} textAnchor="end">{ring.elevation}°</text></g>)}
    <Arrow from={{ x: centre.x - radius - 8, y: centre.y }} to={{ x: centre.x + radius + 16, y: centre.y }} tone="grey" head={7} /><text x={centre.x + radius + 20} y={centre.y + 4}>x</text>
    <Arrow from={{ x: centre.x, y: centre.y + radius + 8 }} to={{ x: centre.x, y: centre.y - radius - 16 }} tone="grey" head={7} /><text x={centre.x + 7} y={centre.y - radius - 10}>y</text>
    {children}
  </>;
}

const LIGHT_NAMES = ['s₁', 's₂', 's₃'];
const S1: Vector3 = [0, 0, 1];
const S2: Vector3 = [Math.SQRT1_2, 0, Math.SQRT1_2];

// Q3: three lights and the rank of S (worksheet Q3).
function LightCountAnswer() {
  const [x3, setX3] = useState(-Math.SQRT1_2);
  const [y3, setY3] = useState(0);
  const centre = { x: 180, y: 165 }; const radius = 135;
  // Keep s3 at least 18 degrees above the horizon.
  const place = (x: number, y: number) => {
    const scale = Math.min(1, 0.95 / Math.max(1e-9, Math.hypot(x, y)));
    setX3(snap(x * scale, 0.01)); setY3(snap(y * scale, 0.01));
  };
  const z3 = Math.sqrt(Math.max(0, 1 - x3 * x3 - y3 * y3));
  const lights: Vector3[] = [S1, S2, [x3, y3, z3]];
  const det = determinant3(lights);
  const { rank, condition } = lightMatrixStats(lights);
  const kappa = Number.isFinite(condition) ? fmt(condition, 1) : '∞';
  const screen = (light: Vector3) => ({ x: px(centre.x + light[0] * radius), y: px(centre.y - light[1] * radius) });
  const drag = useDrag<'s3'>((_, pointer) => place((pointer.x - centre.x) / radius, (centre.y - pointer.y) / radius));
  const worksheet = Math.abs(x3 + Math.SQRT1_2) < 0.006 && Math.abs(y3) < 0.006;
  const q4 = Math.abs(x3) < 0.006 && Math.abs(y3 - Math.SQRT1_2) < 0.006;
  return <AnswerFrame title="How many images, and which lights?" lab="Lab 02 · worksheet Q3" takeaway={<>At least <b>three images</b>, with light directions that are linearly independent, so not all in one plane through the origin. The worksheet lights (0, 0, 1), (1, 0, 1)/√2 and (−1, 0, 1)/√2 all lie in the x–z plane: <b>det S = 0 and rank S = 2</b>, so n₂, and with it ρ, cannot be recovered.</>}>
    <div className="answer-layout">
      <Figure instruction="DRAG LIGHT s₃" subtitle="Lights seen from above: centre = straight above, rim = horizon. On the orange line s₃ shares the plane of s₁ and s₂.">
        <svg className="answer-svg draggable" viewBox="0 0 360 330" aria-label={`Top view of three light directions; s3 = (${fmt(x3, 2)}, ${fmt(y3, 2)}, ${fmt(z3, 2)})`} {...drag.svg}>
          <TopView centre={centre} radius={radius}>
            <line x1={centre.x - radius} y1={centre.y} x2={centre.x + radius} y2={centre.y} className="answer-plane-line" />
            <text x={centre.x + radius - 6} y={centre.y + 22} textAnchor="end">plane of s₁ and s₂</text>
            {lights.map((light, index) => <line key={index} x1={centre.x} y1={centre.y} x2={screen(light).x} y2={screen(light).y} className="hemi-light-ray" />)}
            {[S1, S2].map((light, index) => <g key={index}><circle cx={screen(light).x} cy={screen(light).y} r="7" className="hemi-light" /><text x={screen(light).x + 9} y={screen(light).y - 10} className="strong">{LIGHT_NAMES[index]}</text></g>)}
            <Handle at={screen(lights[2])} warm label="Drag light s₃" onStart={drag.start('s3')} />
            <text x={screen(lights[2]).x + 14} y={screen(lights[2]).y - 14} className="strong">s₃</text>
          </TopView>
        </svg>
        <Bars centred domain={0.7} bars={[{ label: 'det S', value: det, warm: rank < 3 }]} />
        <Readout warning={rank < 3} title={rank < 3 ? 'rank S = 2: g is not unique' : `rank S = 3: g is unique · κ(S) = ${kappa}`}>{rank < 3 ? 'S·(0, 1, 0)ᵀ = 0, so the images cannot see g₂.' : 'A larger κ means noise in I is amplified more in g.'} s₃ = ({fmt(x3, 2)}, {fmt(y3, 2)}, {fmt(z3, 2)})</Readout>
        <Range label="s₃ x-component" value={x3} min={-0.9} max={0.9} step={0.01} onChange={(value) => place(value, y3)} />
        <Range label="s₃ y-component" value={y3} min={-0.9} max={0.9} step={0.01} onChange={(value) => place(x3, value)} />
        <Choices options={[
          { label: 'Worksheet s₃ = (−1, 0, 1)/√2', active: worksheet, onClick: () => { setX3(-Math.SQRT1_2); setY3(0); } },
          { label: 'Q4 light s₃ = (0, 1, 1)/√2', active: q4, onClick: () => { setX3(0); setY3(Math.SQRT1_2); } },
        ]} />
      </Figure>
      <div className="answer-steps">
        <Step number={1} title="Count unknowns and equations"><p>g = ρn has three unknown components, and each image gives one linear equation.</p><div className="answer-equation">Iₖ = sₖᵀg, k = 1, …, K ⇒ K ≥ 3 images</div></Step>
        <Step number={2} title="Stack the lights"><div className="answer-equation">S = [0 0 1; 0.707 0 0.707; {fmt(x3, 2)} {fmt(y3, 2)} {fmt(z3, 2)}]</div></Step>
        <Step number={3} title="Test independence"><div className="answer-equation">det S = s₁·(s₂ × s₃) = s₃,y/√2 = <b>{fmt(det)}</b> ⇒ rank S = <b>{rank}</b></div><p>The directions are independent only when s₃ leaves the vertical plane of s₁ and s₂, here the x–z plane.</p></Step>
        {rank < 3
          ? <Step number={4} title="See what is lost"><div className="answer-equation">S·(0, 1, 0)ᵀ = 0</div><p>g + t(0, 1, 0) explains the three images equally well for every t, so n₂, and with it ρ, cannot be recovered.</p></Step>
          : <Step number={4} title="Check the conditioning"><p>All three components of g are determined. κ(S) = {kappa}: moving s₃ toward the orange line makes κ grow and the solution more sensitive to noise.</p></Step>}
      </div>
    </div>
  </AnswerFrame>;
}

// Q4: solving S g = I for the worksheet lights (worksheet Q4).
const WORKSHEET_I = [0.2, 0.3 * Math.SQRT2, 0.3 * Math.SQRT2];
const Q4_LIGHTS: Vector3[] = [S1, S2, [0, Math.SQRT1_2, Math.SQRT1_2]];

function SolveAnswer() {
  const [intensities, setIntensities] = useState(WORKSHEET_I);
  const [scale, setScale] = useState(1);
  const I = intensities.map((value) => value * scale);
  const { g, albedo, normal } = solveWorksheetLights(I);
  const facing = normal !== null && normal[2] > 1e-6;
  const worksheet = scale === 1 && intensities.every((value, index) => value === WORKSHEET_I[index]);
  const centre = { x: 180, y: 160 }; const radius = 128;
  const at = (v: Vector3) => ({ x: px(centre.x + v[0] * radius), y: px(centre.y - v[1] * radius) });
  const update = (index: number, value: number) => setIntensities(intensities.map((entry, k) => (k === index ? value : entry)));
  const status = !normal ? 'ρ = 0: no light comes back, so n is undefined' : !facing ? 'n₃ ≤ 0: this normal faces away from the camera' : albedo > 1 ? `ρ = ${fmt(albedo)} > 1: not a physical albedo` : null;
  return <AnswerFrame title="Solving for albedo and normal" lab="Lab 02 · worksheet Q4" takeaway={<>The worksheet intensities give <b>g = (2/5, 2/5, 1/5), so ρ = 3/5 and n = (2/3, 2/3, 1/3)</b>. Move the common factor c: ρ scales with it and n stays put, because the length of g is the albedo and its direction is the normal.</>}>
    <div className="answer-layout">
      <Figure instruction="MOVE THE INTENSITY SLIDERS" subtitle="The blue point is the solved normal seen from above; the orange points are the three lights">
        <svg className="answer-svg" viewBox="0 0 360 320" aria-label={`Solved normal for I = (${fmt(I[0])}, ${fmt(I[1])}, ${fmt(I[2])})`}>
          <TopView centre={centre} radius={radius}>
            {Q4_LIGHTS.map((light, index) => <g key={index}><circle cx={at(light).x} cy={at(light).y} r="7" className="hemi-light" /><text x={index ? at(light).x + 10 : at(light).x - 9} y={index ? at(light).y - 10 : at(light).y + 20} textAnchor={index ? 'start' : 'end'} className="strong">{LIGHT_NAMES[index]}</text></g>)}
            {normal && facing ? <><line x1={centre.x} y1={centre.y} x2={at(normal).x} y2={at(normal).y} className="answer-normal-line" /><circle cx={at(normal).x} cy={at(normal).y} r="8" className="hemi-estimate" /><text x={at(normal).x + 11} y={at(normal).y + 19} className="strong">n</text></> : null}
          </TopView>
        </svg>
        <Bars domain={1.2} bars={[{ label: 'ρ = ‖g‖', value: albedo, warm: albedo > 1 }]} />
        <Readout warning={status !== null} title={status ?? <>ρ = {fmt(albedo)} · n = ({fmt(normal?.[0] ?? 0)}, {fmt(normal?.[1] ?? 0)}, {fmt(normal?.[2] ?? 0)})</>}>g = ({fmt(g[0])}, {fmt(g[1])}, {fmt(g[2])}) · I = c·(I₁, I₂, I₃) with c = {fmt(scale, 2)}</Readout>
        <Range label="I₁ (light s₁)" value={intensities[0]} min={0} max={1} step={0.005} digits={3} onChange={(value) => update(0, value)} />
        <Range label="I₂ (light s₂)" value={intensities[1]} min={0} max={1} step={0.005} digits={3} onChange={(value) => update(1, value)} />
        <Range label="I₃ (light s₃)" value={intensities[2]} min={0} max={1} step={0.005} digits={3} onChange={(value) => update(2, value)} />
        <Range label="Common factor c" value={scale} min={0.25} max={1.6} step={0.05} onChange={(value) => setScale(snap(value, 0.05))} />
        <Choices options={[{ label: 'Worksheet I = (1/5, 3√2/10, 3√2/10)', active: worksheet, onClick: () => { setIntensities(WORKSHEET_I); setScale(1); } }]} />
      </Figure>
      <div className="answer-steps">
        <Step number={1} title="Write the system"><p>The rows of S are the light directions s₁ = (0, 0, 1), s₂ = (1, 0, 1)/√2 and s₃ = (0, 1, 1)/√2.</p><div className="answer-equation">Sg = I with I = ({fmt(I[0])}, {fmt(I[1])}, {fmt(I[2])})</div></Step>
        <Step number={2} title="Solve row by row"><div className="answer-equation">row 1: g₃ = I₁ = {fmt(g[2])}<br />row 2: (g₁ + g₃)/√2 = I₂ ⇒ g₁ = √2·I₂ − g₃ = {fmt(g[0])}<br />row 3: (g₂ + g₃)/√2 = I₃ ⇒ g₂ = √2·I₃ − g₃ = {fmt(g[1])}</div></Step>
        <Step number={3} title="Split albedo and normal"><div className="answer-equation">ρ = ‖g‖ = <b>{fmt(albedo)}</b><br />n = g/ρ = <b>{normal ? `(${fmt(normal[0])}, ${fmt(normal[1])}, ${fmt(normal[2])})` : 'undefined'}</b></div><p>The length of g is the albedo; its direction is the normal.</p></Step>
        <Step number={4} title="Go back to slopes"><div className="answer-equation">{normal && facing ? <>(p, q) = (n₁/n₃, n₂/n₃) = ({fmt(normal[0] / normal[2], 2)}, {fmt(normal[1] / normal[2], 2)})<br />∇z = −(p, q) = ({fmt(-normal[0] / normal[2], 2)}, {fmt(-normal[1] / normal[2], 2)})</> : 'No slopes: the normal does not face the camera.'}</div><p>Photometric stereo gives this normal at every pixel; lab 01 integrates the slopes into depth.</p></Step>
      </div>
    </div>
  </AnswerFrame>;
}

// One term of p·ps + q·qs + 1, without coefficients 1 or zero terms.
function term(value: number, symbol: string, first: boolean) {
  const magnitude = fmt(Math.abs(value), 1);
  const body = magnitude === '1.0' ? symbol : `${magnitude}${symbol}`;
  if (first) return value < 0 ? `−${body}` : body;
  return value < 0 ? `− ${body}` : `+ ${body}`;
}
function lightLine(ps: number, qs: number) {
  const terms: string[] = [];
  if (Math.abs(ps) >= 0.05) terms.push(term(ps, 'p', true));
  if (Math.abs(qs) >= 0.05) terms.push(term(qs, 'q', terms.length === 0));
  return [...terms, terms.length ? '+ 1' : '1'].join(' ');
}

// Q5: brightest and black orientations under a distant light (worksheet Q2(b)).
function BrightestAnswer() {
  const [ps, setPs] = useState(1);
  const [qs, setQs] = useState(0);
  const norm = Math.hypot(1, ps, qs);
  const facingCamera = reflectance(0, 0, ps, qs);
  const overhead = Math.abs(ps) < 0.05 && Math.abs(qs) < 0.05;
  const line = lightLine(ps, qs);
  return <AnswerFrame title="Brightest and black orientations" lab="Lab 03 · distant light · worksheet Q2(b)" takeaway={<>For s ∝ (1, 0, 1): the brightest orientation is <b>(p, q) = (1, 0)</b>, where n = s and R = 1. <b>R = 0 on the line p = −1</b>; orientations with p &lt; −1 face away from the light (attached shadow).</>}>
    <div className="answer-layout">
      <Figure instruction="DRAG ON THE MAP TO MOVE THE LIGHT" subtitle="The brightest orientation follows the light; the dashed line R = 0 stays on the far side">
        <ReflectanceMap ps={ps} qs={qs} p={0} q={0} drag="light" showOrientation={false} onPick={(nextP, nextQ) => { setPs(nextP); setQs(nextQ); }} />
        <Readout title={<>Brightest: (p, q) = ({fmt(ps, 1)}, {fmt(qs, 1)}) with R = 1</>}>{overhead ? 'Light straight above: no orientation that faces the camera is black.' : <>Black on the line {line} = 0, attached shadow beyond it.</>} Facing the camera, (0, 0): R = {fmt(facingCamera)}</Readout>
        <Range label="Light pₛ" value={ps} min={-2.5} max={2.5} step={0.1} digits={1} onChange={(value) => setPs(snap(value, 0.1))} />
        <Range label="Light qₛ" value={qs} min={-2.5} max={2.5} step={0.1} digits={1} onChange={(value) => setQs(snap(value, 0.1))} />
        <Choices options={[{ label: 'Worksheet light s ∝ (1, 0, 1)', active: ps === 1 && qs === 0, onClick: () => { setPs(1); setQs(0); } }]} />
      </Figure>
      <div className="answer-steps">
        <Step number={1} title="Write the reflectance map"><p>With N = (p, q, 1) and s ∝ (pₛ, qₛ, 1) = ({fmt(ps, 1)}, {fmt(qs, 1)}, 1) (slide 10):</p><div className="answer-equation">R(p, q) = ({line}) / (√(1 + p² + q²) · {fmt(norm)})</div></Step>
        <Step number={2} title="Find the maximum"><p>R = cos θᵢ ≤ 1, with equality only when n = s (slide 12).</p><div className="answer-equation">R = 1 at (p, q) = (pₛ, qₛ) = <b>({fmt(ps, 1)}, {fmt(qs, 1)})</b></div><p>For comparison, the orientation facing the camera, (0, 0), has R = {fmt(facingCamera)}.</p></Step>
        <Step number={3} title="Find the black orientations">{overhead
          ? <p>With the light straight above, R &gt; 0 for every orientation, so there is no line R = 0.</p>
          : <><div className="answer-equation">R = 0 on <b>{line} = 0</b></div><p>There the light grazes the surface (θᵢ = 90°). Beyond the line the surface faces away from the light: attached shadow, the shaded side of the map.</p></>}</Step>
      </div>
    </div>
  </AnswerFrame>;
}

// Q6: the brightest point under a nearby light (worksheet Q7(a) and the extension).
function NearLightAnswer() {
  const [height, setHeight] = useState(10);
  const [r, setR] = useState(Math.sqrt(50));
  const [falloff, setFalloff] = useState(false);
  const unit = 15; const footX = 190; const planeY = 200; const profileY = 318; const profileHeight = 60;
  const { distance, cosine, angle, withFalloff, relativeWithFalloff } = nearLightBrightness(height, r);
  const relative = falloff ? relativeWithFalloff : cosine;
  const light = { x: footX, y: planeY - height * unit };
  const probe = { x: footX + r * unit, y: planeY };
  const below = Math.abs(r) < 1e-9;
  // Screen direction from the probe to the light, and the bisector of n and s.
  const toward = { x: -r / distance, y: -height / distance };
  const bisector = { x: toward.x, y: toward.y - 1 };
  const bisectorLength = Math.hypot(bisector.x, bisector.y);
  const arc = 22;
  const profile = Array.from({ length: 89 }, (_, index) => {
    const t = -11 + index * 0.25;
    const sample = nearLightBrightness(height, t);
    return `${index ? 'L' : 'M'}${px(footX + t * unit)} ${px(profileY - (falloff ? sample.relativeWithFalloff : sample.cosine) * profileHeight)}`;
  }).join(' ');
  const drag = useDrag<'light' | 'probe'>((target, pointer) => {
    if (target === 'light') setHeight(snap(clamp((planeY - pointer.y) / unit, 1, 12), 0.1));
    else setR(snap(clamp((pointer.x - footX) / unit, -10, 10), 0.05));
  });
  const corner = Math.abs(r - Math.sqrt(50)) < 1e-9 && height === 10;
  return <AnswerFrame title="The brightest point under a nearby light" lab="Lab 03 · nearby light · worksheet Q7(a)" takeaway={<>The brightest point is directly below the light: <b>(5, 5, 0) with B = 1</b> for the worksheet, because there s = n. Away from it s tilts and B = cos θ falls; at the corner (0, 0), B ≈ 0.816. The 1/d² fall-off lowers the corner to 0.544 of the peak but does not move the brightest point.</>}>
    <div className="answer-layout">
      <Figure instruction="DRAG THE LIGHT AND THE PROBE" subtitle="Side view through the light; r is the horizontal distance from the point (5, 5) below it">
        <svg className="answer-svg draggable" viewBox="0 0 380 330" aria-label={`Point light at height ${fmt(height, 1)}; probe at distance ${fmt(r, 2)} has brightness ${fmt(relative)}`} {...drag.svg}>
          <line x1="25" y1={planeY} x2="355" y2={planeY} className="answer-surface thin" />
          <line x1={footX} y1={px(light.y)} x2={footX} y2={planeY} className="answer-axis" />
          <line x1={px(light.x)} y1={px(light.y)} x2={px(probe.x)} y2={planeY} className="answer-ray" />
          <Arrow from={probe} to={{ x: probe.x, y: planeY - 48 }} tone="blue" />
          {below ? null : <Arrow from={probe} to={{ x: probe.x + toward.x * 48, y: planeY + toward.y * 48 }} tone="warm" />}
          {angle > 8 ? <path d={`M${px(probe.x)} ${planeY - arc}A${arc} ${arc} 0 0 ${r > 0 ? 0 : 1} ${px(probe.x + toward.x * arc)} ${px(planeY + toward.y * arc)}`} className="answer-arc" /> : null}
          {angle > 8 ? <text x={px(probe.x + bisector.x / bisectorLength * 36)} y={px(planeY + bisector.y / bisectorLength * 36 + 4)} textAnchor="middle" className="strong">θ</text> : null}
          <text x={px(probe.x + (r < 0 ? -7 : 7))} y={planeY - 38} textAnchor={r < 0 ? 'end' : 'start'}>{below ? 'n = s' : 'n'}</text>
          {below ? null : <text x={px(probe.x + toward.x * 60)} y={px(planeY + toward.y * 60 + 4)} textAnchor="middle">s</text>}
          <Handle at={light} warm radius={11} label="Drag the light up or down" onStart={drag.start('light')} />
          <text x={footX + 18} y={px(light.y + 4)} className="strong">A, h = {fmt(height, 1)}</text>
          <Handle at={probe} label="Drag the probe point along the plane" onStart={drag.start('probe')} />
          <text x="25" y={planeY + 22}>plane z = 0</text>
          <text x={footX} y={planeY + 22} textAnchor="middle">r = 0</text>
          <text x="25" y="246">relative brightness{falloff ? ' with 1/d²' : ''}</text>
          <line x1="25" y1={profileY - profileHeight} x2="355" y2={profileY - profileHeight} className="answer-axis" />
          <line x1="25" y1={profileY} x2="355" y2={profileY} className="answer-axis-solid" />
          <text x="360" y={profileY - profileHeight + 4}>1</text><text x="360" y={profileY + 4}>0</text>
          <path d={profile} className="answer-profile" />
          <circle cx={px(probe.x)} cy={px(profileY - relative * profileHeight)} r="5" className="answer-dot warm" />
        </svg>
        <Readout title={falloff ? <>B / B(below the light) = (h/d)³ = {fmt(relative)}</> : <>B = cos θ = h/d = {fmt(cosine)}</>}>d = {fmt(distance)} · θ = {fmt(angle, 1)}° · r = {fmt(r, 2)}</Readout>
        <Range label="Light height h" value={height} min={1} max={12} step={0.1} digits={1} onChange={(value) => setHeight(snap(value, 0.1))} />
        <Range label="Probe distance r" value={r} min={-10} max={10} step={0.05} onChange={(value) => setR(snap(value, 0.05))} />
        <Choices options={[
          { label: 'Worksheet corner (0, 0): r = √50, h = 10', active: corner, onClick: () => { setHeight(10); setR(Math.sqrt(50)); } },
          { label: 'Below the light: r = 0', active: below, onClick: () => setR(0) },
          { label: falloff ? 'Extension on: 1/d² fall-off' : 'Extension: add 1/d² fall-off', active: falloff, onClick: () => setFalloff(!falloff) },
        ]} />
      </Figure>
      <div className="answer-steps">
        <Step number={1} title="Light direction at the probe"><p>The probe X is at horizontal distance r from the point below the light A, and n = (0, 0, 1).</p><div className="answer-equation">d = ‖A − X‖ = √(r² + h²) = √({r < 0 ? `(${fmt(r, 2)})` : fmt(r, 2)}² + {fmt(height, 1)}²) = {fmt(distance)}<br />s = (A − X)/d</div></Step>
        <Step number={2} title="Brightness"><div className="answer-equation">{falloff
          ? <>B = (h/d)·(1/d²) = h/d³ = <b>{fmt(withFalloff, 5)}</b><br />relative to below the light: (h/d)³ = <b>{fmt(relative)}</b></>
          : <>B = ⟨n, s⟩ = h/d = cos θ = <b>{fmt(cosine)}</b></>}</div></Step>
        <Step number={3} title="Where B is largest"><div className="answer-equation">d ≥ h, with equality only at r = 0</div><p>The brightest point is directly below the light, where s = n and B = {falloff ? '1/h²' : '1'}. This is the rule of slide 12, maximum reflectance when n = s.</p></Step>
        <Step number={4} title="Worksheet numbers"><div className="answer-equation">A = (5, 5, 10): brightest point (5, 5, 0), B = 1<br />corner (0, 0): r = √50, B = 10/√150 ≈ 0.816<br />with 1/d²: B(0, 0)/B(5, 5) = (100/150)^(3/2) ≈ 0.544</div></Step>
      </div>
    </div>
  </AnswerFrame>;
}

const answers: Record<string, ComponentType> = {
  't04-integration-plane': PlaneNormalAnswer,
  't04-integration-test': IntegrabilityAnswer,
  't04-stereo-count': LightCountAnswer,
  't04-stereo-solve': SolveAnswer,
  't04-reflectance-peak': BrightestAnswer,
  't04-near-light-peak': NearLightAnswer,
};

export function InteractiveAnswer({ questionId, fallback }: AnswerProps) {
  const Answer = answers[questionId];
  if (!Answer) return <div className="released-answer"><span>ANSWER</span><p>{fallback}</p></div>;
  return <Answer />;
}

'use client';

import { useState, type ReactNode } from 'react';

type AnswerProps = { questionId: string; fallback: string };

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const fmt = (value: number, digits = 2) => value.toFixed(digits);

function AnswerFrame({ title, takeaway, children }: { title: string; takeaway: ReactNode; children: ReactNode }) {
  return <div className="worked-answer">
    <div className="answer-title-row"><span>WORKED ANSWER</span><strong>{title}</strong></div>
    {children}
    <div className="answer-takeaway"><span>TAKEAWAY</span><p>{takeaway}</p></div>
  </div>;
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return <div className="answer-step"><span>{number}</span><div><strong>{title}</strong>{children}</div></div>;
}

function Range({ label, value, min, max, step, unit = '', onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void }) {
  return <label className="answer-range"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><output>{fmt(value, step < 1 ? 2 : 0)}{unit}</output></label>;
}

function Figure({ instruction, subtitle, children }: { instruction: string; subtitle: string; children: ReactNode }) {
  return <div className="interactive-figure"><div className="figure-heading"><span>{instruction}</span><b>{subtitle}</b></div>{children}</div>;
}

function EdgeProfile({ sigma, contrast, threshold }: { sigma: number; contrast: number; threshold?: number }) {
  const peak = contrast / (Math.sqrt(2 * Math.PI) * sigma);
  const values = Array.from({ length: 121 }, (_, index) => {
    const x = -30 + index / 2;
    return { x: 40 + index * 5, y: 210 - (peak * Math.exp(-(x * x) / (2 * sigma * sigma)) / 0.2) * 170 };
  });
  const curve = values.map((point, index) => `${index ? 'L' : 'M'}${fmt(point.x, 1)} ${fmt(point.y, 1)}`).join(' ');
  const crossing = threshold && threshold < peak ? sigma * Math.sqrt(2 * Math.log(peak / threshold)) : 0;
  return <svg className="answer-svg" viewBox="0 0 680 260" role="img" aria-label={`Gaussian edge derivative with peak ${fmt(peak, 3)} and scale ${sigma}`}>
    <line className="answer-axis" x1="40" y1="210" x2="640" y2="210" />
    <line className="answer-guide" x1="340" y1="28" x2="340" y2="210" />
    {threshold !== undefined && <>
      {crossing > 0 && <rect className="answer-detected" x={340 - crossing * 10} y="30" width={crossing * 20} height="180" />}
      <line className="answer-threshold" x1="40" y1={210 - threshold / 0.2 * 170} x2="640" y2={210 - threshold / 0.2 * 170} />
      <text x="490" y={clamp(203 - threshold / 0.2 * 170, 25, 198)}>threshold = {fmt(threshold, 3)}</text>
    </>}
    <path className="answer-curve" d={curve} />
    <circle className="answer-point" cx="340" cy={210 - peak / 0.2 * 170} r="5" />
    <text x="44" y="235">−30 px</text><text x="327" y="235">edge</text><text x="594" y="235">+30 px</text>
    <text x="350" y={clamp(198 - peak / 0.2 * 170, 25, 195)}>peak {fmt(peak, 3)}</text>
  </svg>;
}

function EdgeScaleAnswer() {
  const [sigma, setSigma] = useState(5);
  const [contrast, setContrast] = useState(0.8);
  const peak = contrast / (Math.sqrt(2 * Math.PI) * sigma);
  return <AnswerFrame title="Gaussian scale and the edge response" takeaway={<>A wider Gaussian reduces noise but gives a <b>lower, wider derivative peak</b>. The ideal step remains centred at the same edge location.</>}>
    <div className="answer-layout"><Figure instruction="MOVE BOTH SLIDERS" subtitle="The derivative stays centred while its height and width change">
      <EdgeProfile sigma={sigma} contrast={contrast} />
      <Range label="Gaussian σ" value={sigma} min={2} max={14} step={0.5} unit=" px" onChange={setSigma} />
      <Range label="Step contrast ΔI" value={contrast} min={0.2} max={1} step={0.05} onChange={setContrast} />
    </Figure><div className="answer-steps">
      <Step number={1} title="Start with an ideal intensity step"><p>Convolving a step of height ΔI with a Gaussian Gσ smooths the jump.</p></Step>
      <Step number={2} title="Differentiate the smoothed step"><div className="answer-equation">Iσ′(x) = ΔI · Gσ(x)<br />= ΔI / (√(2π)σ) · exp(−x² / (2σ²))</div></Step>
      <Step number={3} title="Read the peak and width"><p>At x = 0 the current peak is <b>{fmt(peak, 3)}</b>. Its standard deviation is σ = <b>{fmt(sigma, 1)} px</b>. Doubling σ halves the peak and doubles the profile width when contrast stays fixed.</p></Step>
    </div></div>
  </AnswerFrame>;
}

function EdgeThresholdAnswer() {
  const [sigma, setSigma] = useState(5);
  const [contrast, setContrast] = useState(0.8);
  const [threshold, setThreshold] = useState(0.03);
  const peak = contrast / (Math.sqrt(2 * Math.PI) * sigma);
  const detected = peak > threshold;
  const halfWidth = detected ? sigma * Math.sqrt(2 * Math.log(peak / threshold)) : 0;
  return <AnswerFrame title="When a fixed threshold misses an edge" takeaway={<>Detection needs <b>ΔI / (√(2π)σ) &gt; T</b>. An intensity step can still exist when its smoothed gradient falls below T.</>}>
    <div className="answer-layout"><Figure instruction="TRY A LOWER CONTRAST OR LARGER σ" subtitle="The highlighted interval is where the gradient exceeds the threshold">
      <EdgeProfile sigma={sigma} contrast={contrast} threshold={threshold} />
      <Range label="Contrast ΔI" value={contrast} min={0.1} max={1} step={0.05} onChange={setContrast} />
      <Range label="Gaussian σ" value={sigma} min={2} max={14} step={0.5} unit=" px" onChange={setSigma} />
      <Range label="Threshold T" value={threshold} min={0.01} max={0.12} step={0.005} onChange={setThreshold} />
      <div className={detected ? 'answer-readout' : 'answer-readout muted'}><strong>{detected ? 'Edge detected' : 'Edge missed'}</strong><span>peak {fmt(peak, 3)} {detected ? `· interval ±${fmt(halfWidth, 1)} px` : `≤ threshold ${fmt(threshold, 3)}`}</span></div>
    </Figure><div className="answer-steps">
      <Step number={1} title="Compute the strongest gradient"><div className="answer-equation">peak |Iₓ| = ΔI / (√(2π)σ) = <b>{fmt(peak, 3)}</b></div></Step>
      <Step number={2} title="Compare it with the fixed threshold"><p>The rule reports pixels only where |Iₓ| &gt; T = {fmt(threshold, 3)}. {detected ? 'The peak clears the threshold.' : 'Even the peak does not clear the threshold.'}</p></Step>
      <Step number={3} title="Explain the failure"><p>Lower ΔI scales the whole curve down. Larger σ lowers its peak as 1/σ. Neither operation removes the underlying step.</p></Step>
    </div></div>
  </AnswerFrame>;
}

const interestImage = [
  [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1], [0, 0, 0, 1, 1, 1], [0, 0, 0, 1, 1, 1],
];

function HarrisAnswer() {
  const [alpha, setAlpha] = useState(1);
  const [location, setLocation] = useState<'corner' | 'edge'>('corner');
  const [k, setK] = useState(0.05);
  const base = location === 'corner' ? [[4, -1], [-1, 4]] : [[6, 0], [0, 0]];
  const scale = alpha * alpha / 9;
  const m11 = base[0][0] * scale, m12 = base[0][1] * scale, m22 = base[1][1] * scale;
  const determinant = m11 * m22 - m12 * m12;
  const score = determinant - k * (m11 + m22) ** 2;
  const row = location === 'corner' ? 3 : 5, col = 3;
  return <AnswerFrame title="Harris: corner, edge and contrast scaling" takeaway={<>At k = 0.05, the solution gives <b>R(*) = 59/405 ≈ 0.14568</b> and <b>R(**) = −1/45 ≈ −0.02222</b>. Halving intensity divides both scores by 16.</>}>
    <div className="answer-layout"><Figure instruction="CHOOSE A POINT AND CHANGE CONTRAST" subtitle="The highlighted 3×3 neighborhood supplies the gradient products">
      <div className="answer-pixel-grid" role="img" aria-label="Six by six binary image with selected Harris location">
        {interestImage.flatMap((imageRow, r) => imageRow.map((value, c) => <div key={`${r}-${c}`} className={`${value ? 'bright' : ''} ${r === row && c === col ? 'selected' : ''} ${Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1 ? 'window' : ''}`}><span>{fmt(value * alpha, alpha === 1 ? 0 : 2)}</span>{r === row && c === col ? <b>{location === 'corner' ? '*' : '**'}</b> : null}</div>))}
      </div>
      <div className="answer-choice"><button className={location === 'corner' ? 'active' : ''} onClick={() => setLocation('corner')}>Corner (*)</button><button className={location === 'edge' ? 'active' : ''} onClick={() => setLocation('edge')}>Edge (**)</button></div>
      <Range label="Intensity factor α" value={alpha} min={0.25} max={1} step={0.05} onChange={setAlpha} />
      <Range label="Harris k" value={k} min={0.03} max={0.08} step={0.005} onChange={setK} />
      <div className="answer-readout"><strong>R = {fmt(score, 5)}</strong><span>{score > 0 ? 'corner-like response' : 'edge-like response'}</span></div>
    </Figure><div className="answer-steps">
      <Step number={1} title="Average gradient products"><p>With the sheet&apos;s central differences and 3×3 uniform window, M(*) = ⅑ [[4, −1], [−1, 4]] and M(**) = ⅑ [[6, 0], [0, 0]] for I¹. The negative off-diagonal term uses upward y.</p></Step>
      <Step number={2} title="Apply the Harris score"><div className="answer-equation">M = [[{fmt(m11, 3)}, {fmt(m12, 3)}], [{fmt(m12, 3)}, {fmt(m22, 3)}]]<br />R = det M − k(tr M)² = <b>{fmt(score, 5)}</b></div></Step>
      <Step number={3} title="Scale all intensities"><p>Gradients scale by α, M by α², and R by α⁴ when k is held fixed. At α = 0.5 and k = 0.05, the scores become 59/6480 ≈ 0.009105 and −1/720 ≈ −0.001389.</p></Step>
    </div></div>
  </AnswerFrame>;
}

function DescriptorAnswer() {
  const [quarterTurns, setQuarterTurns] = useState(0);
  const angle = quarterTurns * 90;
  const rawBins = [0, 0, 0, 0].map((_, index) => index === quarterTurns ? 1 : 0);
  return <AnswerFrame title="Detection selects a point; description makes it matchable" takeaway={<>The detector chooses <b>where</b> to look. A descriptor records <b>what the local neighborhood looks like</b>. Estimating or normalising scale and orientation makes descriptors more comparable across views.</>}>
    <div className="answer-layout"><Figure instruction="ROTATE THE SECOND PATCH" subtitle="An illustrative four-bin descriptor changes until orientation is normalised">
      <svg className="answer-svg" viewBox="0 0 680 260" role="img" aria-label={`Reference feature and the same feature rotated by ${angle} degrees`}>
        <rect className="answer-patch" x="65" y="34" width="220" height="190" /><rect className="answer-patch" x="395" y="34" width="220" height="190" />
        <g><path className="answer-feature" d="M124 90 H175 V140" /><circle className="answer-feature-point" cx="175" cy="140" r="9" /><line className="answer-orientation" x1="175" y1="140" x2="220" y2="140" /></g>
        <g transform={`rotate(${angle} 505 140)`}><path className="answer-feature" d="M454 90 H505 V140" /><circle className="answer-feature-point" cx="505" cy="140" r="9" /><line className="answer-orientation" x1="505" y1="140" x2="550" y2="140" /></g>
        <text x="98" y="245">reference detection</text><text x="423" y="245">same feature · {angle}°</text>
      </svg>
      <div className="answer-choice">{[0, 90, 180, 270].map((degrees, index) => <button key={degrees} className={quarterTurns === index ? 'active' : ''} onClick={() => setQuarterTurns(index)}>{degrees}°</button>)}</div>
      <div className="answer-vector"><span>Schematic raw bins</span><code>[{rawBins.join(', ')}]</code><span>After orientation alignment</span><code>[1, 0, 0, 0]</code></div>
    </Figure><div className="answer-steps">
      <Step number={1} title="Detect repeatable locations"><p>A detector finds image positions, often accompanied by a scale or dominant orientation. The orange dots mark corresponding detections here.</p></Step>
      <Step number={2} title="Describe their neighborhoods"><p>A descriptor converts the patch around each detected point into a comparable vector. The four-bin vectors shown are a schematic example, not a specific descriptor algorithm.</p></Step>
      <Step number={3} title="Make the comparison stable"><p>Rotation and zoom can alter raw patch measurements. Aligning the patch to a chosen orientation and scale helps matching the same physical feature in two images.</p></Step>
    </div></div>
  </AnswerFrame>;
}

function LineFitAnswer() {
  const [yValues, setYValues] = useState([-7, -1, 5]);
  const xs = [0, 2, 4];
  const meanY = yValues.reduce((sum, value) => sum + value, 0) / 3;
  const slope = xs.reduce((sum, x, index) => sum + (x - 2) * (yValues[index] - meanY), 0) / 8;
  const intercept = meanY - 2 * slope;
  const residuals = xs.map((x, index) => yValues[index] - slope * x - intercept);
  const sse = residuals.reduce((sum, residual) => sum + residual * residual, 0);
  const xSvg = (x: number) => 76 + x * 125;
  const ySvg = (y: number) => 225 - (y + 10) * 10;
  const update = (index: number, value: number) => setYValues(yValues.map((old, current) => current === index ? value : old));
  return <AnswerFrame title="Ordinary least-squares line" takeaway={<>For the tutorial points, <b>y = 3x − 7</b> and the sum of squared vertical residuals is <b>0</b>. The slope is unique because the x coordinates are not all equal.</>}>
    <div className="answer-layout"><Figure instruction="MOVE THE THREE OBSERVATIONS" subtitle="Vertical segments show the residuals minimised by ordinary least squares">
      <svg className="answer-svg" viewBox="0 0 680 280" role="img" aria-label={`Least-squares line y equals ${fmt(slope)}x plus ${fmt(intercept)}, squared error ${fmt(sse)}`}>
        <line className="answer-axis" x1="50" y1={ySvg(0)} x2="625" y2={ySvg(0)} /><line className="answer-axis" x1="76" y1="30" x2="76" y2="245" />
        <line className="answer-fit-line" x1={xSvg(0)} y1={ySvg(intercept)} x2={xSvg(4)} y2={ySvg(slope * 4 + intercept)} />
        {xs.map((x, index) => <g key={x}><line className="answer-residual" x1={xSvg(x)} y1={ySvg(yValues[index])} x2={xSvg(x)} y2={ySvg(slope * x + intercept)} /><circle className="answer-point" cx={xSvg(x)} cy={ySvg(yValues[index])} r="7" /><text x={xSvg(x) - 22} y="265">x={x}</text></g>)}
      </svg>
      {xs.map((x, index) => <Range key={x} label={`y at x = ${x}`} value={yValues[index]} min={-9} max={9} step={1} onChange={(value) => update(index, value)} />)}
      <div className="answer-readout"><strong>y = {fmt(slope, 2)}x {intercept < 0 ? '−' : '+'} {fmt(Math.abs(intercept), 2)}</strong><span>Σ residual² = {fmt(sse, 2)}</span></div>
    </Figure><div className="answer-steps">
      <Step number={1} title="Minimise vertical errors"><div className="answer-equation">E(c₁,c₀) = Σ(c₁xᵢ + c₀ − yᵢ)²</div></Step>
      <Step number={2} title="Write the normal equations"><div className="answer-equation">[[Σx², Σx], [Σx, n]] [c₁,c₀]ᵀ = [Σxy, Σy]ᵀ<br />For the sheet: [[20,6],[6,3]] [c₁,c₀]ᵀ = [18,−3]ᵀ</div></Step>
      <Step number={3} title="Solve and check"><p>For the current points, c₁ = {fmt(slope, 2)} and c₀ = {fmt(intercept, 2)}. The vertical sum of squares is {fmt(sse, 2)}. {sse < 1e-10 ? 'These three points are exactly collinear.' : 'These three points are not collinear; the residual segments show the remaining error.'}</p></Step>
    </div></div>
  </AnswerFrame>;
}

const prewittPresets = {
  'Horizontal ramp': [0, 1, 2, 0, 1, 2, 0, 1, 2],
  'Vertical ramp': [2, 2, 2, 1, 1, 1, 0, 0, 0],
  Corner: [0, 0, 0, 0, 2, 2, 0, 2, 2],
} as const;

function PrewittAnswer() {
  const [patch, setPatch] = useState<number[]>([...prewittPresets['Horizontal ramp']]);
  const a = patch.reduce((sum, value, index) => sum + (index % 3 - 1) * value, 0) / 6;
  const b = patch.reduce((sum, value, index) => sum + (1 - Math.floor(index / 3)) * value, 0) / 6;
  const c = patch.reduce((sum, value) => sum + value, 0) / 9;
  const update = (index: number, value: number) => setPatch(patch.map((old, current) => current === index ? clamp(value, -9, 9) : old));
  return <AnswerFrame title="Prewitt as a local least-squares plane" takeaway={<>With local v increasing <b>upward</b>, the masks below are applied by <b>correlation</b>. A 180° rotation of either antisymmetric mask reverses its sign, so convolution with the same mask reverses the response.</>}>
    <div className="answer-layout"><Figure instruction="EDIT THE 3×3 INTENSITY PATCH" subtitle="The two slope estimates update with every pixel value">
      <div className="answer-patch-editor">{patch.map((value, index) => <label key={index}><span className="sr-only">Pixel row {Math.floor(index / 3) + 1}, column {index % 3 + 1}</span><input type="number" min={-9} max={9} step={1} value={value} onChange={(event) => update(index, Number(event.target.value))} /></label>)}</div>
      <div className="answer-choice">{Object.entries(prewittPresets).map(([name, values]) => <button key={name} onClick={() => setPatch([...values])}>{name}</button>)}</div>
      <div className="answer-slope-bars"><div><span>Horizontal slope a</span><i style={{ transform: `scaleX(${clamp(Math.abs(a) / 3, 0.02, 1)})`, background: a < 0 ? '#d78334' : '#2a94c2' }} /><b>{fmt(a, 2)}</b></div><div><span>Vertical slope b</span><i style={{ transform: `scaleX(${clamp(Math.abs(b) / 3, 0.02, 1)})`, background: b < 0 ? '#d78334' : '#2a94c2' }} /><b>{fmt(b, 2)}</b></div></div>
    </Figure><div className="answer-steps">
      <Step number={1} title="Fit a plane to nine samples"><div className="answer-equation">z(u,v) = au + bv + c, with u → right and v ↑ up</div></Step>
      <Step number={2} title="Use the centred grid"><p>Σu = Σv = Σuv = 0, Σu² = Σv² = 6. Thus the normal matrix is diag(6, 6, 9), giving a = Σuz/6, b = Σvz/6 and c = Σz/9.</p></Step>
      <Step number={3} title="Read the correlation masks"><div className="answer-equation">Kₓ = ⅙ [−1 0 1; −1 0 1; −1 0 1]<br />Kᵧ = ⅙ [1 1 1; 0 0 0; −1 −1 −1]</div><p>Current plane: z = {fmt(a, 2)}u {b < 0 ? '−' : '+'} {fmt(Math.abs(b), 2)}v {c < 0 ? '−' : '+'} {fmt(Math.abs(c), 2)}.</p></Step>
    </div></div>
  </AnswerFrame>;
}

function AffineAnswer() {
  const [p10x, setP10x] = useState(3);
  const [p10y, setP10y] = useState(-3);
  const [p01x, setP01x] = useState(2);
  const [p01y, setP01y] = useState(1);
  const origin = { x: 1, y: -2 };
  const fourth = { x: p10x + p01x - origin.x, y: p10y + p01y - origin.y };
  const targetX = (x: number) => 355 + x * 47;
  const targetY = (y: number) => 148 - y * 31;
  const targetPoints = [origin, { x: p10x, y: p10y }, fourth, { x: p01x, y: p01y }];
  const targetPolygon = targetPoints.map((point) => `${targetX(point.x)},${targetY(point.y)}`).join(' ');
  const a11 = p10x - origin.x, a21 = p10y - origin.y, a12 = p01x - origin.x, a22 = p01y - origin.y;
  const determinant = a11 * a22 - a12 * a21;
  return <AnswerFrame title="Three correspondences determine an affine map" takeaway={<>Three <b>non-collinear source points</b> give six independent equations for six affine parameters. For the sheet&apos;s target points, <b>(1,1) maps to (4,0)</b>.</>}>
    <div className="answer-layout"><Figure instruction="MOVE THE TWO TARGET BASIS POINTS" subtitle="Three mapped corners determine the fourth corner of the parallelogram">
      <svg className="answer-svg" viewBox="0 0 680 285" role="img" aria-label={`Affine map sends the fourth corner to ${fmt(fourth.x, 1)}, ${fmt(fourth.y, 1)}`}>
        <polygon className="answer-source-shape" points="75,205 195,205 195,85 75,85" />
        <polygon className="answer-target-shape" points={targetPolygon} />
        <line className="answer-correspondence" x1="75" y1="205" x2={targetX(origin.x)} y2={targetY(origin.y)} />
        <line className="answer-correspondence" x1="195" y1="205" x2={targetX(p10x)} y2={targetY(p10y)} />
        <line className="answer-correspondence" x1="75" y1="85" x2={targetX(p01x)} y2={targetY(p01y)} />
        <text x="65" y="244">(0,0)</text><text x="177" y="244">(1,0)</text><text x="42" y="74">(0,1)</text><text x="165" y="74">(1,1)</text>
        {targetPoints.map((point, index) => <g key={index}><circle className={index === 2 ? 'answer-point warm' : 'answer-point'} cx={targetX(point.x)} cy={targetY(point.y)} r="5" /><text x={targetX(point.x) + 8} y={targetY(point.y) - 7}>{index === 2 ? 'predicted' : `pair ${index === 3 ? 3 : index + 1}`}</text></g>)}
      </svg>
      <Range label="(1,0) target x′" value={p10x} min={2} max={4} step={0.1} onChange={setP10x} />
      <Range label="(1,0) target y′" value={p10y} min={-4} max={-2} step={0.1} onChange={setP10y} />
      <Range label="(0,1) target x′" value={p01x} min={1} max={3} step={0.1} onChange={setP01x} />
      <Range label="(0,1) target y′" value={p01y} min={0} max={2} step={0.1} onChange={setP01y} />
      <div className="answer-readout"><strong>(1,1) → ({fmt(fourth.x, 1)}, {fmt(fourth.y, 1)})</strong><span>det A = {fmt(determinant, 2)}</span></div>
    </Figure><div className="answer-steps">
      <Step number={1} title="Count equations and unknowns"><p>An affine map has four matrix entries and two translation entries. Each pair gives one x′ and one y′ equation, so at least three pairs are needed.</p></Step>
      <Step number={2} title="Build the linear system"><div className="answer-equation">[x y 0 0 1 0] θ = x′<br />[0 0 x y 0 1] θ = y′</div><p>For the source points (0,0), (1,0), (0,1), the translation is the first target and the columns of A are the other two target offsets.</p></Step>
      <Step number={3} title="Solve the tutorial example"><div className="answer-equation">A = [[{fmt(a11, 1)}, {fmt(a12, 1)}], [{fmt(a21, 1)}, {fmt(a22, 1)}]]<br />t = ({fmt(origin.x, 1)}, {fmt(origin.y, 1)})</div><p>At the sheet&apos;s values, A = [[2, 1], [−1, 3]] and t = (1, −2). Extra noisy pairs are fitted by least squares.</p></Step>
    </div></div>
  </AnswerFrame>;
}

function HomographyAnswer() {
  const [p, setP] = useState(0.2);
  const [q, setQ] = useState(-0.1);
  const project = (x: number, y: number) => {
    const denominator = 1 + p * x + q * y;
    return { x: 380 + 90 * x / denominator, y: 220 - 75 * y / denominator };
  };
  const source = (x: number, y: number) => ({ x: 80 + 145 * x, y: 220 - 145 * y });
  const grid = [0, 0.25, 0.5, 0.75, 1];
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]] as const;
  return <AnswerFrame title="Homography estimation by DLT" takeaway={<>A homography has <b>eight degrees of freedom up to scale</b>. Four point pairs in general position are the minimum; with noisy pairs, DLT uses the smallest right singular vector of its stacked matrix.</>}>
    <div className="answer-layout"><Figure instruction="CHANGE THE PERSPECTIVE TERMS" subtitle="The right grid is the projective image of the left grid">
      <svg className="answer-svg" viewBox="0 0 680 270" role="img" aria-label={`Projective grid with perspective terms ${fmt(p, 2)} and ${fmt(q, 2)}`}>
        {grid.map((t) => <g key={t}>
          <line className="answer-grid-line" x1={source(t, 0).x} y1={source(t, 0).y} x2={source(t, 1).x} y2={source(t, 1).y} />
          <line className="answer-grid-line" x1={source(0, t).x} y1={source(0, t).y} x2={source(1, t).x} y2={source(1, t).y} />
          <line className="answer-warped-line" x1={project(t, 0).x} y1={project(t, 0).y} x2={project(t, 1).x} y2={project(t, 1).y} />
          <line className="answer-warped-line" x1={project(0, t).x} y1={project(0, t).y} x2={project(1, t).x} y2={project(1, t).y} />
        </g>)}
        {corners.map(([x, y], index) => <g key={index}><circle className="answer-point warm" cx={project(x, y).x} cy={project(x, y).y} r="5" /><text x={project(x, y).x + 8} y={project(x, y).y - 6}>{index + 1}</text></g>)}
        <text x="116" y="251">source plane</text><text x="442" y="251">mapped plane</text>
      </svg>
      <Range label="h₃₁" value={p} min={-0.3} max={0.3} step={0.02} onChange={setP} />
      <Range label="h₃₂" value={q} min={-0.3} max={0.3} step={0.02} onChange={setQ} />
      <div className="answer-readout"><strong>H ∼ [[1,0,0],[0,1,0],[{fmt(p, 2)},{fmt(q, 2)},1]]</strong><span>A demonstration of the map; DLT estimates H from correspondences.</span></div>
    </Figure><div className="answer-steps">
      <Step number={1} title="Remove the unknown point scale"><p>From p′ ∼ Hp, divide the first two coordinates by h₃₁x + h₃₂y + h₃₃. Rearranging produces two homogeneous linear equations per point pair.</p></Step>
      <Step number={2} title="Stack all point pairs"><div className="answer-equation">[x y 1 0 0 0 −x′x −x′y −x′] h = 0<br />[0 0 0 x y 1 −y′x −y′y −y′] h = 0</div></Step>
      <Step number={3} title="Use SVD and check geometry"><p>Minimise ‖Ah‖ with ‖h‖ = 1 by taking the right singular vector for the smallest singular value. Four pairs are the minimum, with no three of the four source or target points collinear. Normalising coordinates improves conditioning.</p></Step>
      <Step number={4} title="Remember the scale ambiguity"><p>H and βH produce the same map for every β ≠ 0. Setting h₃₃ = 1 works only when that entry is nonzero.</p></Step>
    </div></div>
  </AnswerFrame>;
}

export function InteractiveAnswer({ questionId, fallback }: AnswerProps) {
  switch (questionId) {
    case 't03-edges-scale': return <EdgeScaleAnswer />;
    case 't03-edges-threshold': return <EdgeThresholdAnswer />;
    case 't03-interest-harris': return <HarrisAnswer />;
    case 't03-interest-descriptor': return <DescriptorAnswer />;
    case 't03-fitting-line': return <LineFitAnswer />;
    case 't03-fitting-prewitt': return <PrewittAnswer />;
    case 't03-registration-affine': return <AffineAnswer />;
    case 't03-registration-homography': return <HomographyAnswer />;
    default: return <div className="released-answer"><span>ANSWER</span><p>{fallback}</p></div>;
  }
}

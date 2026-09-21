'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Dices, Grid3X3, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RangeControl } from '@/components/range-control';
import { addNoise, convolveRow, filterPixels, type FilterKind, type NoiseKind } from '@/lib/image-processing';

const canvasSize = 176;
const inputMatrix = [
  [128, 128, 128],
  [64, 192, 64],
  [0, 128, 64],
];
const targetMatrix = [
  [96, 128, 96],
  [80, 128, 80],
  [32, 80, 64],
];

function drawPixels(canvas: HTMLCanvasElement | null, pixels: Uint8ClampedArray) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), canvasSize, canvasSize), 0, 0);
}

function MatrixTable({ values, label, target }: { values: number[][]; label: string; target?: number[][] }) {
  return <div className="matrix-wrap"><span>{label}</span><div className="matrix-grid">{values.flatMap((row, rowIndex) => row.map((value, columnIndex) => <b className={target && Math.abs(value - target[rowIndex][columnIndex]) < .01 ? 'matched' : ''} key={`${rowIndex}-${columnIndex}`}>{Number(value.toFixed(1))}</b>))}</div></div>;
}

export function FilteringLab() {
  const originalCanvas = useRef<HTMLCanvasElement>(null);
  const noisyCanvas = useRef<HTMLCanvasElement>(null);
  const filteredCanvas = useRef<HTMLCanvasElement>(null);
  const noisyPixels = useRef<Uint8ClampedArray | null>(null);
  const [source, setSource] = useState<Uint8ClampedArray | null>(null);
  const [noiseKind, setNoiseKind] = useState<NoiseKind>('salt-pepper');
  const [noiseLevel, setNoiseLevel] = useState(12);
  const [filterKind, setFilterKind] = useState<FilterKind>('modified-median');
  const [kernelSize, setKernelSize] = useState(5);
  const [seed, setSeed] = useState(22);
  const [patch, setPatch] = useState<number[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [signal, setSignal] = useState([12, 42, 78, 36, 91, 54, 18]);
  const [kernel, setKernel] = useState([.2, .6, .2]);

  useEffect(() => {
    const image = new Image();
    image.src = '/cameraman.png';
    image.onload = () => {
      const staging = document.createElement('canvas');
      staging.width = canvasSize;
      staging.height = canvasSize;
      const context = staging.getContext('2d');
      if (!context) return;
      context.imageSmoothingEnabled = true;
      context.drawImage(image, 0, 0, canvasSize, canvasSize);
      const data = context.getImageData(0, 0, canvasSize, canvasSize).data;
      const grayscale = new Uint8ClampedArray(data.length);
      for (let index = 0; index < data.length; index += 4) {
        const gray = Math.round(.299 * data[index] + .587 * data[index + 1] + .114 * data[index + 2]);
        grayscale[index] = gray;
        grayscale[index + 1] = gray;
        grayscale[index + 2] = gray;
        grayscale[index + 3] = 255;
      }
      setSource(grayscale);
    };
  }, []);

  useEffect(() => {
    if (!source) return;
    drawPixels(originalCanvas.current, source);
    const noisy = addNoise(source, noiseKind, noiseLevel, seed);
    noisyPixels.current = noisy;
    drawPixels(noisyCanvas.current, noisy);
    drawPixels(filteredCanvas.current, filterPixels(noisy, canvasSize, canvasSize, filterKind, kernelSize));
  }, [source, noiseKind, noiseLevel, seed, filterKind, kernelSize]);

  const inspectPatch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!noisyPixels.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvasSize - 1, Math.floor((event.clientX - bounds.left) / bounds.width * canvasSize)));
    const y = Math.max(0, Math.min(canvasSize - 1, Math.floor((event.clientY - bounds.top) / bounds.height * canvasSize)));
    const values: number[] = [];
    const radius = Math.floor(kernelSize / 2);
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const px = Math.max(0, Math.min(canvasSize - 1, x + dx));
        const py = Math.max(0, Math.min(canvasSize - 1, y + dy));
        values.push(noisyPixels.current[(py * canvasSize + px) * 4]);
      }
    }
    setPatch(values);
  };

  const firstPass = useMemo(() => signal.map((_, index) => {
    const left = signal[index - 1] ?? 0;
    const right = signal[index + 1] ?? 0;
    return (left + signal[index] + right) / 3;
  }), [signal]);
  const secondCenter = (firstPass[2] + firstPass[3] + firstPass[4]) / 3;

  const producedMatrix = useMemo(
    () => inputMatrix.map((row) => convolveRow(row, kernel)),
    [kernel],
  );
  const kernelError = producedMatrix.reduce((sum, row, y) => sum + row.reduce((inner, value, x) => inner + Math.abs(value - targetMatrix[y][x]), 0), 0);

  return (
    <section className="lab-module" aria-labelledby="filter-title">
      <div className="module-heading">
        <div><p className="section-kicker">FILTERS 1–5</p><h2 id="filter-title">Filtering playground</h2><p>Match the noise to the filter. Inspect what each local window keeps, averages, or rejects.</p></div>
        <div className="model-callout"><ScanSearch size={17} /><span><strong>Material image</strong> · the cameraman image is loaded from the Tutorial 02 notebook.</span></div>
      </div>

      <div className="filter-control-bar glass-panel">
        <div><span>Noise</span><NativeSelect aria-label="Noise type" value={noiseKind} onChange={(event) => setNoiseKind(event.target.value as NoiseKind)}><NativeSelectOption value="gaussian">Gaussian</NativeSelectOption><NativeSelectOption value="salt-pepper">Salt &amp; pepper</NativeSelectOption></NativeSelect></div>
        <RangeControl label="noise level" symbol={noiseKind === 'gaussian' ? 'σ' : 'p'} value={noiseLevel} min={2} max={30} step={1} unit={noiseKind === 'gaussian' ? 'gray' : '%'} onChange={setNoiseLevel} />
        <div><span>Filter</span><NativeSelect aria-label="Filter type" value={filterKind} onChange={(event) => setFilterKind(event.target.value as FilterKind)}><NativeSelectOption value="box">Box mean</NativeSelectOption><NativeSelectOption value="gaussian">Gaussian</NativeSelectOption><NativeSelectOption value="median">Median</NativeSelectOption><NativeSelectOption value="modified-median">Modified median</NativeSelectOption></NativeSelect></div>
        <div><span>Kernel size</span><NativeSelect aria-label="Kernel size" value={kernelSize} onChange={(event) => setKernelSize(Number(event.target.value))}><NativeSelectOption value="3">3 × 3</NativeSelectOption><NativeSelectOption value="5">5 × 5</NativeSelectOption><NativeSelectOption value="7">7 × 7</NativeSelectOption></NativeSelect></div>
        <Button variant="outline" onClick={() => setSeed((value) => value + 1)}><Dices size={15} /> New noise</Button>
      </div>

      <div className="image-triptych">
        <figure><figcaption><span>01</span><strong>Original</strong></figcaption><canvas ref={originalCanvas} width={canvasSize} height={canvasSize} aria-label="Original cameraman image" /></figure>
        <figure className="inspectable"><figcaption><span>02</span><strong>Noisy · hover to inspect</strong></figcaption><canvas ref={noisyCanvas} width={canvasSize} height={canvasSize} onPointerMove={inspectPatch} onPointerLeave={() => setPatch([])} aria-label={`Noisy cameraman image; hover to inspect a ${kernelSize} by ${kernelSize} pixel window`} />{patch.length ? <div className="patch-popover"><small>{kernelSize} × {kernelSize} WINDOW · CENTER HIGHLIGHTED</small><div style={{ gridTemplateColumns: `repeat(${kernelSize}, 1fr)` }}>{patch.map((value, index) => <span className={index === Math.floor(patch.length / 2) ? 'center' : undefined} key={`${index}-${value}`}>{value}</span>)}</div></div> : null}</figure>
        <figure><figcaption><span>03</span><strong>{filterKind.replace('-', ' ')}</strong></figcaption><canvas ref={filteredCanvas} width={canvasSize} height={canvasSize} aria-label="Filtered cameraman image" /></figure>
      </div>
      <p className="micro-note">Modified median keeps the center pixel unless it falls outside [Q1, Q3]; only an outlier is replaced by the local median. This selective rule preserves more detail, but it can leave impulses in high-contrast or textured windows where 0 or 255 already falls inside the local quartile interval.</p>

      <div className="mini-labs">
        <article className="mini-lab glass-panel">
          <div className="mini-heading"><Grid3X3 size={17} /><span><small>FILTERS 2</small><strong>Apply a mean filter twice</strong></span></div>
          <div className="signal-row">
            {signal.map((value, index) => <label key={index}><span>{'abcdefg'[index]}</span><input type="number" value={value} min="0" max="255" onChange={(event) => setSignal((current) => current.map((item, itemIndex) => itemIndex === index ? Number(event.target.value) : item))} /></label>)}
          </div>
          <div className="kernel-result"><span>center after two passes</span><strong>{secondCenter.toFixed(2)}</strong><code>(b + 2c + 3d + 2e + f) / 9</code></div>
          <div className="equivalent-kernel"><span>interior equivalent kernel</span>{[1,2,3,2,1].map((value, index) => <b key={index}>{value}/9</b>)}</div>
          <p>For this center output, a and g lie outside the five-value support and are intentional distractors. For pixels unaffected by the boundary, the two passes equal one triangular-kernel pass. Full-image equivalence requires extending the signal through both passes and cropping only once at the end.</p>
        </article>

        <article className="mini-lab glass-panel">
          <div className="mini-heading"><Grid3X3 size={17} /><span><small>FILTERS 3</small><strong>Find the horizontal kernel</strong></span></div>
          <p>Adjust k so that I ∗ k matches I′. Convolution flips the kernel horizontally.</p>
          <div className="matrix-flow kernel-problem-matrices"><MatrixTable values={inputMatrix} label="I" /><span>∗ k →</span><MatrixTable values={producedMatrix} label="current output" target={targetMatrix} /><span>match</span><MatrixTable values={targetMatrix} label="I′" /></div>
          <div className="kernel-inputs">{kernel.map((value, index) => <label key={index}><span>k{index + 1}</span><input type="number" value={value} min="-1" max="1" step="0.05" onChange={(event) => setKernel((current) => current.map((item, itemIndex) => itemIndex === index ? Number(event.target.value) : item))} /></label>)}</div>
          <div className={kernelError < .1 ? 'kernel-score solved' : 'kernel-score'}><span>Total absolute error</span><strong>{kernelError.toFixed(1)}</strong><small>{kernelError < .1 ? 'Exact match · [0.25, 0.5, 0.25]' : 'Keep adjusting'}</small></div>
          <p className="kernel-flip-note"><strong>Why the flip is easy to miss:</strong> the solution is symmetric, so reversing it looks identical. With the asymmetric probe k = [1, 0, 0], convolution samples the right neighbor; correlation would sample the left neighbor.</p>
        </article>
      </div>

      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="advanced-card">
        <CollapsibleTrigger className="advanced-trigger"><span><small>ADVANCED</small><strong>Non-local means &amp; mean shift</strong></span>{advancedOpen ? <ChevronUp /> : <ChevronDown />}</CollapsibleTrigger>
        <CollapsibleContent>
          <div className="advanced-explain-grid">
            <article><span>NLM</span><strong>P̂ = (1/N) Σ Pᵢ</strong><p>Under the tutorial’s simplifying assumption that the selected patches share the same clean patch P₀ and their Gaussian noises remain independent, P̂ ∼ N(P₀, σ²I/N).</p></article>
            <article><span>MEAN SHIFT</span><strong>xᵗ⁺¹ = mean of neighbors</strong><p>With the Epanechnikov kernel, one iteration averages samples inside the current window. Repeating that non-local mean update moves toward a mode.</p></article>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

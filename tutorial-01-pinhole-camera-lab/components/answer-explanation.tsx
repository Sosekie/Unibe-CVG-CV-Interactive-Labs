"use client";

import { useId } from "react";
import type { AnswerExplanation as Explanation, AnswerPlot } from "@/lib/answer-types";

function ExplanationPlot({ plot }: { plot: AnswerPlot }) {
  const id = useId();
  const [xmin, xmax, ymin, ymax] = plot.bounds;
  // Equal metric scales on both axes: the 45° counterexample must look 45°.
  const scale = Math.min(360 / (xmax - xmin), 230 / (ymax - ymin));
  const x = (value: number) => 230 + (value - (xmin + xmax) / 2) * scale;
  const y = (value: number) => 145 - (value - (ymin + ymax) / 2) * scale;
  return <figure className="answer-figure">
    <h4>{plot.title}</h4>
    <div className="answer-plot-scroll" tabIndex={0} role="region" aria-label={plot.title}>
      <svg viewBox="0 0 460 290" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>{plot.title}</title>
        <desc id={`${id}-description`}>{plot.caption}</desc>
        <rect x="1" y="1" width="458" height="288" rx="12" className="answer-plot-background" />
        {ymin <= 0 && ymax >= 0 ? <line x1={x(xmin)} y1={y(0)} x2={x(xmax)} y2={y(0)} className="answer-plot-axis" /> : null}
        {xmin <= 0 && xmax >= 0 ? <line x1={x(0)} y1={y(ymin)} x2={x(0)} y2={y(ymax)} className="answer-plot-axis" /> : null}
        <text x={x(xmax) + 13} y={y(0) + 5}>{plot.axisLabels[0]}</text>
        <text x={x(0) - 5} y={y(ymax) - 12}>{plot.axisLabels[1]}</text>
        {plot.lines.map((line, index) => <polyline key={index} points={line.points.map(([px, py]) => `${x(px)},${y(py)}`).join(" ")} className={`answer-plot-line ${line.tone}`} strokeDasharray={line.dashed ? "6 5" : undefined} />)}
        {plot.points.map((point, index) => <g key={index}>
          <circle cx={x(point.at[0])} cy={y(point.at[1])} r="4.5" className="answer-plot-point" />
          <text x={x(point.at[0])} y={y(point.at[1]) + (point.below ? 23 : -13)} textAnchor="middle" className="answer-plot-point-label">{point.label}</text>
        </g>)}
      </svg>
    </div>
    <ul className="answer-legend">{plot.lines.filter((line) => line.label).map((line, index) => <li key={index}><i className={`${line.tone}${line.dashed ? " dashed" : ""}`} aria-hidden="true" />{line.label}</li>)}</ul>
    <figcaption>{plot.caption}</figcaption>
  </figure>;
}

export function AnswerExplanation({ explanation, questionNumber }: { explanation: Explanation; questionNumber: number }) {
  return <div className="answer-explanation">
    <div className="answer-takeaway"><span>THE KEY IDEA</span><p>{explanation.conclusion}</p></div>
    <div className="answer-reading-layout">
      <ExplanationPlot plot={explanation.illustration} />
      <div className="answer-reasoning">
        <details className="answer-derivation">
          <summary>Walk through the reasoning <span className="sr-only">for question {questionNumber}</span></summary>
          <ol>{explanation.steps.map((step) => <li key={step.title}><h4>{step.title}</h4><p>{step.text}</p>{step.formula ? <div className="answer-equation">{step.formula}</div> : null}</li>)}</ol>
        </details>
        <div className="answer-caveat"><h4>Keep in mind</h4><p>{explanation.caveat}</p></div>
        <div className="answer-reflection"><h4>Before we discuss</h4><p>{explanation.reflection}</p></div>
      </div>
    </div>
    <p className="answer-convention">Tutorial convention: virtual image plane, x = fX/Z and y = fY/Z; principal point at (0, 0), y upward, f &gt; 0. Unless stated otherwise, Z &gt; 0. The plotted examples use f = 1.</p>
  </div>;
}

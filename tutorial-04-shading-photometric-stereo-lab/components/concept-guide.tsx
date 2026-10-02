import type { ReactNode } from 'react';

// Shared layout for the background sections below each lab: numbered concepts,
// each tagged with the lecture slides (lec04a) it comes from.

export function ConceptGuide({ kicker, title, intro, children }: { kicker: string; title: string; intro: ReactNode; children: ReactNode }) {
  return <section className="concept-guide" aria-label={title}>
    <div className="concept-guide-heading"><p className="section-kicker">{kicker}</p><h3>{title}</h3><p>{intro}</p></div>
    <ol className="concept-list">{children}</ol>
  </section>;
}

export function Concept({ title, slides, children }: { title: string; slides?: string; children: ReactNode }) {
  return <li className="concept-item">
    <div className="concept-item-title"><strong>{title}</strong>{slides ? <span className="slide-tag">{slides}</span> : null}</div>
    {children}
  </li>;
}

export function Eq({ children }: { children: ReactNode }) {
  return <div className="guide-equation">{children}</div>;
}

export function TryIt({ children }: { children: ReactNode }) {
  return <div className="guide-live"><strong>Try it</strong><div>{children}</div></div>;
}

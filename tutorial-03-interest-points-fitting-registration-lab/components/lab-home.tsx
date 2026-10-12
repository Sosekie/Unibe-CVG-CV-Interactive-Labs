'use client';

import { useState } from 'react';
import { EdgesLab } from '@/components/edges-lab';
import { InterestPointsLab } from '@/components/interest-points-lab';
import { FittingLab } from '@/components/fitting-lab';
import { RegistrationLab } from '@/components/registration-lab';
import { QuestionsSection } from '@/components/questions-section';
import { SiteHeader } from '@/components/site-header';

const modules = [
  { id: 'edges', number: '01', label: 'Edges', detail: 'Gradient · threshold' },
  { id: 'interest', number: '02', label: 'Interest Points', detail: 'Harris · Hessian' },
  { id: 'fitting', number: '03', label: 'Fitting', detail: 'LS · TLS · Prewitt' },
  { id: 'registration', number: '04', label: 'Registration', detail: 'Affine · Homography' },
] as const;

export default function Home() {
  const [active, setActive] = useState<(typeof modules)[number]['id']>('edges');

  return (
    <main className="lab-shell">
      <SiteHeader />
      <section className="intro-strip" aria-label="About Tutorial 03">
        <p>Choose one lab and use the controls to explore the underlying model.</p>
        <p><strong>Course scope:</strong> Edges · Interest Points · Fitting · Registration</p>
      </section>

      <section className="module-shell">
        <div className="workspace-heading">
          <div><p className="section-kicker">01 / INTERACTIVE LABS</p><h2>Explore one concept at a time</h2></div>
          <p>Aligned with the week 3 lecture and tutorial plan.</p>
        </div>
        <div className="module-nav" role="tablist" aria-label="Tutorial 03 lab modules">
          {modules.map((module) => (
            <button key={module.id} role="tab" aria-selected={active === module.id} className={active === module.id ? 'active' : ''} onClick={() => setActive(module.id)}>
              <b>{module.number}</b><span><strong>{module.label}</strong><small>{module.detail}</small></span>
            </button>
          ))}
        </div>
        {active === 'edges' ? <EdgesLab /> : null}
        {active === 'interest' ? <InterestPointsLab /> : null}
        {active === 'fitting' ? <FittingLab /> : null}
        {active === 'registration' ? <RegistrationLab /> : null}
      </section>
      <QuestionsSection />
      <footer className="lab-footer">
        <span>CV Tutorial 03 · Interactive course visualizer</span>
        <a
          href="https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs"
          target="_blank"
          rel="noreferrer"
        >
          If this site is unavailable, find all materials and local setup instructions on GitHub.
        </a>
        <span>University of Bern · Computer Vision Group</span>
      </footer>
    </main>
  );
}

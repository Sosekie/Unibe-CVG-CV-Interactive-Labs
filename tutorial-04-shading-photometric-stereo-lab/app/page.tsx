'use client';

import { useState } from 'react';
import { NormalIntegrationLab } from '@/components/normal-integration-lab';
import { PhotometricStereoLab } from '@/components/photometric-stereo-lab';
import { QuestionsSection } from '@/components/questions-section';
import { ReflectanceLab } from '@/components/reflectance-lab';
import { SiteHeader } from '@/components/site-header';

const modules = [
  { id: 'integration', number: '01', label: 'Normal Integration', detail: 'Normals → depth' },
  { id: 'stereo', number: '02', label: 'Photometric Stereo', detail: 'Lights → normals' },
  { id: 'reflectance', number: '03', label: 'Light & Reflectance', detail: 'Far · near light' },
] as const;

export default function Home() {
  const [active, setActive] = useState<(typeof modules)[number]['id']>('integration');

  return (
    <main className="lab-shell">
      <SiteHeader />
      <section className="intro-strip" aria-label="About Tutorial 04">
        <p>Choose one lab and use the controls to explore the model. Each lab names the matching slides and worksheet questions, and explains the background below the plots.</p>
        <p><strong>Course scope:</strong> Shape from shading · Integrability · Photometric stereo</p>
      </section>
      <section className="module-shell">
        <div className="workspace-heading">
          <div><p className="section-kicker">01 / INTERACTIVE LABS</p><h2>Recover shape from light</h2></div>
          <p>Aligned with the Tutorial 04 worksheet and the Lecture 4 slides (lec04a). Slide numbers refer to those slides.</p>
        </div>
        <div className="module-nav" role="tablist" aria-label="Tutorial 04 lab modules">
          {modules.map((module) => (
            <button key={module.id} role="tab" aria-selected={active === module.id} className={active === module.id ? 'active' : ''} onClick={() => setActive(module.id)}>
              <b>{module.number}</b><span><strong>{module.label}</strong><small>{module.detail}</small></span>
            </button>
          ))}
        </div>
        {active === 'integration' ? <NormalIntegrationLab /> : null}
        {active === 'stereo' ? <PhotometricStereoLab /> : null}
        {active === 'reflectance' ? <ReflectanceLab /> : null}
      </section>
      <QuestionsSection />
      <footer className="lab-footer">
        <span>CV Tutorial 04 · Interactive course visualizer</span>
        <a href="https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs" target="_blank" rel="noreferrer">If this site is unavailable, find all materials and local setup instructions on GitHub.</a>
        <span>University of Bern · Computer Vision Group</span>
      </footer>
    </main>
  );
}

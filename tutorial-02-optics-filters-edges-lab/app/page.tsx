'use client';

import { useState } from 'react';
import { FocusLab } from '@/components/focus-lab';
import { RayTransferLab } from '@/components/ray-transfer-lab';
import { FilteringLab } from '@/components/filtering-lab';
import { GradientsEventsLab } from '@/components/gradients-events-lab';
import { QuestionsSection } from '@/components/questions-section';
import { SiteHeader } from '@/components/site-header';

const modules = [
  { id: 'focus', number: '01', label: 'Focus & FoV', detail: 'Camera 1–3' },
  { id: 'rays', number: '02', label: 'Ray Transfer', detail: 'Camera 4–5' },
  { id: 'filtering', number: '03', label: 'Filtering', detail: 'Filters 1–5' },
  { id: 'events', number: '04', label: 'Gradients & Events', detail: 'Camera 6 · Edges' },
] as const;

export default function Home() {
  const [active, setActive] = useState<(typeof modules)[number]['id']>('focus');

  return (
    <main className="lab-shell">
      <SiteHeader />
      <section className="intro-strip" aria-label="About Tutorial 02">
        <p>Choose one lab and change the parameters to test each concept.</p>
        <p><strong>Model note:</strong> the optics module uses a physical thin lens; it is separate from Tutorial 01&apos;s ideal pinhole camera.</p>
      </section>

      <section className="module-shell">
        <div className="workspace-heading">
          <div><p className="section-kicker">01 / INTERACTIVE LABS</p><h2>Explore one concept at a time</h2></div>
          <p>Four focused workspaces, using the same visual language as Tutorial 01.</p>
        </div>
        <div className="module-nav" role="tablist" aria-label="Tutorial 02 lab modules">
          {modules.map((module) => (
              <button key={module.id} role="tab" aria-selected={active === module.id} className={active === module.id ? 'active' : ''} onClick={() => setActive(module.id)}>
                <b>{module.number}</b><span><strong>{module.label}</strong><small>{module.detail}</small></span>
              </button>
          ))}
        </div>
        {active === 'focus' ? <FocusLab /> : null}
        {active === 'rays' ? <RayTransferLab /> : null}
        {active === 'filtering' ? <FilteringLab /> : null}
        {active === 'events' ? <GradientsEventsLab /> : null}
      </section>
      <QuestionsSection />
      <footer className="lab-footer"><span>CV Tutorial 02 · Interactive course visualizer</span><span>University of Bern · Computer Vision Group</span></footer>
    </main>
  );
}

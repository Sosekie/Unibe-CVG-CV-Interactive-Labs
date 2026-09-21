import Image from 'next/image';
import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="aperture-mark" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <p className="eyebrow">COMPUTER VISION · TUTORIAL 02</p>
          <h1>Camera Models, Filters &amp; Event Cameras</h1>
        </div>
      </div>
      <div className="topbar-meta">
        <a className="institution-lockup" href="https://www.cvg.unibe.ch/" target="_blank" rel="noreferrer" aria-label="Computer Vision Group, University of Bern">
          <Image unoptimized src="https://www.unibe.ch/assets/media/image/logo_unibern@2x.png" alt="University of Bern" width={360} height={276} />
          <span>Computer Vision Group</span>
        </a>
        <nav className="topbar-nav" aria-label="Site navigation">
          <a href="#questions">Questions</a>
          <Link href="/teacher">Teacher</Link>
        </nav>
        <div className="model-note"><span className="note-dot" />Physical image formation</div>
      </div>
    </header>
  );
}

import Image from 'next/image';

export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="aperture-mark" aria-hidden="true"><span /><span /><span /></div>
        <div><p className="eyebrow">COMPUTER VISION · TUTORIAL 03</p><h1>Edges, Interest Points, Fitting &amp; Registration</h1></div>
      </div>
      <div className="topbar-meta">
        <a className="institution-lockup" href="https://www.cvg.unibe.ch/" target="_blank" rel="noreferrer" aria-label="Computer Vision Group, University of Bern">
          <Image unoptimized src="https://www.unibe.ch/assets/media/image/logo_unibern@2x.png" alt="University of Bern" width={360} height={276} />
          <span>Computer Vision Group</span>
        </a>
        <nav className="topbar-nav" aria-label="Site navigation"><a href="#questions">Questions</a><a href="/teacher">Teacher</a></nav>
        <div className="model-note"><span className="note-dot" />Feature geometry</div>
      </div>
    </header>
  );
}

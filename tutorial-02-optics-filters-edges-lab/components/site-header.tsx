export function SiteHeader() {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="aperture-mark" aria-hidden="true"><span /><span /><span /></div>
        <div>
          <p className="eyebrow">COMPUTER VISION · TUTORIAL 02</p>
          <h1>Optics, Filters &amp; Edges Lab</h1>
        </div>
      </div>
      <div className="topbar-meta">
        <a className="institution-lockup" href="https://www.cvg.unibe.ch/" target="_blank" rel="noreferrer" aria-label="Computer Vision Group, University of Bern">
          <strong>UNIBE</strong>
          <span>Computer Vision Group</span>
        </a>
        <nav className="topbar-nav" aria-label="Site navigation">
          <a href="#questions">Questions</a>
        </nav>
        <div className="model-note"><span className="note-dot" />Physical image formation</div>
      </div>
    </header>
  );
}

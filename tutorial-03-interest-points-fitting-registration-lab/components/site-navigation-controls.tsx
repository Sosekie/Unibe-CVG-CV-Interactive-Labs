'use client';

import { useEffect, useState } from 'react';

const storageKey = 'cv-tutorial-03-zoom';
const minZoom = 70;
const maxZoom = 150;
const step = 10;
const clampZoom = (value: number) => Math.min(maxZoom, Math.max(minZoom, value));

export function SiteNavigationControls() {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(storageKey));
      if (Number.isFinite(saved) && saved >= minZoom && saved <= maxZoom) setZoom(saved);
    } catch { /* The controls still work when storage is unavailable. */ }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const direction = event.deltaY < 0 ? step : -step;
        setZoom((current) => clampZoom(current + direction));
        return;
      }
      if (!event.shiftKey) return;
      let target = event.target instanceof Element ? event.target : null;
      while (target) {
        if (target instanceof HTMLElement) {
          const overflow = window.getComputedStyle(target).overflowX;
          if ((overflow === 'auto' || overflow === 'scroll') && target.scrollWidth > target.clientWidth + 1) {
            event.preventDefault();
            const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            target.scrollLeft += delta * factor;
            return;
          }
        }
        target = target.parentElement;
      }
    };
    document.addEventListener('wheel', onWheel, { passive: false });
    return () => document.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('zoom', `${zoom}%`);
    try { window.localStorage.setItem(storageKey, String(zoom)); } catch { /* No persistence needed. */ }
  }, [zoom]);

  return <div className="site-navigation-controls" role="group" aria-label="Page zoom controls">
    <button type="button" aria-label="Zoom out" disabled={zoom <= minZoom} onClick={() => setZoom((current) => clampZoom(current - step))}>−</button>
    <button type="button" className="site-zoom-reset" aria-label="Reset zoom to 100 percent" title="Reset zoom" onClick={() => setZoom(100)}>{zoom}%</button>
    <button type="button" aria-label="Zoom in" disabled={zoom >= maxZoom} onClick={() => setZoom((current) => clampZoom(current + step))}>+</button>
  </div>;
}

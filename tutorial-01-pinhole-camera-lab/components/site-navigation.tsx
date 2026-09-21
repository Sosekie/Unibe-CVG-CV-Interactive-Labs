"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { clampZoom, horizontalDelta, wheelIntent, wheelPixels, ZOOM_MAX, ZOOM_MIN } from "@/lib/page-navigation";

export function SiteNavigation() {
  const [zoom, setZoom] = useState(100);
  const current = useRef(100);
  const applyZoom = (value: number) => {
    const next = clampZoom(value);
    current.current = next;
    setZoom(next);
    // Zoom the root so all routes and portal content share the same layout scale.
    document.documentElement.style.zoom = String(next / 100);
    document.documentElement.style.setProperty("--page-scale", String(next / 100));
    try { window.localStorage.setItem("pinhole-page-zoom", String(next)); } catch { /* Session zoom still works. */ }
  };

  useEffect(() => {
    const root = document.documentElement;
    const previousZoom = root.style.zoom;
    const previousScale = root.style.getPropertyValue("--page-scale");
    let saved = 100;
    try { saved = Number(window.localStorage.getItem("pinhole-page-zoom") ?? 100); } catch { /* Use default. */ }
    applyZoom(saved);

    const onWheel = (event: WheelEvent) => {
      const intent = wheelIntent(event);
      if (intent === "scroll") return;
      const delta = wheelPixels(event, window.innerHeight);
      if (intent === "zoom") {
        event.preventDefault();
        const movement = delta.y || delta.x;
        if (movement) applyZoom(current.current + (movement < 0 ? 10 : -10));
        return;
      }
      const scroller = event.composedPath().find((node) => {
        if (!(node instanceof HTMLElement)) return false;
        return /auto|scroll/.test(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth;
      }) as HTMLElement | undefined;
      const target = scroller ?? document.scrollingElement;
      if (target && (scroller || target.scrollWidth > target.clientWidth)) {
        // Prevent a second native scroll and vertical leakage at a horizontal edge.
        event.preventDefault();
        target.scrollLeft += horizontalDelta(delta.x, delta.y);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, true);
      root.style.zoom = previousZoom;
      root.style.setProperty("--page-scale", previousScale);
    };
  }, []);

  return (
    <nav className="site-navigation" aria-label="Page zoom">
      <Button variant="outline" size="icon" aria-label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => applyZoom(current.current - 10)}>−</Button>
      <Button variant="ghost" className="zoom-reset" aria-label={`Zoom ${zoom}%. Reset to 100%`} onClick={() => applyZoom(100)}>{zoom}%</Button>
      <Button variant="outline" size="icon" aria-label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => applyZoom(current.current + 10)}>+</Button>
      <span className="zoom-hint">Ctrl/⌘ + wheel</span>
    </nav>
  );
}

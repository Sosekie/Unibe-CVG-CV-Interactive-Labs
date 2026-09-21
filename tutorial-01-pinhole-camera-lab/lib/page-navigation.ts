export const ZOOM_MIN = 50;
export const ZOOM_MAX = 200;

export function clampZoom(value: number) {
  return Number.isFinite(value) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value))) : 100;
}

export function wheelPixels(event: { deltaX: number; deltaY: number; deltaMode: number }, pageHeight: number) {
  const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageHeight : 1;
  return { x: event.deltaX * factor, y: event.deltaY * factor };
}

export function wheelIntent(event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
  return event.ctrlKey || event.metaKey ? "zoom" : event.shiftKey ? "horizontal" : "scroll";
}

export function horizontalDelta(x: number, y: number) {
  return Math.abs(x) >= Math.abs(y) ? x : y;
}

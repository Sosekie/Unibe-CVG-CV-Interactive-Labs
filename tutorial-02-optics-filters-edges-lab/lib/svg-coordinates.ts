export function clientPointToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
) {
  const screenMatrix = svg.getScreenCTM();
  if (!screenMatrix) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const transformed = point.matrixTransform(screenMatrix.inverse());
  return { x: transformed.x, y: transformed.y };
}

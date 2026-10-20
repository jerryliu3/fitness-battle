/** Pixel geometry shared by layout and gesture calculations; labels never scale with the window. */
export function laneGeometry(viewportWidth: number, viewportHeight: number, count: number) {
  const width = Math.max(320, viewportWidth, count * 72 + 52);
  const height = Math.max(280, viewportHeight);
  return { width, height, laneWidth: (width - 52) / Math.max(1, count), plotHeight: height - 140 };
}

export function centeredLaneScroll(index: number, laneWidth: number, viewportWidth: number, contentWidth: number) {
  const target = 10 + (index + 0.5) * laneWidth - viewportWidth / 2;
  return Math.max(0, Math.min(contentWidth - viewportWidth, target));
}

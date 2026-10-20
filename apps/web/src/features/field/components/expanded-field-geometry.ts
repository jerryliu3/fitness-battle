/** Use spare width and height without changing the content's aspect ratio. */
export function expandedFieldScale(width: number, height: number, viewportWidth: number, viewportHeight: number): number {
  if (width <= 0 || height <= 0) return 1;
  const widthFit = Math.max(0.1, (viewportWidth - 32) / width);
  return Math.min(widthFit, Math.max(1, (viewportHeight - 88) / height));
}

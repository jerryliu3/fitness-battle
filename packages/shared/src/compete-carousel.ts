/** Maps horizontal scroll offset to the active event page (web + native carousels). */
export function competeEventCarouselPageIndex(
  scrollOffset: number,
  pageWidth: number,
  pageCount: number,
) {
  if (pageWidth <= 0 || pageCount <= 0) return 0;
  return Math.max(
    0,
    Math.min(pageCount - 1, Math.round(scrollOffset / pageWidth)),
  );
}

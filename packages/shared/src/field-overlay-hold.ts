/** Stationary holds clear field chrome without owning pan/pinch input. */
export function createFieldOverlayHold(onHiddenChange: (hidden: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number } | null = null;
  let hidden = false;
  let consumed = false;
  const stopTimer = () => { clearTimeout(timer); timer = undefined; };
  const end = () => {
    stopTimer();
    origin = null;
    if (hidden) {
      hidden = false;
      onHiddenChange(false);
    }
  };
  const reset = () => { end(); consumed = false; };
  return {
    start(x: number, y: number, touches = 1) {
      reset();
      if (touches !== 1) return;
      origin = { x, y };
      timer = setTimeout(() => {
        hidden = true;
        consumed = true;
        onHiddenChange(true);
      }, 450);
    },
    move(x: number, y: number, touches = 1) {
      // Match the web field's four-pixel drag threshold.
      if (touches !== 1 || origin && Math.hypot(x - origin.x, y - origin.y) >= 4) {
        stopTimer();
        origin = null;
      }
    },
    end,
    reset,
    // Keep the release consumed even if a platform delays its synthetic press.
    suppressSelection: () => consumed,
  };
}

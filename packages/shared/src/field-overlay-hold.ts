/** Stationary holds temporarily clear field chrome without owning pan/pinch input. */
export function createFieldOverlayHold(onHiddenChange: (hidden: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number } | null = null;
  let hidden = false;
  let suppressUntil = 0;
  const stopTimer = () => { clearTimeout(timer); timer = undefined; };
  const end = () => {
    stopTimer();
    origin = null;
    if (hidden) {
      suppressUntil = Date.now() + 100;
      hidden = false;
      onHiddenChange(false);
    }
  };
  return {
    start(x: number, y: number, touches = 1) {
      end();
      suppressUntil = 0;
      if (touches !== 1) return;
      origin = { x, y };
      timer = setTimeout(() => { hidden = true; onHiddenChange(true); }, 450);
    },
    move(x: number, y: number, touches = 1) {
      if (touches !== 1 || origin && Math.hypot(x - origin.x, y - origin.y) > 8) {
        stopTimer();
        origin = null;
      }
    },
    end,
    suppressSelection: () => hidden || Date.now() < suppressUntil,
  };
}

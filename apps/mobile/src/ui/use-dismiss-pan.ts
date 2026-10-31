import { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, type PanResponderGestureState } from "react-native";

/** Directional dismissal leaves taps, opposite swipes and content scrolling alone. */
export function useDismissPan({ axis, open, extent, reduced, onClose, canStart }: {
  axis: "x" | "y";
  open: boolean;
  extent: number;
  reduced: boolean;
  onClose: () => void;
  canStart?: (gesture: PanResponderGestureState) => boolean;
}) {
  const translation = useRef(new Animated.Value(0)).current;
  const latest = useRef({ open, extent, reduced, onClose, canStart });
  latest.current = { open, extent, reduced, onClose, canStart };
  useEffect(() => { if (open) translation.setValue(0); }, [open, translation]);
  const responder = useMemo(() => {
    const displacement = (gesture: PanResponderGestureState) => axis === "y" ? gesture.dy : gesture.dx;
    const restore = () => Animated.timing(translation, {
      toValue: 0, duration: latest.current.reduced ? 0 : 180, useNativeDriver: true,
    }).start();
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        const distance = displacement(gesture);
        const cross = axis === "y" ? gesture.dx : gesture.dy;
        return latest.current.open && gesture.numberActiveTouches === 1 && distance > 10
          && distance > Math.abs(cross) * 1.4 && (latest.current.canStart?.(gesture) ?? true);
      },
      onPanResponderGrant: () => translation.stopAnimation(),
      onPanResponderMove: (_, gesture) => translation.setValue(Math.max(0, displacement(gesture))),
      onPanResponderRelease: (_, gesture) => {
        const distance = displacement(gesture);
        const velocity = axis === "y" ? gesture.vy : gesture.vx;
        if (distance > Math.min(100, latest.current.extent * 0.2) || (distance > 24 && velocity > 0.75)) {
          latest.current.onClose();
        } else restore();
      },
      onPanResponderTerminate: restore,
      onPanResponderTerminationRequest: () => false,
    });
  }, [axis, translation]);
  return { translation, panHandlers: responder.panHandlers };
}

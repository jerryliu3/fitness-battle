import {
  createElement,
  useCallback,
  useEffect,
  useId,
  useState,
  type ComponentType,
} from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  G,
  Path,
  Rect,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
  Mask,
} from "react-native-svg";
import {
  polishedCapsuleScene,
  polishedLaneScale,
  type CapsuleNode,
} from "@fitness-battle/shared";
import { useReducedMotion } from "./use-reduced-motion";

const elements = {
  g: G,
  path: Path,
  rect: Rect,
  defs: Defs,
  linearGradient: LinearGradient,
  stop: Stop,
  mask: Mask,
};
function draw(node: CapsuleNode, key: number): React.ReactNode {
  const Element = elements[node.tag] as ComponentType<Record<string, unknown>>;
  return createElement(
    Element,
    { ...node.attrs, key },
    node.children?.map(draw),
  );
}
export function PolishedRacer({
  x,
  y,
  you,
  gold = you,
  time,
  wakeBottom,
  showWake = true,
}: {
  x: number;
  y: number;
  you: boolean;
  gold?: boolean;
  time?: number;
  wakeBottom?: number;
  showWake?: boolean;
}) {
  const id = useId(),
    scale = polishedLaneScale(you);
  const [defs, wake, ...head] = polishedCapsuleScene(id, gold, time);
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`} pointerEvents="none">
      {draw(defs, 0)}
      {wakeBottom !== undefined && (
        <Defs>
          <ClipPath id={`${id}-wake-bound`}>
            <Rect
              x={-40}
              y={-35}
              width={80}
              height={Math.max(0, wakeBottom / scale + 35)}
            />
          </ClipPath>
        </Defs>
      )}
      {showWake ? (
        <G
          clipPath={
            wakeBottom === undefined ? undefined : `url(#${id}-wake-bound)`
          }
        >
          {draw(wake, 1)}
        </G>
      ) : null}
      {head.map(draw)}
    </G>
  );
}
/** One field clock, suspended when the screen/app is inactive or motion is reduced. */
export function usePolishedWakeTime(active = true) {
  const reduced = useReducedMotion();
  const [foreground, setForeground] = useState(
      AppState.currentState === "active",
    ),
    [focused, setFocused] = useState(false);
  const [time, setTime] = useState<number | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const app = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => app.remove();
  }, []);
  useEffect(() => {
    if (!active || reduced || !foreground || !focused) {
      setTime(undefined);
      return;
    }
    let raf = 0,
      published = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - published >= 1000 / 30) {
        published = now;
        setTime((now - start) / 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced, foreground, focused]);
  return time;
}

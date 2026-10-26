import {
  createElement,
  memo,
  useId,
  useMemo,
  type ComponentType,
} from "react";
import { Platform } from "react-native";
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
  polishedWakeLength,
  POLISHED_IDENTITY,
  type CapsuleNode,
} from "@fitness-battle/shared";

import Animated, { useAnimatedProps, type SharedValue } from "react-native-reanimated";
import type { WakeAnimation } from "./use-wake-animation";

const AnimatedG = Animated.createAnimatedComponent(G);
const Echo = memo(function Echo({ phase, length, index, shape }: { phase: SharedValue<number>; length: number; index: number; shape: CapsuleNode }) {
  const animatedProps = useAnimatedProps(() => {
    const progress = (phase.value + index / POLISHED_IDENTITY.echoes) % 1;
    return { matrix: [1, 0, 0, 1, 0, progress * length], opacity: .8 - (.8 - .12) * progress };
  });
  return <AnimatedG animatedProps={animatedProps}>{shape.children?.map(drawCapsuleNode)}</AnimatedG>;
});

const elements = {
  g: G,
  path: Path,
  rect: Rect,
  defs: Defs,
  linearGradient: LinearGradient,
  stop: Stop,
  mask: Mask,
};
function drawCapsuleNode(node: CapsuleNode, key: number): React.ReactNode {
  const Element = elements[node.tag] as ComponentType<Record<string, unknown>>;
  const {maskType,...attrs}=node.attrs;
  const attributes=Platform.OS==="web"&&maskType?{...attrs,style:{maskType}}:node.attrs;
  return createElement(
    Element,
    { ...attributes, key },
    node.children?.map(drawCapsuleNode),
  );
}
export const PolishedRacer = memo(function PolishedRacer({
  x,
  y,
  you,
  gold = you,
  time,
  wakeBottom,
  showWake = true,
  sizeScale,
  animation,
}: {
  x: number;
  y: number;
  you: boolean;
  gold?: boolean;
  time?: number;
  wakeBottom?: number;
  showWake?: boolean;
  sizeScale?: number;
  animation?: WakeAnimation;
}) {
  const id = useId(),
    scale = sizeScale ?? polishedLaneScale(you);
  const scene = useMemo(() => polishedCapsuleScene(id, gold, time), [id, gold, time]);
  const [paintedDefs, , ...paintedHead] = useMemo(() => scene.map(drawCapsuleNode), [scene]);
  const wake = scene[1], fade = wake.children![0];
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`} pointerEvents="none">
      {paintedDefs}
      {showWake && wakeBottom !== undefined && (
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
          {animation ? <G {...wake.attrs}><G {...fade.attrs}>
            {fade.children!.map((shape, index) => <Echo key={index} phase={gold ? animation.gold : animation.platinum}
              length={polishedWakeLength(gold)} index={index} shape={shape} />)}
          </G></G> : drawCapsuleNode(wake, 1)}
        </G>
      ) : null}
      {paintedHead}
    </G>
  );
});

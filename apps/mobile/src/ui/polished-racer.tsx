import {
  createElement,
  memo,
  useId,
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
  type CapsuleNode,
} from "@fitness-battle/shared";

const elements = {
  g: G,
  path: Path,
  rect: Rect,
  defs: Defs,
  linearGradient: LinearGradient,
  stop: Stop,
  mask: Mask,
};
export function drawCapsuleNode(node: CapsuleNode, key: number): React.ReactNode {
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
}: {
  x: number;
  y: number;
  you: boolean;
  gold?: boolean;
  time?: number;
  wakeBottom?: number;
  showWake?: boolean;
  sizeScale?: number;
}) {
  const id = useId(),
    scale = sizeScale ?? polishedLaneScale(you);
  const [defs, wake, ...head] = polishedCapsuleScene(id, gold, time, false, showWake);
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`} pointerEvents="none">
      {drawCapsuleNode(defs, 0)}
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
          {drawCapsuleNode(wake, 1)}
        </G>
      ) : null}
      {head.map(drawCapsuleNode)}
    </G>
  );
});

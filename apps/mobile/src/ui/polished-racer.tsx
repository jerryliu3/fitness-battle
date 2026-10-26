import { createElement, memo, useId, useMemo, type ComponentType } from "react";
import { G, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { polishedCapsuleScene, polishedLaneScale, type CapsuleNode } from "@fitness-battle/shared";

const elements = { g: G, path: Path, defs: Defs, linearGradient: LinearGradient, stop: Stop };
function draw(node: CapsuleNode, key: number): React.ReactNode {
  const Element = elements[node.tag as keyof typeof elements] as ComponentType<Record<string, unknown>>;
  return createElement(Element, { ...node.attrs, key }, node.children?.map(draw));
}
/** Native athletes use a static head and a separate solid route line. */
export const PolishedRacer = memo(function PolishedRacer({ x, y, you, gold = you, sizeScale }: {
  x: number; y: number; you: boolean; gold?: boolean; sizeScale?: number;
}) {
  const id = useId();
  const head = useMemo(() => {
    const [defs, , ...shapes] = polishedCapsuleScene(id, gold);
    // Wake masks/fade are deliberately not mounted in native SVG.
    return [{ ...defs, children: defs.children?.filter(n => n.tag === "linearGradient" && n.attrs.id !== `${id}-fade`) }, ...shapes].map(draw);
  }, [id, gold]);
  return <G transform={`translate(${x} ${y}) scale(${sizeScale ?? polishedLaneScale(you)})`} pointerEvents="none">{head}</G>;
});

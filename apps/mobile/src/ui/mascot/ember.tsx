import { createElement, useId, type ComponentType } from "react";
import Svg, { G, Path, Ellipse, Circle, Defs, ClipPath, LinearGradient, Stop } from "react-native-svg";
import { createEmberScene, EMBER_MODEL, type EmberExpression, type EmberNode, type EmberPose, type EmberMorphConcept } from "@fitness-battle/shared/mascot";

// The adapter changes element names only. Shapes, layering, colors and transforms stay shared.
const elements = { g: G, path: Path, ellipse: Ellipse, circle: Circle, defs: Defs, clipPath: ClipPath, linearGradient: LinearGradient, stop: Stop };
function renderNode(node: EmberNode, key: number): React.ReactNode {
  const Element = elements[node.tag] as ComponentType<Record<string, unknown>>;
  return createElement(Element, { ...node.attrs, key }, node.children?.map(renderNode));
}

export function Ember({ pose, expression, size = 160, shadow = true, morph = 0, morphConcept = "baseline", launchFlight = 0, launchCrouch = 0, launchSkid = 0, skidSpray, landingDust, label }: {
  pose?: Partial<EmberPose>; expression?: EmberExpression; size?: number; shadow?: boolean; label?: string; morph?: number; morphConcept?: EmberMorphConcept; launchFlight?: number; launchCrouch?: number; launchSkid?: number; skidSpray?: number; landingDust?: number;
}) {
  const id = useId();
  return <Svg width={size} height={size * EMBER_MODEL.height / EMBER_MODEL.width} viewBox={EMBER_MODEL.viewBox} accessible={Boolean(label)} accessibilityRole={label ? "image" : undefined} accessibilityLabel={label}>
    {createEmberScene({ id, pose, expression, shadow, morph, morphConcept, launchFlight, launchCrouch, launchSkid, skidSpray, landingDust }).map(renderNode)}
  </Svg>;
}

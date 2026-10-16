"use client";

import { createElement, memo, useId, type CSSProperties } from "react";
import { createEmberScene, EMBER_MODEL, type EmberExpression, type EmberNode, type EmberPose, type EmberMorphConcept } from "@fitness-battle/shared/mascot";

function renderNode(node: EmberNode, key: number): React.ReactNode {
  return createElement(node.tag, { ...node.attrs, key }, node.children?.map(renderNode));
}

/** Stateless renderer. The same display list also drives the native component and SVG exports. */
export const Ember = memo(function Ember({ pose, expression, shadow = true, morph = 0, morphConcept = "baseline", launchFlight = 0, launchCrouch = 0, launchSkid = 0, skidSpray, landingDust, label, className, style }: {
  pose?: Partial<EmberPose>; expression?: EmberExpression; shadow?: boolean;
  /** Omit label when decorative. Describe the outcome separately when it conveys product state. */
  label?: string; className?: string; style?: CSSProperties; morph?: number; morphConcept?: EmberMorphConcept; launchFlight?: number; launchCrouch?: number; launchSkid?: number; skidSpray?: number; landingDust?: number;
}) {
  const id = useId();
  return <svg viewBox={EMBER_MODEL.viewBox} className={className} style={style} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    {createEmberScene({ id, pose, expression, shadow, morph, morphConcept, launchFlight, launchCrouch, launchSkid, skidSpray, landingDust }).map(renderNode)}
  </svg>;
});

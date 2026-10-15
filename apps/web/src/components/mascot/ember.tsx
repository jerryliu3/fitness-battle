"use client";

import { createElement, memo, useId, type CSSProperties } from "react";
import { createEmberScene, EMBER_MODEL, type EmberExpression, type EmberNode, type EmberPose } from "@fitness-battle/shared/mascot";

function renderNode(node: EmberNode, key: number): React.ReactNode {
  return createElement(node.tag, { ...node.attrs, key }, node.children?.map(renderNode));
}

/** Stateless renderer. The same display list also drives the native component and SVG exports. */
export const Ember = memo(function Ember({ pose, expression, shadow = true, label, className, style }: {
  pose?: Partial<EmberPose>; expression?: EmberExpression; shadow?: boolean;
  /** Omit label when decorative. Describe the outcome separately when it conveys product state. */
  label?: string; className?: string; style?: CSSProperties;
}) {
  const id = useId();
  return <svg viewBox={EMBER_MODEL.viewBox} className={className} style={style} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    {createEmberScene({ id, pose, expression, shadow }).map(renderNode)}
  </svg>;
});

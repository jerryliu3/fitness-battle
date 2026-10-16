"use client";

import { createElement, memo, useEffect, useId, useState, type CSSProperties } from "react";
import {
  createEmberScene,
  EMBER_CLIPS,
  EMBER_MODEL,
  EMBER_REST,
  sampleEmber,
  type EmberAction,
  type EmberExpression,
  type EmberKConcept,
  type EmberNode,
  type EmberPose,
} from "@fitness-battle/shared/mascot";

function renderNode(node: EmberNode, key: number): React.ReactNode {
  return createElement(node.tag, { ...node.attrs, key }, node.children?.map(renderNode));
}

/** Stateless renderer. The same display list also drives the native component and SVG exports. */
export const Ember = memo(function Ember({
  pose,
  expression,
  size,
  shadow = true,
  kMorph,
  kConcept,
  kColor,
  label,
  className,
  style,
}: {
  pose?: Partial<EmberPose>;
  expression?: EmberExpression;
  size?: number;
  shadow?: boolean;
  kMorph?: number;
  kConcept?: EmberKConcept;
  kColor?: string;
  /** Omit label when decorative. Describe the outcome separately when it conveys product state. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size ? (size * EMBER_MODEL.height) / EMBER_MODEL.width : undefined}
      viewBox={EMBER_MODEL.viewBox}
      className={className}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {createEmberScene({ id, pose, expression, shadow, kMorph, kConcept, kColor }).map(renderNode)}
    </svg>
  );
});

export function AnimatedEmber({
  clip = "idle",
  loop = true,
  size,
  shadow = true,
  kMorph,
  kConcept,
  label,
  className,
  style,
}: {
  clip?: EmberAction;
  loop?: boolean;
  size?: number;
  shadow?: boolean;
  kMorph?: number;
  kConcept?: EmberKConcept;
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [pose, setPose] = useState<EmberPose>(() => ({ ...EMBER_REST }));

  useEffect(() => {
    const media = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (media?.matches) {
      setPose({ ...EMBER_REST });
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = EMBER_CLIPS[clip].duration;

    function tick(now: number) {
      const elapsed = now - start;
      setPose(sampleEmber(clip, elapsed, { loop }));
      if (loop || elapsed < duration) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clip, loop]);

  return (
    <Ember
      pose={pose}
      size={size}
      shadow={shadow}
      kMorph={kMorph}
      kConcept={kConcept}
      label={label}
      className={className}
      style={style}
    />
  );
}


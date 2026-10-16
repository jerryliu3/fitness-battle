import { createElement, useEffect, useId, useState, type ComponentType } from "react";
import Svg, { G, Path, Ellipse, Circle, Defs, ClipPath, LinearGradient, Stop } from "react-native-svg";
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

// The adapter changes element names only. Shapes, layering, colors and transforms stay shared.
const elements = { g: G, path: Path, ellipse: Ellipse, circle: Circle, defs: Defs, clipPath: ClipPath, linearGradient: LinearGradient, stop: Stop };
function renderNode(node: EmberNode, key: number): React.ReactNode {
  const Element = elements[node.tag] as ComponentType<Record<string, unknown>>;
  return createElement(Element, { ...node.attrs, key }, node.children?.map(renderNode));
}

export function Ember({ pose, expression, size = 160, shadow = true, kMorph, kConcept, kColor, label }: {
  pose?: Partial<EmberPose>; expression?: EmberExpression; size?: number; shadow?: boolean;
  kMorph?: number; kConcept?: EmberKConcept; kColor?: string; label?: string;
}) {
  const id = useId();
  return <Svg width={size} height={size * EMBER_MODEL.height / EMBER_MODEL.width} viewBox={EMBER_MODEL.viewBox} accessible={Boolean(label)} accessibilityRole={label ? "image" : undefined} accessibilityLabel={label}>
    {createEmberScene({ id, pose, expression, shadow, kMorph, kConcept, kColor }).map(renderNode)}
  </Svg>;
}

export function AnimatedEmber({
  clip = "idle",
  loop = true,
  size = 160,
  shadow = true,
  kMorph,
  kConcept,
  label,
}: {
  clip?: EmberAction;
  loop?: boolean;
  size?: number;
  shadow?: boolean;
  kMorph?: number;
  kConcept?: EmberKConcept;
  label?: string;
}) {
  const [pose, setPose] = useState<EmberPose>(() => ({ ...EMBER_REST }));

  useEffect(() => {
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
    />
  );
}


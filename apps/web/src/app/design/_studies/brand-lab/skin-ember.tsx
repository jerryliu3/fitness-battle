"use client";

import { createElement, useId } from "react";
import {
  createEmberScene,
  EMBER_MODEL,
  type EmberNode,
  type EmberAction,
} from "@fitness-battle/shared/mascot";
import { useEmberPlayback } from "@/components/mascot/use-ember-playback";
import { getSkin, type SkinId } from "./catalog";

export function recolorEmber(
  nodes: readonly EmberNode[],
  colors: Readonly<Record<string, string>>,
): EmberNode[] {
  return nodes.map((node) => ({
    ...node,
    attrs: Object.fromEntries(
      Object.entries(node.attrs).map(([key, value]) => [
        key,
        (key === "fill" || key === "stroke" || key === "stopColor") &&
        typeof value === "string"
          ? (colors[value] ?? value)
          : value,
      ]),
    ),
    ...(node.children ? { children: recolorEmber(node.children, colors) } : {}),
  }));
}
function renderNode(node: EmberNode, key: number): React.ReactNode {
  return createElement(
    node.tag,
    { ...node.attrs, key },
    node.children?.map(renderNode),
  );
}

/** Study-only finishes reuse the canonical geometry and animation; no filters, alternate rigs, or stat changes. */
export function SkinEmber({
  skin = "classic",
  action = "idle",
  playing = false,
  label,
  className = "",
}: {
  skin?: SkinId;
  action?: EmberAction;
  playing?: boolean;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const { hostRef, pose } = useEmberPlayback({ action, playing, loop: true });
  const finish = getSkin(skin).palette;
  const original = EMBER_MODEL.palette;
  const colors = {
    [original.gold]: finish.gold,
    [original.light]: finish.light,
    [original.edge]: finish.edge,
    [original.ink]: finish.ink,
  };
  const nodes = createEmberScene({ id, pose, shadow: true });
  return (
    <div ref={hostRef} className={`skin-ember ${className}`}>
      <svg
        viewBox={playing ? EMBER_MODEL.viewBox : "10 15 340 365"}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
      >
        {(skin === "classic" ? nodes : recolorEmber(nodes, colors)).map(
          renderNode,
        )}
      </svg>
    </div>
  );
}

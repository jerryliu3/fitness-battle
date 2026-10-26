"use client";

import { createElement, memo, useEffect, useId, useMemo, useRef, type CSSProperties } from "react";
import { polishedCapsuleScene, polishedWakeDuration, polishedWakeLength, type CapsuleNode } from "@fitness-battle/shared";

function draw(node: CapsuleNode, key: number): React.ReactNode {
  const { maskType, ...attrs } = node.attrs;
  return createElement(node.tag, { ...attrs, ...(maskType ? { style: { maskType } } : {}), key }, node.children?.map(draw));
}

/** Browser-owned animation. Visibility changes mutate only this decorative group. */
export const LocalWake = memo(function LocalWake({ gold, animate = true }: { gold: boolean; animate?: boolean }) {
  const id = useId();
  const [defs, wake] = useMemo(() => polishedCapsuleScene(id, gold), [id, gold]);
  const fade = wake.children![0];
  const host = useRef<SVGGElement>(null);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let visible = false;
    const update = () => { node.dataset.paused = String(document.hidden || !visible); };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      update();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <g ref={host} className="field-local-wake" data-animate={animate} data-paused="true" aria-hidden="true" pointerEvents="none">
    {draw(defs, 0)}
    <g {...wake.attrs}><g {...fade.attrs}>
      {fade.children!.map((echo, index) => <g key={index} {...echo.attrs} className="field-local-echo"
        style={{ animationDuration: `${polishedWakeDuration(gold)}s`, animationDelay: `${-index * polishedWakeDuration(gold) / fade.children!.length}s`, "--wake-travel": `${polishedWakeLength(gold)}px` } as CSSProperties}>
        {echo.children?.map(draw)}
      </g>)}
    </g></g>
  </g>;
});

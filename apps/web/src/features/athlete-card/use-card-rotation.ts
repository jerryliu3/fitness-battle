"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { dragPose, nearestPose, pointerPose, REST_POSE, type CardPose } from "./card-optics";
import { useCardPose } from "./use-card-pose";

export function useCardRotation(disabled: boolean) {
  const [inspecting, setInspecting] = useState(false);
  const pose = useCardPose(disabled);
  const drag = useRef<{ id: number; element: HTMLDivElement; x: number; y: number; start: CardPose; moved: boolean } | null>(null);
  const stopDrag = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    if (!active) return;
    pose.stage.current?.removeAttribute("data-dragging");
    if (active.element.hasPointerCapture(active.id)) active.element.releasePointerCapture(active.id);
  }, [pose.stage]);
  // Changing motion preferences or leaving the page must release capture.
  useEffect(() => stopDrag, [disabled, stopDrag]);

  const reset = () => {
    stopDrag();
    setInspecting(false);
    pose.moveTo(nearestPose(pose.getCurrent(), disabled ? { x: 0, y: 0 } : REST_POSE), disabled);
  };
  const flip = () => {
    stopDrag();
    setInspecting(true);
    const current = pose.getTarget();
    const front = Math.cos(current.x * Math.PI / 180) * Math.cos(current.y * Math.PI / 180) >= 0;
    pose.moveTo(nearestPose(current, { x: 0, y: front ? 180 : 0 }), disabled);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0 || event.isPrimary === false || drag.current) return;
    if (
      event.target instanceof Element &&
      event.target.closest("button, input, textarea, select, a, [contenteditable='true']")
    ) {
      return;
    }
    event.preventDefault();
    // Hosts with their own swipe (folio page turn, etc.) must not also claim this.
    event.stopPropagation();
    if (event.pointerType === "mouse") {
      event.currentTarget.focus({ preventScroll: true });
    }
    pose.moveTo(pose.getCurrent(), true);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, element: event.currentTarget, x: event.clientX, y: event.clientY, start: pose.getCurrent(), moved: false };
    pose.stage.current?.setAttribute("data-dragging", "true");
  };
  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const active = drag.current;
    if (active) {
      if (active.id !== event.pointerId) return;
      const dx = event.clientX - active.x;
      const dy = event.clientY - active.y;
      if (!active.moved && Math.hypot(dx, dy) < 3) return;
      if (!active.moved) { active.moved = true; setInspecting(true); }
      pose.dragTo(dragPose(active.start, dx, dy));
    } else if (!inspecting && event.pointerType === "mouse") {
      const rect = event.currentTarget.getBoundingClientRect();
      pose.moveTo(nearestPose(pose.getCurrent(), pointerPose((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height)));
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "Home" || event.key === "Escape") { event.preventDefault(); event.stopPropagation(); reset(); return; }
    if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); flip(); return; }
    if (disabled) return;
    const step = event.shiftKey ? 45 : 15;
    const current = pose.getTarget();
    const changes: Record<string, CardPose> = {
      ArrowLeft: { x: current.x, y: current.y - step }, ArrowRight: { x: current.x, y: current.y + step },
      ArrowUp: { x: current.x - step, y: current.y }, ArrowDown: { x: current.x + step, y: current.y },
    };
    if (!changes[event.key]) return;
    event.preventDefault();
    event.stopPropagation();
    setInspecting(true);
    pose.moveTo(changes[event.key]);
  };
  return {
    stage: pose.stage, reset, flip, backVisible: pose.backVisible,
    // Captured moves bubble to the stage; handling them on both nodes doubles work.
    cardHandlers: { onPointerDown, onDragStart, onKeyDown, onLostPointerCapture: stopDrag },
    stageHandlers: {
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => { if (drag.current?.id === event.pointerId) stopDrag(); },
      onPointerLeave: () => { if (!disabled && !drag.current && !inspecting) pose.reset(); },
      onPointerCancel: () => { stopDrag(); if (!disabled) reset(); },
    },
  };
}

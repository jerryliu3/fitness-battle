"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** One portal target for the entire lifetime: moving it never remounts the lane canvas. */
export function ExpandingField({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const slot = useRef<HTMLDivElement>(null);
  // Radix mounts its portal after the parent layout effect. Observe the actual host.
  const [dialog, setDialog] = useState<HTMLDivElement | null>(null);
  const [mount, setMount] = useState<HTMLDivElement | null>(null);
  const [present, setPresent] = useState(false);
  const origin = useRef<DOMRect | null>(null);
  const returnFocus = useRef<HTMLElement | SVGElement | null>(null);
  const interruptedBounds = useRef<DOMRect | null>(null);
  const animation = useRef<Animation | null>(null);

  useLayoutEffect(() => {
    const node = document.createElement("div");
    node.className = "focus-field-content";
    slot.current?.appendChild(node);
    setMount(node);
    return () => { animation.current?.cancel(); node.remove(); };
  }, []);

  useLayoutEffect(() => {
    if (!open || present || !slot.current) return;
    origin.current = slot.current.getBoundingClientRect();
    returnFocus.current = document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement ? document.activeElement : null;
    // Reserve the inline layout throughout the round trip.
    slot.current.style.height = `${slot.current.offsetHeight}px`;
    setPresent(true);
  }, [open, present]);

  useLayoutEffect(() => {
    const host = dialog;
    if (!present || !host || !mount) return;
    host.appendChild(mount);
    const source = origin.current;
    const destination = slot.current?.getBoundingClientRect();
    const bounds = (rect: DOMRect) => ({ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: "24px" });
    const full = { left: "0px", top: "0px", width: "100%", height: "100%", borderRadius: "0px" };
    const visible = destination && destination.bottom > 0 && destination.top < window.innerHeight;
    const finish = () => {
      if (open) return;
      slot.current?.appendChild(mount);
      if (slot.current) slot.current.style.height = "";
      setPresent(false);
    };
    const interrupted = interruptedBounds.current;
    interruptedBounds.current = null;
    animation.current?.cancel();
    // Geometry, rather than scale, preserves readable labels and usable hit targets.
    const frames = open && source ? [bounds(interrupted ?? source), full] : visible ? [interrupted ? bounds(interrupted) : full, bounds(destination)] : [{ opacity: 1 }, { opacity: 0 }];
    const player = host.animate(frames, { duration: reduce ? 0 : 340, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
    animation.current = player;
    player.onfinish = finish;
    return () => {
      if (player.playState === "running") interruptedBounds.current = host.getBoundingClientRect();
      player.cancel();
    };
  }, [open, present, mount, reduce, dialog]);

  useLayoutEffect(() => {
    if (!dialog) return;
    // The persistent portal has its original React ancestry. Loop Tab at the DOM
    // boundary; Radix still owns focus trapping, Escape, scroll lock and return.
    const loopTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || event.defaultPrevented) return;
      const candidates = [...dialog.querySelectorAll<HTMLElement | SVGElement>(
        "button, input, select, textarea, a[href], [tabindex]",
      )].filter((node) => node.tabIndex >= 0 && !node.matches(":disabled") && node.getClientRects().length > 0);
      const first = candidates[0];
      const last = candidates[candidates.length - 1];
      if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener("keydown", loopTab);
    return () => dialog.removeEventListener("keydown", loopTab);
  }, [dialog]);

  return <>
    <div ref={slot} className="focus-field-slot" />
    {mount && createPortal(children, mount)}
    <Dialog.Root open={present} onOpenChange={(next) => { if (!next) onClose(); }}>
      {present && <Dialog.Portal>
        <Dialog.Overlay className="focus-field-backdrop" />
        <Dialog.Content ref={setDialog} className="focus-field-expanded" aria-describedby={undefined}
          onPointerDownOutside={(event) => {
            // DOM-contained portal children are inside even though their React
            // events do not pass through Dialog.Content's capture handler.
            if (event.detail.originalEvent.target instanceof Node && dialog?.contains(event.detail.originalEvent.target)) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus({ preventScroll: true }); }}>
          <Dialog.Title className="fb-sr-only">Explore athlete lanes</Dialog.Title>
        </Dialog.Content>
      </Dialog.Portal>}
    </Dialog.Root>
  </>;
}

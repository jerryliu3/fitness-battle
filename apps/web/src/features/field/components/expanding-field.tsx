"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { collapseExpandingFieldImmediate } from "./expanding-field-teardown";

/** One portal target for the entire lifetime: moving it never remounts the lane canvas. */
export function ExpandingField({
  open,
  onClose,
  tabActive = true,
  hud,
  children,
}: {
  open: boolean;
  onClose: () => void;
  tabActive?: boolean;
  hud?: ReactNode;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const lastHud = useRef(hud);
  if (hud) lastHud.current = hud;
  const slot = useRef<HTMLDivElement>(null);
  // Radix mounts its portal after the parent layout effect. Observe the actual host.
  const [dialog, setDialog] = useState<HTMLDivElement | null>(null);
  const [mount, setMount] = useState<HTMLDivElement | null>(null);
  const [present, setPresent] = useState(false);
  const origin = useRef<DOMRect | null>(null);
  const returnFocus = useRef<HTMLElement | SVGElement | null>(null);
  const animation = useRef<Animation | null>(null);
  const lastClip = useRef<string | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useLayoutEffect(() => {
    const node = document.createElement("div");
    node.className = "focus-field-content";
    slot.current?.appendChild(node);
    setMount(node);
    return () => { animation.current?.cancel(); node.remove(); };
  }, []);

  useLayoutEffect(() => {
    if (!tabActive) {
      if (present || open) {
        collapseExpandingFieldImmediate(dialog, mount, slot.current, {
          host: animation.current,
        });
        animation.current = null;
        lastClip.current = null;
        setPresent(false);
        if (open) onClose();
      }
      return;
    }
    if (!open || present || !slot.current) return;
    origin.current = slot.current.getBoundingClientRect();
    returnFocus.current = document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement ? document.activeElement : null;
    // Reserve the inline layout throughout the round trip.
    slot.current.style.height = `${slot.current.offsetHeight}px`;
    setPresent(true);
  }, [open, present, tabActive, dialog, mount, onClose]);

  useLayoutEffect(() => {
    const host = dialog;
    if (!tabActive || !present || !host || !mount) return;
    host.appendChild(mount);
    const source = origin.current;
    if (!source) return;
    const destination = slot.current?.getBoundingClientRect();
    const clip = (rect: DOMRect) => `inset(${rect.top}px ${window.innerWidth - rect.right}px ${window.innerHeight - rect.bottom}px ${rect.left}px round 24px)`;
    const full = "inset(0px 0px 0px 0px round 0px)";
    const visible = destination && destination.bottom > 0 && destination.top < window.innerHeight;
    animation.current?.cancel();
    host.style.visibility = "";
    // Reflow the persistent scene at viewport dimensions. Its ResizeObserver
    // updates geometry while the field retains selection, camera and lane anchor.
    // Only the reveal is animated; the field is never a scaled inline thumbnail.
    mount.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    const from = lastClip.current && lastClip.current !== "none" ? lastClip.current : open ? clip(source) : full;
    const frames = open
      ? [{ clipPath: from }, { clipPath: full }]
      : visible
        ? [{ clipPath: from }, { clipPath: clip(destination) }]
        : [{ opacity: 1 }, { opacity: 0 }];
    const player = host.animate(frames, {
      duration: reduce ? 0 : 420,
      easing: "cubic-bezier(.22,1,.36,1)",
      fill: "both",
    });
    animation.current = player;
    player.onfinish = () => {
      if (open) return;
      host.style.visibility = "hidden";
      slot.current?.appendChild(mount);
      mount.style.cssText = "";
      if (slot.current) slot.current.style.height = "";
      lastClip.current = null;
      setPresent(false);
    };
    return () => {
      lastClip.current = mount.parentElement === host ? getComputedStyle(host).clipPath : null;
      player.cancel();
    };
  }, [open, present, mount, reduce, dialog, viewport, tabActive]);

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
    <div
      ref={slot}
      className="focus-field-slot"
      hidden={!tabActive}
      aria-hidden={!tabActive}
    />
    {tabActive && mount && createPortal(children, mount)}
    <Dialog.Root open={present && tabActive} onOpenChange={(next) => { if (!next) onClose(); }}>
      {present && tabActive && <Dialog.Portal>
        <Dialog.Overlay className="focus-field-backdrop" />
        <Dialog.Content ref={setDialog} className="focus-field-expanded" aria-describedby={undefined}
          onPointerDownOutside={(event) => {
            // DOM-contained portal children are inside even though their React
            // events do not pass through Dialog.Content's capture handler.
            if (event.detail.originalEvent.target instanceof Node && dialog?.contains(event.detail.originalEvent.target)) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // Switching dimensions can hide the original expansion button.
            requestAnimationFrame(() => {
              const original = returnFocus.current;
              const target = original && original !== document.body && original !== document.documentElement && original.getClientRects().length
                ? original
                : [...(slot.current?.querySelectorAll<HTMLElement>("button[aria-label^='Expand ']") ?? [])].find(button => button.getClientRects().length);
              target?.focus({ preventScroll: true });
            });
          }}>
          <Dialog.Title className="fb-sr-only">Explore athlete lanes</Dialog.Title>
          {lastHud.current ?? (
            <>
              <button type="button" className="focus-field-close club-icon-button" onClick={onClose} aria-label="Return to field">‹</button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>}
    </Dialog.Root>
  </>;
}

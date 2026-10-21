"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Reparent one stable portal target; expanding never recreates the SVG/WebGL scene. */
export function PersistentField({ expanded, onClose, children }: { expanded: boolean; onClose: () => void; children: ReactNode }) {
  const inline = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState<HTMLDivElement | null>(null);
  const [full, setFull] = useState<HTMLDivElement | null>(null);
  const focus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const node = document.createElement("div"); node.className = "bl-persistent-content";
    inline.current?.appendChild(node); setMount(node);
    return () => node.remove();
  }, []);
  useLayoutEffect(() => {
    if (!mount) return;
    if (expanded && full) {
      if (!focus.current) focus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (inline.current && mount.parentElement === inline.current) inline.current.style.height = `${inline.current.offsetHeight}px`;
      full.appendChild(mount);
    } else if (!expanded) {
      inline.current?.appendChild(mount);
      if (inline.current) inline.current.style.height = "";
    }
  }, [expanded, full, mount]);
  useLayoutEffect(() => {
    if (!full) return;
    const loop = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = [...full.querySelectorAll<HTMLElement>("button, a[href], input, select, [tabindex='0']")].filter(el => !el.matches(":disabled") && el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    full.addEventListener("keydown", loop);
    return () => full.removeEventListener("keydown", loop);
  }, [full]);
  return <>
    <div className="bl-inline-slot" ref={inline}/>
    {mount && createPortal(children, mount)}
    <Dialog.Root open={expanded} onOpenChange={open => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="bl-expanded-overlay"/>
        <Dialog.Content className="board-lab bl-expanded" aria-describedby={undefined}
          onOpenAutoFocus={() => { if (!focus.current) focus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            const target = focus.current; focus.current = null;
            // Reparenting can blur the trigger; restore only after its inline host is back.
            requestAnimationFrame(() => { if (target?.isConnected) target.focus({ preventScroll: true }); });
          }}
          onPointerDownOutside={event => { if (event.detail.originalEvent.target instanceof Node && full?.contains(event.detail.originalEvent.target)) event.preventDefault(); }}>
          <Dialog.Title className="bl-sr-only">Explore your weekly field</Dialog.Title>
          <div ref={setFull}/>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}

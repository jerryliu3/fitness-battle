"use client";

import { useCompete } from "@/components/compete-context";
import { SpecialEventCeremony } from "@/features/arena/special-event-ceremony";
import { playCue } from "@/lib/haptics";
import { buildDebugSpecialEventCeremony, DEBUG_EVENT_OPTIONS, DEBUG_SPECIAL_EVENT_PREVIEWS, type DebugEventId, type DebugSpecialEventPreviewId, type ShellTabId } from "@fitness-battle/shared";
import { useEffect, useRef, useState } from "react";

export function DebugEventMenu({
  activeTab,
  onNavigate,
}: {
  activeTab: ShellTabId | null;
  onNavigate: (href: string, tabId: ShellTabId) => void;
}) {
  const { state, debugActive, triggerDebugEvent, resetDebugState } = useCompete();
  const [open, setOpen] = useState(false);
  const [specialPreview, setSpecialPreview] = useState<DebugSpecialEventPreviewId | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Node && !wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleSelect(eventId: DebugEventId) {
    setOpen(false);
    void playCue("selection");
    const result = triggerDebugEvent?.(eventId);
    if (!result) return;
    if (eventId === "week-closing" || eventId === "deregister-sport") onNavigate(result.targetRoute, "arena");
  }

  return (
    <div ref={wrapRef} className="focus-shell-debug">
      <button
        type="button"
        className={`focus-shell-debug-btn${debugActive ? " is-active" : ""}`}
        aria-label="Debug event triggers"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="focus-shell-debug-dot" aria-hidden="true" />
        Debug {open ? "▴" : "▾"}
      </button>
      {open ? (
        <div className="focus-shell-debug-menu" role="menu" aria-label="Trigger UI events">
          <p className="focus-shell-debug-kicker">Test UI events</p>
          <button type="button" role="menuitem" className="focus-shell-debug-item" onClick={() => { setOpen(false); onNavigate("/onboarding?preview=1", "arena"); }}><b>Onboarding · full setup</b><small>Replay every step without saving preferences</small></button>
          {DEBUG_EVENT_OPTIONS.map((item) => (
            <button key={item.id} type="button" role="menuitem" className="focus-shell-debug-item" onClick={() => handleSelect(item.id)}>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </button>
          ))}
          {DEBUG_SPECIAL_EVENT_PREVIEWS.map((item) => (
            <button key={item.id} type="button" role="menuitem" className="focus-shell-debug-item" onClick={() => { setOpen(false); void playCue("selection"); setSpecialPreview(item.id); }}>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </button>
          ))}
          {debugActive ? (
            <button type="button" role="menuitem" className="focus-shell-debug-reset" onClick={() => { setOpen(false); void playCue("soft"); resetDebugState?.(); }}>
              Reset debug preview
            </button>
          ) : null}
        </div>
      ) : null}
      {specialPreview ? (
        <SpecialEventCeremony
          ceremony={buildDebugSpecialEventCeremony(specialPreview, state?.primary ?? "running")}
          sport={state?.primary ?? "running"}
          units={state?.units ?? "us"}
          onDone={() => setSpecialPreview(null)}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppParagraph } from "./section";

/** One account-owned notification, independent of page layout and navigation. */
export function AccountSaveToast({ message, conflict, saving, onRetry }: {
  message: string | null; conflict: boolean; saving: boolean; onRetry: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [host, setHost] = useState<Element | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const event = JSON.stringify([message, conflict, saving]);
  useEffect(() => {
    setMounted(true);
    const update = () => {
      const hosts = document.querySelectorAll?.('[role="dialog"][data-state="open"] [data-account-notice-host]');
      setHost(hosts?.length ? hosts[hosts.length - 1] : null);
    };
    update();
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setDismissed(null); }, [event]);
  useEffect(() => {
    if (!message || conflict || saving || event === dismissed) return;
    const timer = setTimeout(() => setDismissed(event), 8000);
    return () => clearTimeout(timer);
  }, [message, conflict, saving, event, dismissed]);
  if (!mounted || (!message && !conflict) || event === dismissed) return null;
  return createPortal(<aside role="alert" aria-label={conflict ? "Account changed" : "Account save failed"} data-account-save-toast style={{ position: host ? "absolute" : "fixed", zIndex: 1000, top: "calc(env(safe-area-inset-top, 0px) + 16px)", left: "max(16px, env(safe-area-inset-left, 0px))", right: "max(16px, env(safe-area-inset-right, 0px))", maxWidth: 560, marginInline: "auto", padding: 16, borderRadius: 20, border: "1px solid var(--line)", background: "var(--card)", color: "var(--ink)", boxShadow: "0 8px 32px #142b3b29", pointerEvents: "auto" }}>
    <AppParagraph style={{ margin: "0 0 12px" }}>{conflict ? "Your account changed elsewhere. Reload to continue. Your local draft will be kept as a recovery copy." : message}</AppParagraph>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      <button className="fb-btn" type="button" disabled={saving} onClick={onRetry}>{saving ? "Saving…" : conflict ? "Reload account" : "Retry save"}</button>
      <button className="fb-btn-line" type="button" aria-label="Dismiss notification" onClick={() => setDismissed(event)}>Dismiss</button>
    </div>
  </aside>, host ?? document.body);
}

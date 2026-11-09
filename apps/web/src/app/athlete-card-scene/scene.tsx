"use client";

import { useEffect, useState } from "react";
import { parseAthleteCardMessage } from "@fitness-battle/shared";
import { AthleteCrest } from "@/features/athlete-card/athlete-crest";
import { appearanceVariables } from "@/theme/app-colors";

function parentOrigin() { try { return new URL(document.referrer).origin; } catch { return null; } }
function send(type: string) {
  const native = (window as Window & { ReactNativeWebView?: { postMessage: (data: string) => void } }).ReactNativeWebView;
  if (native) native.postMessage(JSON.stringify({ type }));
  // Readiness acknowledgements contain no account data.
  else if (window.parent !== window) window.parent.postMessage({ type }, parentOrigin() ?? "*");
}

/** Receives presentation data in memory; no identity, records or tokens in URLs. */
export function AthleteCardScene() {
  const [message, setMessage] = useState<ReturnType<typeof parseAthleteCardMessage>>(null);
  useEffect(() => {
    function receive(event: MessageEvent) {
      const origin = parentOrigin();
      if (window.parent !== window && (event.source !== window.parent || (origin && event.origin !== origin))) return;
      try {
        const next = parseAthleteCardMessage(typeof event.data === "string" ? JSON.parse(event.data) : event.data);
        if (next) setMessage(next);
      } catch { /* Ignore malformed bridge input. */ }
    }
    window.addEventListener("message", receive);
    send("athlete-card-ready");
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => { if (message) send("athlete-card-rendered"); }, [message]);
  return <main style={{ ...appearanceVariables(message?.appearance ?? "system"), minHeight: "100dvh", background: "var(--app-surface-canvas)", padding: "0 8px", overflow: "hidden" }}>
    {message ? <AthleteCrest model={message.model} active={message.active} /> : null}
  </main>;
}

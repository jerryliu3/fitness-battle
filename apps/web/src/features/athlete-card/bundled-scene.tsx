import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { parseAthleteCardMessage } from "@fitness-battle/shared";
import { AthleteCrest } from "./athlete-crest";

declare const assets: Record<string, string>;

function send(type: string) {
  const native = (window as Window & { ReactNativeWebView?: { postMessage(data: string): void } }).ReactNativeWebView;
  if (native) native.postMessage(JSON.stringify({ type }));
  else if (window.parent !== window) window.parent.postMessage({ type }, window.origin);
}

function Scene() {
  const [message, setMessage] = useState<ReturnType<typeof parseAthleteCardMessage>>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (window.parent !== window && (event.source !== window.parent || event.origin !== window.origin)) return;
      const next = parseAthleteCardMessage(event.data);
      if (next) setMessage(next);
    };
    window.addEventListener("message", receive);
    send("athlete-card-ready");
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (message) send("athlete-card-rendered");
  }, [message]);
  return message && <main style={{ colorScheme: message.appearance }}>
    <AthleteCrest model={message.model} active={message.active} assets={assets} />
  </main>;
}

createRoot(document.getElementById("root")!).render(<Scene />);

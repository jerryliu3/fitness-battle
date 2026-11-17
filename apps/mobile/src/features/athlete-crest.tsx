import { memo, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import type { AthleteCardModel } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { useSceneActive } from "../ui/use-scene-active";
import { useAppTheme } from "../theme";
import { AthleteProfileCard } from "./athlete-profile-card";

export const AthleteCrest = memo(function AthleteCrest({ model, onInteractionChange, compact = false, active: suppliedActive = true, transparent = false }: { model: AthleteCardModel; compact?: boolean; active?: boolean; transparent?: boolean; onInteractionChange?: (held: boolean) => void }) {
  const active = useSceneActive() && suppliedActive;
  const { mode, colors: c } = useAppTheme();
  const web = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const held = useRef(false);
  const unavailable = useRef(false);
  const latest = useRef({ type: "athlete-card", model, active, appearance: mode, compact });
  latest.current = { type: "athlete-card", model, active, appearance: mode, compact };
  const sent = useRef<typeof latest.current | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/athlete-card-scene`;
  const origin = new URL(uri).origin;
  function inject() {
    if (!ready.current || (held.current && active)) return;
    const previous = sent.current, next = latest.current;
    const changedModel = previous ? Object.fromEntries(Object.entries(next.model).filter(([key, value]) => value !== previous.model[key as keyof AthleteCardModel])) : next.model;
    if (previous && !Object.keys(changedModel).length && next.active === previous.active && next.appearance === previous.appearance && next.compact === previous.compact) return;
    const payload = JSON.stringify({ ...next, model: changedModel });
    // Keep the full model inside the loaded scene: photos cross the bridge only when changed.
    web.current?.injectJavaScript(`(()=>{const p=window.__overtaekAthleteCard;const n=${payload};const v=p?{...p,...n,model:{...p.model,...n.model}}:n;window.__overtaekAthleteCard=v;window.dispatchEvent(new MessageEvent('message',{data:v}));})();true;`);
    sent.current = next;
  }
  function interaction(next: boolean) {
    held.current = next;
    onInteractionChange?.(next);
    if (!next) inject();
  }
  function fail() { ready.current = false; unavailable.current = true; setLoaded(false); setFailed(true); onInteractionChange?.(false); }
  useEffect(inject, [model, active, mode, compact]);
  useEffect(() => { if (!active) { held.current = false; onInteractionChange?.(false); } return () => onInteractionChange?.(false); }, [active, onInteractionChange]);
  useEffect(() => {
    if (!active || loaded || failed) return;
    const timer = setTimeout(fail, 12000);
    return () => clearTimeout(timer);
  }, [active, loaded, failed]);
  return <View style={{ minHeight: compact ? 180 : 430, backgroundColor: compact || transparent ? "transparent" : c.paper }}>
    {!loaded && <View style={{ position: "absolute", inset: 0, justifyContent: "center" }}>
      <AthleteProfileCard name={model.name} location={model.location} avatarUrl={model.avatarUrl} score={model.score} rank={model.rank} />
    </View>}
    {!failed && <WebView ref={web} source={{ uri }} originWhitelist={[origin]} javaScriptEnabled scrollEnabled={false} bounces={false}
      onTouchStart={() => interaction(true)} onTouchEnd={() => interaction(false)} onTouchCancel={() => interaction(false)}
      style={{ height: compact ? 180 : 430, backgroundColor: compact || transparent ? "transparent" : c.paper, opacity: loaded ? 1 : 0 }}
      onShouldStartLoadWithRequest={(request: { url: string }) => {
        if (request.url === "about:blank") return true;
        try { const url = new URL(request.url); return url.origin === origin && url.pathname === "/athlete-card-scene"; } catch { return false; }
      }} onError={fail} onHttpError={fail} onContentProcessDidTerminate={fail}
      onMessage={(event: WebViewMessageEvent) => { try {
        if (unavailable.current) return;
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === "athlete-card-ready") { ready.current = true; sent.current = null; inject(); }
        if (message.type === "athlete-card-rendered" && ready.current) setLoaded(true);
      } catch { /* Ignore malformed bridge messages. */ } }} />}

  </View>;
});

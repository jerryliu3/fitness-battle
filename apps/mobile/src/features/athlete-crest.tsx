import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";
import type { AthleteCardModel } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { useSceneActive } from "../ui/use-scene-active";
import { useAppTheme } from "../theme";
import { AthleteProfileCard } from "./athlete-profile-card";

export function AthleteCrest({ model, onInteractionChange }: { model: AthleteCardModel; onInteractionChange?: (held: boolean) => void }) {
  const active = useSceneActive();
  const { mode, colors: c } = useAppTheme();
  const web = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const unavailable = useRef(false);
  const latest = useRef({ type: "athlete-card", model, active, appearance: mode });
  latest.current = { type: "athlete-card", model, active, appearance: mode };
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/athlete-card-scene`;
  const origin = new URL(uri).origin;
  function inject() {
    if (ready.current) web.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(latest.current)}}));true;`);
  }
  function fail() { ready.current = false; unavailable.current = true; setLoaded(false); setFailed(true); onInteractionChange?.(false); }
  useEffect(inject, [model, active, mode]);
  useEffect(() => { if (!active) onInteractionChange?.(false); return () => onInteractionChange?.(false); }, [active, onInteractionChange]);
  useEffect(() => {
    if (!active || loaded || failed) return;
    const timer = setTimeout(fail, 12000);
    return () => clearTimeout(timer);
  }, [active, loaded, failed]);
  return <View style={{ minHeight: 390, backgroundColor: c.paper }}>
    {!failed && <WebView ref={web} source={{ uri }} originWhitelist={[origin]} javaScriptEnabled scrollEnabled={false} bounces={false}
      onTouchStart={() => onInteractionChange?.(true)} onTouchEnd={() => onInteractionChange?.(false)} onTouchCancel={() => onInteractionChange?.(false)}
      style={{ height: 390, backgroundColor: c.paper, opacity: loaded ? 1 : 0 }}
      onShouldStartLoadWithRequest={(request: { url: string }) => {
        if (request.url === "about:blank") return true;
        try { const url = new URL(request.url); return url.origin === origin && url.pathname === "/athlete-card-scene"; } catch { return false; }
      }} onError={fail} onHttpError={fail} onContentProcessDidTerminate={fail}
      onMessage={(event: WebViewMessageEvent) => { try {
        if (unavailable.current) return;
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === "athlete-card-ready") { ready.current = true; inject(); }
        if (message.type === "athlete-card-rendered" && ready.current) setLoaded(true);
      } catch { /* Ignore malformed bridge messages. */ } }} />}
    {!loaded && <View style={{ position: "absolute", inset: 0 }}>
      <AthleteProfileCard name={model.name} city={model.city} avatarUrl={model.avatarUrl} score={model.score} />
    </View>}
  </View>;
}

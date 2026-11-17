import { memo, createElement, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import type { AthleteCardModel } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { useSceneActive } from "../ui/use-scene-active";
import { AthleteProfileCard } from "./athlete-profile-card";
import { useAppTheme } from "../theme";

/** Expo web uses the same host and model; native uses a WebView. */
export const AthleteCrest = memo(function AthleteCrest({ model, active: suppliedActive = true, transparent = false }: { model: AthleteCardModel; active?: boolean; transparent?: boolean; onInteractionChange?: (held: boolean) => void }) {
  const active = useSceneActive() && suppliedActive;
  const { mode, colors } = useAppTheme();
  const frame = useRef<HTMLIFrameElement>(null);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/athlete-card-scene`;
  const origin = new URL(uri).origin;
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== origin) return;
      if (event.data?.type === "athlete-card-ready") setRevision(n => n + 1);
      if (event.data?.type === "athlete-card-rendered") setLoaded(true);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [origin]);
  useEffect(() => { if (revision) frame.current?.contentWindow?.postMessage({ type: "athlete-card", model, active, appearance: mode }, origin); }, [revision, model, active, mode, origin]);
  useEffect(() => {
    if (!active || loaded || failed) return;
    const timer = setTimeout(() => setFailed(true), 12000);
    return () => clearTimeout(timer);
  }, [active, loaded, failed]);
  return <View style={{ minHeight: 390, backgroundColor: transparent ? "transparent" : colors.paper }}>
    {!failed && createElement("iframe", { ref: frame, title: `${model.name} athlete card`, src: uri, onError: () => { setLoaded(false); setFailed(true); }, style: { width: "100%", height: 390, border: 0, opacity: loaded ? 1 : 0 } })}
    {!loaded && <View style={{ position: "absolute", inset: 0 }}>
      <AthleteProfileCard name={model.name} location={model.location} avatarUrl={model.avatarUrl} score={model.score} rank={model.rank} />
    </View>}
  </View>;
});

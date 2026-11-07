import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Mapbox from "@rnmapbox/maps";
import { FocusButton, FocusSheet } from "./focus";
import { textStyle } from "./section";
import { SHELL_COLORS as c } from "../theme";

const TELEMETRY_KEY = "mapbox-telemetry-preference-v1";
let preference: boolean | undefined;
let loaded: Promise<void> | undefined;
function loadPreference() {
  return loaded ??= AsyncStorage.getItem(TELEMETRY_KEY).then(value => {
    if (value === "true" || value === "false") { preference = value === "true"; Mapbox.setTelemetryEnabled(preference); }
  }).catch(() => {});
}

/** Compact visible icon with a full touch target and the SDK's required privacy choice. */
export function MapAttribution({ top }: { top: number }) {
  const [open, setOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<boolean | undefined>(preference);
  useEffect(() => { let alive = true; void loadPreference().then(() => { if (alive) setTelemetry(preference); }); return () => { alive = false; }; }, []);
  const toggleTelemetry = async () => {
    const next = telemetry === false;
    await AsyncStorage.setItem(TELEMETRY_KEY, String(next));
    preference = next; Mapbox.setTelemetryEnabled(next); setTelemetry(next);
  };
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Map credits and privacy" hitSlop={15} onPress={() => { setTelemetry(preference); setOpen(true); }} style={{ position: "absolute", top, right: 12, width: 14, height: 20, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ ...textStyle("support"), color: c.ink }}>ⓘ</Text>
    </Pressable>
    <FocusSheet open={open} title="Map credits" onClose={() => setOpen(false)}>
      {[{ label: "© Mapbox", url: "https://www.mapbox.com/about/maps" }, { label: "© OpenStreetMap", url: "https://www.openstreetmap.org/copyright" }, { label: "Improve this map", url: "https://apps.mapbox.com/feedback/" }].map(link => <FocusButton key={link.label} secondary label={link.label} onPress={() => { void Linking.openURL(link.url); }} />)}
      <FocusButton secondary label={telemetry === false ? "Turn on anonymous map usage sharing" : "Turn off anonymous map usage sharing"} onPress={() => { void toggleTelemetry().catch(() => Alert.alert("Map privacy", "Could not save your preference. Please try again.")); }} />
    </FocusSheet>
  </>;
}

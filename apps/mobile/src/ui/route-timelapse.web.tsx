import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { encodePolyline, type LngLat } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { colors } from "../theme";

export interface RouteTimelapseProps {
  coordinates: LngLat[] | string;
  mode?: "3d-flyover" | "2d-overview";
  accentColor?: string;
  durationMs?: number;
  onFinish?: () => void;
  onUnavailable?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function RouteTimelapse({
  coordinates,
  mode = "3d-flyover",
  accentColor = colors.lime,
  durationMs = 12000,
  style,
}: RouteTimelapseProps) {
  const polylineStr =
    typeof coordinates === "string" ? coordinates : encodePolyline(coordinates);

  const uri = `${mobileEnv.apiUrl.replace(/\/$/, "")}/route-scene?polyline=${encodeURIComponent(
    polylineStr,
  )}&mode=${mode}&accent=${encodeURIComponent(accentColor)}&duration=${durationMs}`;

  return (
    <View style={[styles.frame, style]}>
      <iframe
        src={uri}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="3D Route Replay"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    height: 380,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.ink,
  },
});

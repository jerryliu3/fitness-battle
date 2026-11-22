import { View } from "react-native";
import { MaterialPanel } from "./material-panel";
import { useAppTheme } from "../theme";

const FILL = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;

export function useMapHud() {
  const { mode, colors } = useAppTheme();
  const light = mode === "light";
  return {
    light,
    surface: light ? { backgroundColor: colors.mapHudSurface, borderColor: colors.mapHudBorder, borderWidth: 1 } : undefined,
    chrome: light ? { backgroundColor: "transparent", borderColor: colors.mapHudBorder, borderWidth: 1 } : undefined,
    ink: light ? colors.ink : colors.white,
    muted: colors.mapHudMuted,
    accent: light ? colors.ink : colors.tennis,
  };
}

export function MapHudBackdrop({ radius }: { radius: number }) {
  const { mode, colors } = useAppTheme();
  if (mode !== "light") return null;
  return (
    <View pointerEvents="none" accessible={false} style={[FILL, { borderRadius: radius, overflow: "hidden" }]}>
      <MaterialPanel style={FILL} fallbackColor={colors.card} />
      <View style={[FILL, { backgroundColor: colors.mapHudSurface }]} />
    </View>
  );
}

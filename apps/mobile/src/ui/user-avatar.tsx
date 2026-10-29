import { useThemeColors } from "../theme";
import { useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { initialsFromName } from "@fitness-battle/shared";
import { SHELL_COLORS as c } from "../theme";
import { textStyle } from "./section";

export function UserAvatar({ src, name, size = 38, fallback, decorative = true, highlight = false, onLoadEnd }: {
  src?: string | null; name: string; size?: number; fallback?: ReactNode; decorative?: boolean; onLoadEnd?: () => void; highlight?: boolean;
}) {
  const c = useThemeColors();

  const [failed, setFailed] = useState<string | null>(null);
  const url = src?.trim();
  return <View accessible={!decorative} accessibilityLabel={decorative ? undefined : name} accessibilityRole={decorative ? undefined : "image"}
    style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: highlight ? c.tennis : c.soft, borderWidth: highlight ? 2 : 0, borderColor: c.tennis }}>
    {url && failed !== url ? <Image source={{ uri: url }} resizeMode="cover" onError={() => { setFailed(url); onLoadEnd?.(); }} onLoadEnd={onLoadEnd} style={{ width: size, height: size }} />
      : fallback ?? <Text style={[textStyle("label"), { color: c.ink }]}>{initialsFromName(name) || "?"}</Text>}
  </View>;
}

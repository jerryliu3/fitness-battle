import { useThemeColors } from "../theme";
import { useMemo, useState } from "react";
import { Switch, View } from "react-native";
import { createOnboardingOvertakeMoment, onboardingOvertakeCourse, type SportId } from "@fitness-battle/shared";
import { CompetitionMoment } from "./competition-moment";
import { AppText } from "../ui/section";

export function OnboardingOvertake({
  onComplete,
  initialDimension = "4d",
  sport = "running",
  name,
}: {
  onComplete?: () => void;
  initialDimension?: "2d" | "4d";
  sport?: SportId;
  name?: string;
} = {}) {
  const c = useThemeColors();
  const [dimension, setDimension] = useState<"2d" | "4d">(initialDimension);
  const [replay, setReplay] = useState(0);
  const moment = useMemo(() => createOnboardingOvertakeMoment(name, sport), [name, sport]);
  const gps = sport === "running" || sport === "cycling";
  const view = gps ? dimension : "2d";
  const play = () => {
    if (onComplete) { onComplete(); return; }
    setReplay(n => n + 1);
  };
  return <View style={{ gap: 12 }}>
    {gps && <View style={{ flexDirection: "row", gap: 12, alignItems: "center", justifyContent: "flex-end" }}>
      <AppText role="label">2D field</AppText>
      <Switch accessibilityLabel="3D course" value={view === "4d"} onValueChange={value => setDimension(value ? "4d" : "2d")} trackColor={{ false: c.line, true: c.ink }} />
      <AppText role="label">3D course</AppText>
    </View>}
    <CompetitionMoment key={`${sport}:${replay}`} autoStart embedded dimension={view}
      course={gps ? onboardingOvertakeCourse : null} moment={moment} remaining={1} onConfirm={play} />
  </View>;
}

import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ONBOARDING_REPLAY_TUNING } from "@fitness-battle/shared";
import { OnboardingOvertake } from "../src/features/onboarding-overtake";
import { prefetchOnboardingCourseFromApi } from "../src/lib/onboarding-course";
import { useThemeColors } from "../src/theme";
import { FocusSegments } from "../src/ui/focus";
import { ScreenHeader } from "../src/ui/screen-header";

/** Unlinked presentation study: uses the real scene without any account writes. */
export default function ReplayTuning() {
  const c = useThemeColors(), router = useRouter();
  const [durationMs, setDuration] = useState<number>(ONBOARDING_REPLAY_TUNING.durationMs);
  const [slowdownWeight, setSlowdown] = useState<number>(ONBOARDING_REPLAY_TUNING.slowdownWeight);
  const [zoomBoost, setZoom] = useState<number>(ONBOARDING_REPLAY_TUNING.zoomBoost);
  const [courseRevision, setCourseRevision] = useState(0);
  useEffect(() => { let active = true; void prefetchOnboardingCourseFromApi().then(course => { if (active && course) setCourseRevision(value => value + 1); }); return () => { active = false; }; }, []);
  const tuning = useMemo(() => ({ durationMs, slowdownWeight, zoomBoost }), [durationMs, slowdownWeight, zoomBoost]);
  const close = () => router.canGoBack() ? router.back() : router.replace("/welcome");
  return <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: c.paper }}>
    <ScreenHeader title="Overtake tuning" onBack={close} nativeBar={false} />
    <View style={{ flex: 1 }}>
      <OnboardingOvertake key={`${courseRevision}:${durationMs}:${slowdownWeight}:${zoomBoost}`} sport="cycling" name="You" replayTuning={tuning} onComplete={close} onBack={close} />
    </View>
    <View style={{ padding: 12, gap: 8 }}>
      <FocusSegments label="Replay duration" value={String(durationMs)} onChange={value => setDuration(Number(value))}
        options={[{ value: "6500", label: "6.5s" }, { value: "8000", label: "8s" }, { value: "13050", label: "13s" }]} />
      <FocusSegments label="Pass slowdown" value={String(slowdownWeight)} onChange={value => setSlowdown(Number(value))}
        options={[{ value: "3", label: "Light" }, { value: "6", label: "Balanced" }, { value: "18", label: "Original" }]} />
      <FocusSegments label="Camera closeness" value={String(zoomBoost)} onChange={value => setZoom(Number(value))}
        options={[{ value: "0", label: "Wide" }, { value: "0.6", label: "Close" }, { value: "1", label: "Closer" }]} />
    </View>
  </SafeAreaView>;
}

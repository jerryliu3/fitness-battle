import { useFocusStyles, FocusSegments } from "../ui/focus";
import { SectionStack } from "../ui/section";
import { MotionStep } from "../ui/motion-step";
import { useEffect, useState } from "react";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCompeteStore } from "../lib/compete-store";
import { PerformanceSpace } from "./performance-space";
import { JourneySpace } from "./journey-space";
import { HealthLabSpace } from "./health-lab-space";

export type ProgressTabSpace = "performance" | "journey" | "health_lab";

const PROGRESS_TABS: readonly {
  value: ProgressTabSpace;
  label: string;
}[] = [
  { value: "performance", label: "Performance" },
  { value: "journey", label: "Journey" },
  { value: "health_lab", label: "Health Lab" },
];

export function ProgressScreen({
  initialSpace,
  initialHorizon,
}: {
  initialSpace?: ProgressTabSpace;
  initialHorizon?: "week" | "month" | "year";
} = {}) {
  const f = useFocusStyles();
  const { state, accountKey } = useCompeteStore();
  const localParams = useLocalSearchParams<{ view?: string; horizon?: string }>();
  const globalParams = useGlobalSearchParams<{ view?: string; horizon?: string }>();
  const rawView = initialSpace ?? localParams.view ?? globalParams.view;
  const rawHorizon = initialHorizon ?? localParams.horizon ?? globalParams.horizon;

  const resolveSpace = (v?: string): ProgressTabSpace => {
    if (!v) return "performance";
    const lower = v.toLowerCase();
    if (lower === "journey" || lower === "overview" || lower === "history") {
      return "journey";
    }
    if (
      lower === "health" ||
      lower === "health_lab" ||
      lower === "vitals" ||
      lower === "recovery"
    ) {
      return "health_lab";
    }
    return "performance";
  };

  const [space, setSpace] = useState<ProgressTabSpace>(() => resolveSpace(rawView));

  // Keep legacy and deep link routes functioning cleanly
  useEffect(() => {
    if (!rawView) return;
    setSpace(resolveSpace(rawView));
  }, [rawView]);

  if (!state) return null;

  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={f.content}>
        <SectionStack divided={false}>
          {/* Top 3 Spaces Segment Selector */}
          <FocusSegments
            variant="tabs"
            label="Progress spaces"
            value={space}
            options={PROGRESS_TABS}
            onChange={setSpace}
          />

          {/* Animated Transition between Spaces */}
          <MotionStep identity={space}>
            {space === "performance" ? (
              <PerformanceSpace
                state={state}
                signedOut={accountKey === "device"}
              />
            ) : space === "journey" ? (
              <JourneySpace
                state={state}
                initialHorizon={
                  rawHorizon === "month" || rawHorizon === "year"
                    ? rawHorizon
                    : "week"
                }
              />
            ) : (
              <HealthLabSpace
                state={state}
                signedOut={accountKey === "device"}
              />
            )}
          </MotionStep>
        </SectionStack>
      </ScrollView>
    </SafeAreaView>
  );
}

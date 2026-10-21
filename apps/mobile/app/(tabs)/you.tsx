import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { ProgressScreen } from "../../src/features/progress-screen";

export default function ProgressTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    panel?: string;
    tracker?: string;
    provider?: string;
  }>();
  // Keep existing tracker callbacks and settings deep links working after the
  // Athlete destination moved out of the tab bar.
  const { panel, tracker, provider } = params;
  useFocusEffect(
    useCallback(() => {
      if (!tracker && (!panel || panel === "progress")) return;
      // Tabs retain their params. Consume the legacy link before leaving so
      // returning to Progress doesn't open settings again.
      router.setParams({
        panel: undefined,
        tracker: undefined,
        provider: undefined,
      });
      router.push({
        pathname: "/athlete",
        params: { panel, tracker, provider },
      });
    }, [panel, tracker, provider, router]),
  );
  return <ProgressScreen />;
}

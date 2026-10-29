import { useFocusStyles } from "../src/ui/focus";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../src/ui/screen-header";
import { f } from "../src/ui/focus";
import {
  AthleteTelemetryDetailView,
  getDomainTitle,
} from "../src/features/athlete-telemetry-details";
import { useCompeteStore } from "../src/lib/compete-store";
import type { AnalyticsDomainId } from "@fitness-battle/shared";

export default function TelemetryScreen() {
  const f = useFocusStyles();

  const router = useRouter();
  const { domain } = useLocalSearchParams<{ domain?: AnalyticsDomainId }>();
  const { state } = useCompeteStore();

  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScreenHeader
        title={getDomainTitle(domain)}
        onBack={() => router.back()}
      />
      <AthleteTelemetryDetailView domain={domain} state={state} />
    </SafeAreaView>
  );
}

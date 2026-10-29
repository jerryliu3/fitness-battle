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
  const router = useRouter();
  const { domain, signedOut: signedOutParam } =
    useLocalSearchParams<{ domain?: AnalyticsDomainId; signedOut?: string }>();
  const { state, accountKey } = useCompeteStore();
  const signedOut = signedOutParam === "1" || accountKey === "device";

  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScreenHeader
        title={getDomainTitle(domain)}
        onBack={() => router.back()}
      />
      <AthleteTelemetryDetailView
        domain={domain}
        state={state}
        signedOut={signedOut}
      />
    </SafeAreaView>
  );
}

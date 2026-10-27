import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../src/ui/screen-header";
import { f } from "../src/ui/focus";
import {
  AthleteTelemetryDetailView,
  getDomainTitle,
} from "../src/features/athlete-telemetry-details";
import type { AnalyticsDomainId } from "@fitness-battle/shared";

export default function TelemetryScreen() {
  const router = useRouter();
  const { domain } = useLocalSearchParams<{ domain?: AnalyticsDomainId }>();

  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScreenHeader
        title={getDomainTitle(domain)}
        onBack={() => router.back()}
      />
      <AthleteTelemetryDetailView domain={domain} />
    </SafeAreaView>
  );
}

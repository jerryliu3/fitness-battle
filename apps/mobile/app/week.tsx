import { SectionStack } from "../src/ui/section";
import { ScreenHeader } from "../src/ui/screen-header";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WeekChart } from "../src/features/week-chart";
import { EffortRail } from "../src/features/effort-rail";
import { WeekRecap } from "../src/features/club-week-recap";
import { useCompeteStore } from "../src/lib/compete-store";

import { f } from "../src/ui/focus";
export default function Week() {
  const { state } = useCompeteStore();
  const router = useRouter();
  if (!state) return null;
  return <SafeAreaView style={f.safe}>
    <ScreenHeader title="Your week" onBack={() => router.canGoBack() ? router.back() : router.replace("/today")} />
    <ScrollView contentContainerStyle={[f.content, { paddingTop: 0 }]}>
<SectionStack divided={false}>
      <WeekChart state={state} /><EffortRail /><WeekRecap state={state} />
    </SectionStack>
</ScrollView>
  </SafeAreaView>;
}

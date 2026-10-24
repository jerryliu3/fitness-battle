import { SectionStack } from "../src/ui/section";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WeeklyChapters } from "../src/features/weekly-chapters";
import { useCompeteStore } from "../src/lib/compete-store";
import { AwardShelf } from "../src/ui/award-shelf";
import { awardCards } from "@fitness-battle/shared";
import { ScreenHeader } from "../src/ui/screen-header";
import { f } from "../src/ui/focus";

export default function ProgressHistoryScreen() {
  const { state } = useCompeteStore();
  const router = useRouter();
  if (!state) return null;
  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScreenHeader title="Past weeks & awards" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[f.content, { paddingTop: 0 }]}>
<SectionStack divided={false}>
        <WeeklyChapters state={state} />
        {awardCards(state).length > 0 ? (
          <AwardShelf cards={awardCards(state)} />
        ) : null}
      </SectionStack>
</ScrollView>
    </SafeAreaView>
  );
}

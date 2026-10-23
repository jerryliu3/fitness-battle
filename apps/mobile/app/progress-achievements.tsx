import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AchievementsCatalog } from "../src/features/achievements-catalog";
import { useCompeteStore } from "../src/lib/compete-store";
import { ScreenHeader } from "../src/ui/screen-header";
import { f } from "../src/ui/focus";

export default function ProgressAchievementsScreen() {
  const { state } = useCompeteStore();
  const router = useRouter();
  if (!state) return null;
  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScreenHeader title="Achievements" onBack={() => router.back()} />
      <AchievementsCatalog state={state} />
    </SafeAreaView>
  );
}

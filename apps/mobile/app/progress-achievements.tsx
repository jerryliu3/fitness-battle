import { useFocusStyles } from "../src/ui/focus";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AchievementsCatalog } from "../src/features/achievements-catalog";
import { useCompeteStore } from "../src/lib/compete-store";
import { ScreenHeader } from "../src/ui/screen-header";


export default function ProgressAchievementsScreen() {
const f=useFocusStyles();

  const { state } = useCompeteStore();
  const router = useRouter();
  const { milestone } = useLocalSearchParams<{ milestone?: string }>();
  if (!state) return null;
  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScreenHeader title="Achievements" onBack={() => router.back()} />
      <AchievementsCatalog state={state} initialId={milestone} />
    </SafeAreaView>
  );
}

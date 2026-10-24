import { SectionStack } from "../src/ui/section";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CrewHub } from "../src/features/crew";
import { ScreenHeader } from "../src/ui/screen-header";
import { f } from "../src/ui/focus";
export default function CrewMembersScreen() {
  const router = useRouter();
  const { crewId } = useLocalSearchParams<{ crewId?: string }>();
  return <SafeAreaView style={f.safe}>
    <ScreenHeader title="Members" onBack={() => router.back()} />
    <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}><CrewHub membersOnly crewId={crewId} /></SectionStack>
</ScrollView>
  </SafeAreaView>;
}

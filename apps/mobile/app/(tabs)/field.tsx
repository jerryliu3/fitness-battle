import { useFocusStyles } from "../../src/ui/focus";
import { SectionStack } from "../../src/ui/section";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { f } from "../../src/ui/focus";
import { CrewHub } from "../../src/features/crew";
export default function CrewScreen() {
  const f = useFocusStyles();

  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
        <CrewHub />
      </SectionStack>
</ScrollView>
    </SafeAreaView>
  );
}

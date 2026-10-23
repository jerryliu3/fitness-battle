import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FocusHeading, f } from "../../src/ui/focus";
import { CrewHub } from "../../src/features/crew";
export default function CrewScreen() {
  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusHeading kicker="Better, together" title="Crew" body="Different paces. Same direction."/>
        <CrewHub />
      </ScrollView>
    </SafeAreaView>
  );
}

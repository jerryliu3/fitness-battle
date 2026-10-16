import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FocusHeading, f } from "../../src/ui/focus";
import { CrewHub } from "../../src/features/crew";
export default function CrewScreen() {
  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusHeading
          kicker="Your people"
          title="A little further, together."
          body="Different paces. Same direction."
        />
        <CrewHub />
      </ScrollView>
    </SafeAreaView>
  );
}

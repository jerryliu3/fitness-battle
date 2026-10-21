import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FocusButton, f } from "../src/ui/focus";
export default function NotFound() {
  const router = useRouter();
  return (
    <SafeAreaView style={f.safe} edges={["bottom"]}>
      <View style={f.content}>
        <Text style={f.kicker}>OVERTAEK</Text>
        <Text style={f.title}>A little off course.</Text>
        <Text style={f.copy}>We couldn't find that page.</Text>
        <FocusButton
          label="Back to Home"
          onPress={() => router.replace("/today")}
        />
        <FocusButton
          label="Compete"
          secondary
          onPress={() => router.replace("/arena")}
        />
      </View>
    </SafeAreaView>
  );
}

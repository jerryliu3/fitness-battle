import { useFocusStyles } from "../src/ui/focus";
import { AppText } from "../src/ui/section";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconButton } from "../src/ui/icon-button";
import { FocusButton, f } from "../src/ui/focus";
export default function NotFound() {
  const f = useFocusStyles();

  const router = useRouter();
  return (
    <SafeAreaView style={f.safe} edges={["bottom"]}>
      <View style={f.content}>
        <Text style={f.kicker}>OVERTAEK</Text>
        <AppText accessibilityRole="header" role="display" >A little off course.</AppText>
        <AppText role="body" secondary >We couldn't find that page.</AppText>
        <IconButton icon="back"
          label="Return to Home"
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

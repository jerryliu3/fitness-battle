import { router } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Copy, GhostButton, Kicker, Note } from "../src/ui/primitives";
import { ui } from "../src/ui/styles";

const UPDATED = "October 14, 2026";

export default function TermsScreen() {
  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll}>
        <GhostButton label="← Back" onPress={() => router.back()} />
        <Card>
          <Kicker>Legal</Kicker>
          <Text style={ui.title}>Terms of Use</Text>
          <Copy>Last updated {UPDATED}</Copy>
          <Copy>
            These terms govern Fitness Battle on iOS and Android. By creating an
            account or using the app, you agree to them.
          </Copy>
          <Text style={ui.cardTitle}>The service</Text>
          <Copy>
            Compete in weekly fitness battles, connect trackers, and view
            standings. Demo or stub tracker modes are labeled and are not live
            connections.
          </Copy>
          <Text style={ui.cardTitle}>Fitness data</Text>
          <Copy>
            Connecting trackers or Apple Health / Health Connect is optional.
            Fitness Battle is not a medical device and does not provide medical
            advice.
          </Copy>
          <Text style={ui.cardTitle}>Conduct</Text>
          <Copy>
            Compete fairly. Do not cheat, harass others, or attempt to access
            another user’s data. We may suspend accounts that harm the service.
          </Copy>
          <Note>
            Full terms live at fitness-battle-one.vercel.app/terms. Contact
            3jerryliu@gmail.com.
          </Note>
          <GhostButton
            label="Privacy Policy"
            onPress={() => router.push("/privacy")}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

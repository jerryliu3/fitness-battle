import { router } from "expo-router";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Copy, GhostButton, Kicker, Note } from "../src/ui/primitives";
import { ui } from "../src/ui/styles";

const UPDATED = "October 13, 2026";

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={ui.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={ui.scroll}>
        <GhostButton label="← Back" onPress={() => router.back()} onPlum />
        <Card>
          <Kicker>Legal</Kicker>
          <Text style={ui.title}>Privacy Policy</Text>
          <Copy>Last updated {UPDATED}</Copy>
          <Copy>
            Fitness Battle helps you run group and 1v1 fitness battles with
            automatic tracking on web, iOS, and Android. This policy explains
            what we collect, why we use it, and the choices you have.
          </Copy>

          <Text style={ui.cardTitle}>1. Who this applies to</Text>
          <Copy>
            This policy covers the Fitness Battle apps and related APIs. If you
            use a third-party service through us (WHOOP, Strava, Oura, Garmin,
            Apple Health, or Health Connect), that provider’s own privacy policy
            also applies.
          </Copy>

          <Text style={ui.cardTitle}>2. Information we collect</Text>
          <Copy>
            Account: email, password (stored by our auth provider), and optional
            display name. Fitness connections: workouts and activity summaries,
            recovery or readiness scores, and sleep metrics when you connect a
            supported tracker. On phone, Apple Health and Health Connect workouts
            you approve are read on-device and sent to our API to score your week.
          </Copy>

          <Text style={ui.cardTitle}>3. How we use data</Text>
          <Copy>
            We use account and fitness data to sign you in, score battles, show
            standings, and improve the product. We do not sell your personal
            information.
          </Copy>

          <Text style={ui.cardTitle}>4. Sharing</Text>
          <Copy>
            We share data with infrastructure providers that host the service
            (for example our database and auth provider) and with trackers you
            connect under their terms. Race rankings may display public results
            from audited sources with attribution.
          </Copy>

          <Text style={ui.cardTitle}>5. Your choices</Text>
          <Copy>
            You can disconnect trackers, revoke Health permissions in system
            settings, and request account deletion by contacting us through the
            support channel listed in the store listing.
          </Copy>

          <Note>
            Full policy: https://fitness-battle-one.vercel.app/privacy · Contact
            jerrry333x@gmail.com
          </Note>
          <GhostButton label="Terms of Use" onPress={() => router.push("/terms")} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

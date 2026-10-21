import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FocusButton, f } from "../src/ui/focus";
import { SettingsRow } from "../src/ui/settings-row";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={f.safe} edges={[]}>
      <ScrollView contentContainerStyle={f.content}>
        <FocusButton
          label="← Back to Athlete"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/athlete")
          }
        />
        <Text accessibilityRole="header" style={f.title}>
          Settings
        </Text>
        <View style={{ gap: 8 }}>
          <SettingsRow
            title="Edit profile"
            detail="Name & city"
            onPress={() =>
              router.push({
                pathname: "/athlete-settings",
                params: { panel: "profile" },
              })
            }
          />
          <SettingsRow
            title="Data Sync"
            detail="Trackers, device health & history"
            onPress={() =>
              router.push({
                pathname: "/athlete-settings",
                params: { panel: "connections" },
              })
            }
          />
          <SettingsRow
            title="Preferences"
            detail="Units, sports & week freezes"
            onPress={() =>
              router.push({
                pathname: "/athlete-settings",
                params: { panel: "preferences" },
              })
            }
          />
          <SettingsRow
            title="Notifications"
            detail="Your updates, your choice"
            onPress={() => router.push("/notifications")}
          />
          <SettingsRow
            title="How scoring works"
            detail="Levels & eligibility"
            onPress={() =>
              router.push({
                pathname: "/athlete-settings",
                params: { panel: "scoring" },
              })
            }
          />
          <SettingsRow
            title="Account"
            detail="Sign out, report an issue & delete account"
            onPress={() =>
              router.push({
                pathname: "/athlete-settings",
                params: { panel: "account" },
              })
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

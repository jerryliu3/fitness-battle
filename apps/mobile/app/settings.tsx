import { useFocusStyles } from "../src/ui/focus";
import { SectionStack } from "../src/ui/section";
import { ScreenHeader } from "../src/ui/screen-header";

import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { f } from "../src/ui/focus";
import { SettingsRow } from "../src/ui/settings-row";

export default function SettingsScreen() {
  const f = useFocusStyles();

  return (
    <SafeAreaView style={f.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={f.content}>
<SectionStack divided={false}>
        <ScreenHeader
          title="Settings"
          onBack={() => {
            router.replace({ pathname: "/athlete", params: { edit: "1" } });
          }}
        />
        <View style={{ gap: 8 }}>
          <SettingsRow
            title="Edit profile"
            detail="Name & city"
            onPress={() =>
              router.replace({
                pathname: "/athlete",
                params: { edit: "1" },
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
      </SectionStack>
</ScrollView>
    </SafeAreaView>
  );
}

import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  T,
  c,
  Action,
  Surface,
} from "../src/prototypes/product-refinement/foundation";
export default function RefinementHub() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          gap: 24,
          maxWidth: 540,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <T role="caption" secondary>
          Overtaek · Product refinement
        </T>
        <T role="display">Closer to the app.</T>
        <T>
          Native screens built from the current product’s components and visual
          language. Each direction is a full screen with working detail
          navigation and fictional data.
        </T>
        <Surface style={{ gap: 12, backgroundColor: c.soft }}>
          <T role="heading">One more direction.</T>
          <T>
            Field-first competition, a connected training portfolio, shared crew
            moments and an earned athlete passport.
          </T>
          {["compete", "progress", "crew", "profile"].map((tab) => (
            <Action
              key={tab}
              label={`Follow-up · ${tab[0]!.toUpperCase()}${tab.slice(1)}`}
              onPress={() => router.push(`/refine-next?tab=${tab}` as "/today")}
            />
          ))}
        </Surface>
        {[
          {
            id: "compete",
            title: "Compete",
            count: "3 directions",
            copy: "Three field-first directions with the actual 2D map and 3D renderer.",
          },
          {
            id: "progress",
            title: "Progress",
            count: "2 directions",
            copy: "Training charts, visual comparisons and the sessions behind them.",
          },
          {
            id: "crew",
            title: "Crew",
            count: "2 directions",
            copy: "The real shared trail, with sessions and member contributions in view.",
          },
          {
            id: "profile",
            title: "Profile",
            count: "2 directions",
            copy: "Athlete passports with three PB visuals and owner/public views.",
          },
        ].map((item) => (
          <Surface key={item.id} style={{ gap: 12 }}>
            <T role="heading">{item.title}</T>
            <T role="caption" secondary>
              {item.count}
            </T>
            <T>{item.copy}</T>
            <Action
              label={`Open ${item.title}`}
              onPress={() =>
                router.push(`/refine-${item.id}` as "/refine-compete")
              }
            />
          </Surface>
        ))}
        <View>
          <T role="caption" secondary>
            Local fixture interactions only. No changes to your real account.
            Use the concept chooser above each screen, or Compare to inspect
            them together.
          </T>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
        {[
          {
            id: "compete",
            title: "Compete",
            count: "3 directions",
            copy: "Event picker, swipeable meets and sport tabs.",
          },
          {
            id: "progress",
            title: "Progress",
            count: "2 directions",
            copy: "Training charts, visual comparisons and the sessions behind them.",
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

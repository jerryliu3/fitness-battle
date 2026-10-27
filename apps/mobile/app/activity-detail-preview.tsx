import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { freshState } from "@fitness-battle/shared";
import { SessionStage } from "../src/features/session-stage";
import { example, studyNow, type Example } from "../src/prototypes/activity-context/model";
import { ScreenHeader } from "../src/ui/screen-header";
import { AppText } from "../src/ui/section";
import { SHELL_COLORS as c } from "../src/theme";

export default function ActivityDetailPreview() {
  const router = useRouter(), params = useLocalSearchParams<{ sample?: Example; review?: string }>();
  const [sample, setSample] = useState<Example>(params.sample ?? "run");
  const [removed, setRemoved] = useState(false);
  useEffect(() => { if (params.sample && ["run", "strength", "no-hr", "sparse"].includes(params.sample)) { setSample(params.sample); setRemoved(false); } }, [params.sample]);
  const data = useMemo(() => example(sample), [sample]);
  const state = useMemo(() => ({ ...freshState(studyNow), primary: data.current.sport, activities: data.history, units: data.units, demoNow: studyNow.toISOString() }), [data]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
    <ScreenHeader title="Your activity" onBack={() => router.canGoBack() ? router.back() : router.replace("/today")} />
    <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40, gap: 24 }}>
      <AppText role="caption" secondary>FICTIONAL PREVIEW · actual detail component</AppText>
      {params.review !== "1" ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{(["run", "strength", "no-hr", "sparse"] as Example[]).map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: sample === item }} onPress={() => { setSample(item); setRemoved(false); }} style={{ minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: sample === item ? c.ink : c.soft }}><AppText role="label" style={{ color: sample === item ? c.card : c.ink }}>{item}</AppText></Pressable>)}</View> : null}
      {removed ? <AppText>Removed from this preview only.</AppText> : <SessionStage key={sample} state={state} activities={[data.current]} onRemove={() => setRemoved(true)} />}
    </ScrollView>
  </SafeAreaView>;
}

import { useState } from "react";
import { Pressable, View } from "react-native";
import { competeNow, eventRegistration, type CompeteEvent, type CompeteState } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { FocusButton } from "../ui/focus";
import { useThemeColors } from "../theme";
import { CompeteIcon, EventArt } from "./compete-home-sections";

export function EventRegistration({ state, event, registered, onClaim }: { state: CompeteState; event: CompeteEvent; registered: boolean; onClaim(): void }) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState<number | null>(null);
  const detail = eventRegistration(state, event, competeNow(state));
  return <View style={{ gap: 20 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><CompeteIcon name={event} gold /><AppText role="label">{detail.name}</AppText><AppText role="caption" secondary style={{ marginLeft: "auto" }}>{detail.dateRange}</AppText></View>
    <AppText secondary>{detail.description}</AppText>
    <View style={{ gap: 6 }}><AppText role="label">Starts {detail.starts}</AppText><AppText role="caption" secondary>Ends {detail.ends}</AppText></View>
    <AppText role="heading" accessibilityRole="header">Event details</AppText>
    <View style={{ gap: 10 }}>{detail.details.map((item, i) => <Pressable key={item.title} accessibilityRole="button" accessibilityState={{ expanded: expanded === i }} onPress={() => setExpanded(expanded === i ? null : i)} style={{ padding: 16, minHeight: 72, gap: 8, borderRadius: 20, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><CompeteIcon name={(["time", "crew", "trophy", event] as const)[i]!} gold /><View style={{ flex: 1, gap: 4 }}><AppText role="label">{item.title}</AppText><AppText role="caption" secondary>{item.summary}</AppText></View><AppText accessible={false}> {expanded === i ? "−" : "＋"}</AppText></View>
      {expanded === i && <AppText role="caption" secondary>{item.detail}</AppText>}
    </Pressable>)}</View>
    <View style={{ padding: 20, gap: 12, borderRadius: 24, backgroundColor: c.actionSoft, borderWidth: 1, borderColor: c.line, overflow: "hidden" }}>
      <EventArt event={event} feature />
      <AppText role="caption">Weekly entry pass</AppText><AppText role="heading">{detail.name} Meet</AppText><AppText>{detail.dateRange}</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><AppText role="caption">Admits 1 competitor</AppText><View accessible={false} style={{ flexDirection: "row", gap: 3 }}>{Array.from({ length: 12 }, (_, i) => <View key={i} style={{ width: i % 3 === 0 ? 4 : 2, height: 22, backgroundColor: c.podiumGold }} />)}</View></View>
    </View>
    <AppText role="caption" secondary>{detail.renewal}</AppText>
    <FocusButton label={registered ? "Already registered" : "Claim entry pass"} disabled={registered} onPress={onClaim} />
  </View>;
}

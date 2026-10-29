import { useFocusStyles } from "../ui/focus";
import { RouteStaticPreview } from "../ui/route-static-preview";
import { Section, AppText } from "../ui/section";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { APP_TIMEZONE, activityRoute, clubDuration, formatVolume, homeRecentActivities, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useAuth } from "../lib/auth";
import { useCrewActivities } from "./use-crew-activities";
import { FocusSheet, f } from "../ui/focus";
import { SportActivityIcon } from "../ui/sport-activity-icon";

export function LatestActivity({ state, onOpen }: { state: CompeteState; onOpen: (activity: Activity) => void }) {
  const f = useFocusStyles();

  const { user } = useAuth();
  const crew = useCrewActivities();
  const { blocks } = useAthleteBlocks();
  const rows = homeRecentActivities(state, user?.id, crew.activities).filter(row => !blocks.some(block => block.id === row.userId));
  const [selected, setSelected] = useState<{ account?: string; id: string } | null>(null);
  const detail = selected?.account === user?.id ? rows.find(row => row.id === selected?.id) : null;
  return <>
    <Section title="Latest activity">
      {rows.length > 0 ? (
        rows.map(row => { const route = activityRoute(row.ownActivity); return <Pressable key={`${row.userId}:${row.id}`} accessibilityRole="button" onPress={() => row.ownActivity ? onOpen(row.ownActivity) : setSelected({ account: user?.id, id: row.id })}
          style={[f.row, { minHeight: 76, paddingVertical: 12, borderBottomWidth: 0 }]}>
          {route ? <RouteStaticPreview coordinates={route} width={128} height={128} padding={16} strokeWidth={3} showMarkers={false} showPlayBadge={false} style={{ width: 64, height: 64, borderRadius: 12 }} /> : <SportActivityIcon sport={row.sport} />}
          <View style={[f.grow, { gap: 4 }]}><AppText role="row" >{row.ownActivity ? sportById(row.sport).name : `${row.name} · ${sportById(row.sport).name}`} · {clubDuration(row.movingSec)}</AppText>
            <AppText role="support" secondary >{new Date(row.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}</AppText></View>
          <AppText role="caption" secondary >View activity →</AppText>
        </Pressable>; })
      ) : (
        <View style={{ paddingVertical: 12 }}>
          <AppText role="body" secondary>No recent activity yet.</AppText>
        </View>
      )}
    </Section>
    {crew.error && <AppText role="caption" secondary  accessibilityLiveRegion="polite">{crew.error}</AppText>}
    <FocusSheet open={Boolean(detail)} title={detail ? `${detail.name}'s activity` : "Activity"} onClose={() => setSelected(null)}>
      {detail && <><AppText role="heading">{sportById(detail.sport).name}</AppText><AppText role="support" secondary >{clubDuration(detail.movingSec)} · {formatVolume(detail.sport, detail.distanceM, detail.movingSec, state.units)}</AppText>
        <AppText role="caption" secondary >{new Date(detail.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" })}</AppText></>}
    </FocusSheet>
  </>;
}

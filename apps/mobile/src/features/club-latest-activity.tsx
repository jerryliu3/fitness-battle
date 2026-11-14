import { useFocusStyles } from "../ui/focus";
import { RouteStaticPreview } from "../ui/route-static-preview";
import { Section, AppText, TextAction } from "../ui/section";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { APP_TIMEZONE, SHELL_SECTION, activityRoute, clubDuration, formatVolume, homeRecentActivities, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
import { createThemedStyles, useThemedStyles } from "../theme";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useAuth } from "../lib/auth";
import { prefetchActivityReplay } from "../lib/prefetch-activity-replay";
import { useCrewActivities } from "./use-crew-activities";
import { FocusSheet } from "../ui/focus";
import { SportActivityIcon } from "../ui/sport-activity-icon";

export function LatestActivity({ state, onOpen }: { state: CompeteState; onOpen: (activity: Activity) => void }) {
const f=useFocusStyles();
const s=useThemedStyles(sThemes);

  const { user, accessToken } = useAuth();
  const crew = useCrewActivities();
  const { blocks } = useAthleteBlocks();
  const router = useRouter();
  const rows = homeRecentActivities(state, user?.id, crew.activities).filter(row => !blocks.some(block => block.id === row.userId));
  const [selected, setSelected] = useState<{ account?: string; id: string } | null>(null);
  const detail = selected?.account === user?.id ? rows.find(row => row.id === selected?.id) : null;
  return <>
    <Section
      title="Latest activity"
      action={
        <TextAction
          label="View all"
          accessibilityLabel="View all activities"
          onPress={() => router.push("/progress-history?tab=activities")}
        />
      }
    >
      {rows.length > 0 ? (
        rows.map((row, index) => { const route = activityRoute(row.ownActivity); return <Pressable key={`${row.userId}:${row.id}`} accessibilityRole="button"
          onPressIn={() => row.ownActivity && prefetchActivityReplay(row.ownActivity, accessToken)}
          onPress={() => row.ownActivity ? onOpen(row.ownActivity) : setSelected({ account: user?.id, id: row.id })}
          style={[f.row, s.row, index < rows.length - 1 && s.rowDivider]}>
          {route ? <RouteStaticPreview coordinates={route} width={128} height={128} padding={16} strokeWidth={3} showMarkers={false} showPlayBadge={false} style={{ width: 64, height: 64, borderRadius: 12 }} /> : <SportActivityIcon sport={row.sport} />}
          <View style={[f.grow, { gap: 4 }]}><AppText role="row" >{row.ownActivity ? sportById(row.sport).name : `${row.name} · ${sportById(row.sport).name}`} · {clubDuration(row.movingSec)}</AppText>
            <AppText role="support" secondary >{new Date(row.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })}</AppText></View>
          <AppText role="caption" secondary >View →</AppText>
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

const sThemes = createThemedStyles((c) => ({
  row: { minHeight: 76, paddingVertical: 12 },
  rowDivider: {
    borderBottomWidth: SHELL_SECTION.dividerWidth,
    borderBottomColor: c.divider,
  },
}));

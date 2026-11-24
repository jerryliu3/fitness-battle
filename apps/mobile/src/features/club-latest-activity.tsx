import { useFocusStyles } from "../ui/focus";
import { ActivityLeadingGraphic } from "../ui/activity-leading-graphic";
import { Section, AppText, TextAction } from "../ui/section";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { accountTimeZone, SHELL_SECTION, clubDuration, formatAccountDateTime, formatVolume, homeRecentActivities, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
import { createThemedStyles, useThemedStyles } from "../theme";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useAuth } from "../lib/auth";
import { prefetchActivityReplay } from "../lib/prefetch-activity-replay";
import { useCrewActivities } from "./use-crew-activities";
import { FocusSheet } from "../ui/focus";

export function LatestActivity({ state, onOpen }: { state: CompeteState; onOpen: (activity: Activity) => void }) {
  const displayTz = accountTimeZone(state);
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
        rows.map((row, index) => (
          <Pressable key={`${row.userId}:${row.id}`} accessibilityRole="button"
          onPressIn={() => row.ownActivity && prefetchActivityReplay(row.ownActivity, accessToken)}
          onPress={() => {
            if (row.ownActivity) {
              onOpen(row.ownActivity);
              return;
            }
            const peerActivity: Activity = {
              id: row.id,
              sport: row.sport,
              startedAt: row.startedAt,
              distanceM: row.distanceM,
              movingSec: row.movingSec,
              avgHr: row.avgHr ?? null,
              source: row.source ?? "strava",
              verified: true,
              provenance: "recorded",
            };
            onOpen(peerActivity);
          }}
          style={[f.row, s.row, index < rows.length - 1 && s.rowDivider]}>
          <ActivityLeadingGraphic
            activity={row.ownActivity ?? row}
            routeActivity={row.ownActivity}
            history={state.activities}
            size={64}
          />
          <View style={[f.grow, { gap: 4 }]}><AppText role="row" >{row.ownActivity ? sportById(row.sport).name : `${row.name} · ${sportById(row.sport).name}`} · {clubDuration(row.movingSec)}</AppText>
            <AppText role="support" secondary >{new Date(row.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: displayTz })}</AppText></View>
          <AppText role="caption" secondary >View →</AppText>
        </Pressable>))
      ) : (
        <View style={{ paddingVertical: 12 }}>
          <AppText role="body" secondary>No recent activity yet.</AppText>
        </View>
      )}
    </Section>
    {crew.error && <AppText role="caption" secondary  accessibilityLiveRegion="polite">{crew.error}</AppText>}
    <FocusSheet open={Boolean(detail)} title={detail ? `${detail.name}'s activity` : "Activity"} onClose={() => setSelected(null)}>
      {detail && <><AppText role="heading">{sportById(detail.sport).name}</AppText><AppText role="support" secondary >{clubDuration(detail.movingSec)} · {formatVolume(detail.sport, detail.distanceM, detail.movingSec, state.units)}</AppText>
        <AppText role="caption" secondary >{formatAccountDateTime(state, detail.startedAt)}</AppText></>}
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

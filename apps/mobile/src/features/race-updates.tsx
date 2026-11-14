import { useLayoutEffect, useMemo, useRef } from "react";
import Animated, { FadeInUp, LinearTransition } from "react-native-reanimated";
import { useCompetitionTimeline } from "./competition-timeline-context";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { RankAvatar } from "../ui/rank-symbol";
import { useReducedMotion } from "../ui/use-reduced-motion";
import { Pressable, View } from "react-native";
import { competitionActivityLog, competitionReplayTimeMs, formatCompetitionFeedTimestamp, type CompeteState, type SportId } from "@fitness-battle/shared";
import { AppText } from "../ui/section";
import { useThemeColors } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { useEventActivity } from "./use-event-activity";

export function RaceUpdates({ state, sport, active }: { state: CompeteState; sport: SportId; active: boolean }) {
  const c = useThemeColors();
  const timeline = useCompetitionTimeline();
  const { blocks } = useAthleteBlocks();
  const fallback = useEventActivity(state, sport, active && !timeline);
  const completed = Math.floor(timeline?.cursor ?? 0);
  const rows = useMemo(() => timeline?.index ? competitionActivityLog(timeline.index, blocks.map(block => block.id), completed) : timeline ? [] : fallback.rows, [timeline?.index, completed, blocks, fallback.rows]);
  const loading = timeline ? !timeline.ready : fallback.loading;
  const error = timeline?.error ?? fallback.error;
  const retry = timeline?.retry ?? fallback.retry;
  const cursor = timeline?.cursor ?? rows.length;
  const feedReferenceMs = timeline?.index
    ? cursor >= timeline.count
      ? Date.parse(timeline.index.replay.through)
      : competitionReplayTimeMs(timeline.index, cursor)
    : Date.now();
  const reduced = useReducedMotion();
  const previous = useRef<{ cursor: number; ready: boolean; ids: Set<string> } | null>(null);
  const forward = previous.current?.ready === true && cursor > previous.current.cursor;
  useLayoutEffect(() => { previous.current = { cursor, ready: timeline ? timeline.ready : !fallback.loading, ids: new Set(rows.map(row => row.id)) }; }, [rows, cursor, timeline?.ready, fallback.loading]);
  if (!active) return null;
  return <View style={{ gap: 14 }}>
    {error ? <View style={{ gap: 8 }}><AppText role="caption" accessibilityLiveRegion="polite">{error}</AppText><Pressable accessibilityRole="button" onPress={() => retry()} style={{ minHeight: 44, justifyContent: "center" }}><AppText role="label">Retry</AppText></Pressable></View> : loading ? <AppText role="caption" secondary>Loading race updates…</AppText> : <>
      {!rows.length && <AppText secondary>No activity at this point in the race.</AppText>}
      <View style={{ borderRadius: 20, backgroundColor: c.card, overflow: "hidden" }}>{rows.map((row, i) => <Animated.View key={row.id} entering={!reduced && forward && !previous.current?.ids.has(row.id) ? FadeInUp.duration(240) : undefined} layout={reduced ? undefined : LinearTransition.duration(240)} style={{ padding: 16, flexDirection: "row", gap: 12, alignItems: "flex-start", borderTopWidth: i ? 1 : 0, borderColor: c.line }}>
        {!row.movement ? <RankAvatar rank="beginner" src={row.avatarUrl} name={row.actorName} size={56} /> : <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: c.actionSoft }}><AppIcon name="progress" size={24} /></View>}
        <View style={{ flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 4, minWidth: 0 }}><AppText role="label">{row.title}</AppText><AppText role="caption" secondary>{row.detail}</AppText></View>
          <AppText role="caption" secondary style={{ flexShrink: 0, paddingTop: 2 }}>{formatCompetitionFeedTimestamp(row.at, feedReferenceMs)}</AppText>
        </View>
      </Animated.View>)}</View>
    </>}
  </View>;
}

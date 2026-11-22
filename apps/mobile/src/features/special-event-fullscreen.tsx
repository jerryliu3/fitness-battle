import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  competeNow,
  competitionCourseWindow,
  formatSpecialEventVolume,
  specialEventCourseUnit,
  specialEventFormatLabel,
  specialEventPhase,
  specialEventSceneLanes,
  specialEventSideCode,
  specialEventSideLabel,
  specialEventStatusBadge,
  specialEventStatusHero,
  type CompeteState,
  type SpecialEventEdition,
  type SpecialEventStandings,
} from "@fitness-battle/shared";
import { useCachedApi } from "../lib/use-cached-api";
import { useCompeteStore } from "../lib/compete-store";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { CoursePreview } from "./event-home";
import { CompeteIcon } from "./compete-home-sections";
import { GeographicCourse } from "./geographic-course";
import { SpecialEventRegistrationSheet } from "./special-event-sheet";
import { useCompetitionCourse } from "./use-competition-course";

export function SpecialEventFullscreen({
  state,
  edition,
  busy,
  error,
  onCancel,
  onClose,
}: {
  state: CompeteState;
  edition: SpecialEventEdition;
  busy: boolean;
  error?: string;
  onCancel(): void;
  onClose(): void;
}) {
  const c = useThemeColors();
  const { debugActive } = useCompeteStore();
  const now = competeNow(state);
  const phase = specialEventPhase(edition, now);
  const status = specialEventStatusBadge(edition, now);
  const courseUnit = specialEventCourseUnit(edition.sport, state.units);
  const supports3D = courseUnit === "mi" || courseUnit === "km";

  const [viewDim, setViewDim] = useState<"3d" | "2d">(supports3D ? "3d" : "2d");
  const [selectedId, setSelectedId] = useState("");
  const [focusRequest, setFocusRequest] = useState(0);

  useEffect(() => {
    setSelectedId("");
    setViewDim(supports3D ? "3d" : "2d");
  }, [edition.id, supports3D]);

  const canViewStandings = Boolean(phase === "active" || phase === "settled" || edition.finalizedAt);
  const standingsApi = useCachedApi<{ standings: SpecialEventStandings }>(
    canViewStandings ? `/api/special-events/${encodeURIComponent(edition.id)}` : null,
  );
  const standings = standingsApi.data?.standings ?? null;

  const period = competitionCourseWindow(state, now, edition.sport);
  const { course, error: courseError, retry } = useCompetitionCourse(
    edition.sport, period.startsAt.toISOString(), period.endsAt.toISOString(), debugActive, supports3D && viewDim === "3d",
  );

  const lanes = specialEventSceneLanes(standings, state.units);
  const resolvedSelected = selectedId || lanes.find((l) => l.you)?.id || lanes[0]?.id || "";
  const hero = standings ? specialEventStatusHero(standings, edition, state.units) : null;
  const activeRound = standings?.rounds.find((r) => r.roundNumber === standings.currentRound) ?? standings?.rounds[standings.rounds.length - 1];
  const activeHeat = activeRound?.heats.find((h) => h.isMine) ?? activeRound?.heats[0];

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={["top", "bottom"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Compete"
            onPress={() => { if (!busy) onClose(); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingRight: 8 }}
          >
            <View style={{ transform: [{ rotate: "180deg" }] }}>
              <AppIcon name="chevron" size={20} />
            </View>
            <AppText role="label">Back</AppText>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText role="label" numberOfLines={1}>{edition.title}</AppText>
            <AppText role="caption" secondary numberOfLines={1}>
              {specialEventFormatLabel(edition.config)} · {status}
            </AppText>
          </View>
          {activeHeat ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setViewDim((d) => (d === "3d" ? "2d" : "3d"))}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}
            >
              <AppText role="caption">{viewDim === "3d" ? "2D View" : "3D Map"}</AppText>
            </Pressable>
          ) : (
            <CompeteIcon name={edition.sport} size={22} gold />
          )}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          {viewDim === "3d" && supports3D && lanes.length > 0 ? (
            <View style={{ height: 320, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: c.line, backgroundColor: "#141923" }}>
              <GeographicCourse
                cardSessionKey={edition.id}
                course={course}
                lanes={lanes}
                unit={courseUnit}
                selectedId={resolvedSelected}
                focusRequest={focusRequest}
                onSelect={(id) => { setSelectedId(id); setFocusRequest((n) => n + 1); }}
                error={courseError}
                onRetry={retry}
              />
            </View>
          ) : viewDim === "2d" && activeHeat ? (
            <View style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 10 }}>
              <AppText role="label">Live course progress · Round {activeRound?.roundNumber}</AppText>
              {(() => {
                const maxScore = Math.max(1, ...activeHeat.sides.map((s) => s.score));
                const showCut = edition.config.match.kind === "survivor_heat" && activeHeat.sides.length > activeHeat.advanceCount;
                return activeHeat.sides.map((side, idx) => (
                  <View key={side.sideId} style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <AppText role="caption">
                        {edition.config.grouping.kind !== "solo" ? `${specialEventSideCode(side)} · ` : ""}
                        {specialEventSideLabel(side)}{side.isYou ? " · You" : ""}
                      </AppText>
                      <AppText role="caption">{formatSpecialEventVolume(edition.sport, side.score, state.units)}</AppText>
                    </View>
                    <View style={{ height: 8, borderRadius: 99, backgroundColor: c.paper, overflow: "hidden" }}>
                      <View style={{ width: `${Math.max(4, Math.round((side.score / maxScore) * 100))}%`, height: "100%", backgroundColor: side.isYou ? c.podiumGold : c.ink }} />
                    </View>
                    {showCut && idx + 1 === activeHeat.advanceCount ? (
                      <View style={{ borderBottomWidth: 2, borderStyle: "dashed", borderColor: c.statusError, paddingTop: 4, alignItems: "center" }}>
                        <AppText role="caption" secondary>Elimination cut · Top {activeHeat.advanceCount}</AppText>
                      </View>
                    ) : null}
                  </View>
                ));
              })()}
            </View>
          ) : (
            <CoursePreview state={state} sport={edition.sport} queued={phase !== "active"} />
          )}

          {hero ? (
            <View style={{ padding: 14, borderRadius: 18, backgroundColor: c.surfaceInverse, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <View style={{
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: hero.tone === "lime" ? c.tennis : hero.tone === "danger" ? c.statusError : c.podiumGold,
                }}>
                  <AppText role="caption" style={{ color: hero.tone === "danger" ? c.textOnError : c.ink }}>{hero.badge}</AppText>
                </View>
                <AppText role="caption" style={{ color: c.textOnInverse }}>{status}</AppText>
              </View>
              <AppText role="heading" style={{ color: c.textOnInverse }}>{hero.headline}</AppText>
              <AppText role="caption" style={{ color: c.textOnInverse }}>{hero.detail}</AppText>
            </View>
          ) : null}

          <SpecialEventRegistrationSheet
            state={state}
            edition={edition}
            busy={busy}
            error={error}
            fullscreen
            standingsOverride={canViewStandings ? standings : undefined}
            standingsErrorOverride={canViewStandings ? standingsApi.error : undefined}
            onRegister={() => {}}
            onCancel={onCancel}
            onClose={onClose}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

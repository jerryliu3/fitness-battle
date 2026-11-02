import { useState } from "react";
import {
  competeNow,
  effortScoreLine,
  seasonPassModel,
  type CompeteState,
  type OpenLineRange,
  type ScoreTrack,
} from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useScoreTrackLens } from "../lib/score-track-lens";
import { SHELL_COLORS as c } from "../theme";
import { ChartFrame } from "../ui/chart-frame";
import { FocusSegments, f } from "../ui/focus";
import { OpenLineChart } from "../ui/open-line-chart";
import { AppText, SectionHeader, TextAction } from "../ui/section";
import { CompetitionReplayButton } from "./competition-replay";

export function EffortTrend({ state }: { state: CompeteState }) {
  const [defaultTrack] = useScoreTrackLens();
  const { user } = useAuth();
  const router = useRouter();
  const scope = `${user?.id}:${state.primary}`;
  const [lens, setLens] = useState<{ scope: string; track: ScoreTrack } | null>(
    null,
  );
  const [range, setRange] = useState<OpenLineRange>("fourWeeks");
  const track = lens?.scope === scope ? lens.track : defaultTrack;
  const now = competeNow(state);
  const chart = effortScoreLine(state, track, range);
  const pass = seasonPassModel(state, track, now);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const activeWeek =
    pass.weekNodes.find((w) => w.id === selectedWeekId) ??
    pass.weekNodes[0] ??
    null;

  return (
    <View style={{ gap: 18 }}>
      {/* HERO SEASON LADDER CARD */}
      <View
        style={{
          borderRadius: 22,
          backgroundColor: c.ink,
          borderWidth: 1,
          borderColor: "#243c4e",
          padding: 18,
          gap: 14,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <View style={{ gap: 2, flex: 1 }}>
            <AppText
              role="caption"
              style={{ color: c.tennis, fontWeight: "700" }}
            >
              SEASON LADDER · {pass.sportName.toUpperCase()}
            </AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <AppText role="display" style={{ color: c.card }}>
                {pass.score.toLocaleString()}
              </AppText>
              <AppText role="label" style={{ color: "#c9d6e3" }}>
                {pass.band.name}
              </AppText>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <AppText role="caption" style={{ color: "#c9d6e3" }}>
              {pass.nextBand
                ? `Next Tier: ${pass.nextBand.name}`
                : "Top Rank Band"}
            </AppText>
            <AppText
              role="caption"
              style={{ color: c.tennis, fontWeight: "700" }}
            >
              {pass.nextBand
                ? `${pass.intoNext} pts to ${pass.nextBand.min.toLocaleString()}`
                : "Champion (2,000+)"}
            </AppText>
          </View>
        </View>

        {/* 5-Checkpoint Visual Rank Ladder Track */}
        <View style={{ gap: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {pass.checkpoints.map((cp) => (
              <AppText
                key={cp.min}
                role="caption"
                style={{
                  color: cp.current
                    ? c.tennis
                    : cp.reached
                      ? c.card
                      : "#8fa2b5",
                  fontWeight: cp.current ? "800" : "500",
                }}
              >
                {cp.min.toLocaleString()}
                {cp.current ? " ★" : ""}
              </AppText>
            ))}
          </View>
          <View
            style={{
              height: 10,
              borderRadius: 999,
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: `${Math.round(pass.ladderProgress * 100)}%`,
                height: 10,
                borderRadius: 999,
                backgroundColor: c.tennis,
              }}
            />
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: c.tennis,
                borderWidth: 2,
                borderColor: c.ink,
                marginLeft: -7,
              }}
            />
          </View>
          <AppText role="caption" style={{ color: "#c9d6e3" }}>
            {pass.band.blurb}
          </AppText>
        </View>
      </View>

      {/* EFFORT SCORE CURVE */}
      <ChartFrame>
        <View style={f.section}>
          <FocusSegments
            label="Effort chart score track"
            value={track}
            options={[
              { value: "open", label: "Open" },
              { value: "verified", label: "GPS Tracked" },
            ]}
            onChange={(nextTrack) => setLens({ scope, track: nextTrack })}
          />
          <OpenLineChart
            showAxes={false}
            live
            key={`${scope}:${track}`}
            chart={chart}
            label={`${track === "open" ? "Open" : "GPS Tracked"} effort score history`}
            unit="Effort score"
            range={range}
            onRangeChange={setRange}
          />
        </View>
      </ChartFrame>

      {/* UNIFIED PAST WEEKS & AWARDS SCRUBBER */}
      <View
        style={[
          f.card,
          {
            backgroundColor: c.card,
            borderColor: c.line,
            gap: 14,
          },
        ]}
      >
        <SectionHeader
          title="Past weeks & awards"
          subtitle={
            pass.settledWeeksCount > 0
              ? `${pass.settledWeeksCount} settled ${pass.settledWeeksCount === 1 ? "week" : "weeks"} · ${pass.podiumsCount} ${pass.podiumsCount === 1 ? "podium" : "podiums"} · Tap a week node`
              : "Settled rounds and weekly score changes land here"
          }
          action={
            <TextAction
              label="View all"
              accessibilityLabel="View all past weeks and awards"
              onPress={() => router.push("/progress-history")}
            />
          }
        />

        {pass.weekNodes.length > 0 && activeWeek ? (
          <>
            {/* Interactive Week Node Pills */}
            <View style={{ flexDirection: "row", gap: 6 }}>
              {pass.weekNodes.map((wk) => {
                const isSelected = wk.id === activeWeek.id;
                return (
                  <Pressable
                    key={wk.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${wk.rangeLabel}, place ${wk.place} of ${wk.fieldSize}, ${wk.deltaLabel} Effort Score`}
                    onPress={() => setSelectedWeekId(wk.id)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      paddingVertical: 8,
                      paddingHorizontal: 4,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isSelected ? c.ink : c.line,
                      backgroundColor: isSelected ? c.ink : c.paper,
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <AppText
                      role="caption"
                      style={{
                        color: isSelected ? c.tennis : c.fieldTeal,
                        fontWeight: "800",
                      }}
                    >
                      #{wk.place}
                    </AppText>
                    <AppText
                      role="caption"
                      style={{
                        color: isSelected ? c.card : c.ink,
                        fontWeight: "700",
                      }}
                    >
                      {wk.deltaLabel}
                    </AppText>
                    <AppText
                      role="caption"
                      style={{
                        color: isSelected ? "#c9d6e3" : c.muted,
                      }}
                    >
                      {wk.shortLabel}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Selected Week Dimensional Award & Replay Receipt */}
            <View
              style={{
                padding: 14,
                borderRadius: 16,
                backgroundColor: c.soft,
                borderWidth: 1,
                borderColor: c.tennis,
                gap: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor: c.ink,
                    }}
                  >
                    <AppText role="label" style={{ color: c.tennis }}>
                      #{activeWeek.place} of {activeWeek.fieldSize}
                    </AppText>
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText role="label">{activeWeek.headline}</AppText>
                    <AppText role="caption" secondary>
                      {activeWeek.rangeLabel} · {activeWeek.sportName} (
                      {activeWeek.trackLabel})
                    </AppText>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText role="heading" style={{ color: c.fieldTeal }}>
                    {activeWeek.deltaLabel} pts
                  </AppText>
                  <AppText role="caption" secondary>
                    {activeWeek.eloBefore} → {activeWeek.eloAfter}
                  </AppText>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-around",
                  paddingTop: 10,
                  borderTopWidth: 1,
                  borderTopColor: c.line,
                }}
              >
                <View style={{ alignItems: "center", gap: 2 }}>
                  <AppText role="caption" secondary>
                    Volume
                  </AppText>
                  <AppText role="label">{activeWeek.volumeLabel}</AppText>
                </View>
                <View style={{ alignItems: "center", gap: 2 }}>
                  <AppText role="caption" secondary>
                    Week Effort
                  </AppText>
                  <AppText role="label">{activeWeek.effortLabel} pts</AppText>
                </View>
                <View style={{ alignItems: "center", gap: 2 }}>
                  <AppText role="caption" secondary>
                    Standing
                  </AppText>
                  <AppText role="label">
                    {activeWeek.frozen
                      ? "Frozen"
                      : activeWeek.place === 1
                        ? "1st Place"
                        : activeWeek.place <= 3
                          ? "Podium"
                          : `Place #${activeWeek.place}`}
                  </AppText>
                </View>
              </View>

              <CompetitionReplayButton
                state={state}
                selection={activeWeek.result}
                label={`Replay round · ${activeWeek.rangeLabel}`}
              />
            </View>
          </>
        ) : (
          <AppText role="body" secondary>
            When your first competition week settles Monday 00:00 ET, your
            placement award card, score delta, and 3D round replay will appear
            here.
          </AppText>
        )}
      </View>
    </View>
  );
}


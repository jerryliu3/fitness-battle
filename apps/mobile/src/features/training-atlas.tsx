import { AppText, Section } from "../ui/section";
import { BenchmarkChart } from "../ui/benchmark-chart";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  APP_TIMEZONE,
  clampTrainingAnchor,
  competeNow,
  dayKey,
  earliestDataDate,
  formatTrainingHours,
  formatWeeklyCompetitionRange,
  shiftAppDay,
  shiftTrainingMonth,
  sportById,
  defaultTrainingSports,
  normalizeTrainingSports,
  trainingAtlas,
  trainingBuckets,
  trainingRangeNavigation,
  type CompeteState,
  type SportId,
  type TrainingRange,
} from "@fitness-battle/shared";
import { FocusDisclosure, f } from "../ui/focus";
import { ChartRangeToggle } from "./chart-range-toggle";
import { TrainingSportMenu } from "./training-sport-menu";
import { SHELL_COLORS as c } from "../theme";
const colors = [
  c.soft,
  `${c.secondary}33`,
  `${c.secondary}88`,
  `${c.secondary}bb`,
  c.ink,
];
export function TrainingAtlas({ state }: { state: CompeteState }) {
  const now = competeNow(state);
  const [gridWidth, setGridWidth] = useState(280);
  const [sports, setSports] = useState<SportId[]>(() => defaultTrainingSports()),
    [range, setRange] = useState<TrainingRange>("week"),
    [anchor, setAnchor] = useState(() => now),
    [selectedDay, setSelectedDay] = useState<string | null>(null);
  const buckets = trainingBuckets(state.activities, sports, range, anchor, now),
    cells = trainingAtlas(state.activities, sports, anchor, now);
  const day =
    cells.find((d) => d.day === selectedDay) ??
    cells.find((d) => d.day === dayKey(now)) ??
    cells.find((d) => d.inMonth && !d.future);
  const earliest = useMemo(() => earliestDataDate(state, now), [state, now]);
  const { prevAllowed, nextAllowed } = trainingRangeNavigation(
    anchor,
    earliest,
    now,
    range,
  );
  const move = (n: number) => {
    if (n < 0 && !prevAllowed) return;
    if (n > 0 && !nextAllowed) return;
    const target =
      range === "week"
        ? shiftAppDay(anchor, n * 7)
        : shiftTrainingMonth(anchor, n * (range === "year" ? 12 : 1));
    setAnchor(clampTrainingAnchor(target, earliest, now, range));
    setSelectedDay(null);
  };
  return (
    <Section titleRole="display" title="Your training">
      <View style={[f.row, { justifyContent: "space-between", alignItems: "center" }]}>
        <TrainingSportMenu
          value={sports}
          onChange={(next) => {
            setSports(normalizeTrainingSports(next));
          }}
        />

      </View>
      <View style={s.row}>
        <Pressable
          style={s.arrow}
          accessibilityRole="button"
          accessibilityLabel={`Previous ${range}`}
          accessibilityState={{ disabled: !prevAllowed }}
          disabled={!prevAllowed}
          onPress={() => move(-1)}
        >
          <AppText role="label" style={{ opacity: prevAllowed ? 1 : 0.3 }}>
            ←
          </AppText>
        </Pressable>
        <AppText role="label" >
          {range === "week"
            ? formatWeeklyCompetitionRange(anchor)
            : anchor.toLocaleDateString("en-US", {
                timeZone: APP_TIMEZONE,
                ...(range === "year"
                  ? { year: "numeric" }
                  : { month: "long", year: "numeric" }),
              })}
        </AppText>
        <Pressable
          style={s.arrow}
          accessibilityRole="button"
          accessibilityLabel={`Next ${range}`}
          accessibilityState={{ disabled: !nextAllowed }}
          disabled={!nextAllowed}
          onPress={() => move(1)}
        >
          <AppText role="label" style={{ opacity: nextAllowed ? 1 : 0.3 }}>
            →
          </AppText>
        </Pressable>
      </View>
      <BenchmarkChart key={`${range}:${anchor.toISOString()}:${sports.join(",")}`} buckets={buckets} now={now} dateLabel={range === "week" ? formatWeeklyCompetitionRange(anchor) : anchor.toLocaleDateString("en-US", { timeZone: APP_TIMEZONE, ...(range === "year" ? { year: "numeric" } : { month: "long", year: "numeric" }) })} />
        <ChartRangeToggle
          value={range}
          onChange={(next) => {
            setRange(next);
            setAnchor((current) =>
              clampTrainingAnchor(current, earliest, now, next),
            );
          }}
        />
      <FocusDisclosure title="Daily activity">
        <Text style={f.kicker}>
          {anchor.toLocaleDateString("en-US", {
            month: "long",
            timeZone: APP_TIMEZONE,
          })}{" "}
          · daily activity
        </Text>
        <View
          onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
          style={{ width: "100%", gap: 4 }}
        >
          <View style={{ flexDirection: "row", gap: 4 }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <AppText role="caption" secondary
                key={i}
                style={{ width: (gridWidth - 24) / 7, textAlign: "center" }}
              >
                {d}
              </AppText>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {cells.map((d) => (
              <Pressable
                key={d.day}
                disabled={!d.inMonth || d.future}
                accessibilityRole="button"
                accessibilityState={{ selected: day?.day === d.day }}
                accessibilityLabel={`${d.day}, ${formatTrainingHours(d.movingSec)} hours, ${d.sessions} ${d.sessions === 1 ? "session" : "sessions"}`}
                onPress={() => setSelectedDay(d.day)}
                style={[
                  s.cell,
                  {
                    width: (gridWidth - 24) / 7,
                    opacity: !d.inMonth ? 0 : d.future ? 0.3 : 1,
                    backgroundColor: colors[d.intensity],
                    borderWidth: day?.day === d.day ? 2 : 0,
                    borderColor: c.tennis,
                  },
                ]}
              >
                <AppText role="caption" secondary
                  style={{ color: d.intensity === 4 ? c.card : c.ink }}
                >
                  {d.inMonth ? d.label : ""}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
        <View
          style={{ gap: 8, paddingTop: 10 }}
          accessibilityLiveRegion="polite"
        >
          {day ? (
            <>
              <Text style={f.kicker}>
                {day.day} · {formatTrainingHours(day.movingSec)} hr
              </Text>
              {day.activityIds.length ? (
                day.activityIds.map((id) => {
                  const a = state.activities.find((a) => a.id === id)!;
                  return (
                    <View key={id} style={s.row}>
                      <AppText role="row" >{sportById(a.sport).name}</AppText>
                      <AppText role="caption" secondary >
                        {formatTrainingHours(a.movingSec)} hr · {a.source}
                      </AppText>
                    </View>
                  );
                })
              ) : (
                <AppText role="caption" secondary >Nothing recorded.</AppText>
              )}
            </>
          ) : null}
        </View>
      <View style={s.row}>
        <AppText role="caption" secondary >Moving time</AppText>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {colors.map((color) => (
            <View
              key={color}
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      </View>
      </FocusDisclosure>
    </Section>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  arrow: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
});

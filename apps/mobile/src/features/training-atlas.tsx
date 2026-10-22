import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  APP_TIMEZONE,
  trainingComparison,
  clubDuration,
  formatWeeklyCompetitionRange,
  weeklyPeriodBounds,
  SPORTS,
  competeNow,
  dayKey,
  formatTrainingHours,
  shiftAppDay,
  shiftTrainingMonth,
  sportById,
  trainingAtlas,
  trainingBuckets,
  type CompeteState,
  type SportId,
  type TrainingRange,
} from "@fitness-battle/shared";
import { FocusDisclosure, FocusSegments, f } from "../ui/focus";
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
  const [sport, setSport] = useState<SportId | "all">("all"),
    [range, setRange] = useState<TrainingRange>("week"),
    [anchor, setAnchor] = useState(() => now),
    [selected, setSelected] = useState<string | null>(null),
    [selectedDay, setSelectedDay] = useState<string | null>(null);
  const buckets = trainingBuckets(state.activities, sport, range, anchor, now),
    cells = trainingAtlas(state.activities, sport, anchor, now);
  const bucket =
    buckets.find((b) => b.start === selected) ??
    buckets.find((b) => b.partial) ??
    buckets.filter((b) => Date.parse(b.start) <= now.getTime()).at(-1) ??
    buckets[0]!;
  const comparison = trainingComparison(
    state.activities,
    sport,
    range,
    anchor,
    now,
  );
  const max = Math.max(1, ...buckets.map((b) => b.movingSec));
  const day =
    cells.find((d) => d.day === selectedDay) ??
    cells.find((d) => d.day === dayKey(now)) ??
    cells.find((d) => d.inMonth && !d.future);
  const move = (n: number) => {
    setAnchor(
      range === "week"
        ? shiftAppDay(anchor, n * 7)
        : shiftTrainingMonth(anchor, n * (range === "year" ? 12 : 1)),
    );
    setSelected(null);
    setSelectedDay(null);
  };
  const next =
    range === "week"
      ? shiftAppDay(anchor, 7)
      : shiftTrainingMonth(anchor, range === "year" ? 12 : 1);
  const nextAllowed =
    range === "year"
      ? dayKey(next).slice(0, 4) <= dayKey(now).slice(0, 4)
      : range === "month"
        ? dayKey(next).slice(0, 7) <= dayKey(now).slice(0, 7)
        : weeklyPeriodBounds(next).startsAt <= now;
  return (
    <View style={f.card}>
      <Text style={f.h2}>Your training</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={f.row}>
          {[{ id: "all", name: "All sports" }, ...SPORTS].map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityState={{ selected: sport === s.id }}
              onPress={() => {
                setSport(s.id as SportId | "all");
                setSelected(null);
              }}
              style={[f.chip, sport === s.id && f.chipActive]}
            >
              <Text style={f.small}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <FocusSegments
        label="Training chart range"
        value={range}
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
          { value: "year", label: "Year" },
        ]}
        onChange={(r) => {
          setRange(r);
          setSelected(null);
        }}
      />
      <View style={s.row}>
        <Pressable
          style={s.arrow}
          accessibilityRole="button"
          accessibilityLabel={`Previous ${range}`}
          onPress={() => move(-1)}
        >
          <Text style={f.rowTitle}>←</Text>
        </Pressable>
        <Text style={f.rowTitle}>
          {range === "week"
            ? formatWeeklyCompetitionRange(anchor)
            : anchor.toLocaleDateString("en-US", {
                timeZone: APP_TIMEZONE,
                ...(range === "year"
                  ? { year: "numeric" }
                  : { month: "long", year: "numeric" }),
              })}
        </Text>
        <Pressable
          style={s.arrow}
          accessibilityRole="button"
          accessibilityLabel={`Next ${range}`}
          disabled={!nextAllowed}
          onPress={() => move(1)}
        >
          <Text style={[f.rowTitle, { opacity: nextAllowed ? 1 : 0.3 }]}>
            →
          </Text>
        </Pressable>
      </View>
      <View style={{ gap: 4 }}>
        <Text style={f.kicker}>Active time</Text>
        <Text
          style={[f.massive, { fontSize: 38, fontFamily: "DMSans_700Bold" }]}
        >
          {clubDuration(buckets.reduce((sum, b) => sum + b.movingSec, 0))}
        </Text>
        <Text style={f.small}>
          {buckets.reduce((sum, b) => sum + b.sessions, 0)} sessions ·{" "}
          {sport === "all" ? "All sports" : sportById(sport).name}
        </Text>
      </View>
      <Text style={[f.small, { color: c.secondary }]}>{comparison.label}</Text>
      <ScrollView
        horizontal
        contentContainerStyle={{ flexGrow: 1 }}
        showsHorizontalScrollIndicator={range === "year"}
      >
        <View
          style={{
            flex: 1,
            minWidth: range === "year" ? 528 : undefined,
            height: 154,
            flexDirection: "row",
            gap: 4,
          }}
        >
          {buckets.map((b) => (
            <Pressable
              key={b.start}
              style={s.barButton}
              disabled={Date.parse(b.start) > now.getTime()}
              accessibilityRole="button"
              accessibilityState={{ selected: bucket.start === b.start }}
              accessibilityLabel={`${b.label}, ${formatTrainingHours(b.movingSec)} hours, ${b.sessions} sessions${b.partial ? ", partial period" : ""}`}
              onPress={() => setSelected(b.start)}
            >
              <View
                style={{
                  height: 118,
                  justifyContent: "flex-end",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {[0, 39, 78, 117].map((y) => (
                  <View
                    key={y}
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: y,
                      left: 0,
                      right: 0,
                      height: 1,
                      backgroundColor: c.line,
                      opacity: 0.55,
                    }}
                  />
                ))}
                <View
                  style={{
                    width: "42%",
                    height: b.movingSec
                      ? Math.max(2, (b.movingSec / max) * 118)
                      : 0,
                    backgroundColor:
                      bucket.start === b.start ? c.tennis : c.secondary,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    opacity: b.partial ? 0.65 : 1,
                  }}
                />
              </View>
              <Text style={[f.small, { fontSize: 10 }]}>{b.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={s.row} accessibilityLiveRegion="polite">
        <Text style={f.h2}>{formatTrainingHours(bucket.movingSec)} hr</Text>
        <Text style={f.small}>
          {bucket.sessions} sessions{bucket.partial ? " · so far" : ""}
        </Text>
      </View>
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
              <Text
                key={i}
                style={[
                  f.small,
                  { width: (gridWidth - 24) / 7, textAlign: "center" },
                ]}
              >
                {d}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {cells.map((d) => (
              <Pressable
                key={d.day}
                disabled={!d.inMonth || d.future}
                accessibilityRole="button"
                accessibilityState={{ selected: day?.day === d.day }}
                accessibilityLabel={`${d.day}, ${formatTrainingHours(d.movingSec)} hours, ${d.sessions} sessions`}
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
                <Text
                  style={[
                    f.small,
                    { color: d.intensity === 4 ? c.card : c.ink },
                  ]}
                >
                  {d.inMonth ? d.label : ""}
                </Text>
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
                      <Text style={f.copy}>{sportById(a.sport).name}</Text>
                      <Text style={f.small}>
                        {formatTrainingHours(a.movingSec)} hr · {a.source}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={f.small}>Nothing recorded.</Text>
              )}
            </>
          ) : null}
        </View>
      </FocusDisclosure>
      <View style={s.row}>
        <Text style={f.small}>Moving time · Open activity</Text>
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
    </View>
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
  barButton: {
    flex: 1,
    minWidth: 32,
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
});

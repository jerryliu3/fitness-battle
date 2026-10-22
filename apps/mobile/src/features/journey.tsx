import {
  APP_TIMEZONE,
  dayKey,
  formatVolume,
  groupActivitiesByDay,
  planJourneyTrail,
  routeThroughCenters,
  sportById,
  type Activity,
  type JourneyLane,
  type UnitSystem,
} from "@fitness-battle/shared";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SHELL_COLORS as c } from "../theme";
import { FocusButton, FocusSheet, f } from "../ui/focus";
import { Ember } from "../ui/mascot/ember";
import { useCompeteStore } from "../lib/compete-store";

function formatDayHours(seconds: number): string {
  const hours = seconds / 3600;
  if (hours <= 0) return "0 hr";
  const rounded = Math.round(hours * 10) / 10;
  if (rounded >= 10) {
    return `${Math.round(rounded)} hr`;
  }
  const display = rounded < 0.1 ? "0.1" : rounded.toFixed(1).replace(/\.0$/, "");
  return `${display} hr`;
}

const ROW = 192;
const laneX = { l: 0.24, c: 0.5, r: 0.76 };
export function Journey({
  activities,
  units,
  onToday,
}: {
  activities: Activity[];
  units: UnitSystem;
  onToday: () => void;
}) {
  const { dispatch, accountKey } = useCompeteStore();
  const [removed, setRemoved] = useState<Activity | null>(null);
  useEffect(() => {
    setRemoved(null);
    setSelectedDay(null);
  }, [accountKey]);
  const [width, setWidth] = useState(320);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const todayKey = dayKey(new Date(), APP_TIMEZONE);
  const days = groupActivitiesByDay(activities, 30);
  const todayDay = days.find((d) => d.day === todayKey);
  const pastDays = days.filter((d) => d.day !== todayKey);
  const allPastDays = groupActivitiesByDay(
    activities.filter(
      (a) => dayKey(new Date(a.startedAt), APP_TIMEZONE) !== todayKey,
    ),
    Infinity,
  );
  const plan = planJourneyTrail(allPastDays);
  const truncated =
    activities.length >
    pastDays.reduce((n, d) => n + d.items.length, 0) +
      (todayDay ? todayDay.items.length : 0);
  const stops: {
    id: string;
    lane: JourneyLane;
    kind: "today" | "day" | "past" | "start";
    day?: typeof todayDay;
  }[] = pastDays.length || todayDay
    ? [
        { id: "today", lane: plan.today, kind: "today", day: todayDay },
        ...pastDays.map((day, i) => ({
          id: day.id,
          lane: plan.days[i]!,
          kind: "day" as const,
          day,
        })),
        {
          id: truncated ? "past-more" : "start",
          lane: "c",
          kind: truncated ? "past" : "start",
        },
      ]
    : [
        { id: "today", lane: "r", kind: "today" },
        { id: "past", lane: "l", kind: "past" },
        { id: "start", lane: "c", kind: "start" },
      ];
  const visibleStops = stops;
  const paths = routeThroughCenters(
    visibleStops.map((s, i) => ({
      x: laneX[s.lane] * width,
      y: i * ROW + ROW / 2,
    })),
    width,
  );
  const selected = days.find((d) => d.id === selectedDay);
  return (
    <>
      {removed ? (
        <View style={f.feedback} accessibilityLiveRegion="polite">
          <Text style={f.copy}>Session removed.</Text>
          <FocusButton
            label="Undo"
            secondary
            onPress={() => {
              dispatch({
                type: "set-disposition",
                activityId: removed.id,
                disposition: removed.disposition,
              });
              setRemoved(null);
            }}
          />
        </View>
      ) : null}
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{ paddingTop: 56 }}
      >
        <View style={{ height: ROW * visibleStops.length }}>
          <Svg
            width={width}
            height={ROW * visibleStops.length}
            style={{ position: "absolute" }}
            pointerEvents="none"
          >
            {paths.map((d, i) => (
              <Path
                key={i}
                d={d}
                fill="none"
                stroke="#c9d5bf"
                strokeWidth={2.5}
                strokeDasharray="4 7"
              />
            ))}
          </Svg>
          {visibleStops.map((stop) => {
            const day = stop.day;
            const primary = day?.items[0];
            const dateWithWeekday = day
              ? new Date(`${day.day}T12:00:00Z`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })
              : null;
            const titleLabel = day
              ? day.items.length > 1
                ? `${day.items.length} sessions`
                : sportById(primary!.sport).name
              : stop.kind === "today"
                ? "See today's session"
                : stop.id === "past-more"
                  ? "More past sessions"
                  : stop.kind === "past"
                    ? "Past sessions will appear here"
                    : "Your journey begins here";
            const dayHours = day
              ? formatDayHours(
                  day.items.reduce((acc, a) => acc + (a.movingSec || 0), 0),
                )
              : null;
            return (
              <View key={stop.id} style={{ height: ROW }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    day
                      ? `${dateWithWeekday}, ${titleLabel}, ${dayHours}`
                      : titleLabel
                  }
                  disabled={stop.kind === "past" || stop.kind === "start"}
                  onPress={() =>
                    stop.kind === "today" && !stop.day
                      ? onToday()
                      : setSelectedDay(stop.day ? stop.day.id : stop.id)
                  }
                  style={{
                    position: "absolute",
                    left: laneX[stop.lane] * width - 40,
                    top: ROW / 2 - 40,
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor:
                      stop.kind === "past"
                        ? "#e4e8e1"
                        : stop.kind === "today"
                          ? c.tennis
                          : c.card,
                    borderWidth: 1,
                    borderBottomWidth: 5,
                    borderColor: c.line,
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  {stop.kind === "today" ? (
                    <View
                      pointerEvents="none"
                      style={{ position: "absolute", bottom: 18 }}
                    >
                      <Ember size={118} expression="happy" />
                    </View>
                  ) : null}
                  {day ? (
                    <>
                      <Text style={f.rowTitle}>✓</Text>
                      <Text style={f.small}>{dayHours}</Text>
                    </>
                  ) : stop.kind === "today" ? null : (
                    <Text style={f.rowTitle}>
                      {stop.kind === "start" ? "START" : "⋯"}
                    </Text>
                  )}
                </Pressable>
                <View
                  style={{
                    position: "absolute",
                    top: ROW / 2 + (stop.lane === "c" ? 45 : -20),
                    left:
                      stop.lane === "l"
                        ? width * 0.24 + 50
                        : stop.lane === "r"
                          ? 0
                          : width * 0.25,
                    width: stop.lane === "c" ? width * 0.5 : width * 0.45,
                    alignItems:
                      stop.lane === "r"
                        ? "flex-end"
                        : stop.lane === "c"
                          ? "center"
                          : "flex-start",
                  }}
                >
                  {dateWithWeekday ? (
                    <Text style={f.small}>{dateWithWeekday}</Text>
                  ) : null}
                  <Text
                    style={[
                      f.kicker,
                      { textAlign: stop.lane === "r" ? "right" : "left" },
                    ]}
                  >
                    {titleLabel}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <FocusSheet
        open={!!selected}
        title={selected?.day ?? "Sessions"}
        onClose={() => setSelectedDay(null)}
      >
        {selected?.items.map((a) => (
          <View key={a.id} style={f.card}>
            <Text style={f.h2}>{sportById(a.sport).name}</Text>
            <Text style={f.rowTitle}>
              {formatVolume(a.sport, a.distanceM, a.movingSec, units)}
            </Text>
            <Text style={f.copy}>
              {a.verified ? "Verified" : "Open"} · counted · {a.source}
            </Text>
            <View style={{ marginTop: 8 }}>
              <FocusButton
                label="Remove session"
                secondary
                onPress={() => {
                  setRemoved(a);
                  setSelectedDay(null);
                  dispatch({
                    type: "set-disposition",
                    activityId: a.id,
                    disposition: "excluded",
                  });
                  if (selected.items.length <= 1) {
                    setSelectedDay(null);
                  }
                }}
              />
            </View>
          </View>
        ))}
      </FocusSheet>
    </>
  );
}

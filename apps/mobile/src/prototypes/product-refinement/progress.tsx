import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import {
  trainingBuckets,
  trainingAtlas,
  weeklyPeriodBounds,
  shiftAppDay,
  shiftTrainingMonth,
  trainingRangeNavigation,
  monthlyPeriodBounds,
  type Activity,
  type SportId,
  type TrainingRange,
} from "@fitness-battle/shared";
import { FocusSegments, FocusSheet } from "../../ui/focus";
import {
  T,
  c,
  row,
  stack,
  Tap,
  Action,
  Pill,
  Metric,
  SectionHeader,
  Surface,
  Rule,
  Study,
  Flow,
  useStudyNav,
  AppIcon,
  Plot,
  Spark,
  type Page,
} from "./foundation";
import {
  trainingNow,
  trainingRows,
  trainingView,
  sportName,
  sessionName,
  shortDate,
} from "./training-data";
const concepts = ["Training portfolio", "The training mix"] as const;
const sportColors = [c.secondary, c.tennis, "#aebdcb"];
export default function ProgressRefinement() {
  return (
    <Study tab="progress" concepts={concepts}>
      {(i) => <Progress key={i} variant={i} />}
    </Study>
  );
}
function Progress({ variant }: { variant: number }) {
  const [range, setRange] = useState<TrainingRange>("week"),
    [anchor, setAnchor] = useState(trainingNow),
    [sport, setSport] = useState<SportId | "all">("all"),
    [picker, setPicker] = useState(false),
    [selected, setSelected] = useState<number | null>(null);
  const view = trainingView(range, anchor, sport);
  const setPeriod = (next: TrainingRange) => {
    setRange(next);
    setSelected(null);
  };
  const shift = (n: number) => {
    setAnchor(
      range === "week"
        ? shiftAppDay(anchor, n * 7)
        : shiftTrainingMonth(anchor, n * (range === "year" ? 12 : 1)),
    );
    setSelected(null);
  };
  return (
    <Flow render={(page) => <ProgressDetail page={page} sport={sport} />}>
      <ProgressRoot
        variant={variant}
        range={range}
        anchor={anchor}
        sport={sport}
        picker={() => setPicker(true)}
        view={view}
        setPeriod={setPeriod}
        shift={shift}
        selected={selected}
        select={setSelected}
      />
      <FocusSheet
        open={picker}
        title="Training by sport"
        onClose={() => setPicker(false)}
      >
        {(["all", "running", "cycling", "strength"] as const).map((id) => (
          <Tap
            key={id}
            selected={sport === id}
            onPress={() => {
              setSport(id);
              setSelected(null);
              setPicker(false);
            }}
            style={{
              ...row,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            {id !== "all" && <AppIcon name={id} />}
            <T role="heading" style={{ flex: 1 }}>
              {sportName(id)}
            </T>
            <T role="label">{sport === id ? "Selected" : "View"}</T>
          </Tap>
        ))}
      </FocusSheet>
    </Flow>
  );
}
function ProgressRoot({
  variant,
  range,
  anchor,
  sport,
  picker,
  view,
  setPeriod,
  shift,
  selected,
  select,
}: {
  variant: number;
  range: TrainingRange;
  anchor: Date;
  sport: SportId | "all";
  picker: () => void;
  view: ReturnType<typeof trainingView>;
  setPeriod: (r: TrainingRange) => void;
  shift: (n: number) => void;
  selected: number | null;
  select: (i: number) => void;
}) {
  const nav = useStudyNav();
  const start = view.buckets[0]!.start,
    end = view.buckets.at(-1)!.end;
  const dateLabel =
    range === "year"
      ? "2026"
      : range === "month"
        ? anchor.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "America/New_York",
          })
        : `${shortDate(start)} – ${shortDate(new Date(Date.parse(end) - 1).toISOString())}`;
  const rangeNav = trainingRangeNavigation(
    anchor,
    new Date(trainingRows[0]!.startedAt),
    trainingNow,
    range,
  );
  const bucket = selected === null ? null : view.buckets[selected];
  const journey = () =>
    nav.push({
      key: "journey",
      title: bucket
        ? `${shortDate(bucket.start)} · Training`
        : "Training journey",
      id: bucket?.start ?? start,
      period: bucket?.end ?? end,
    });
  const chart = (
    <>
      <Plot
        values={view.buckets.map((b) => b.movingSec / 3600)}
        labels={view.buckets.map((b) => b.label)}
        bars={range !== "week"}
        previous={
          range === "week"
            ? view.priorBuckets.map((b) => b.movingSec / 3600)
            : undefined
        }
        onSelect={select}
      />
      <FocusSegments
        label="Training period"
        value={range}
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
          { value: "year", label: "Year" },
        ]}
        onChange={setPeriod}
      />
      <Tap label="View sessions for selected chart period" onPress={journey}>
        <View style={{ ...row, justifyContent: "space-between" }}>
          <View>
            <T role="label">
              {bucket
                ? `${bucket.sessions} sessions · ${shortDate(bucket.start)}`
                : `${view.rows.length} sessions in this ${range}`}
            </T>
            <T role="caption" secondary>
              Open the training journey
            </T>
          </View>
          <AppIcon name="chevron" size={20} />
        </View>
      </Tap>
    </>
  );
  const sportTotals = (["running", "cycling", "strength"] as const).map(
    (id, i) => ({
      id,
      color: sportColors[i]!,
      hours:
        view.rows
          .filter((a) => a.sport === id)
          .reduce((n, a) => n + a.movingSec, 0) / 3600,
    }),
  );
  return (
    <>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <T role="display" accessibilityRole="header">
            Progress
          </T>
          <T role="caption" secondary>
            A little further. A little more you.
          </T>
        </View>
        <Tap label="Choose training sport" onPress={picker}>
          <View style={{ ...row, gap: 4 }}>
            <T role="label">{sportName(sport)}⌄</T>
          </View>
        </Tap>
      </View>
      <View style={{ ...row, justifyContent: "space-between" }}>
        <Tap
          label={`Previous ${range}`}
          disabled={!rangeNav.prevAllowed}
          onPress={() => shift(-1)}
        >
          <AppIcon name="back" size={20} />
        </Tap>
        <T role="label">{dateLabel}</T>
        <Tap
          label={`Next ${range}`}
          disabled={!rangeNav.nextAllowed}
          onPress={() => shift(1)}
        >
          <AppIcon name="chevron" size={20} />
        </Tap>
      </View>
      {variant === 0 ? (
        <View style={stack}>
          <View style={row}>
            <View style={{ flex: 1 }}>
              <T role="caption" secondary>
                Active time
              </T>
              <T role="display">
                {view.hours.toFixed(1)}
                <T role="body"> hr</T>
              </T>
            </View>
            <Pill>{view.comparison.label.replace(" compared", "")}</Pill>
          </View>
          {chart}
        </View>
      ) : (
        <>
          <Surface style={{ gap: 20, backgroundColor: c.ink }}>
            <View style={row}>
              <View style={{ flex: 1 }}>
                <T role="caption" style={{ color: "#c9d6e3" }}>
                  Your training mix
                </T>
                <T role="display" style={{ color: c.card }}>
                  {view.hours.toFixed(1)}
                  <T style={{ color: c.card }}> hr</T>
                </T>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <T role="heading" style={{ color: c.tennis }}>
                  {view.rows.length}
                </T>
                <T role="caption" style={{ color: "#c9d6e3" }}>
                  sessions
                </T>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                height: 16,
                borderRadius: 8,
                overflow: "hidden",
                gap: 3,
              }}
            >
              {sportTotals
                .filter((s) => s.hours > 0)
                .map((s) => (
                  <View
                    key={s.id}
                    style={{ flex: s.hours, backgroundColor: s.color }}
                  />
                ))}
            </View>
            <View style={row}>
              {sportTotals.map((s) => (
                <View key={s.id} style={{ flex: 1, gap: 4 }}>
                  <AppIcon name={s.id} color={s.color} size={22} />
                  <T role="label" style={{ color: c.card }}>
                    {s.hours.toFixed(1)} hr
                  </T>
                  <T role="caption" style={{ color: "#c9d6e3" }}>
                    {sportName(s.id)}
                  </T>
                </View>
              ))}
            </View>
          </Surface>
          <View style={stack}>
            <SectionHeader title="Your rhythm" />
            {chart}
          </View>
        </>
      )}
      <Rule />
      <SectionHeader
        title="What’s changing"
        subtitle="See what’s changing in your training."
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <DeltaCard
          title="Sessions"
          value={String(view.rows.length)}
          previous={view.priorRows.length}
          note={`vs previous ${range}${view.comparison.partial ? " (full period)" : ""}`}
          values={view.buckets.map((b) => b.sessions)}
          onPress={journey}
        />
        <DeltaCard
          title="Active days"
          value={String(
            new Set(view.rows.map((a) => a.startedAt.slice(0, 10))).size,
          )}
          previous={
            new Set(view.priorRows.map((a) => a.startedAt.slice(0, 10))).size
          }
          note={`vs previous ${range}${view.comparison.partial ? " (full period)" : ""}`}
          values={view.buckets.map((b) => (b.sessions ? 1 : 0))}
          onPress={journey}
        />
      </View>
      <View style={{ ...row, paddingVertical: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <T role="heading">Effort score</T>
          <T role="caption" secondary>
            Open · Running
          </T>
          <T role="heading">
            1,168{" "}
            <T role="caption" style={{ color: c.secondary }}>
              +42 this month
            </T>
          </T>
        </View>
        <View style={{ width: 110 }}>
          <Spark values={[1085, 1092, 1088, 1110, 1128, 1126, 1142, 1168]} />
        </View>
        <Tap
          label="View effort score history"
          onPress={() => nav.push({ key: "effort", title: "Effort score" })}
        >
          <AppIcon name="chevron" />
        </Tap>
      </View>
      <Rule />
      <SectionHeader
        title="Personal bests"
        action={
          <Tap
            onPress={() =>
              nav.push({ key: "records", title: "Personal bests" })
            }
          >
            <T role="label">All records</T>
          </Tap>
        }
      />
      <Tap
        label="View your 5K personal best"
        onPress={() => nav.push({ key: "record", title: "5K personal best" })}
        style={{ ...row, paddingVertical: 8 }}
      >
        <View
          style={{ padding: 16, backgroundColor: c.soft, borderRadius: 18 }}
        >
          <AppIcon name="compete" color={c.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <T role="heading">23:42</T>
          <T role="caption" secondary>
            5K · Oct 11 · 18 sec faster
          </T>
        </View>
        <AppIcon name="chevron" />
      </Tap>
      <Rule />
      <SectionHeader title="The bigger picture" />
      <Tap
        onPress={() => nav.push({ key: "atlas", title: "Training atlas" })}
        style={{ ...row, paddingVertical: 12 }}
      >
        <AtlasStamp />
        <View style={{ flex: 1 }}>
          <T role="label">Your year in motion</T>
          <T role="caption" secondary>
            A day-by-day view of 2026
          </T>
        </View>
        <AppIcon name="chevron" />
      </Tap>
      <Tap
        onPress={() => nav.push({ key: "chapters", title: "Past weeks" })}
        style={{ ...row, paddingVertical: 12 }}
      >
        <AppIcon name="compete" />
        <View style={{ flex: 1 }}>
          <T role="label">Past weeks & awards</T>
          <T role="caption" secondary>
            Closed rounds and monthly chapters
          </T>
        </View>
        <AppIcon name="chevron" />
      </Tap>
    </>
  );
}
function DeltaCard({
  title,
  value,
  previous,
  note,
  values,
  onPress,
}: {
  title: string;
  value: string;
  previous: number;
  note: string;
  values: number[];
  onPress: () => void;
}) {
  return (
    <Tap
      onPress={onPress}
      style={{
        flex: 1,
        minWidth: 0,
        padding: 16,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 20,
        gap: 8,
      }}
    >
      <T role="label">{title}</T>
      <T role="display">{value}</T>
      <View style={{ gap: 5 }}>
        <View
          style={{
            width: "100%",
            height: 6,
            borderRadius: 3,
            backgroundColor: c.line,
          }}
        >
          <View
            style={{
              width: `${(Number(value) / Math.max(1, Number(value), previous)) * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: c.secondary,
            }}
          />
        </View>
        <View
          style={{
            width: "100%",
            height: 6,
            borderRadius: 3,
            backgroundColor: c.line,
          }}
        >
          <View
            style={{
              width: `${(previous / Math.max(1, Number(value), previous)) * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: "#aebdcb",
            }}
          />
        </View>
      </View>
      <T role="caption" style={{ color: c.secondary }}>
        {Number(value) - previous > 0 ? "+" : ""}
        {Number(value) - previous} {note}
      </T>
    </Tap>
  );
}
function AtlasStamp() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      {Array.from({ length: 25 }, (_, i) => (
        <Rect
          key={i}
          x={(i % 5) * 9}
          y={Math.floor(i / 5) * 9}
          width={6}
          height={6}
          rx={2}
          fill={[c.line, c.secondary, "#9dbbb2", c.tennis][i % 4]}
        />
      ))}
    </Svg>
  );
}
export function SessionList({ rows }: { rows: Activity[] }) {
  const nav = useStudyNav();
  return (
    <View style={stack}>
      {rows.length === 0 ? (
        <T secondary>No counted activity in this period.</T>
      ) : (
        [...rows].reverse().map((a) => (
          <Tap
            key={a.id}
            label={`${sessionName(a)}, ${shortDate(a.startedAt)}`}
            onPress={() =>
              nav.push({ key: "session", title: sessionName(a), id: a.id })
            }
            style={{
              ...row,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <View
              style={{ padding: 12, borderRadius: 14, backgroundColor: c.soft }}
            >
              <AppIcon name={a.sport} />
            </View>
            <View style={{ flex: 1 }}>
              <T role="label">{sessionName(a)}</T>
              <T role="caption" secondary>
                {shortDate(a.startedAt)} · {sportName(a.sport)}
              </T>
            </View>
            <T role="label">{Math.round(a.movingSec / 60)} min</T>
            <AppIcon name="chevron" size={16} />
          </Tap>
        ))
      )}
    </View>
  );
}
export function ProgressDetail({
  page,
  sport,
  metric = false,
}: {
  page: Page;
  sport: SportId | "all";
  metric?: boolean;
}) {
  const nav = useStudyNav();
  if (page.key === "session") {
    const a = trainingRows.find((a) => a.id === page.id)!;
    return (
      <>
        <Pill>{sportName(a.sport)} · Counted</Pill>
        <T role="display">{sessionName(a)}</T>
        <T secondary>{shortDate(a.startedAt)} · 8:00 AM Eastern</T>
        <Surface style={{ gap: 20 }}>
          <View style={row}>
            <Metric
              value={`${Math.round(a.movingSec / 60)} min`}
              label="Moving time"
            />
            {a.distanceM > 0 && (
              <Metric
                value={`${(a.distanceM / (metric ? 1000 : 1609.344)).toFixed(1)} ${metric ? "km" : "mi"}`}
                label="Distance"
              />
            )}
          </View>
          <Rule />
          <T role="label">
            {a.verified ? "GPS verified" : "Manual entry · Open only"}
          </T>
          <T secondary>
            This session contributes to your training time and the selected
            sport’s counted activity.
          </T>
        </Surface>
        <T role="caption" secondary>
          Fictional activity. Route and heart-rate data are unavailable for this
          receipt.
        </T>
      </>
    );
  }
  if (page.key === "journey") {
    const rows = trainingRows.filter(
      (a) =>
        (sport === "all" || a.sport === sport) &&
        a.startedAt >= page.id! &&
        a.startedAt < page.period!,
    );
    const grouped = [
      ...new Set(rows.map((a) => a.startedAt.slice(0, 10))),
    ].reverse();
    return (
      <>
        <T role="display">Time well spent.</T>
        <T secondary>
          {shortDate(page.id!)} –{" "}
          {shortDate(new Date(Date.parse(page.period!) - 1).toISOString())} ·{" "}
          {rows.length} sessions
        </T>
        <View style={{ gap: 20 }}>
          {grouped.map((date, i) => (
            <View key={date} style={{ ...row, alignItems: "stretch" }}>
              <View style={{ width: 38, alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: i === 0 ? c.tennis : c.soft,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <T role="label">{Number(date.slice(-2))}</T>
                </View>
                <View style={{ flex: 1, width: 2, backgroundColor: c.line }} />
              </View>
              <View style={{ flex: 1 }}>
                <T role="label">{shortDate(`${date}T12:00:00Z`)}</T>
                <SessionList
                  rows={rows.filter((a) => a.startedAt.startsWith(date))}
                />
              </View>
            </View>
          ))}
        </View>
        {rows.length === 0 && (
          <T secondary>No counted sessions in this selection.</T>
        )}
      </>
    );
  }
  if (page.key === "atlas")
    return (
      <>
        <T role="display">2026, one day at a time.</T>
        <T secondary>
          Darker days mean more moving time. Tap a month to see its sessions.
        </T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          {Array.from({ length: 10 }, (_, month) => {
            const at = new Date(Date.UTC(2026, month, 15, 12));
            const cells = trainingAtlas(trainingRows, sport, at, trainingNow);
            return (
              <Tap
                key={month}
                label={`View ${at.toLocaleDateString("en-US", { month: "long" })} training`}
                onPress={() =>
                  nav.push({
                    key: "journey",
                    title: at.toLocaleDateString("en-US", { month: "long" }),
                    id: monthlyPeriodBounds(at).startsAt.toISOString(),
                    period: monthlyPeriodBounds(at).endsAt.toISOString(),
                  })
                }
                style={{ width: "47%", gap: 8, paddingVertical: 10 }}
              >
                <T role="label">
                  {at.toLocaleDateString("en-US", { month: "long" })}
                </T>
                <Svg width="100%" height={84} viewBox="0 0 140 84">
                  {cells.map((d, i) => (
                    <Rect
                      key={d.day}
                      x={(i % 7) * 20}
                      y={Math.floor(i / 7) * 14}
                      width={15}
                      height={10}
                      rx={3}
                      opacity={d.inMonth && !d.future ? 1 : 0.15}
                      fill={
                        [c.line, "#c8ded6", "#91b9aa", c.secondary, c.ink][
                          d.intensity
                        ]
                      }
                    />
                  ))}
                </Svg>
              </Tap>
            );
          })}
        </View>
        <T role="caption" secondary>
          January–October · Future days are muted, never treated as missed
          workouts.
        </T>
      </>
    );
  if (page.key === "effort")
    return (
      <>
        <T role="caption" secondary>
          Running · Independent score tracks
        </T>
        <EffortDetail />
      </>
    );
  if (page.key === "record")
    return (
      <>
        <Pill>Running · 5K</Pill>
        <T role="display">23:42</T>
        <T secondary>Your fastest recorded 5K · Oct 11</T>
        <Plot
          values={[26.2, 25.7, 25.1, 24.8, 24, 23.7]}
          labels={["May", "Jun", "Jul", "Aug", "Sep", "Oct"]}
          unit="min"
        />
        <T role="caption" secondary>
          Lower is faster · Recorded qualifying attempts
        </T>
        <Surface style={{ gap: 12 }}>
          <T role="heading">18 seconds faster</T>
          <T>
            Previous best 24:00 on September 20. Current best 23:42 on October
            11.
          </T>
        </Surface>
        <Action
          label="View the October 11 session"
          secondary
          onPress={() =>
            nav.push({
              key: "session",
              title: "Sunday long run",
              id: trainingRows.find((a) =>
                a.startedAt.startsWith("2026-10-11"),
              )!.id,
            })
          }
        />
        <T role="caption" secondary>
          Illustrative PB history; the 5K attempt is a segment of the longer
          recorded session.
        </T>
      </>
    );
  if (page.key === "records")
    return (
      <>
        <T role="display">Made by showing up.</T>
        {[
          ["5K", "23:42"],
          ["10K", "49:18"],
          ["Longest run", "6.9 mi"],
        ].map(([label, value]) => (
          <Surface key={label} style={{ gap: 8 }}>
            <T role="label">{label}</T>
            <T role="display">{value}</T>
            <T role="caption" secondary>
              Running · October 2026
            </T>
            {label === "5K" && (
              <Action
                label="See 5K attempts"
                secondary
                onPress={() =>
                  nav.push({ key: "record", title: "5K personal best" })
                }
              />
            )}
          </Surface>
        ))}
      </>
    );
  return (
    <>
      <T role="display">Your season, so far.</T>
      {["October", "September", "August"].map((name, i) => (
        <Surface key={name} style={{ gap: 12 }}>
          <T role="heading">{name}</T>
          <T secondary>
            {
              [
                "Three closed weeks. A new 5K best.",
                "Four weeks of consistent training.",
                "Your longest run of the summer.",
              ][i]
            }
          </T>
          <View style={row}>
            <Metric value={String([3, 4, 5][i])} label="Settled weeks" />
            <Metric value={String([2, 1, 2][i])} label="Top-three finishes" />
          </View>
          <Action
            label={`View ${name} training`}
            secondary
            onPress={() =>
              nav.push({
                key: "journey",
                title: name,
                id: monthlyPeriodBounds(
                  new Date(Date.UTC(2026, 9 - i, 15, 12)),
                ).startsAt.toISOString(),
                period: monthlyPeriodBounds(
                  new Date(Date.UTC(2026, 9 - i, 15, 12)),
                ).endsAt.toISOString(),
              })
            }
          />
        </Surface>
      ))}
    </>
  );
}
function EffortDetail() {
  const [gps, setGps] = useState(false);
  return (
    <>
      <FocusSegments
        label="Effort score track"
        value={gps ? "gps" : "open"}
        options={[
          { value: "open", label: "Open score" },
          { value: "gps", label: "GPS only" },
        ]}
        onChange={(v) => setGps(v === "gps")}
      />
      <T role="display">{gps ? "1,156" : "1,168"}</T>
      <Plot
        values={
          gps
            ? [1072, 1098, 1101, 1120, 1139, 1156]
            : [1085, 1110, 1128, 1126, 1142, 1168]
        }
        labels={["Sep 20", "Sep 27", "Oct 4", "Oct 11", "Oct 18", "Oct 25"]}
        unit="pts"
      />
      <T secondary>
        Your rating history is separate from training volume. The lens changes
        which counted sessions qualify.
      </T>
    </>
  );
}

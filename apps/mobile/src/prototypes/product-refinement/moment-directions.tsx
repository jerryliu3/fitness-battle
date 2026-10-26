import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  type TrainingRange,
  type SportId,
  shiftAppDay,
  shiftTrainingMonth,
  trainingRangeNavigation,
} from "@fitness-battle/shared";
import { CrewRelay } from "../../features/crew-relay";
import { FocusSegments } from "../../ui/focus";
import {
  T,
  c,
  row,
  stack,
  Tap,
  Action,
  Pill,
  Metric,
  Surface,
  SectionHeader,
  Study,
  Flow,
  useStudyNav,
  UserAvatar,
  AppIcon,
  Plot,
  type Page,
} from "./foundation";
import FieldDirections from "./field-directions";
import { ProgressDetail } from "./progress";
import { Profile } from "./profile";
import { CrewDetail, SessionTicket } from "./crew";
import {
  trainingNow,
  trainingRows,
  trainingView,
  sportName,
  sessionName,
  shortDate,
} from "./training-data";
import { crewPeople, crewMembers, crewEntries } from "./crew-data";
export default function MomentDirections() {
  const p = useLocalSearchParams<{ tab?: string }>();
  const tab =
    p.tab === "progress" || p.tab === "crew" || p.tab === "profile"
      ? p.tab
      : "compete";
  const [crewMoment, setCrewMoment] = useState("active");
  if (tab === "compete") return <FieldDirections />;
  return (
    <Study
      key={tab}
      tab={tab}
      followup
      concepts={[
        tab === "progress"
          ? "The living portfolio"
          : tab === "crew"
            ? "Every mile has a face"
            : "The earned passport",
      ]}
      reviewControls={
        tab === "crew" ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
            <FocusSegments
              label="Study scenario"
              value={crewMoment}
              options={[
                { value: "quiet", label: "Quiet week" },
                { value: "active", label: "In motion" },
                { value: "milestone", label: "100 miles" },
              ]}
              onChange={setCrewMoment}
            />
          </View>
        ) : undefined
      }
    >
      {() =>
        tab === "progress" ? (
          <LivingPortfolio />
        ) : tab === "crew" ? (
          <CrewMoment key={crewMoment} moment={crewMoment} />
        ) : (
          <Profile variant={2} />
        )
      }
    </Study>
  );
}
function LivingPortfolio() {
  const [range, setRange] = useState<TrainingRange>("week"),
    [anchor, setAnchor] = useState(trainingNow),
    [sport, setSport] = useState<SportId | "all">("all"),
    [selection, setSelection] = useState<number | null>(null);
  const view = trainingView(range, anchor, sport),
    bucket = selection === null ? null : view.buckets[selection];
  const rows = bucket
    ? view.rows.filter(
        (a) => a.startedAt >= bucket.start && a.startedAt < bucket.end,
      )
    : view.rows;
  const navigation = trainingRangeNavigation(
    anchor,
    new Date(trainingRows[0]!.startedAt),
    trainingNow,
    range,
  );
  const shift = (n: number) => {
    setAnchor(
      range === "week"
        ? shiftAppDay(anchor, n * 7)
        : shiftTrainingMonth(anchor, n * (range === "year" ? 12 : 1)),
    );
    setSelection(null);
  };
  return (
    <Flow render={(page) => <ProgressDetail page={page} sport={sport} />}>
      <PortfolioRoot
        range={range}
        setRange={(r) => {
          setRange(r);
          setSelection(null);
        }}
        sport={sport}
        setSport={(s) => {
          setSport(s);
          setSelection(null);
        }}
        view={view}
        selection={selection}
        select={setSelection}
        rows={rows}
        clear={() => setSelection(null)}
        shift={shift}
        previous={navigation.prevAllowed}
        next={navigation.nextAllowed}
      />
    </Flow>
  );
}
function PortfolioRoot({
  range,
  setRange,
  sport,
  setSport,
  view,
  selection,
  select,
  rows,
  clear,
  shift,
  previous,
  next,
}: {
  range: TrainingRange;
  setRange: (r: TrainingRange) => void;
  sport: SportId | "all";
  setSport: (s: SportId | "all") => void;
  view: ReturnType<typeof trainingView>;
  selection: number | null;
  select: (i: number) => void;
  rows: typeof trainingRows;
  clear: () => void;
  shift: (n: number) => void;
  previous: boolean;
  next: boolean;
}) {
  const nav = useStudyNav();
  const bucket = selection === null ? null : view.buckets[selection];
  const hours = rows.reduce((n, a) => n + a.movingSec, 0) / 3600;
  const mix = (["running", "cycling", "strength"] as const).map((id, i) => ({
    id,
    seconds: rows
      .filter((a) => a.sport === id)
      .reduce((n, a) => n + a.movingSec, 0),
    color: [c.secondary, c.tennis, "#aebdcb"][i],
  }));
  return (
    <>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <T role="display">Progress</T>
          <T role="caption" secondary>
            Your training, connected.
          </T>
        </View>
        <Tap
          label="Open year atlas"
          onPress={() => nav.push({ key: "atlas", title: "Your year" })}
        >
          <AppIcon name="expand" />
        </Tap>
      </View>
      <FocusSegments
        label="Training sport"
        variant="tabs"
        value={sport}
        options={["all", "running", "cycling", "strength"].map((id) => ({
          value: id as SportId | "all",
          label: id === "all" ? "All" : sportName(id),
        }))}
        onChange={setSport}
      />
      <View style={{ gap: 16 }}>
        <View style={row}>
          <Tap
            label="Previous period"
            disabled={!previous}
            onPress={() => shift(-1)}
          >
            <AppIcon name="back" />
          </Tap>
          <View style={{ flex: 1, alignItems: "center" }}>
            <T role="label">
              {shortDate(view.buckets[0]!.start)} –{" "}
              {shortDate(
                new Date(
                  Date.parse(view.buckets.at(-1)!.end) - 1,
                ).toISOString(),
              )}
            </T>
          </View>
          <Tap label="Next period" disabled={!next} onPress={() => shift(1)}>
            <AppIcon name="chevron" />
          </Tap>
        </View>
        <View style={row}>
          <View style={{ flex: 1 }}>
            <T role="caption" secondary>
              {bucket ? bucket.label : `This ${range}`}
            </T>
            <T role="display">
              {hours.toFixed(1)}
              <T> hr</T>
            </T>
          </View>
          <Pill>
            {bucket
              ? `${rows.length} sessions`
              : view.comparison.label.replace(" compared", "")}
          </Pill>
        </View>
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
          onChange={setRange}
        />
      </View>
      <Surface style={{ gap: 14 }}>
        <View style={row}>
          <T role="heading" style={{ flex: 1 }}>
            {bucket ? `${bucket.label} · In focus` : "Where the time went"}
          </T>
          {bucket && (
            <Tap onPress={clear}>
              <T role="label">Show all</T>
            </Tap>
          )}
        </View>
        <View
          style={{
            height: 12,
            flexDirection: "row",
            gap: 3,
            borderRadius: 6,
            overflow: "hidden",
            backgroundColor: c.line,
          }}
        >
          {mix
            .filter((m) => m.seconds > 0)
            .map((m) => (
              <View
                key={m.id}
                style={{ flex: m.seconds, backgroundColor: m.color }}
              />
            ))}
        </View>
        <View style={{ ...row, alignItems: "flex-start" }}>
          {mix.map((m) => (
            <View key={m.id} style={{ flex: 1, gap: 4 }}>
              <AppIcon name={m.id} color={m.color} />
              <T role="label">{(m.seconds / 3600).toFixed(1)} hr</T>
              <T role="caption" secondary>
                {sportName(m.id)}
              </T>
            </View>
          ))}
        </View>
        <T role="caption" secondary>
          {new Set(rows.map((a) => a.startedAt.slice(0, 10))).size} active days
          · {rows.length} counted sessions
        </T>
      </Surface>
      <SectionHeader
        title={bucket ? "Behind this moment" : "The sessions behind it"}
        subtitle="Chart selection filters everything below"
      />
      {rows.length === 0 ? (
        <View style={{ paddingVertical: 24, gap: 8 }}>
          <T role="heading">Room to breathe.</T>
          <T secondary>No counted sessions in this selection.</T>
          <Action label="Return to the full period" secondary onPress={clear} />
        </View>
      ) : (
        rows
          .slice()
          .reverse()
          .map((a) => (
            <Tap
              key={a.id}
              onPress={() =>
                nav.push({ key: "session", title: sessionName(a), id: a.id })
              }
              style={{
                ...row,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: c.line,
              }}
            >
              <View
                style={{
                  padding: 12,
                  backgroundColor: c.card,
                  borderRadius: 16,
                }}
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
      <Action
        label="Explore the full journey"
        secondary
        onPress={() =>
          nav.push({
            key: "journey",
            title: "Training journey",
            id: bucket?.start ?? view.buckets[0]!.start,
            period: bucket?.end ?? view.buckets.at(-1)!.end,
          })
        }
      />
    </>
  );
}
function CrewMoment({ moment }: { moment: string }) {
  const [going, setGoing] = useState<Record<string, boolean>>({
      sunrise: true,
    }),
    [rest, setRest] = useState(false);
  const scale =
    moment === "quiet" ? 0 : moment === "milestone" ? 100 / 76.8 : 1;
  const members = crewPeople.map((p) => ({
    ...p,
    miles: Number((p.miles * scale).toFixed(2)),
  }));
  const entries =
    moment === "quiet"
      ? []
      : crewEntries.map((e) => ({
          ...e,
          distance_m: e.distance_m * scale,
          moving_sec: Math.round(e.moving_sec * scale),
        }));
  const total = entries.reduce((n, e) => n + e.distance_m / 1609.344, 0);
  return (
    <Flow
      render={(page) =>
        page.key === "moment-member" ? (
          <MomentMember
            page={page}
            members={members}
            total={total}
            quiet={moment === "quiet"}
          />
        ) : (
          <CrewDetail
            page={page}
            going={going}
            toggle={(id) => setGoing((s) => ({ ...s, [id]: !s[id] }))}
            rest={rest}
            setRest={setRest}
          />
        )
      }
    >
      <CrewMomentRoot
        moment={moment}
        members={members}
        entries={entries}
        total={total}
        going={Boolean(going.sunrise)}
      />
    </Flow>
  );
}
function CrewMomentRoot({
  moment,
  members,
  entries,
  total,
  going,
}: {
  moment: string;
  members: typeof crewPeople;
  entries: typeof crewEntries;
  total: number;
  going: boolean;
}) {
  const nav = useStudyNav(),
    [selected, setSelected] = useState<string | null>(null);
  const person = members.find((p) => p.id === selected);
  return (
    <>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <T role="display">Crew</T>
          <T role="caption" secondary>
            Prospect Pace · Brooklyn
          </T>
        </View>
        <Tap
          label="Invite to your crew"
          onPress={() => nav.push({ key: "invite", title: "Invite people" })}
        >
          <AppIcon name="plus" />
        </Tap>
      </View>
      <View
        style={{
          borderRadius: 26,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.line,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            padding: 20,
            gap: 8,
            backgroundColor: moment === "milestone" ? c.soft : c.card,
          }}
        >
          <T role="caption" secondary>
            OUR SHARED WEEK · OCT 19 – 25
          </T>
          <View style={{ ...row, alignItems: "flex-end" }}>
            <T role="display" style={{ flex: 1 }}>
              {total.toFixed(1)}
              <T> mi</T>
            </T>
            <Pill>
              {moment === "milestone"
                ? "100 / 100"
                : `${(100 - total).toFixed(1)} to go`}
            </Pill>
          </View>
          <T role="heading">
            {moment === "quiet"
              ? "A new week starts with us."
              : moment === "milestone"
                ? "Four people. One hundred miles."
                : "Every mile has a face."}
          </T>
          <T role="caption" secondary>
            {moment === "quiet"
              ? "Nobody needs to go far to get us started."
              : `${entries.length} sessions · Shared distance target 100 mi`}
          </T>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <CrewRelay
            key={moment}
            members={crewMembers}
            entries={entries}
            sport="running"
            format="cooperative"
            targetSessions={3}
            targetDistanceM={100 * 1609.344}
            previousDistanceM={68.2 * 1609.344}
            units="us"
            userId="alex"
            compact
            onSelectMember={setSelected}
          />
        </View>
      </View>
      {person && (
        <Surface style={{ gap: 14 }}>
          <View style={row}>
            <UserAvatar name={person.name} size={44} />
            <View style={{ flex: 1 }}>
              <T role="heading">{person.name}</T>
              <T role="caption" secondary>
                {person.miles.toFixed(1)} mi ·{" "}
                {total ? Math.round((person.miles / total) * 100) : 0}% of our
                week
              </T>
            </View>
            <Tap label="Close member preview" onPress={() => setSelected(null)}>
              <T role="label">Close</T>
            </Tap>
          </View>
          <Action
            label={`Meet ${person.name.split(" ")[0]}`}
            secondary
            onPress={() =>
              nav.push({
                key: "moment-member",
                title: person.name,
                id: person.id,
              })
            }
          />
        </Surface>
      )}
      {moment === "milestone" && (
        <View style={{ gap: 10, paddingVertical: 8 }}>
          <T role="heading">Everyone left their mark.</T>
          <View
            style={{
              flexDirection: "row",
              height: 10,
              gap: 3,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {members.map((p, i) => (
              <View
                key={p.id}
                style={{
                  flex: p.miles,
                  backgroundColor: [
                    c.secondary,
                    c.tennis,
                    "#7d9eac",
                    "#b2c7a5",
                  ][i],
                }}
              />
            ))}
          </View>
          <T secondary>A shared finish, built one outing at a time.</T>
        </View>
      )}
      <SectionHeader
        title={
          moment === "quiet" ? "Our next chance to meet" : "The next start line"
        }
      />
      <SessionTicket id="sunrise" going={going} />
      <SectionHeader
        title="The people behind the miles"
        subtitle="Tap a person or their place on the trail"
      />
      {members.map((p) => (
        <Tap
          key={p.id}
          onPress={() =>
            nav.push({ key: "moment-member", title: p.name, id: p.id })
          }
          style={{
            ...row,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <UserAvatar name={p.name} size={40} />
          <View style={{ flex: 1 }}>
            <T role="label">{p.id === "alex" ? "You" : p.name}</T>
            <T role="caption" secondary>
              {moment === "quiet"
                ? "Ready for a fresh week"
                : `${p.miles.toFixed(1)} mi together`}
            </T>
          </View>
          <AppIcon name="chevron" size={16} />
        </Tap>
      ))}
    </>
  );
}
function MomentMember({
  page,
  members,
  total,
  quiet,
}: {
  page: Page;
  members: typeof crewPeople;
  total: number;
  quiet: boolean;
}) {
  const p = members.find((m) => m.id === page.id)!;
  return (
    <>
      <UserAvatar name={p.name} size={80} />
      <T role="display">{p.name}</T>
      <T secondary>
        {p.city} · With us since {p.since}
      </T>
      <View style={row}>
        <Metric value={`${p.miles.toFixed(1)} mi`} label="Shared this week" />
        <Metric
          value={`${total ? Math.round((p.miles / total) * 100) : 0}%`}
          label="Of our distance"
        />
      </View>
      <T role="heading">
        {quiet
          ? "Every week is another start."
          : "Their part of our shared story."}
      </T>
      <T secondary>
        {quiet
          ? "No counted running this week yet. Their place in the crew is already here."
          : `${p.name.split(" ")[0]} helped move Prospect Pace toward its shared 100 mile target.`}
      </T>
      <Surface style={stack}>
        <T role="caption" secondary>
          PERSONAL BEST · 5K
        </T>
        <T role="display">{p.best}</T>
        <T secondary>
          Athlete record · separate from this week’s crew contribution.
        </T>
      </Surface>
    </>
  );
}

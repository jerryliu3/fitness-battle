import { useRef, useState, useEffect, type ComponentRef } from "react";
import { ScrollView, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { FocusSegments, FocusSheet } from "../../ui/focus";
import { PolishedRacer } from "../../ui/polished-racer";
import {
  T,
  c,
  row,
  stack,
  Tap,
  Action,
  Pill,
  Metric,
  IconTap,
  SectionHeader,
  Surface,
  Rule,
  Study,
  Flow,
  useStudyNav,
  UserAvatar,
  AppIcon,
  Plot,
  type Page,
} from "./foundation";
import { board, meets, people, type Meet } from "./compete-data";
const concepts = ["The weekly board", "Your meets", "Sport rooms"] as const;
export default function CompeteRefinement() {
  return (
    <Study tab="compete" concepts={concepts}>
      {(index) => <Compete key={index} variant={index} />}
    </Study>
  );
}
function Compete({ variant }: { variant: number }) {
  const [sport, setSport] = useState(0),
    [gps, setGps] = useState(false),
    [picker, setPicker] = useState(false),
    [view, setView] = useState("standings");
  const meet = meets[sport]!;
  const choose = (next: number) => {
    setSport(next);
    if (meets[next]!.gps === null) setGps(false);
  };
  return (
    <Flow
      render={(page) => <CompeteDetail page={page} meet={meet} gps={gps} />}
    >
      <CompeteRoot
        variant={variant}
        meet={meet}
        sport={sport}
        choose={choose}
        gps={gps}
        setGps={setGps}
        picker={() => setPicker(true)}
        view={view}
        setView={setView}
      />
      <FocusSheet
        open={picker}
        title="Your events"
        body="One weekly field per sport. Open and GPS are two views of the same event."
        onClose={() => setPicker(false)}
      >
        {meets.map((m, i) => (
          <Tap
            key={m.id}
            selected={i === sport}
            onPress={() => {
              choose(i);
              setPicker(false);
            }}
            style={{
              ...row,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <AppIcon name={m.id} />
            <View style={{ flex: 1 }}>
              <T role="heading">{m.name}</T>
              <T role="caption" secondary>
                {m.gps === null ? "Open score" : "Open + GPS"} · 6 athletes
              </T>
            </View>
            <T role="label">{i === sport ? "Selected" : "View"}</T>
          </Tap>
        ))}
      </FocusSheet>
    </Flow>
  );
}
function CompeteRoot({
  variant,
  meet,
  sport,
  choose,
  gps,
  setGps,
  picker,
  view,
  setView,
}: {
  variant: number;
  meet: Meet;
  sport: number;
  choose: (i: number) => void;
  gps: boolean;
  setGps: (v: boolean) => void;
  picker: () => void;
  view: string;
  setView: (v: string) => void;
}) {
  const nav = useStudyNav();
  const open = (key: string, title: string, id?: string) =>
    nav.push({ key, title, id });
  const rows = board(meet, gps);
  const you = rows[2]!;
  const lens = (
    <View style={stack}>
      {meet.gps !== null ? (
        <FocusSegments
          label={`${meet.name} score source`}
          value={gps ? "gps" : "open"}
          options={[
            { value: "open", label: "Open score" },
            { value: "gps", label: "GPS only" },
          ]}
          onChange={(v) => setGps(v === "gps")}
        />
      ) : (
        <Pill>Open score · All counted sessions</Pill>
      )}
      <Tap
        label="How Open and GPS work"
        onPress={() => open("scoring", "Open & GPS")}
      >
        <View style={{ ...row, gap: 6 }}>
          <AppIcon name="scoring" size={16} />
          <T role="caption" secondary>
            {gps
              ? "Only GPS verified activity counts here"
              : "All counted activity, including manual sessions"}
          </T>
          <AppIcon name="chevron" size={14} />
        </View>
      </Tap>
    </View>
  );
  const ranking = (
    <View style={stack}>
      <View style={row}>
        <T role="caption" secondary style={{ width: 24 }}>
          #
        </T>
        <T role="caption" secondary style={{ flex: 1 }}>
          Athlete
        </T>
        <T role="caption" secondary>
          {meet.unit} / effort
        </T>
      </View>
      {rows.map((person) => (
        <Tap
          key={person.name}
          label={`${person.place}. ${person.name}, ${person.value} ${meet.unit}, ${person.effort} effort`}
          onPress={() => open("athlete", person.name, person.name)}
          style={{
            ...row,
            paddingVertical: 12,
            paddingHorizontal: person.place === 3 ? 12 : 0,
            marginHorizontal: person.place === 3 ? -12 : 0,
            borderRadius: 16,
            backgroundColor: person.place === 3 ? c.soft : "transparent",
            borderBottomWidth: person.place === 3 ? 0 : 1,
            borderColor: c.line,
          }}
        >
          <T role="label" style={{ width: 24 }}>
            {person.place}
          </T>
          <UserAvatar
            name={person.name}
            size={38}
            highlight={person.place === 3}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <T role="label">{person.place === 3 ? "You" : person.name}</T>
            <View style={{ ...row, gap: 4 }}>
              <T role="caption" secondary>
                {person.change > 0
                  ? `↑ ${person.change} place`
                  : person.change < 0
                    ? `↓ ${-person.change} places`
                    : "Holding steady"}
              </T>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T role="label">{person.value.toFixed(1)}</T>
            <T role="caption" secondary>
              {board(meet, gps)
                .find((p) => p.name === person.name)!
                .effort.toLocaleString()}
            </T>
          </View>
          <AppIcon name="chevron" size={16} />
        </Tap>
      ))}
    </View>
  );
  return (
    <>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <T role="display" accessibilityRole="header">
            Compete
          </T>
          <T role="caption" secondary>
            Oct 19 – 25 · Ends Monday, Eastern
          </T>
        </View>
        <IconTap
          icon="compete"
          label="Past results"
          onPress={() => open("history", "Past results")}
        />
      </View>
      {variant === 0 && (
        <View style={stack}>
          <View style={{ ...row, justifyContent: "space-between" }}>
            <Tap label={`Choose event, ${meet.name}`} onPress={picker}>
              <View style={row}>
                <View
                  style={{
                    backgroundColor: c.card,
                    padding: 10,
                    borderRadius: 14,
                  }}
                >
                  <AppIcon name={meet.id} />
                </View>
                <View>
                  <T role="heading">{meet.name}⌄</T>
                  <T role="caption" secondary>
                    {meet.subtitle}
                  </T>
                </View>
              </View>
            </Tap>
            <Pill>3 days left</Pill>
          </View>
          {lens}
        </View>
      )}
      {variant === 1 && (
        <>
          <View style={{ gap: 12 }}>
            <View style={{ ...row, justifyContent: "space-between" }}>
              <T role="heading">Your meets</T>
              <Tap onPress={picker}>
                <T role="label">All events</T>
              </Tap>
            </View>
            <MeetPager selected={sport} choose={choose} gps={gps} />
          </View>
          {lens}
        </>
      )}
      {variant === 2 && (
        <>
          <FocusSegments
            label="Your sports"
            value={meet.id}
            variant="tabs"
            options={meets.map((m) => ({ value: m.id, label: m.name }))}
            onChange={(id) => choose(meets.findIndex((m) => m.id === id))}
          />
          <Surface style={{ gap: 16 }}>
            <View style={row}>
              <View style={{ flex: 1 }}>
                <T role="heading">{meet.subtitle}</T>
                <T role="caption" secondary>
                  Weekly field · 6 athletes
                </T>
              </View>
              <Pill>3 days left</Pill>
            </View>
            <View style={row}>
              <Metric value={`#${you.place}`} label="Your place" />
              <Metric value={`${you.value} ${meet.unit}`} label="This week" />
              <Metric value={you.effort.toLocaleString()} label="Effort" />
            </View>
            {lens}
          </Surface>
        </>
      )}
      {variant === 0 && (
        <View style={{ ...row, paddingVertical: 2 }}>
          <View style={{ flex: 1 }}>
            <T role="display">
              {you.value.toFixed(1)}
              <T role="body"> {meet.unit}</T>
            </T>
            <T role="caption" secondary>
              Accumulated this week
            </T>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T role="heading">
              3
              <T role="body" secondary>
                {" "}
                / 6
              </T>
            </T>
            <T role="caption" secondary>
              Your place · ↑ 1
            </T>
          </View>
        </View>
      )}
      <View style={stack}>
        <View style={row}>
          <T role="heading" accessibilityRole="header" style={{ flex: 1 }}>
            {variant === 2 ? "The field" : "Standings"}
          </T>
          <Tap
            label="Switch between standings and map"
            onPress={() => setView(view === "standings" ? "map" : "standings")}
          >
            <View style={{ ...row, gap: 6 }}>
              <AppIcon
                name={view === "standings" ? "expand" : "scoring"}
                size={18}
              />
              <T role="label">{view === "standings" ? "Map" : "List"}</T>
            </View>
          </Tap>
        </View>
        {view === "standings" ? (
          ranking
        ) : (
          <Surface style={{ gap: 16, backgroundColor: "#eaf0e2" }}>
            <T role="label">{meet.subtitle}</T>
            <Svg width="100%" height={240} viewBox="0 0 310 240">
              <Path
                d="M0 175 Q120 120 310 180 L310 240 L0 240Z"
                fill="#dce6d4"
              />
              {rows.slice(0, 4).map((p, i) => (
                <PolishedRacer
                  key={p.name}
                  x={40 + i * 75}
                  y={45 + i * 38}
                  you={p.place === 3}
                  gold={p.place === 1}
                  sizeScale={0.5}
                  time={0}
                  showWake
                />
              ))}
            </Svg>
            <T role="caption" secondary>
              Illustrative field · Open standings above use the same totals.
            </T>
            <Action
              label="Back to full standings"
              secondary
              onPress={() => setView("standings")}
            />
          </Surface>
        )}
      </View>
      <Tap
        label="See the next athlete ahead"
        onPress={() => open("chase", "The next place")}
        style={{
          ...row,
          padding: 16,
          backgroundColor: c.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: c.line,
        }}
      >
        <UserAvatar name="Jordan Lee" size={42} />
        <View style={{ flex: 1 }}>
          <T role="label">The next place is within reach</T>
          <T role="caption" secondary>
            {(rows[1]!.value - you.value).toFixed(1)} {meet.unit} behind Jordan
            · #2
          </T>
        </View>
        <AppIcon name="chevron" size={18} />
      </Tap>
      <Rule />
      <SectionHeader
        title="Last week"
        action={
          <Tap onPress={() => open("history", "Past results")}>
            <T role="label">All results</T>
          </Tap>
        }
      />
      <Tap onPress={() => open("result", "Oct 12 – 18")} style={row}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: c.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AppIcon name="compete" />
        </View>
        <View style={{ flex: 1 }}>
          <T role="label">A strong finish.</T>
          <T role="caption" secondary>
            2nd in {meet.name} · +18 effort
          </T>
        </View>
        <AppIcon name="chevron" />
      </Tap>
    </>
  );
}
export function MeetPager({
  selected,
  choose,
  gps,
  compact = false,
}: {
  compact?: boolean;
  selected: number;
  choose: (i: number) => void;
  gps: boolean;
}) {
  const [width, setWidth] = useState(330);
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const step = width - 48;
  useEffect(() => {
    ref.current?.scrollTo({ x: selected * step, animated: true });
  }, [selected, step]);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ gap: 4, marginHorizontal: -20 }}
    >
      <ScrollView
        ref={ref}
        horizontal
        snapToInterval={step}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 40, gap: 12 }}
        scrollEventThrottle={100}
        onMomentumScrollEnd={(e) =>
          choose(
            Math.max(
              0,
              Math.min(2, Math.round(e.nativeEvent.contentOffset.x / step)),
            ),
          )
        }
      >
        {meets.map((m, i) => (
          <View
            key={m.id}
            style={{
              width: step - 12,
              padding: compact ? 14 : 20,
              borderRadius: 24,
              backgroundColor: i === selected ? c.ink : "#e7eeea",
              gap: compact ? 8 : 18,
            }}
          >
            <View style={row}>
              <AppIcon name={m.id} color={i === selected ? c.tennis : c.ink} />
              <T
                role="heading"
                style={{ flex: 1, color: i === selected ? c.card : c.ink }}
              >
                {m.name}
              </T>
              <T
                role="caption"
                style={{ color: i === selected ? "#c9d6e3" : c.muted }}
              >
                Weekly
              </T>
            </View>
            <View>
              <T
                role={compact ? "heading" : "display"}
                style={{ color: i === selected ? c.card : c.ink }}
              >
                {(gps && m.gps !== null ? m.gps : m.total).toFixed(1)}
                <T
                  role="body"
                  style={{ color: i === selected ? c.card : c.ink }}
                >
                  {" "}
                  {m.unit}
                </T>
              </T>
              <T
                role="caption"
                style={{ color: i === selected ? "#c9d6e3" : c.muted }}
              >
                Your week · {m.subtitle}
              </T>
            </View>
            <View
              style={{
                ...row,
                borderTopWidth: 1,
                borderColor: "#ffffff33",
                paddingTop: compact ? 6 : 14,
              }}
            >
              <T
                role="label"
                style={{ flex: 1, color: i === selected ? c.card : c.ink }}
              >
                #3 of 6
              </T>
              <T
                role="caption"
                style={{ color: i === selected ? "#c9d6e3" : c.muted }}
              >
                {(m.score - (gps && m.gps !== null ? 12 : 0)).toLocaleString()}{" "}
                effort
              </T>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={{ ...row, justifyContent: "center", gap: 0 }}>
        {meets.map((m, i) => (
          <Tap
            key={m.id}
            label={`Show ${m.name} meet`}
            selected={selected === i}
            onPress={() => {
              ref.current?.scrollTo({ x: i * step, animated: true });
              choose(i);
            }}
            style={{ width: 44, alignItems: "center" }}
          >
            <View
              style={{
                width: selected === i ? 22 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: selected === i ? c.ink : "#c9d6d2",
              }}
            />
          </Tap>
        ))}
      </View>
    </View>
  );
}
export function CompeteDetail({
  page,
  meet,
  gps,
}: {
  page: Page;
  meet: Meet;
  gps: boolean;
}) {
  const nav = useStudyNav();
  if (page.key === "history")
    return (
      <>
        <T role="display">Every week counts.</T>
        <T secondary>
          {meet.name} · {gps ? "GPS" : "Open"}
        </T>
        {["Oct 12 – 18", "Oct 5 – 11", "Sep 28 – Oct 4"].map((date, i) => (
          <Tap
            key={date}
            onPress={() =>
              nav.push({ key: "result", title: date, id: String(i) })
            }
            style={{
              ...row,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <View style={{ flex: 1 }}>
              <T role="heading">{date}</T>
              <T role="caption" secondary>
                {["2nd place", "4th place", "3rd place"][i]} · {meet.name}
              </T>
            </View>
            <T role="label">{["+18", "+6", "+12"][i]} effort</T>
            <AppIcon name="chevron" />
          </Tap>
        ))}
      </>
    );
  if (page.key === "scoring")
    return (
      <>
        <Surface style={{ gap: 16 }}>
          <AppIcon name="scoring" />
          <T role="heading">Two lenses. One event.</T>
          <T>
            Open includes all counted sessions, including manual activity. GPS
            only includes verified GPS sessions.
          </T>
          <T secondary>
            Each track keeps its own effort score and final result. Changing the
            lens doesn’t move or remove your activities.
          </T>
        </Surface>
        <SectionHeader title="Your running this week" />
        <View style={row}>
          <Metric value="18.4 mi" label="Open" />
          <Metric value="16.2 mi" label="GPS" />
        </View>
        <T role="caption" secondary>
          Fixture example: 2.2 miles of manual running are counted in Open only.
          Weeks run Monday to Monday in America/New_York.
        </T>
      </>
    );
  if (page.key === "result") {
    const n = Number(page.id ?? 0);
    const place = [2, 4, 3][n] ?? 2;
    return (
      <>
        <Pill>
          Final · {meet.name} · {gps ? "GPS" : "Open"}
        </Pill>
        <T role="display">
          {place === 2 ? "A strong finish." : "Another week in the books."}
        </T>
        <Surface style={{ gap: 24, backgroundColor: c.soft }}>
          <View
            style={{
              ...row,
              alignItems: "flex-end",
              justifyContent: "center",
              height: 150,
            }}
          >
            {[
              { name: "You", place },
              { name: "Maya", place: 1 },
              { name: "Jordan", place: place === 3 ? 2 : 3 },
            ].map((p) => (
              <View
                key={p.name}
                style={{ flex: 1, gap: 8, alignItems: "center" }}
              >
                <UserAvatar name={p.name} />
                <T role="caption">{p.name}</T>
                <View
                  style={{
                    width: "100%",
                    height: p.place === 1 ? 80 : 50,
                    backgroundColor: p.place === 1 ? c.tennis : "#dce4de",
                    borderRadius: 12,
                    alignItems: "center",
                    paddingTop: 8,
                  }}
                >
                  <T role="heading">{p.place}</T>
                </View>
              </View>
            ))}
          </View>
          <View style={row}>
            <Metric value={`#${place} / 6`} label="Final place" />
            <Metric
              value={String([18, 6, 12][n] ?? 18)}
              label="Effort gained"
            />
          </View>
        </Surface>
        <T secondary>
          Final places and effort changes belong to this closed week. Your
          current week continues separately.
        </T>
        <Action
          label="View your counted sessions"
          onPress={() =>
            nav.push({
              key: "sessions",
              title: "Counted sessions",
              period: page.title,
              id: "Alex Morgan",
            })
          }
        />
      </>
    );
  }
  if (page.key === "chase")
    return (
      <>
        <View style={row}>
          <UserAvatar name="Jordan Lee" size={64} />
          <View>
            <T role="heading">Jordan Lee</T>
            <T secondary>#2 in {meet.name}</T>
          </View>
        </View>
        <T role="display">
          {(board(meet, gps)[1]!.value - board(meet, gps)[2]!.value).toFixed(1)}{" "}
          {meet.unit} to close.
        </T>
        <Plot
          labels={["Mon", "Tue", "Wed", "Thu"]}
          values={[4.3, 8.9, 14.1, board(meet, gps)[2]!.value]}
          previous={[5.1, 10.2, 16.7, board(meet, gps)[1]!.value]}
          unit={meet.unit}
        />
        <T role="caption" secondary>
          Teal: you · Dashed: Jordan · Accumulated this week
        </T>
        <Action
          label="View Jordan’s week"
          onPress={() =>
            nav.push({ key: "athlete", title: "Jordan Lee", id: "Jordan Lee" })
          }
        />
      </>
    );
  const person = people.find((p) => p.name === page.id) ?? people[2]!;
  const personTotal = board(meet, gps).find(
    (p) => p.name === person.name,
  )!.value;
  const receipts = [0.42, 0.33, 0.25].map((share, i) => ({
    title: ["Morning miles", "An easy loop", "After work"][i]!,
    date: (page.period
      ? page.period.includes("12")
        ? ["Oct 18", "Oct 16", "Oct 13"]
        : page.period.includes("5")
          ? ["Oct 11", "Oct 9", "Oct 6"]
          : ["Oct 4", "Oct 2", "Sep 29"]
      : ["Thu, Oct 22", "Tue, Oct 20", "Mon, Oct 19"])[i]!,
    value:
      i === 2
        ? Number(
            (
              personTotal -
              Number((personTotal * 0.42).toFixed(1)) -
              Number((personTotal * 0.33).toFixed(1))
            ).toFixed(1),
          )
        : Number((personTotal * share).toFixed(1)),
  }));
  if (page.key === "receipt") {
    const receipt = receipts[page.item ?? 0]!;
    return (
      <>
        <Pill>{meet.name} · Counted</Pill>
        <T role="display">{receipt.title}</T>
        <T secondary>
          {receipt.date} · {person.name}
        </T>
        <Surface style={{ gap: 16 }}>
          <Metric
            value={`${receipt.value} ${meet.unit}`}
            label="Counted volume"
          />
          <Rule />
          <T role="label">
            {gps ? "GPS verified activity" : "Counted Open activity"}
          </T>
          <T secondary>
            Included in this week’s {meet.name.toLowerCase()} total.
          </T>
        </Surface>
        <T role="caption" secondary>
          Fictional session receipt. No tracker or recording action is
          performed.
        </T>
      </>
    );
  }
  return (
    <>
      <View style={row}>
        <UserAvatar name={person.name} size={72} />
        <View style={{ flex: 1 }}>
          <T role="display">{person.name}</T>
          <T secondary>{person.city}</T>
        </View>
      </View>
      <View style={row}>
        <Metric value={`${personTotal} ${meet.unit}`} label="This week" />
        <Metric
          value={board(meet, gps)
            .find((p) => p.name === person.name)!
            .effort.toLocaleString()}
          label="Effort"
        />
        <Metric value="3" label="Sessions" />
      </View>
      <Rule />
      <SectionHeader
        title={page.period ? `${page.period} sessions` : "This week’s sessions"}
        subtitle={`${meet.name} · ${gps ? "GPS verified" : "Open score"}`}
      />
      {receipts.map((r, i) => (
        <Tap
          key={r.title}
          label={`Open ${r.title}`}
          onPress={() =>
            nav.push({
              key: "receipt",
              title: r.title,
              id: person.name,
              item: i,
              period: page.period,
            })
          }
          style={{
            ...row,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <View
            style={{ padding: 12, backgroundColor: c.card, borderRadius: 14 }}
          >
            <AppIcon name={meet.id} />
          </View>
          <View style={{ flex: 1 }}>
            <T role="label">{r.title}</T>
            <T role="caption" secondary>
              {r.date}
            </T>
          </View>
          <T role="label">
            {r.value} {meet.unit}
          </T>
          <AppIcon name="chevron" size={16} />
        </Tap>
      ))}
      <T role="caption" secondary>
        Only sessions counted in the selected event and track are shown.
      </T>
    </>
  );
}

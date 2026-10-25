import { useState } from "react";
import { ImageBackground, ScrollView, Switch, View } from "react-native";
import { CrewRelay } from "../../features/crew-relay";
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
  Spark,
  type Page,
} from "./foundation";
import {
  crewPeople,
  crewMembers,
  crewEntries,
  crewMiles,
  crewSessions,
} from "./crew-data";
const trail = require("../../../assets/club/alpine-trail.jpg");
const concepts = ["Shared clubhouse", "Together first"] as const;
export default function CrewRefinement() {
  return (
    <Study tab="crew" concepts={concepts}>
      {(i) => <Crew key={i} variant={i} />}
    </Study>
  );
}
function Crew({ variant }: { variant: number }) {
  const [going, setGoing] = useState<Record<string, boolean>>({
      sunrise: true,
    }),
    [rest, setRest] = useState(false);
  return (
    <Flow
      render={(page) => (
        <CrewDetail
          page={page}
          going={going}
          toggle={(id) => setGoing((s) => ({ ...s, [id]: !s[id] }))}
          rest={rest}
          setRest={setRest}
        />
      )}
    >
      <CrewRoot variant={variant} going={going} />
    </Flow>
  );
}
function CrewRoot({
  variant,
  going,
}: {
  variant: number;
  going: Record<string, boolean>;
}) {
  const nav = useStudyNav();
  const people = () => nav.push({ key: "members", title: "Our people" });
  const relay = (
    <CrewRelay
      members={crewMembers}
      entries={crewEntries}
      sport="running"
      format="cooperative"
      targetSessions={3}
      targetDistanceM={100 * 1609.344}
      previousDistanceM={68.2 * 1609.344}
      units="us"
      userId="alex"
      compact
      onSelectMember={(id) =>
        nav.push({
          key: "member",
          title: crewPeople.find((p) => p.id === id)!.name,
          id,
        })
      }
    />
  );
  const summary = (
    <>
      <View style={{ ...row, justifyContent: "space-between" }}>
        <View style={stack}>
          <T role="caption" secondary>
            Our shared week · Oct 19 – 25
          </T>
          <T role="display">
            {crewMiles.toFixed(1)}
            <T> mi</T>
          </T>
          <T role="caption" secondary>
            12 sessions · 4 people showing up
          </T>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Pill>76.8%</Pill>
          <T role="caption" secondary>
            of 100 mi
          </T>
        </View>
      </View>
      {relay}
    </>
  );
  const contributions = (
    <View style={stack}>
      <SectionHeader
        title={variant === 0 ? "Our people" : "Everyone moves us forward"}
        subtitle="This week’s counted running"
        action={
          <Tap onPress={people}>
            <T role="label">See all</T>
          </Tap>
        }
      />
      {crewPeople.map((p) => (
        <Tap
          key={p.id}
          label={`View ${p.name}'s member profile`}
          onPress={() => nav.push({ key: "member", title: p.name, id: p.id })}
          style={{
            ...row,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <UserAvatar name={p.name} size={44} highlight={p.id === "alex"} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={row}>
              <T role="label" style={{ flex: 1 }}>
                {p.id === "alex" ? "You" : p.name}
              </T>
              <T role="label">{p.miles.toFixed(1)} mi</T>
            </View>
            {variant === 1 && (
              <View
                style={{ height: 5, backgroundColor: c.line, borderRadius: 3 }}
              >
                <View
                  style={{
                    height: 5,
                    width: `${(p.miles / crewMiles) * 100}%`,
                    borderRadius: 3,
                    backgroundColor: p.id === "alex" ? c.tennis : c.secondary,
                  }}
                />
              </View>
            )}
            <T role="caption" secondary>
              {p.last} · 3 sessions
            </T>
          </View>
          <AppIcon name="chevron" size={16} />
        </Tap>
      ))}
    </View>
  );
  const tickets = (
    <View style={stack}>
      <SectionHeader
        title="The next start line"
        subtitle="A plan to show up together"
        action={
          <Tap
            onPress={() =>
              nav.push({ key: "sessions", title: "Crew sessions" })
            }
          >
            <T role="label">All sessions</T>
          </Tap>
        }
      />
      {variant === 0 ? (
        <SessionTicket id="sunrise" going={Boolean(going.sunrise)} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {crewSessions.map((s) => (
            <View key={s.id} style={{ width: 286 }}>
              <SessionTicket id={s.id} going={Boolean(going[s.id])} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
  return (
    <>
      <View style={row}>
        <T role="display" accessibilityRole="header" style={{ flex: 1 }}>
          Crew
        </T>
        <Tap
          label="Invite people to Prospect Pace"
          onPress={() => nav.push({ key: "invite", title: "Invite people" })}
        >
          <View style={{ ...row, gap: 5 }}>
            <AppIcon name="plus" size={18} />
            <T role="label">Invite</T>
          </View>
        </Tap>
        <IconTap
          icon="preferences"
          label="Crew settings"
          onPress={() => nav.push({ key: "settings", title: "Crew settings" })}
        />
      </View>
      {variant === 0 ? (
        <View
          style={{
            borderRadius: 24,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.card,
          }}
        >
          <ImageBackground
            source={trail}
            style={{
              padding: 20,
              height: 134,
              justifyContent: "flex-end",
              backgroundColor: c.fieldDeep,
            }}
          >
            <View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "#142b3b80",
              }}
            />
            <T role="heading" style={{ color: c.card }}>
              Prospect Pace
            </T>
            <Tap label="View all four crew members" onPress={people}>
              <T role="caption" style={{ color: c.card }}>
                4 members · Running · Brooklyn
              </T>
            </Tap>
          </ImageBackground>
          <View style={{ padding: 18, gap: 8 }}>{summary}</View>
        </View>
      ) : (
        <>
          <View style={row}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: c.secondary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon name="crew" color={c.card} />
            </View>
            <View style={{ flex: 1 }}>
              <T role="heading">Prospect Pace</T>
              <T role="caption" secondary>
                4 members · Running · Brooklyn
              </T>
            </View>
            <Tap label="View crew members" onPress={people}>
              <AppIcon name="chevron" />
            </Tap>
          </View>
          <View style={{ paddingTop: 4, gap: 8 }}>
            <View style={{ alignItems: "center", gap: 4 }}>
              <T role="caption" secondary>
                Every mile, together.
              </T>
              <T role="display">
                {crewMiles.toFixed(1)}
                <T> mi</T>
              </T>
              <T role="caption" secondary>
                Shared distance target · 100 mi
              </T>
            </View>
            {relay}
          </View>
        </>
      )}
      {variant === 0 ? (
        <>
          {tickets}
          <Rule />
          {contributions}
        </>
      ) : (
        <>
          {contributions}
          <Rule />
          {tickets}
        </>
      )}
      <Rule />
      <SectionHeader
        title="Stronger than last week"
        subtitle="Compare our counted running."
      />
      <View style={row}>
        <Metric value="+8.6 mi" label="More distance" />
        <Metric value="12" label="Sessions together" />
        <View style={{ width: 100 }}>
          <Spark values={[42, 55, 51, 68.2, 76.8]} />
        </View>
      </View>
      <View style={{ ...row, justifyContent: "space-between" }}>
        <T role="caption" secondary>
          68.2 mi last week → 76.8 mi this week
        </T>
        <Tap
          label="See the shared weekly recap"
          onPress={() => nav.push({ key: "recap", title: "Our week together" })}
        >
          <AppIcon name="chevron" />
        </Tap>
      </View>
    </>
  );
}
function SessionTicket({ id, going }: { id: string; going: boolean }) {
  const nav = useStudyNav();
  const s = crewSessions.find((s) => s.id === id)!;
  return (
    <Tap
      label={`Open ${s.title}`}
      onPress={() => nav.push({ key: "session-plan", title: s.title, id })}
      style={{
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: 22,
        padding: 18,
        gap: 14,
      }}
    >
      <View style={row}>
        <View
          style={{ padding: 10, borderRadius: 14, backgroundColor: c.soft }}
        >
          <T role="label">{s.date.split(", ")[0]}</T>
          <T role="heading">{s.date.split(" ").at(-1)}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T role="heading">{s.title}</T>
          <T role="caption" secondary>
            {s.time} · Eastern · {s.miles}
          </T>
        </View>
      </View>
      <T role="body" secondary>
        {s.place}
      </T>
      <View style={{ ...row, justifyContent: "space-between" }}>
        <View style={{ ...row, gap: 5 }}>
          {s.people.slice(0, 3).map((id) => (
            <UserAvatar
              key={id}
              name={crewPeople.find((p) => p.id === id)!.name}
              size={28}
            />
          ))}
          <T role="caption" secondary>
            {s.people.length + (going ? 1 : 0)} going
          </T>
        </View>
        <Pill dark={going}>{going ? "You’re going" : "View session"}</Pill>
      </View>
    </Tap>
  );
}
function CrewDetail({
  page,
  going,
  toggle,
  rest,
  setRest,
}: {
  page: Page;
  going: Record<string, boolean>;
  toggle: (id: string) => void;
  rest: boolean;
  setRest: (v: boolean) => void;
}) {
  const nav = useStudyNav();
  if (page.key === "members")
    return (
      <>
        <T role="display">Different paces. Same direction.</T>
        {crewPeople.map((p) => (
          <Tap
            key={p.id}
            label={`View ${p.name}'s member profile`}
            onPress={() => nav.push({ key: "member", title: p.name, id: p.id })}
            style={{
              ...row,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <UserAvatar name={p.name} size={54} />
            <View style={{ flex: 1 }}>
              <T role="heading">{p.name}</T>
              <T role="caption" secondary>
                Here since {p.since}
              </T>
            </View>
            <T role="label">{p.miles} mi</T>
            <AppIcon name="chevron" />
          </Tap>
        ))}
      </>
    );
  if (page.key === "member" || page.key === "crew-receipt") {
    const p = crewPeople.find((p) => p.id === page.id) ?? crewPeople[2]!;
    const entries = crewEntries.filter((e) => e.user_id === p.id);
    if (page.key === "crew-receipt") {
      const e = entries[page.item ?? 0]!;
      return (
        <>
          <Pill>Running · Counted Open activity</Pill>
          <T role="display">
            {["Sunday miles", "An easy loop", "Morning miles"][page.item ?? 0]}
          </T>
          <T secondary>
            {p.name} · {e.date}
          </T>
          <Surface style={{ gap: 20 }}>
            <View style={row}>
              <Metric
                value={`${(e.distance_m / 1609.344).toFixed(2)} mi`}
                label="Distance"
              />
              <Metric
                value={`${Math.round(e.moving_sec / 60)} min`}
                label="Moving time"
              />
            </View>
            <Rule />
            <T secondary>
              Included in {p.name.split(" ")[0]}’s {p.miles} mi and Prospect
              Pace’s {crewMiles} mi shared total.
            </T>
          </Surface>
        </>
      );
    }
    return (
      <>
        <View style={row}>
          <UserAvatar name={p.name} size={72} />
          <View style={{ flex: 1 }}>
            <T role="display">{p.name}</T>
            <T secondary>{p.city}</T>
            <T role="caption" secondary>
              Prospect Pace · Since {p.since}
            </T>
          </View>
        </View>
        <Surface style={{ gap: 16 }}>
          <View style={row}>
            <Metric value={`${p.miles} mi`} label="Our shared week" />
            <Metric
              value={`${((p.miles / crewMiles) * 100).toFixed(0)}%`}
              label="Crew contribution"
            />
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line }}>
            <View
              style={{
                height: 8,
                width: `${(p.miles / crewMiles) * 100}%`,
                borderRadius: 4,
                backgroundColor: c.tennis,
              }}
            />
          </View>
        </Surface>
        <View style={row}>
          <Metric value={p.effort.toLocaleString()} label="Running effort" />
          <Metric value={p.best} label="5K best" />
          <Metric value="4" label="Week streak" />
        </View>
        <SectionHeader
          title="A little further"
          subtitle="Weekly running distance"
        />
        <Plot
          values={[
            p.miles * 0.65,
            p.miles * 0.8,
            p.miles * 0.7,
            p.miles * 0.9,
            p.miles,
          ]}
          labels={["Sep 27", "Oct 4", "Oct 11", "Oct 18", "Oct 25"]}
          unit="mi"
        />
        <SectionHeader
          title="Contributing this week"
          subtitle="Counted running sessions"
        />
        {entries.map((e, i) => (
          <Tap
            key={i}
            onPress={() =>
              nav.push({
                key: "crew-receipt",
                title: "Counted session",
                id: p.id,
                item: i,
              })
            }
            style={{
              ...row,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <AppIcon name="running" />
            <View style={{ flex: 1 }}>
              <T role="label">
                {["Sunday miles", "An easy loop", "Morning miles"][i]}
              </T>
              <T role="caption" secondary>
                {e.date}
              </T>
            </View>
            <T role="label">{(e.distance_m / 1609.344).toFixed(2)} mi</T>
            <AppIcon name="chevron" size={16} />
          </Tap>
        ))}
      </>
    );
  }
  if (page.key === "sessions")
    return (
      <>
        <T secondary>Plans to meet up. These don’t add to the shared total.</T>
        {crewSessions.map((s) => (
          <SessionTicket key={s.id} id={s.id} going={Boolean(going[s.id])} />
        ))}
      </>
    );
  if (page.key === "session-plan") {
    const s = crewSessions.find((s) => s.id === page.id)!;
    return (
      <>
        <Pill>Running · Crew session</Pill>
        <T role="display">{s.title}</T>
        <Surface style={{ gap: 16 }}>
          <View style={row}>
            <AppIcon name="compete" />
            <View>
              <T role="heading">
                {s.date} · {s.time}
              </T>
              <T role="caption" secondary>
                America/New_York · Eastern
              </T>
            </View>
          </View>
          <Rule />
          <T>{s.place}</T>
          <T secondary>{s.note}</T>
          <Pill>{s.miles} · Conversational pace</Pill>
        </Surface>
        <SectionHeader
          title={`${s.people.length + (going[s.id] ? 1 : 0)} people going`}
        />
        {[...s.people, ...(going[s.id] ? ["alex"] : [])].map((id) => {
          const p = crewPeople.find((p) => p.id === id)!;
          return (
            <Tap
              key={id}
              onPress={() => nav.push({ key: "member", title: p.name, id })}
              style={row}
            >
              <UserAvatar name={p.name} />
              <T role="label" style={{ flex: 1 }}>
                {id === "alex" ? "You" : p.name}
              </T>
              <AppIcon name="chevron" size={16} />
            </Tap>
          );
        })}
        <Action
          label={
            going[s.id] ? "You’re going · Undo RSVP" : "Join the start line"
          }
          onPress={() => toggle(s.id)}
        />
        <T role="caption" secondary>
          Local RSVP preview. Planned miles count only after activity is
          recorded; no invitation or notification is sent.
        </T>
      </>
    );
  }
  if (page.key === "invite")
    return (
      <>
        <T role="display">Make room for your people.</T>
        <T secondary>Prospect Pace · Private running crew</T>
        <Surface style={{ gap: 20 }}>
          <View style={{ ...row, justifyContent: "center" }}>
            {crewPeople.map((p) => (
              <UserAvatar key={p.id} name={p.name} size={44} />
            ))}
          </View>
          <T role="heading" style={{ textAlign: "center" }}>
            Good company. More miles.
          </T>
          <T style={{ textAlign: "center" }}>
            Join our weekly shared trail and next start line.
          </T>
          <Pill>Invite preview · PACE26</Pill>
        </Surface>
        <T role="caption" secondary>
          This invitation is a local design preview. The code does not join a
          live crew.
        </T>
      </>
    );
  if (page.key === "settings")
    return (
      <>
        <SectionHeader
          title="Prospect Pace"
          subtitle="Running · Cooperative crew"
        />
        <Surface style={{ gap: 16 }}>
          <View style={row}>
            <View style={{ flex: 1 }}>
              <T role="label">My rest week</T>
              <T role="caption" secondary>
                Let the crew know you’re resting.
              </T>
            </View>
            <Switch
              value={rest}
              onValueChange={setRest}
              accessibilityLabel="My rest week"
              trackColor={{ true: c.secondary }}
            />
          </View>
          <T role="caption" secondary>
            Local preference preview. A crew rest marker does not freeze your
            effort score.
          </T>
        </Surface>
        <T role="label">Shared distance target</T>
        <T role="heading">100 mi</T>
        <T secondary>
          A crew distance target, separate from last week’s 68.2 mi. No crew
          settings are saved to a server.
        </T>
      </>
    );
  return (
    <>
      <T role="display">76.8 miles. Four people.</T>
      <T secondary>Oct 19 – 25 · Prospect Pace</T>
      <Plot
        values={[42, 55, 51, 68.2, 76.8]}
        labels={["Sep 27", "Oct 4", "Oct 11", "Oct 18", "Oct 25"]}
        bars
        unit="mi"
      />
      <View style={row}>
        <Metric value="+8.6 mi" label="Versus last week" />
        <Metric value="12" label="Counted sessions" />
      </View>
      <SectionHeader title="Everyone made a difference" />
      {crewPeople.map((p) => (
        <View key={p.id} style={row}>
          <UserAvatar name={p.name} />
          <T style={{ flex: 1 }}>{p.name}</T>
          <T role="label">{p.miles} mi</T>
        </View>
      ))}
      <T role="caption" secondary>
        Fictional weekly recap. This week’s shared target is still 100 mi.
      </T>
    </>
  );
}

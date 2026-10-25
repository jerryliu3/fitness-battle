import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import {
  Action,
  Avatar,
  Card,
  Chart,
  Copy,
  Door,
  Drilldown,
  Heading,
  InspectChart,
  Meter,
  Ring,
  Row,
  Screen,
  Segments,
  Stack,
  Stat,
  Study,
  palette,
  useDrilldown,
  type StudyConcept,
} from "./kit";
import {
  journeyPoints,
  journeyLength,
  journeyPosition,
  crewConcepts,
  crews,
  crewTotal,
  dayShares,
  weekdays,
  type CrewMember,
} from "./crew-data";

export default function CrewStudy() {
  return (
    <Study
      title="Crew / Nine shared spaces"
      tab="Crew"
      concepts={crewConcepts}
      render={(concept) => <CrewConcept concept={concept} />}
    />
  );
}
function CrewConcept({ concept }: { concept: StudyConcept }) {
  const [crewIndex, setCrewIndex] = useState(0);
  const [sort, setSort] = useState<"Contribution" | "Name">("Contribution");
  const [day, setDay] = useState(5);
  const [scenario, setScenario] = useState<
    "Populated" | "First crew" | "Unavailable"
  >("Populated");
  const drill = useDrilldown();
  const crew = crews[crewIndex];
  const members = crew.members as readonly CrewMember[];
  const amount = crewTotal(members);
  const sessions = members.reduce((sum, m) => sum + m.sessions, 0);
  const ordered = [...members].sort((a, b) =>
    sort === "Name" ? a.name.localeCompare(b.name) : b.miles - a.miles,
  );
  const openActivity = (
    member: CrewMember,
    i: number,
    scale = 1,
    week = "Oct 19–25",
  ) =>
    drill.push({
      title: "Member activity",
      render: () => (
        <>
          <Heading eyebrow={`${member.name} · Running`}>
            {i === 0 ? "Morning miles" : "Evening run"}
          </Heading>
          <Stat
            value={`${((member.miles * scale) / member.sessions).toFixed(1)} mi`}
            label="Sample counted distance"
            big
          />
          <Card>
            <Copy bold>Shared contribution</Copy>
            <Copy>
              Included in the crew’s Running total for {week}, within Eastern
              Monday–Monday bounds. This sample is not a real tracker
              connection.
            </Copy>
          </Card>
          <Copy muted>
            Only an authorized member view should expose crew activity. A public
            athlete profile does not automatically expose private crew activity.
          </Copy>
        </>
      ),
    });
  const openMember = (member: CrewMember, scale = 1, week = "Oct 19–25") =>
    drill.push({
      title: member.name,
      render: () => (
        <>
          <Avatar name={member.name} size={78} gold={member.you} />
          <Heading eyebrow={`${crew.name} / Member`}>{member.name}</Heading>
          <Copy muted>
            {member.you
              ? "You · Member since May 2026"
              : "Crew member · Joined June 2026"}
          </Copy>
          <Row>
            <Stat
              value={`${(member.miles * scale).toFixed(1)} mi`}
              label={`${week} contribution`}
            />
            <Stat value={`${member.sessions}`} label="Sample sessions" />
            <Stat
              value={`${((member.miles / amount) * 100).toFixed(0)}%`}
              label="Share of crew volume"
            />
          </Row>
          <Card>
            <Copy bold>Contribution history</Copy>
            <InspectChart
              values={[0.65, 0.85, 0.8, 1].map((v) => v * member.miles * scale)}
              labels={["Earlier", "Week −2", "Week −1", "Selected"]}
              unit="mi"
            />
          </Card>
          <Door
            title="Counted activity"
            note="Private crew view · Sample sessions"
            onPress={() =>
              drill.push({
                title: "Counted activity",
                render: () => (
                  <>
                    <Heading eyebrow={member.name}>
                      Selected week’s effort.
                    </Heading>
                    {Array.from({ length: member.sessions }, (_, i) => (
                      <Door
                        key={i}
                        title={i === 0 ? "Morning miles" : `Run ${i + 1}`}
                        note="Sample counted session"
                        value={`${((member.miles * scale) / member.sessions).toFixed(1)} mi`}
                        onPress={() => openActivity(member, i, scale, week)}
                      />
                    ))}
                  </>
                ),
              })
            }
          />
          <Door
            title="Achievements & personal bests"
            onPress={() =>
              drill.push({
                title: "Member achievements",
                render: () => (
                  <>
                    <Heading>{member.name.split(" ")[0]}’s highlights.</Heading>
                    <Card gold>
                      <Copy size={28} bold>
                        10 active weeks
                      </Copy>
                      <Copy>
                        Sample consistency milestone · No reward entitlement
                      </Copy>
                    </Card>
                    <Stat value="24:18" label="Illustrative fastest 5K" />
                    <Copy muted>
                      Public visibility would be controlled separately from
                      private crew details.
                    </Copy>
                  </>
                ),
              })
            }
          />
        </>
      ),
    });
  const contributions = (scale = 1, week = "Oct 19–25") => (
    <Stack gap={0}>
      {ordered.map((member) => (
        <Pressable
          key={member.name}
          accessibilityRole="button"
          accessibilityLabel={`Open ${member.name} contribution`}
          onPress={() => openMember(member, scale, week)}
          style={({ pressed }) => ({
            paddingVertical: 15,
            gap: 9,
            opacity: pressed ? 0.5 : 1,
            borderBottomWidth: 1,
            borderColor: palette.line,
          })}
        >
          <Row>
            <Avatar name={member.name} gold={member.you} />
            <View style={{ flex: 1 }}>
              <Copy bold>{member.you ? "You · Alex" : member.name}</Copy>
              <Copy size={11} muted>
                {member.sessions} sessions ·{" "}
                {((member.miles / amount) * 100).toFixed(0)}% of crew volume
              </Copy>
            </View>
            <Copy bold>{(member.miles * scale).toFixed(1)} mi</Copy>
          </Row>
          <Meter
            value={member.miles}
            total={
              members[0].miles > members[1].miles
                ? members[0].miles
                : members[1].miles
            }
            label={`${member.name}: ${(member.miles * scale).toFixed(1)} miles`}
            color={member.color}
          />
        </Pressable>
      ))}
    </Stack>
  );
  const openShared = (scale = 1, week = "Oct 19–25") =>
    drill.push({
      title: "Shared progress",
      render: () => (
        <>
          <Heading eyebrow={`${crew.name} · ${week}`}>
            Every mile is part of it.
          </Heading>
          <Stat
            value={`${(amount * scale).toFixed(1)} mi`}
            label="Combined counted Running distance"
            big
          />
          <ContributionStrip
            members={members.map((m) => ({ ...m, miles: m.miles * scale }))}
            total={amount * scale}
          />
          <Copy muted>
            Colors identify member contributions. Total distance is additive;
            intensity and recovery are not inferred.
          </Copy>
          {contributions(scale, week)}
          <Door
            title="What counts?"
            onPress={() =>
              drill.push({
                title: "Crew total receipt",
                render: () => (
                  <>
                    <Heading>The shared total.</Heading>
                    <Copy>
                      Sum eligible counted Running distance for active members,
                      within Eastern Monday–Monday bounds. Plans, pending
                      imports and excluded sessions are not completed progress.
                    </Copy>
                    <Copy>
                      Configured distance target: {crew.goal} mi. Previous week:{" "}
                      {crew.previous} mi. These are distinct baselines.
                    </Copy>
                    <Copy muted>
                      These fixtures demonstrate presentation only. Existing
                      crew authorization and aggregate RPCs remain unchanged.
                    </Copy>
                  </>
                ),
              })
            }
          />
        </>
      ),
    });
  const openRoster = () =>
    drill.push({
      title: "Crew members",
      render: () => (
        <>
          <Heading eyebrow={crew.name}>Your people.</Heading>
          {contributions()}
          <Door
            title="Invite someone"
            note="Preview an invitation; nothing is sent"
            onPress={openInvite}
          />
        </>
      ),
    });
  const openInvite = () =>
    drill.push({
      title: "Invite preview",
      render: () => (
        <>
          <Heading>Good company starts here.</Heading>
          <Card gold>
            <Copy size={25} bold>
              {crew.name}
            </Copy>
            <Copy>Running together · Private crew</Copy>
            <Copy muted>Sample invite code: SUNDAY26</Copy>
          </Card>
          <Copy>
            This is a visual invitation preview. No link is activated, copied,
            shared or sent.
          </Copy>
          <Copy muted>
            A production invitation would reuse the existing membership-scoped
            invite flow.
          </Copy>
        </>
      ),
    });
  const openSessions = () =>
    drill.push({
      title: "Start Line",
      render: () => (
        <SessionTicket
          crewName={crew.name}
          members={members}
          openMember={openMember}
        />
      ),
    });
  const openManage = () =>
    drill.push({
      title: "Crew preferences",
      render: () => (
        <CrewPreferences initialName={crew.name} initialTarget={crew.goal} />
      ),
    });
  const doors = (
    <Stack gap={0}>
      <Door
        title="Shared progress"
        note={`${amount.toFixed(1)} mi · Every member’s contribution`}
        onPress={() => openShared()}
      />
      <Door
        title="Members"
        note={`${members.length} people · Details & achievements`}
        onPress={openRoster}
      />
      <Door
        title="Start Line sessions"
        note="Plans & local RSVP preview"
        onPress={openSessions}
      />
      <Door title="Invite preview" onPress={openInvite} />
      <Door
        title="Crew preferences"
        note="Local draft · No crew writes"
        onPress={openManage}
      />
    </Stack>
  );
  let content;
  switch (concept.id) {
    case "mosaic":
      content = (
        <>
          <Heading eyebrow="This week / Combined Running">
            A bigger picture.
          </Heading>
          <Row>
            <Stat
              value={`${amount.toFixed(1)} mi`}
              label={`${members.length} contributors`}
              big
            />
            <Copy size={12} muted>
              {Math.round((amount / crew.goal) * 100)}% of target
            </Copy>
          </Row>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {members.map((member) => (
              <Pressable
                key={member.name}
                accessibilityRole="button"
                accessibilityLabel={`Open ${member.name} contribution`}
                onPress={() => openMember(member)}
                style={{
                  width: "48%",
                  minHeight: 110 + member.miles * 2,
                  borderRadius: 19,
                  backgroundColor: member.you ? palette.tennis : member.color,
                  padding: 17,
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <Avatar name={member.name} gold={member.you} />
                <View>
                  <Copy
                    color={
                      member.color === "#176c75" && !member.you
                        ? "white"
                        : palette.ink
                    }
                    bold
                  >
                    {member.name.split(" ")[0]}
                  </Copy>
                  <Copy
                    size={28}
                    bold
                    color={
                      member.color === "#176c75" && !member.you
                        ? "white"
                        : palette.ink
                    }
                  >
                    {member.miles.toFixed(1)}
                  </Copy>
                  <Copy
                    size={10}
                    color={
                      member.color === "#176c75" && !member.you
                        ? "white"
                        : palette.ink
                    }
                  >
                    MILES TOGETHER
                  </Copy>
                </View>
              </Pressable>
            ))}
          </View>
          {doors}
        </>
      );
      break;
    case "relay":
      content = (
        <>
          <Heading eyebrow="Many efforts / One total">Pass it forward.</Heading>
          <Card dark>
            <Stat
              value={`${amount.toFixed(1)} mi`}
              label={`Toward ${crew.goal} mi shared distance target`}
              big
            />
            <ContributionStrip members={members} total={amount} />
            <Copy size={12} muted>
              Each color is one member’s volume, not a scheduled relay leg.
            </Copy>
            <Action
              label="Unpack the shared effort →"
              primary
              onPress={() => openShared()}
            />
          </Card>
          {members.map((member, i) => (
            <View key={member.name} style={{ flexDirection: "row", gap: 15 }}>
              <View style={{ width: 28, alignItems: "center" }}>
                <View
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 8,
                    backgroundColor: member.color,
                  }}
                />
                <View
                  style={{ width: 2, flex: 1, backgroundColor: palette.line }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Door
                  title={member.name}
                  note={`${member.sessions} counted sessions`}
                  value={`${member.miles.toFixed(1)} mi`}
                  onPress={() => openMember(member)}
                />
              </View>
            </View>
          ))}
          {doors}
        </>
      );
      break;
    case "constellation":
      content = (
        <>
          <Heading eyebrow={crew.description}>Everyone belongs.</Heading>
          <Constellation
            members={members}
            amount={amount}
            onPress={openMember}
          />
          <Card gold>
            <Row>
              <Copy bold>
                {Math.round((amount / crew.goal) * 100)}% together
              </Copy>
              <Copy size={12}>{crew.goal} mi target</Copy>
            </Row>
            <Meter
              value={amount}
              total={crew.goal}
              label={`${amount} of ${crew.goal} miles`}
            />
          </Card>
          <Action
            label="See the shared breakdown →"
            onPress={() => openShared()}
          />
          {doors}
        </>
      );
      break;
    case "clubhouse":
      content = (
        <>
          <Card dark>
            <View
              style={{ alignItems: "center", gap: 14, paddingVertical: 17 }}
            >
              <View
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 39,
                  backgroundColor: palette.tennis,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Copy size={30} bold color={palette.ink}>
                  SP
                </Copy>
              </View>
              <Copy size={31} bold>
                {crew.name}
              </Copy>
              <Copy muted>{crew.description}</Copy>
              <Row>
                <Stat value={`${members.length}`} label="Members" />
                <Stat value={`${sessions}`} label="Shared sessions" />
              </Row>
            </View>
          </Card>
          <Card gold>
            <Door
              title="The shared week"
              note={`${amount.toFixed(1)} / ${crew.goal} mi target`}
              value={`${Math.round((amount / crew.goal) * 100)}%`}
              onPress={() => openShared()}
            />
            <Meter
              value={amount}
              total={crew.goal}
              label="Shared distance target progress"
            />
          </Card>
          <Row>
            {members.slice(0, 5).map((m) => (
              <Pressable
                key={m.name}
                accessibilityRole="button"
                accessibilityLabel={`Open ${m.name} contribution`}
                onPress={() => openMember(m)}
              >
                <Avatar name={m.name} gold={m.you} />
              </Pressable>
            ))}
          </Row>
          {doors}
        </>
      );
      break;
    case "roster":
      content = (
        <>
          <Heading eyebrow={`${members.length} people / Private crew`}>
            Your people, in depth.
          </Heading>
          <Row>
            <Stat value={`${amount.toFixed(1)} mi`} label="Shared distance" />
            <Stat value={`${sessions}`} label="Shared sessions" />
          </Row>
          <Segments
            options={["Contribution", "Name"]}
            value={sort}
            onChange={setSort}
          />
          {contributions()}
          <Copy size={11} muted>
            Ordered by {sort.toLowerCase()}; contribution is not a measure of
            belonging.
          </Copy>
          {doors}
        </>
      );
      break;
    case "calendar":
      content = (
        <>
          <Heading eyebrow="Oct 19–25 / Shared week">When we move.</Heading>
          <Stat
            value={`${amount.toFixed(1)} mi`}
            label="Crew’s counted Running distance"
            big
          />
          <Chart
            values={dayShares.map((v) => v * amount)}
            labels={weekdays}
            selected={day}
            onSelect={setDay}
            kind="bar"
            unit="mi"
          />
          <Card gold>
            <Copy size={20} bold>
              {weekdays[day]} · {(amount * dayShares[day]).toFixed(1)} mi
              together
            </Copy>
            <Copy size={12}>
              {dayShares[day] === 0
                ? "No recorded contribution in this sample day."
                : `${members.length} sample contributors. Tap a member below to inspect their week.`}
            </Copy>
          </Card>
          {dayShares[day] > 0 &&
            members.map((m) => (
              <Door
                key={m.name}
                title={m.name}
                note={`Sample ${weekdays[day]} contribution`}
                value={`${(m.miles * dayShares[day]).toFixed(1)} mi`}
                onPress={() => openMember(m)}
              />
            ))}
          <Copy size={11} muted>
            Daily bars are recorded effort. Start Line sessions below are plans
            and do not add distance.
          </Copy>
          {doors}
        </>
      );
      break;
    case "sessions":
      content = (
        <>
          <Heading eyebrow="Make time / Together">
            See you at the start.
          </Heading>
          <Card dark>
            <Copy size={12} muted>
              SUNDAY / OCT 25 / 8:30 AM ET
            </Copy>
            <Copy size={34} bold>
              Easy miles.{"\n"}Good company.
            </Copy>
            <Row>
              <Copy>Riverside path</Copy>
              <Copy size={12}>3 sample RSVPs</Copy>
            </Row>
            <Action
              label="Open session & RSVP →"
              primary
              onPress={openSessions}
            />
          </Card>
          <Card gold>
            <Row>
              <Stat
                value={`${amount.toFixed(1)} mi`}
                label="Already counted this week"
              />
              <Stat value={`${members.length}`} label="Crew members" />
            </Row>
            <Meter
              value={amount}
              total={crew.goal}
              label="Shared recorded distance"
            />
          </Card>
          {doors}
        </>
      );
      break;
    case "chapters":
      content = (
        <>
          <Heading eyebrow="Your collective story">
            Weeks worth keeping.
          </Heading>
          {["Oct 19–25", "Oct 12–18", "Oct 5–11"].map((week, i) => {
            const value =
              i === 0 ? amount : i === 1 ? crew.previous : crew.previous * 0.9;
            return (
              <Card key={week} dark={i === 0}>
                <Copy size={12} muted>
                  {week} · {i === 0 ? "In progress" : "Closed week"}
                </Copy>
                <Copy size={36} bold>
                  {value.toFixed(1)} mi
                </Copy>
                <ContributionStrip members={members} total={amount} />
                <Copy size={16}>
                  {
                    [
                      "Everyone left a little of themselves here.",
                      "A steady week, shared six ways.",
                      "The beginning of a good rhythm.",
                    ][i]
                  }
                </Copy>
                <Action
                  label={`Open ${week} recap →`}
                  primary={i === 0}
                  onPress={() => openShared(value / amount, week)}
                />
              </Card>
            );
          })}
          {doors}
        </>
      );
      break;
    default:
      content = (
        <>
          <Heading eyebrow={`${crew.name} / Oct 19–25`}>
            A little further, together.
          </Heading>
          <Card style={{ backgroundColor: "#e3eee8" }}>
            <Row>
              <Stat
                value={`${amount.toFixed(1)} mi`}
                label="Shared Running distance"
              />
              <Copy size={12}>{crew.goal} mi target</Copy>
            </Row>
            <Journey
              amount={amount}
              goal={crew.goal}
              onPress={() => openShared()}
            />
            <Row>
              <Copy size={11}>0 mi / Shared start</Copy>
              <Copy size={11}>{crew.goal} mi / Target</Copy>
            </Row>
          </Card>
          <Row>
            <Stat value={`${sessions}`} label="Counted sessions" />
            <Stat value={`${members.length}`} label="Contributors" />
            <Stat
              value={`+${(amount - crew.previous).toFixed(1)}`}
              label="Miles vs prior week"
            />
          </Row>
          <ContributionStrip members={members} total={amount} />
          {doors}
        </>
      );
  }
  return (
    <>
      <Screen>
        <Row>
          <Copy size={12} bold>
            CREW
          </Copy>
          <Copy size={10} muted>
            Fictional study
          </Copy>
        </Row>
        <Segments
          options={crews.map((c) => c.name)}
          value={crew.name}
          onChange={(name) =>
            setCrewIndex(crews.findIndex((c) => c.name === name))
          }
        />
        {scenario === "Populated" ? (
          content
        ) : (
          <Card>
            <Heading>
              {scenario === "First crew"
                ? "Your crew starts with you."
                : "The crew is unavailable."}
            </Heading>
            <Copy>
              {scenario === "First crew"
                ? "Start a private group or preview an invitation. There is no shared activity to display yet."
                : "No cached total is presented as a fresh shared week."}
            </Copy>
            <Action label="Preview invitation" onPress={openInvite} />
            <Action
              label="Restore sample crew"
              primary
              onPress={() => setScenario("Populated")}
            />
          </Card>
        )}
        <Segments
          options={["Populated", "First crew", "Unavailable"]}
          value={scenario}
          onChange={setScenario}
        />
      </Screen>
      <Drilldown drill={drill} />
    </>
  );
}
function ContributionStrip({
  members,
  total,
}: {
  members: readonly CrewMember[];
  total: number;
}) {
  return (
    <View
      accessible
      accessibilityLabel={members
        .map((m) => `${m.name}, ${m.miles.toFixed(1)} miles`)
        .join(". ")}
      style={{
        height: 23,
        flexDirection: "row",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {members.map((m) => (
        <View
          key={m.name}
          style={{
            width: `${(m.miles / total) * 100}%`,
            backgroundColor: m.color,
            borderRightWidth: 2,
            borderColor: "white",
          }}
        />
      ))}
    </View>
  );
}
function Journey({
  amount,
  goal,
  onPress,
}: {
  amount: number;
  goal: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Explore shared journey contributions"
      onPress={onPress}
    >
      <Svg width="100%" height={240} viewBox="0 0 320 240">
        <Polyline
          points={journeyPoints.map((p) => p.join(",")).join(" ")}
          stroke="#c1d9ca"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points={journeyPoints.map((p) => p.join(",")).join(" ")}
          stroke={palette.teal}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={`${Math.min(1, amount / goal) * journeyLength} ${journeyLength}`}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const p = journeyPosition(fraction);
          return (
            <Circle
              key={fraction}
              cx={p.x}
              cy={p.y}
              r="6"
              stroke="white"
              strokeWidth="2"
              fill={fraction <= amount / goal ? palette.teal : "#b8cfc3"}
            />
          );
        })}
        <Circle
          cx={journeyPosition(amount / goal).x}
          cy={journeyPosition(amount / goal).y}
          r="12"
          stroke="white"
          strokeWidth="3"
          fill={palette.tennis}
        />
      </Svg>
    </Pressable>
  );
}
function Constellation({
  members,
  amount,
  onPress,
}: {
  members: readonly CrewMember[];
  amount: number;
  onPress: (m: CrewMember) => void;
}) {
  return (
    <View
      style={{ height: 308, alignItems: "center", justifyContent: "center" }}
    >
      <View style={{ width: 278, height: 278 }}>
        <Svg width="278" height="278" viewBox="0 0 278 278">
          <Circle
            cx="139"
            cy="139"
            r="104"
            fill="none"
            stroke={palette.line}
            strokeWidth="2"
            strokeDasharray="4 6"
          />
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 106,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Copy size={35} bold>
            {amount.toFixed(1)}
          </Copy>
          <Copy size={11} muted>
            MILES TOGETHER
          </Copy>
        </View>
        {members.map((m, i) => {
          const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <Pressable
              key={m.name}
              accessibilityRole="button"
              accessibilityLabel={`Open ${m.name} contribution`}
              onPress={() => onPress(m)}
              style={{
                position: "absolute",
                left: 139 + Math.cos(angle) * 108 - 26,
                top: 139 + Math.sin(angle) * 108 - 26,
                width: 52,
                alignItems: "center",
                gap: 3,
              }}
            >
              <Avatar name={m.name} size={48} gold={m.you} />
              <Copy size={10} bold>
                {m.name.split(" ")[0]}
              </Copy>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
function SessionTicket({
  crewName,
  members,
  openMember,
}: {
  crewName: string;
  members: readonly CrewMember[];
  openMember: (m: CrewMember) => void;
}) {
  const [going, setGoing] = useState(false);
  return (
    <>
      <Heading eyebrow={`${crewName} / Planned session`}>
        Easy miles. Good company.
      </Heading>
      <Card dark>
        <Copy size={12} muted>
          OCT 25 / 2026 / AMERICA/NEW_YORK
        </Copy>
        <Copy size={39} bold>
          8:30 AM
        </Copy>
        <Copy>Sunday · Riverside path</Copy>
        <Copy size={12} muted>
          Organizer: Mara · Easy running · Sample plan
        </Copy>
      </Card>
      <Action
        label={going ? "Going ✓ · Tap to undo" : "RSVP locally"}
        primary
        onPress={() => setGoing(!going)}
      />
      <Copy>
        {going
          ? "Local preview: you are going. No RSVP was sent."
          : "Local preview: 3 sample RSVPs. No notifications or invitations are sent."}
      </Copy>
      <Heading eyebrow="People at the start">The company.</Heading>
      {members.slice(0, 3).map((m) => (
        <Door
          key={m.name}
          title={m.name}
          note="Sample attendee"
          onPress={() => openMember(m)}
        />
      ))}
      <Copy muted>
        A planned session never adds activity, shared distance or competition
        credit.
      </Copy>
    </>
  );
}
function CrewPreferences({
  initialName,
  initialTarget,
}: {
  initialName: string;
  initialTarget: number;
}) {
  const [name, setName] = useState(initialName),
    [target, setTarget] = useState(String(initialTarget)),
    [saved, setSaved] = useState(false);
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(Number(target)) &&
    Number(target) > 0;
  return (
    <>
      <Heading>Crew preferences.</Heading>
      <Copy muted>
        Local form exploration. Existing crew permissions would apply in
        production.
      </Copy>
      <Copy bold>Crew name</Copy>
      <TextInput
        accessibilityLabel="Crew name draft"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setSaved(false);
        }}
        style={{
          minHeight: 48,
          padding: 14,
          backgroundColor: "white",
          borderRadius: 12,
          color: palette.ink,
        }}
      />
      <Copy bold>Shared distance target · mi</Copy>
      <TextInput
        accessibilityLabel="Crew target draft"
        keyboardType="decimal-pad"
        value={target}
        onChangeText={(value) => {
          setTarget(value);
          setSaved(false);
        }}
        style={{
          minHeight: 48,
          padding: 14,
          backgroundColor: "white",
          borderRadius: 12,
          color: palette.ink,
        }}
      />
      <Action
        label="Preview saved draft"
        primary
        onPress={() => setSaved(valid)}
      />
      <Copy>
        {saved
          ? `Local draft saved: ${name.trim()} · ${Number(target)} mi. No crew data changed.`
          : valid
            ? "Name and target are ready to preview."
            : "Enter a name and a positive distance."}
      </Copy>
    </>
  );
}

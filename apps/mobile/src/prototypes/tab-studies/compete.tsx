import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import {
  Action,
  Avatar,
  Card,
  InspectChart,
  Copy,
  Door,
  Drilldown,
  Heading,
  Meter,
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
  boardFor,
  competeConcepts,
  currentWeek,
  previousWeek,
  sports,
  volumeLabel,
  type Athlete,
  type Sport,
  type Track,
} from "./compete-data";

export default function CompeteStudy() {
  return (
    <Study
      title="Compete / Nine ways in"
      tab="Compete"
      concepts={competeConcepts}
      render={(concept) => <CompeteConcept concept={concept} />}
    />
  );
}
function CompeteConcept({ concept }: { concept: StudyConcept }) {
  const [sport, setSport] = useState<Sport>("Running");
  const [track, setTrack] = useState<Track>("Open");
  const [previous, setPrevious] = useState(false);
  const [scenario, setScenario] = useState<
    "Populated" | "New athlete" | "Offline"
  >("Populated");
  const drill = useDrilldown();
  const board = boardFor(sport, track, previous);
  const you = board.find((a) => a.you)!;
  const rival = board[you.place - 2];
  const openSession = (athlete: Athlete, index: number) =>
    drill.push({
      title: "Counted session",
      render: () => (
        <>
          <Heading eyebrow={`${sport} · ${track}`}>
            {index === 0 ? "Morning miles" : "Evening session"}
          </Heading>
          <Row>
            <Stat
              value={volumeLabel(
                athlete.volume * (index === 0 ? 0.6 : 0.4),
                sport,
              )}
              label="Counted volume"
            />
            <Stat value="Imported" label="Fictional source" />
          </Row>
          <Card>
            <Copy bold>Why this session counts</Copy>
            <Copy>
              Within the selected Eastern week, in this sport and eligible on{" "}
              {track}. This is a sample receipt, with no live tracker
              connection.
            </Copy>
          </Card>
          <Copy muted>
            Public athlete details would require a separate privacy decision.
            This study shows fictional sessions only.
          </Copy>
        </>
      ),
    });
  const openAthlete = (
    athlete: Athlete,
    weekLabel = previous ? previousWeek : currentWeek,
  ) =>
    drill.push({
      title: athlete.name,
      render: () => (
        <>
          <Avatar name={athlete.name} size={76} gold={athlete.you} />
          <Heading
            eyebrow={athlete.you ? "Your field profile" : "Field athlete"}
          >
            {athlete.name}
          </Heading>
          <Row>
            <Stat value={`#${athlete.place}`} label={`${sport} · ${track}`} />
            <Stat
              value={volumeLabel(athlete.volume, sport)}
              label={weekLabel}
            />
            <Stat value={`${athlete.effort}`} label="Effort rating" />
          </Row>
          <Card>
            <Copy bold>Counted sessions</Copy>
            {[0, 1].map((i) => (
              <Door
                key={i}
                title={i === 0 ? "Morning miles" : "Evening session"}
                note="Sample eligible activity"
                value={volumeLabel(
                  athlete.volume * (i === 0 ? 0.6 : 0.4),
                  sport,
                )}
                onPress={() => openSession(athlete, i)}
              />
            ))}
          </Card>
          <Door
            title="Season history"
            note="Four settled weeks in this field"
            onPress={() => openHistory()}
          />
        </>
      ),
    });
  const table = (
    rows = board,
    bars = false,
    compact = false,
    weekLabel = previous ? previousWeek : currentWeek,
  ) => (
    <Stack gap={0}>
      {rows.map((a) => (
        <Pressable
          key={a.name}
          accessibilityRole="button"
          accessibilityLabel={`Open ${a.name}, place ${a.place}, ${volumeLabel(a.volume, sport)}`}
          onPress={() => openAthlete(a, weekLabel)}
          style={({ pressed }) => ({
            paddingVertical: compact ? 10 : 15,
            paddingHorizontal: a.you ? 10 : 0,
            borderBottomWidth: 1,
            borderColor: concept.dark ? "#375260" : palette.line,
            borderRadius: a.you ? 12 : 0,
            backgroundColor: a.you
              ? concept.dark
                ? "#33505a"
                : palette.soft
              : "transparent",
            opacity: pressed ? 0.5 : 1,
            gap: 8,
          })}
        >
          <Row>
            <Copy size={compact ? 12 : 16} bold>
              {String(a.place).padStart(2, "0")}
            </Copy>
            {!compact && <Avatar name={a.name} gold={a.you} />}
            <View style={{ flex: 1, gap: 2 }}>
              <Copy size={compact ? 12 : 14} bold>
                {a.you ? "You · Alex" : a.name}
              </Copy>
              {!compact && (
                <Copy size={11} muted>
                  {a.effort} effort · {a.you ? "Your total" : "View athlete"}
                </Copy>
              )}
            </View>
            <Copy size={compact ? 12 : 16} bold>
              {volumeLabel(a.volume, sport)}
            </Copy>
          </Row>
          {bars && (
            <Meter
              value={a.volume}
              total={board[0].volume}
              label={`${a.name}: ${volumeLabel(a.volume, sport)}`}
              color={a.you ? palette.tennis : palette.teal}
            />
          )}
        </Pressable>
      ))}
    </Stack>
  );
  const openBoard = (closed = previous) => {
    const rows = boardFor(sport, track, closed);
    drill.push({
      title: closed ? "Final standings" : "Full standings",
      render: () => (
        <>
          <Heading eyebrow={`${sport} · ${track}`}>
            {closed ? previousWeek : currentWeek}
          </Heading>
          <Copy muted>
            {closed
              ? "Settled · Final places"
              : "In progress · Ends Mon Oct 26, 00:00 ET"}
          </Copy>
          {table(rows, true, false, closed ? previousWeek : currentWeek)}
          <Door
            title="Week rules & score receipt"
            onPress={() => openRules(closed)}
          />
        </>
      ),
    });
  };
  const openRules = (closed = previous) =>
    drill.push({
      title: "Week & scoring",
      render: () => (
        <>
          <Heading>Every effort has a receipt.</Heading>
          <Card>
            <Copy bold>
              {sport} · {track}
            </Copy>
            <Copy>
              {closed
                ? "Oct 12, 00:00 → Oct 19, 00:00"
                : "Oct 19, 00:00 → Oct 26, 00:00"}{" "}
              America/New_York. Start included, end excluded.
            </Copy>
            <Copy>
              Volume determines this sample weekly place. Effort rating is a
              separate number. Open and GPS are independent views; past you is
              never ranked.
            </Copy>
          </Card>
          <Door
            title="Your counted activities"
            onPress={() => openAthlete(you)}
          />
          <Copy muted>
            Illustrative receipt only. No scoring, settlement or eligibility
            logic changes.
          </Copy>
        </>
      ),
    });
  const openHistory = () =>
    drill.push({
      title: "Past results",
      render: () => (
        <>
          <Heading eyebrow="Settled weeks">Your previous starts.</Heading>
          {["Oct 12–18", "Oct 5–11", "Sep 28–Oct 4", "Sep 21–27"].map(
            (week, i) => (
              <Door
                key={week}
                title={week}
                note={`${sport} · ${track} · Settled`}
                value={`#${[2, 2, 2, 2][i]}`}
                onPress={() =>
                  drill.push({
                    title: week,
                    render: () => (
                      <>
                        <Heading eyebrow="Final result">{week}</Heading>
                        <Row>
                          <Stat
                            value={`#${[2, 2, 2, 2][i]}`}
                            label="Your final place"
                          />
                          <Stat
                            value={`${[8, 4, 14, -3][i] > 0 ? "+" : ""}${[8, 4, 14, -3][i]}`}
                            label="Sample rating change"
                          />
                        </Row>
                        {table(
                          boardFor(sport, track, true)
                            .map((a) => ({
                              ...a,
                              volume: a.volume * (1 - i * 0.08),
                            }))
                            .sort((a, b) => a.place - b.place),
                          false,
                          false,
                          week,
                        )}
                        <Copy muted>
                          Historical placements and rating changes are
                          illustrative study fixtures.
                        </Copy>
                        <Door
                          title="How this week was counted"
                          onPress={() =>
                            drill.push({
                              title: "Historical scoring",
                              render: () => (
                                <>
                                  <Heading>{week}</Heading>
                                  <Copy>
                                    Settled {sport} · {track}. Eastern
                                    Monday–Monday, start included and end
                                    excluded.
                                  </Copy>
                                  <Copy muted>
                                    Fictional historical receipt. Place and
                                    volume are separate from effort rating.
                                  </Copy>
                                </>
                              ),
                            })
                          }
                        />
                      </>
                    ),
                  })
                }
              />
            ),
          )}
        </>
      ),
    });
  const podium = () => (
    <Row style={{ alignItems: "flex-end", gap: 6 }}>
      {[board[1], board[0], board[2]].map((a) => (
        <Pressable
          key={a.name}
          accessibilityRole="button"
          accessibilityLabel={`Open ${a.name}, place ${a.place}`}
          onPress={() => openAthlete(a)}
          style={{ flex: 1, alignItems: "center", gap: 10 }}
        >
          <Avatar name={a.name} size={a.place === 1 ? 60 : 46} gold={a.you} />
          <Copy size={12} bold>
            {a.you ? "You" : a.name.split(" ")[0]}
          </Copy>
          <View
            style={{
              width: "100%",
              paddingVertical: a.place === 1 ? 29 : a.place === 2 ? 20 : 13,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              backgroundColor: a.you ? palette.tennis : "#dce8e6",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Copy size={28} bold color={palette.ink}>
              {a.place}
            </Copy>
            <Copy size={11} color={palette.ink}>
              {volumeLabel(a.volume, sport)}
            </Copy>
          </View>
        </Pressable>
      ))}
    </Row>
  );
  const context = (
    <Stack gap={9}>
      <Segments
        options={sports}
        value={sport}
        onChange={(v) => {
          setSport(v);
          if (v === "Strength") setTrack("Open");
        }}
      />
      <Segments
        options={sport === "Strength" ? ["Open"] : ["Open", "GPS"]}
        value={track}
        onChange={setTrack}
      />
    </Stack>
  );
  const links = (
    <Stack gap={0}>
      <Door
        title="Past results"
        note="Settled weeks, places & score receipts"
        onPress={openHistory}
      />
      <Door
        title="Event details"
        note="Period, rules and counted activity"
        onPress={() => openRules()}
      />
      <Door
        title="Choose an event"
        note="Review your sport registrations"
        onPress={() =>
          drill.push({
            title: "Your events",
            render: () => (
              <>
                <Heading>Choose your field.</Heading>
                {sports.map((v) => (
                  <Door
                    key={v}
                    title={v}
                    note={
                      v === "Strength"
                        ? "Open · Time-based volume"
                        : `${track} · Distance-based volume`
                    }
                    value={v === sport ? "Selected" : "Choose"}
                    onPress={() => {
                      setSport(v);
                      if (v === "Strength") setTrack("Open");
                      drill.close();
                    }}
                  />
                ))}
                <Copy muted>
                  All events here are sample registrations. No join request is
                  sent.
                </Copy>
              </>
            ),
          })
        }
      />
    </Stack>
  );
  let content;
  switch (concept.id) {
    case "chase":
      content = (
        <>
          <Card dark>
            <Copy size={11} muted>
              YOUR NEXT PLACE
            </Copy>
            <Row>
              <Avatar name={rival.name} size={62} />
              <View style={{ flex: 1 }}>
                <Copy size={25} bold>
                  {rival.name.split(" ")[0]} is ahead.
                </Copy>
                <Copy muted>
                  One place, {volumeLabel(rival.volume - you.volume, sport)}{" "}
                  apart.
                </Copy>
              </View>
            </Row>
            <Row>
              <Stat value={`#${you.place}`} label="You" />
              <Stat
                value={`#${rival.place}`}
                label={rival.name.split(" ")[0]}
              />
            </Row>
            <Action
              label="Compare your weeks →"
              primary
              onPress={() =>
                drill.push({
                  title: "The gap",
                  render: () => (
                    <>
                      <Heading>You and {rival.name.split(" ")[0]}.</Heading>
                      <Copy>
                        Weekly volume · {sport} · {track}
                      </Copy>
                      <InspectChart
                        values={[1, 3, 6, 8, 13, you.volume]}
                        comparison={[2, 5, 7, 10, 14, rival.volume]}
                        labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
                        unit={sport === "Strength" ? "min" : "mi"}
                      />
                      <Copy muted>
                        Solid: you · Dashed: {rival.name}. Fictional cumulative
                        volumes, no predicted finishing place.
                      </Copy>
                      <Door
                        title={`${rival.name}’s week`}
                        onPress={() => openAthlete(rival)}
                      />
                    </>
                  ),
                })
              }
            />
          </Card>
          <Heading eyebrow="The full chase">Six people. One week.</Heading>
          {table(board, true)}
          {links}
        </>
      );
      break;
    case "podium":
      content = (
        <>
          <Heading eyebrow={`${currentWeek} · In progress`}>
            Room at the top.
          </Heading>
          {podium()}
          <Copy size={11} muted>
            Current places · Not a final award
          </Copy>
          {table(board.slice(3))}
          <Action label="All six athletes →" onPress={() => openBoard()} />
          {links}
        </>
      );
      break;
    case "tickets":
      content = (
        <>
          <Heading eyebrow="Your registered events">Pick your meet.</Heading>
          {sports.map((v) => {
            const rows = boardFor(v, v === "Strength" ? "Open" : track);
            return (
              <Card key={v} dark={v === sport}>
                <Row>
                  <Copy size={23} bold>
                    {v}
                  </Copy>
                  <Copy size={12}>#{rows.find((a) => a.you)!.place} / 6</Copy>
                </Row>
                <Copy size={12} muted>
                  {currentWeek} · {v === "Strength" ? "Open" : track}
                </Copy>
                {rows.slice(0, 3).map((a) => (
                  <Row key={a.name}>
                    <Copy size={12}>
                      {a.place} · {a.you ? "You" : a.name}
                    </Copy>
                    <Copy size={12} bold>
                      {volumeLabel(a.volume, v)}
                    </Copy>
                  </Row>
                ))}
                <Action
                  label={`Open ${v} meet →`}
                  primary
                  onPress={() => {
                    setSport(v);
                    if (v === "Strength") setTrack("Open");
                    drill.push({
                      title: `${v} meet`,
                      render: () => (
                        <>
                          <Heading
                            eyebrow={`${currentWeek} · ${v === "Strength" ? "Open" : track}`}
                          >
                            {v}
                          </Heading>
                          {rows.map((a) => (
                            <Door
                              key={a.name}
                              title={`${a.place} · ${a.name}`}
                              value={volumeLabel(a.volume, v)}
                              onPress={() =>
                                drill.push({
                                  title: a.name,
                                  render: () => (
                                    <>
                                      <Avatar name={a.name} size={70} />
                                      <Heading>{a.name}</Heading>
                                      <Stat
                                        value={volumeLabel(a.volume, v)}
                                        label={`${v} · Sample weekly total`}
                                      />
                                      <Copy muted>
                                        Fictional meet athlete. This ticket
                                        explores event-level navigation.
                                      </Copy>
                                    </>
                                  ),
                                })
                              }
                            />
                          ))}
                          <Copy muted>
                            Sample registration · No join writes
                          </Copy>
                        </>
                      ),
                    });
                  }}
                />
              </Card>
            );
          })}
          {links}
        </>
      );
      break;
    case "switchboard":
      content = (
        <>
          <Heading>All your fields.</Heading>
          <View style={{ flexDirection: "row", gap: 14 }}>
            <View style={{ width: 65, gap: 10 }}>
              {sports.map((v) => (
                <Action
                  key={v}
                  small
                  label={
                    v === "Running" ? "Run" : v === "Cycling" ? "Ride" : "Lift"
                  }
                  selected={sport === v}
                  onPress={() => {
                    setSport(v);
                    if (v === "Strength") setTrack("Open");
                  }}
                />
              ))}
            </View>
            <View style={{ flex: 1, gap: 14 }}>
              <Copy size={21} bold>
                {sport}
              </Copy>
              <Stat
                value={`#${you.place}`}
                label={`${volumeLabel(you.volume, sport)} · ${currentWeek}`}
              />
              {table(board, false, true)}
            </View>
          </View>
          {links}
        </>
      );
      break;
    case "season":
      content = (
        <>
          <Heading eyebrow="Running chapter / Autumn">
            One week at a time.
          </Heading>
          <ScrollWeeks previous={previous} onChange={setPrevious} />
          <Card gold>
            <Row>
              <Stat
                value={previous ? "Final #2" : "Current #3"}
                label={previous ? previousWeek : currentWeek}
              />
              <Copy size={12}>
                {previous
                  ? "Settled\n+8 sample rating"
                  : "In progress\nMon 26 · 00:00 ET"}
              </Copy>
            </Row>
          </Card>
          {table(board)}
          {links}
        </>
      );
      break;
    case "terminal":
      content = (
        <>
          <Heading eyebrow="FIELD 014 / ASYNCHRONOUS">Race room.</Heading>
          <Row>
            <Stat value={`0${you.place}`} label="YOUR PLACE" big />
            <Stat value={volumeLabel(you.volume, sport)} label="WEEK VOLUME" />
          </Row>
          <View
            style={{
              borderTopWidth: 1,
              borderColor: "#375260",
              paddingTop: 10,
            }}
          >
            <Row>
              <Copy size={10} muted>
                RANK / ATHLETE
              </Copy>
              <Copy size={10} muted>
                VOLUME
              </Copy>
            </Row>
            {table(board, false, true)}
          </View>
          <Card>
            <Row>
              <Copy size={11}>CURRENT GAP</Copy>
              <Copy bold>{volumeLabel(rival.volume - you.volume, sport)}</Copy>
            </Row>
            <Copy size={12} muted>
              To #{rival.place} · {rival.name}
            </Copy>
            <Action label="Inspect rival" onPress={() => openAthlete(rival)} />
          </Card>
          {links}
        </>
      );
      break;
    case "terrain":
      content = (
        <>
          <Heading eyebrow="Same totals / Two views">Find your place.</Heading>
          <Card style={{ backgroundColor: "#dce9e4", height: 215 }}>
            <Svg
              width="100%"
              height="100%"
              viewBox="0 0 320 170"
              accessible
              accessibilityLabel="Illustrative field, not a GPS map"
            >
              <Path
                d="M15 158 C30 90 290 130 200 70 S80 70 298 15"
                fill="none"
                stroke="#aecbc0"
                strokeWidth="32"
              />
              <Path
                d="M15 158 C30 90 290 130 200 70 S80 70 298 15"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="3 7"
              />
              {[
                [290, 16],
                [215, 46],
                [165, 76],
                [219, 105],
                [110, 125],
                [33, 146],
              ].map(([x, y], i) => (
                <Circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={i === 2 ? 12 : 8}
                  fill={i === 2 ? palette.tennis : palette.teal}
                  stroke="white"
                  strokeWidth="3"
                />
              ))}
            </Svg>
          </Card>
          <Copy size={10} muted>
            Illustrative placement · Not measured locations
          </Copy>
          {table(board)}
          {links}
        </>
      );
      break;
    case "results":
      content = (
        <>
          <Heading eyebrow="Your last finish">A week to keep.</Heading>
          <Card dark>
            <Copy size={12} muted>
              {previousWeek} · {sport} · {track}
            </Copy>
            <Stat value="#2" label="FINAL PLACE / 6 ATHLETES" big />
            <Row>
              <Stat value="+8" label="Sample rating change" />
              <Stat
                value={volumeLabel(
                  boardFor(sport, track, true).find((a) => a.you)!.volume,
                  sport,
                )}
                label="Final weekly volume"
              />
            </Row>
            <Action
              label="Open final leaderboard →"
              primary
              onPress={() => openBoard(true)}
            />
          </Card>
          <Door
            title="This week is in progress"
            value={`#${you.place}`}
            note={`${currentWeek} · ${volumeLabel(you.volume, sport)}`}
            onPress={() => openBoard(false)}
          />
          <Heading eyebrow="Your competition shelf">Past results.</Heading>
          {["Oct 5–11 · 3rd", "Sep 28–Oct 4 · 1st"].map((v) => (
            <Door key={v} title={v} note="Settled week" onPress={openHistory} />
          ))}
          {links}
        </>
      );
      break;
    default:
      content = (
        <>
          <Heading eyebrow={`${currentWeek} / Ends Mon, 00:00 ET`}>
            The weekly board.
          </Heading>
          <Row>
            <Stat value={`#${you.place}`} label="Your place / 6 athletes" big />
            <View>
              <Copy size={23} bold>
                {volumeLabel(you.volume, sport)}
              </Copy>
              <Copy size={12} muted>
                {volumeLabel(rival.volume - you.volume, sport)} to #
                {rival.place}
              </Copy>
            </View>
          </Row>
          <Row>
            <Copy size={11} muted>
              PLACE / ATHLETE
            </Copy>
            <Copy size={11} muted>
              WEEKLY VOLUME
            </Copy>
          </Row>
          {table(board)}
          {links}
        </>
      );
  }
  return (
    <>
      <Screen dark={concept.dark}>
        <Row>
          <Copy size={12} bold>
            COMPETE
          </Copy>
          <Copy size={10} muted>
            Fictional study
          </Copy>
        </Row>
        {concept.id !== "switchboard" && context}
        {scenario === "Populated" ? (
          content
        ) : (
          <Card>
            <Heading>
              {scenario === "New athlete"
                ? "Your first start is ahead."
                : "This board is unavailable."}
            </Heading>
            <Copy>
              {scenario === "New athlete"
                ? "No counted activity yet. Review event rules, then return after your first eligible session."
                : "No cached result is substituted for current standings. Try the populated sample to continue reviewing."}
            </Copy>
            <Action label="Review event rules" onPress={() => openRules()} />
            <Action
              label="Load sample board"
              primary
              onPress={() => setScenario("Populated")}
            />
          </Card>
        )}
        <Segments
          options={["Populated", "New athlete", "Offline"] as const}
          value={scenario}
          onChange={setScenario}
        />
      </Screen>
      <Drilldown drill={drill} />
    </>
  );
}
function ScrollWeeks({
  previous,
  onChange,
}: {
  previous: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row>
      <Action
        label="Oct 12–18 · #2"
        selected={previous}
        onPress={() => onChange(true)}
      />
      <Action
        label="Oct 19–25 · Now"
        selected={!previous}
        onPress={() => onChange(false)}
      />
    </Row>
  );
}

import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import {
  Action,
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
  calendarHours,
  lenses,
  metrics,
  progressConcepts,
  ranges,
  records,
  total,
  training,
  trainingValues,
  type Lens,
  type Range,
} from "./progress-data";

export default function ProgressStudy() {
  return (
    <Study
      title="Progress / Nine perspectives"
      tab="Progress"
      concepts={progressConcepts}
      render={(concept) => <ProgressConcept concept={concept} />}
    />
  );
}
function ProgressConcept({ concept }: { concept: StudyConcept }) {
  const [range, setRange] = useState<Range>("Week");
  const [lens, setLens] = useState<Lens>("All sports");
  const [selected, setSelected] = useState(5);
  const [missing, setMissing] = useState(false);
  const [day, setDay] = useState(24);
  const drill = useDrilldown();
  const values = trainingValues(range, lens);
  const amount = total(values);
  const changeRange = (v: Range) => {
    setRange(v);
    setSelected(training[v].hours.length - 1);
  };
  const openSession = (label: string, hours: number) =>
    drill.push({
      title: "Session detail",
      render: () => (
        <>
          <Heading eyebrow="Fictional counted activity">{label}</Heading>
          <Stat
            value={`${Math.round(hours * 60)} min`}
            label={`${lens} · Duration`}
            big
          />
          <Card>
            <Copy bold>Activity receipt</Copy>
            <Copy>
              Sample eligible activity. The time contributes to the selected
              training bucket. Imported/sample source details shown here do not
              establish a live connection.
            </Copy>
          </Card>
          <Row>
            <Stat value="Included" label="Disposition" />
            <Stat value="Open" label="Example competition track" />
          </Row>
          <Copy muted>
            Real pace, route and workout heart-rate charts would appear only
            when source data exists.
          </Copy>
        </>
      ),
    });
  const openBucket = (
    label: string,
    hours: number,
    context = training[range].label,
  ) =>
    drill.push({
      title: label,
      render: () => (
        <>
          <Heading eyebrow={context}>{label}</Heading>
          <Stat value={`${hours.toFixed(1)} h`} label={lens} big />
          {hours > 0 ? (
            <>
              <Door
                title="Morning session"
                note="60% of this sample bucket"
                value={`${Math.round(hours * 0.6 * 60)}m`}
                onPress={() => openSession("Morning session", hours * 0.6)}
              />
              <Door
                title="Evening session"
                note="40% of this sample bucket"
                value={`${Math.round(hours * 0.4 * 60)}m`}
                onPress={() => openSession("Evening session", hours * 0.4)}
              />
            </>
          ) : (
            <Card>
              <Copy bold>No counted activity.</Copy>
              <Copy muted>
                A quiet day stays empty. Missing readings are not interpreted as
                rest or zero.
              </Copy>
            </Card>
          )}
        </>
      ),
    });
  const openMetric = (index: number) =>
    drill.push({
      title: metrics[index].name,
      render: () => (
        <>
          <Heading eyebrow="Historical metric">{metrics[index].name}</Heading>
          {missing && index > 1 ? (
            <Card>
              <Copy bold>No source reading.</Copy>
              <Copy muted>
                Reconnect a real source before displaying a trend. No sample
                zero replaces an unavailable reading.
              </Copy>
            </Card>
          ) : (
            <>
              <Stat
                value={metrics[index].value}
                label={metrics[index].change}
                big
              />
              <InspectChart
                values={metrics[index].values}
                labels={metrics[index].labels}
                unit={metrics[index].unit}
              />
            </>
          )}
          <Card>
            <Copy>{metrics[index].note}</Copy>
          </Card>
          {index === 0 && (
            <Door title="Explore training history" onPress={openExplorer} />
          )}
          {index === 1 && (
            <Door
              title="Latest settled week"
              note="Sample Running / Open receipt"
              onPress={() =>
                drill.push({
                  title: "Rating receipt",
                  render: () => (
                    <>
                      <Heading eyebrow="Oct 12–18 · Settled">
                        +8 effort rating
                      </Heading>
                      <Copy>
                        Final place #2. Sample before 1,178 → after 1,186.
                        Weekly placing and volume milestones are distinct
                        sources in production; this study changes neither.
                      </Copy>
                    </>
                  ),
                })
              }
            />
          )}
        </>
      ),
    });
  const openExplorer = () =>
    drill.push({
      title: "Training explorer",
      render: () => <TrainingExplorer lens={lens} openBucket={openBucket} />,
    });
  const openRecord = (record: (typeof records)[number]) =>
    drill.push({
      title: record.title,
      render: () => (
        <>
          <Heading eyebrow={record.date}>{record.title}</Heading>
          <Stat value={record.value} label="Personal best · Fictional" big />
          <Card gold>
            <Row>
              <Stat value={record.previous} label="Previous record" />
              <Stat value={record.value} label="Current record" />
            </Row>
          </Card>
          <Door
            title={record.activity}
            note={record.detail}
            onPress={() =>
              openSession(
                record.activity,
                record.title === "Fastest 5K"
                  ? 0.405
                  : record.title === "Longest run"
                    ? 1.63
                    : 2.85,
              )
            }
          />
          <Door
            title="Record history"
            onPress={() =>
              drill.push({
                title: "Record history",
                render: () => (
                  <>
                    <Heading>{record.title}</Heading>
                    <Door
                      title={record.date}
                      value={record.value}
                      onPress={() =>
                        openSession(
                          record.activity,
                          record.title === "Fastest 5K"
                            ? 0.405
                            : record.title === "Longest run"
                              ? 1.63
                              : 2.85,
                        )
                      }
                    />
                    <Door
                      title="Previous sample effort"
                      note="Earlier qualifying record"
                      value={record.previous}
                      onPress={() =>
                        openSession(
                          "Previous qualifying effort",
                          record.title === "Fastest 5K"
                            ? 0.415
                            : record.title === "Longest run"
                              ? 1.7
                              : 2.9,
                        )
                      }
                    />
                    <Copy muted>
                      Illustrative record chain; no achievement entitlement or
                      new scoring rule.
                    </Copy>
                  </>
                ),
              })
            }
          />
        </>
      ),
    });
  const chart = (
    <Chart
      values={values}
      labels={training[range].labels}
      selected={selected}
      onSelect={setSelected}
      kind={
        concept.id === "compare" || concept.id === "journal" ? "bar" : "line"
      }
      comparison={
        concept.id === "compare"
          ? training[range].previous.map(
              (v) =>
                v *
                (lens === "All sports"
                  ? 1
                  : lens === "Running"
                    ? 0.5
                    : lens === "Cycling"
                      ? 0.3
                      : 0.2),
            )
          : undefined
      }
    />
  );
  const controls = (
    <Stack gap={9}>
      <Segments options={ranges} value={range} onChange={changeRange} />
      <Segments options={lenses} value={lens} onChange={setLens} />
    </Stack>
  );
  const watchlist = (
    <Stack gap={0}>
      {metrics.map((metric, i) => (
        <Door
          key={metric.name}
          title={metric.name}
          note={missing && i > 1 ? "Source unavailable" : metric.change}
          value={missing && i > 1 ? "—" : metric.value}
          onPress={() => openMetric(i)}
        />
      ))}
    </Stack>
  );
  const navigation = (
    <Stack gap={0}>
      <Door
        title="All training history"
        note="Range → bucket → session"
        onPress={openExplorer}
      />
      <Door
        title="Effort rating"
        note="Open / GPS history and settled-week receipts"
        onPress={() =>
          drill.push({
            title: "Effort history",
            render: () => <EffortHistory />,
          })
        }
      />
      <Door
        title="Personal records"
        note="Qualifying performances and their source sessions"
        onPress={() =>
          drill.push({
            title: "Personal records",
            render: () => (
              <>
                <Heading>Earned by showing up.</Heading>
                {records.map((record) => (
                  <Door
                    key={record.title}
                    title={record.title}
                    note={record.date}
                    value={record.value}
                    onPress={() => openRecord(record)}
                  />
                ))}
              </>
            ),
          })
        }
      />
    </Stack>
  );
  let content;
  switch (concept.id) {
    case "calendar":
      content = (
        <>
          <Heading eyebrow="October 2026">A month in motion.</Heading>
          <Row>
            <Stat value="15.3 h" label="Month to date · All sports" />
            <Stat
              value={`${calendarHours.filter((h) => h !== null && h > 0).length}`}
              label="Active days through Oct 25"
            />
          </Row>
          <Calendar selected={day} onSelect={setDay} />
          <Card gold>
            <Copy size={20} bold>
              October {day}
            </Copy>
            <Copy muted>
              {calendarHours[day - 1] === 0
                ? "No counted activity"
                : "Sample training day"}
            </Copy>
            <Action
              label="Open this day →"
              onPress={() =>
                openBucket(
                  `October ${day}`,
                  calendarHours[day - 1] ?? 0,
                  "October 2026",
                )
              }
            />
          </Card>
          {navigation}
        </>
      );
      break;
    case "signals":
      content = (
        <>
          <Heading eyebrow="Your metric library">Choose a signal.</Heading>
          {metrics.map((metric, i) => (
            <Pressable
              key={metric.name}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${metric.name}`}
              onPress={() => openMetric(i)}
            >
              <Card dark={i === 1}>
                <Row>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Copy size={13} bold>
                      {metric.name}
                    </Copy>
                    <Copy size={29} bold>
                      {missing && i > 1 ? "—" : metric.value}
                    </Copy>
                    <Copy size={11} muted>
                      {missing && i > 1 ? "No reading" : metric.change}
                    </Copy>
                  </View>
                  <Spark values={metric.values} dark={i === 1} />
                </Row>
              </Card>
            </Pressable>
          ))}
          {navigation}
        </>
      );
      break;
    case "journal":
      content = (
        <>
          <Heading eyebrow="Oct 19–25">The training journal.</Heading>
          <Card gold>
            <Row>
              <Stat value="4.1 h" label="Training" />
              <Stat value="5" label="Active days" />
              <Stat value="2" label="Quiet days" />
            </Row>
          </Card>
          {training.Week.labels.map((label, i) => (
            <View key={label} style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ width: 45, alignItems: "center", gap: 5 }}>
                <Copy size={12} muted>
                  {label}
                </Copy>
                <Copy size={24} bold>
                  {19 + i}
                </Copy>
                <View
                  style={{ width: 1, flex: 1, backgroundColor: palette.line }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Door
                  title={
                    training.Week.hours[i] > 0
                      ? [
                          "Easy run",
                          "Strength session",
                          "",
                          "Long ride",
                          "Easy miles",
                          "Weekend run",
                        ][i]
                      : "No counted activity"
                  }
                  note={
                    training.Week.hours[i] > 0
                      ? "Counted · Sample"
                      : "A quiet day"
                  }
                  value={`${Math.round(training.Week.hours[i] * 60)}m`}
                  onPress={() =>
                    openBucket(label, training.Week.hours[i], "Oct 19–25")
                  }
                />
              </View>
            </View>
          ))}
          {navigation}
        </>
      );
      break;
    case "atlas":
      content = (
        <>
          <Heading eyebrow="2026 / Training atlas">
            A year, at a glance.
          </Heading>
          <Stat
            value={`${total(training.Year.hours).toFixed(1)} h`}
            label="Jan–Oct · All sports"
            big
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {training.Year.labels.map((label, i) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={`Open ${label} training`}
                onPress={() =>
                  openBucket(label, training.Year.hours[i], "2026")
                }
                style={{
                  width: "30%",
                  padding: 13,
                  borderRadius: 15,
                  gap: 9,
                  backgroundColor: i === 9 ? palette.soft : "white",
                }}
              >
                <Copy size={12} bold>
                  {label}
                </Copy>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}
                >
                  {Array.from({ length: 20 }, (_, j) => (
                    <View
                      key={j}
                      style={{
                        width: 8,
                        height: 9,
                        borderRadius: 2,
                        backgroundColor:
                          (j + i) % 4 === 0 ? "#e4ece7" : palette.teal,
                        opacity: 0.3 + ((j + i) % 3) * 0.3,
                      }}
                    />
                  ))}
                </View>
                <Copy size={12}>{training.Year.hours[i]} h</Copy>
              </Pressable>
            ))}
          </View>
          <Copy size={10} muted>
            Illustrative activity cells · Tap a month for exact sample hours
          </Copy>
          {navigation}
        </>
      );
      break;
    case "compare":
      content = (
        <>
          <Heading eyebrow={training[range].label}>
            Find the difference.
          </Heading>
          {controls}
          <Row>
            <Card style={{ flex: 1 }}>
              <Copy size={11} muted>
                CURRENT PERIOD
              </Copy>
              <Stat value={`${amount.toFixed(1)} h`} label={lens} />
            </Card>
            <Card style={{ flex: 1 }}>
              <Copy size={11} muted>
                PRIOR PERIOD
              </Copy>
              <Stat
                value={`${(total(training[range].previous) * (lens === "All sports" ? 1 : lens === "Running" ? 0.5 : lens === "Cycling" ? 0.3 : 0.2)).toFixed(1)} h`}
                label="Comparison"
              />
            </Card>
          </Row>
          {chart}
          <Copy size={11} muted>
            Bars: current · Dashed: prior. Current period may be incomplete;
            comparisons are descriptive, not predictions.
          </Copy>
          <Action
            label="Inspect selected bucket →"
            onPress={() =>
              openBucket(training[range].labels[selected], values[selected])
            }
          />
          {navigation}
        </>
      );
      break;
    case "rhythm":
      content = (
        <>
          <Heading eyebrow="Your weekly rhythm">Five days of movement.</Heading>
          <Ring
            value={5}
            total={7}
            label="5 / 7"
            caption="Active calendar days"
          />
          <Row>
            <Stat value="4.1 h" label="Training time" />
            <Stat value="5" label="Counted sessions" />
            <Stat value="8" label="Active-week streak" />
          </Row>
          <Card gold>
            <Copy bold>A quiet day belongs here too.</Copy>
            <Copy size={13}>
              An active-day count describes your week. It is not a readiness
              score or a requirement to train daily.
            </Copy>
          </Card>
          <Action label="Explore this week →" primary onPress={openExplorer} />
          {watchlist}
          {navigation}
        </>
      );
      break;
    case "records":
      content = (
        <>
          <Heading eyebrow="Your personal collection">
            The best of your effort.
          </Heading>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Fastest 5K record"
            onPress={() => openRecord(records[0])}
          >
            <Card dark>
              <Copy size={12} muted>
                PERSONAL BEST / RUNNING
              </Copy>
              <Copy size={57} bold>
                24:18
              </Copy>
              <Row>
                <Copy>Fastest 5K</Copy>
                <Copy size={12} muted>
                  Oct 17 →
                </Copy>
              </Row>
              <Meter
                value={24.3}
                total={24.86}
                label="24:18 current best, 24:52 previous"
                color={palette.tennis}
              />
            </Card>
          </Pressable>
          {records.slice(1).map((record) => (
            <Card key={record.title}>
              <Door
                title={record.title}
                note={`Previous ${record.previous}`}
                value={record.value}
                onPress={() => openRecord(record)}
              />
            </Card>
          ))}
          <Heading eyebrow="Consistency counts too">Your longer story.</Heading>
          {navigation}
        </>
      );
      break;
    case "chapters":
      content = (
        <>
          <Heading eyebrow="Training / 2026">Your year in chapters.</Heading>
          {["October", "September", "August"].map((month, i) => (
            <Card key={month} dark={i === 0}>
              <Copy size={12} muted>
                CHAPTER {10 - i} / 2026
              </Copy>
              <Copy size={33} bold>
                {month}.
              </Copy>
              <Copy size={18}>
                {
                  [
                    "More room for the long run.",
                    "A steady month of showing up.",
                    "Your strongest riding month.",
                  ][i]
                }
              </Copy>
              <Row>
                <Stat
                  value={`${[15.3, 17.1, 16.9][i]} h`}
                  label="Sample training"
                />
                <Action
                  label="Read chapter →"
                  primary={i === 0}
                  onPress={() =>
                    drill.push({
                      title: `${month} chapter`,
                      render: () => (
                        <>
                          <Heading eyebrow="2026 / Monthly chapter">
                            {month}
                          </Heading>
                          <InspectChart
                            kind="bar"
                            values={[3.2, 4.4, 3.6, 4.1].map(
                              (v) => v * ([15.3, 17.1, 16.9][i] / 15.3),
                            )}
                            labels={["Week 1", "Week 2", "Week 3", "Week 4"]}
                          />
                          <Copy muted>
                            Illustrative month narrative. A production chapter
                            needs source-backed findings.
                          </Copy>
                          {[1, 2, 3, 4].map((v, j) => (
                            <Door
                              key={v}
                              title={`Week ${v}`}
                              value={`${([3.2, 4.4, 3.6, 4.1][j] * ([15.3, 17.1, 16.9][i] / 15.3)).toFixed(1)} h`}
                              onPress={() =>
                                openBucket(
                                  `Week ${v}`,
                                  [3.2, 4.4, 3.6, 4.1][j] *
                                    ([15.3, 17.1, 16.9][i] / 15.3),
                                  month,
                                )
                              }
                            />
                          ))}
                        </>
                      ),
                    })
                  }
                />
              </Row>
            </Card>
          ))}
          {navigation}
        </>
      );
      break;
    default:
      content = (
        <>
          <Heading eyebrow="Your training balance">Effort adds up.</Heading>
          {controls}
          <Row>
            <Stat
              value={`${amount.toFixed(1)} h`}
              label={training[range].label}
              big
            />
            <Copy size={12} muted>
              {lens}
            </Copy>
          </Row>
          {chart}
          <Action
            label="Inspect selected bucket →"
            onPress={() =>
              openBucket(training[range].labels[selected], values[selected])
            }
          />
          <Card gold>
            <Copy bold>Consistency is the story.</Copy>
            <Copy size={13}>
              Five active days this week. Explore the individual sessions behind
              the total.
            </Copy>
          </Card>
          {watchlist}
          {navigation}
        </>
      );
  }
  return (
    <>
      <Screen>
        <Row>
          <Copy size={12} bold>
            PROGRESS
          </Copy>
          <Copy size={10} muted>
            Fictional study
          </Copy>
        </Row>
        {content}
        <Action
          label={
            missing
              ? "Restore health readings"
              : "Preview missing health readings"
          }
          onPress={() => setMissing(!missing)}
        />
      </Screen>
      <Drilldown drill={drill} />
    </>
  );
}
function TrainingExplorer({
  lens,
  openBucket,
}: {
  lens: Lens;
  openBucket: (label: string, hours: number, context: string) => void;
}) {
  const [range, setRange] = useState<Range>("Week");
  const [point, setPoint] = useState(5);
  const values = trainingValues(range, lens);
  return (
    <>
      <Heading eyebrow={lens}>Explore your training.</Heading>
      <Segments
        options={ranges}
        value={range}
        onChange={(v) => {
          setRange(v);
          setPoint(training[v].hours.length - 1);
        }}
      />
      <Stat
        value={`${total(values).toFixed(1)} h`}
        label={training[range].label}
      />
      <Chart
        values={values}
        labels={training[range].labels}
        selected={point}
        onSelect={setPoint}
      />
      <Action
        label={`Open ${training[range].labels[point]} activities →`}
        primary
        onPress={() =>
          openBucket(
            training[range].labels[point],
            values[point],
            training[range].label,
          )
        }
      />
      <Copy muted>
        Hours are comparable across sports. Distance is not combined with
        strength duration. Buckets use the Eastern calendar.
      </Copy>
    </>
  );
}
function EffortHistory() {
  const [track, setTrack] = useState<"Open" | "GPS">("Open");
  return (
    <>
      <Heading eyebrow="Running">Effort over time.</Heading>
      <Segments options={["Open", "GPS"]} value={track} onChange={setTrack} />
      <Stat
        value={track === "Open" ? "1,186" : "1,086"}
        label={`${track} · Sample latest settled rating`}
        big
      />
      <InspectChart
        key={track}
        values={metrics[1].values.map((v) => v - (track === "GPS" ? 100 : 0))}
        labels={metrics[1].labels}
        unit="pts"
      />
      <Card>
        <Copy>
          Ratings are separate from training duration. Sample history is not a
          new scoring model.
        </Copy>
      </Card>
    </>
  );
}
function Calendar({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (v: number) => void;
}) {
  return (
    <View
      style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -18 }}
    >
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
        <View
          key={i}
          style={{ width: "14.28%", alignItems: "center", paddingVertical: 9 }}
        >
          <Copy size={11} muted>
            {d}
          </Copy>
        </View>
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <View key={`blank${i}`} style={{ width: "14.28%" }} />
      ))}
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
        <Pressable
          key={d}
          disabled={d > 25}
          accessibilityRole="button"
          accessibilityLabel={`Inspect October ${d}`}
          accessibilityState={{ selected: selected === d, disabled: d > 25 }}
          onPress={() => onSelect(d)}
          style={{
            width: "14.28%",
            minHeight: 51,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: selected === d ? palette.tennis : "transparent",
            borderRadius: 12,
            gap: 5,
            opacity: d > 25 ? 0.3 : 1,
          }}
        >
          <Copy size={14} bold={selected === d}>
            {d}
          </Copy>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor:
                (calendarHours[d - 1] ?? 0) > 0 ? palette.teal : "transparent",
            }}
          />
        </Pressable>
      ))}
    </View>
  );
}
function Spark({
  values,
  dark = false,
}: {
  values: readonly number[];
  dark?: boolean;
}) {
  const min = Math.min(...values),
    max = Math.max(...values);
  return (
    <Svg width={92} height={48} viewBox="0 0 92 48">
      <Polyline
        points={values
          .map(
            (v, i) =>
              `${4 + (i * 84) / (values.length - 1)},${40 - ((v - min) / Math.max(0.1, max - min)) * 32}`,
          )
          .join(" ")}
        fill="none"
        stroke={dark ? palette.tennis : palette.teal}
        strokeWidth="2"
      />
    </Svg>
  );
}

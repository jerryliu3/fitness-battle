import { useRef, useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import {
  fieldDefaultSpan,
  initialsFromName,
  type ArenaLane,
  type ArenaSceneMessage,
} from "@fitness-battle/shared";
import { LaneTrack, type LaneAnchor } from "../../ui/lane-track";
import { Arena3D } from "../../ui/arena-3d";
import { FocusSegments, FocusSheet } from "../../ui/focus";
import {
  T,
  c,
  row,
  stack,
  Tap,
  Action,
  Pill,
  IconTap,
  Metric,
  Surface,
  Study,
  Flow,
  useStudyNav,
  UserAvatar,
  AppIcon,
} from "./foundation";
import { board, meets, type Meet } from "./compete-data";
import { CompeteDetail, MeetPager } from "./compete";
export const fieldConcepts = [
  "The open field",
  "Your meets · field first",
  "Sport rooms · field first",
] as const;
type Moment = "week" | "closing" | "final";
export default function FieldDirections() {
  const params = useLocalSearchParams<{ moment?: Moment }>();
  const [moment, setMoment] = useState<Moment>(
    params.moment === "closing" || params.moment === "final"
      ? params.moment
      : "week",
  );
  return (
    <Study
      tab="compete"
      concepts={fieldConcepts}
      followup
      reviewControls={
        <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
          <FocusSegments
            label="Study scenario"
            value={moment}
            options={[
              { value: "week", label: "Midweek" },
              { value: "closing", label: "Closing" },
              { value: "final", label: "Final" },
            ]}
            onChange={setMoment}
          />
        </View>
      }
    >
      {(i) => <FieldDirection key={i} variant={(i + 2) % 3} moment={moment} />}
    </Study>
  );
}
function FieldDirection({
  variant,
  moment,
}: {
  variant: number;
  moment: Moment;
}) {
  const [sport, setSport] = useState(0),
    [gps, setGps] = useState(false),
    [picker, setPicker] = useState(false);
  const meet = meets[sport]!;
  const choose = (i: number) => {
    setSport(i);
    if (meets[i]!.gps === null) setGps(false);
  };
  return (
    <Flow
      render={(page) => <CompeteDetail page={page} meet={meet} gps={gps} />}
    >
      <FieldRoot
        variant={variant}
        moment={moment}
        meet={meet}
        sport={sport}
        choose={choose}
        gps={gps}
        setGps={setGps}
        picker={() => setPicker(true)}
      />
      <FocusSheet
        open={picker}
        title="Your meets"
        onClose={() => setPicker(false)}
      >
        {meets.map((m, i) => (
          <Tap
            key={m.id}
            selected={sport === i}
            onPress={() => {
              choose(i);
              setPicker(false);
            }}
            style={{ ...row, paddingVertical: 12 }}
          >
            <AppIcon name={m.id} />
            <View style={{ flex: 1 }}>
              <T role="heading">{m.name}</T>
              <T role="caption" secondary>
                {m.subtitle} · {m.gps === null ? "Open" : "Open + GPS"}
              </T>
            </View>
            <T role="label">{sport === i ? "Selected" : "View"}</T>
          </Tap>
        ))}
      </FocusSheet>
    </Flow>
  );
}
function FieldRoot({
  variant,
  moment,
  meet,
  sport,
  choose,
  gps,
  setGps,
  picker,
}: {
  variant: number;
  moment: Moment;
  meet: Meet;
  sport: number;
  choose: (i: number) => void;
  gps: boolean;
  setGps: (v: boolean) => void;
  picker: () => void;
}) {
  const nav = useStudyNav();
  const rows = board(meet, gps),
    you = rows[2]!;
  const [expanded, setExpanded] = useState(false);
  const ahead = rows[1]!;
  return (
    <>
      <View style={row}>
        <View style={{ flex: 1 }}>
          <T role="display">Compete</T>
          <T role="caption" secondary>
            {moment === "week"
              ? "Oct 19 – 25 · This week"
              : moment === "closing"
                ? "Oct 19 – 25 · Closing tonight"
                : "Oct 19 – 25 · Final results"}
          </T>
        </View>
        <IconTap
          icon="compete"
          label="Past results"
          onPress={() => nav.push({ key: "history", title: "Past results" })}
        />
      </View>
      {variant === 0 ? (
        <View style={{ gap: 2 }}>
          <MeetPager compact selected={sport} choose={choose} gps={gps} />
        </View>
      ) : variant === 1 ? (
        <View style={{ gap: 8 }}>
          <FocusSegments
            label="Sport room"
            value={meet.id}
            variant="tabs"
            options={meets.map((m) => ({ value: m.id, label: m.name }))}
            onChange={(id) => choose(meets.findIndex((m) => m.id === id))}
          />
          <View style={row}>
            <T role="heading" style={{ flex: 1 }}>
              {meet.subtitle}
            </T>
            <Pill>6 athletes</Pill>
          </View>
        </View>
      ) : (
        <Tap
          onPress={picker}
          label={`Change meet, ${meet.name}`}
          style={{ ...row, paddingVertical: 4 }}
        >
          <View
            style={{ padding: 12, backgroundColor: c.soft, borderRadius: 16 }}
          >
            <AppIcon name={meet.id} />
          </View>
          <View style={{ flex: 1 }}>
            <T role="heading">{meet.subtitle}⌄</T>
            <T role="caption" secondary>
              {meet.name} · Weekly field
            </T>
          </View>
          <T role="label">#3 / 6</T>
        </Tap>
      )}
      <View style={{ gap: 10, marginTop: -12 }}>
        {meet.gps !== null ? (
          <FocusSegments
            label="Score source"
            value={gps ? "gps" : "open"}
            options={[
              { value: "open", label: "Open" },
              { value: "gps", label: "GPS only" },
            ]}
            onChange={(v) => setGps(v === "gps")}
          />
        ) : (
          <Pill>Open · Counted strength sessions</Pill>
        )}
        <LiveField
          key={`${meet.id}-${gps}`}
          meet={meet}
          gps={gps}
          immersive={variant === 2}
        />
      </View>
      <Surface
        style={{
          gap: 12,
          backgroundColor: moment === "final" ? c.soft : c.card,
        }}
      >
        <View style={row}>
          <View style={{ flex: 1 }}>
            <T role="caption" secondary>
              {moment === "final" ? "Your finish" : "Your position"}
            </T>
            <T role="heading">
              3rd{" "}
              <T role="body">
                of 6 · {you.value} {meet.unit}
              </T>
            </T>
          </View>
          <Pill>{moment === "final" ? "Settled" : "↑ 1 place"}</Pill>
        </View>
        {moment === "final" ? (
          <>
            <T>A week worth keeping. You finished on the podium.</T>
            <View
              style={{
                ...row,
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {[rows[1]!, rows[0]!, you].map((p, i) => (
                <View
                  key={p.name}
                  style={{ flex: 1, alignItems: "center", gap: 8 }}
                >
                  <UserAvatar name={p.name} size={i === 1 ? 48 : 38} />
                  <T role="caption" numberOfLines={1}>
                    {p.place === 3 ? "You" : p.name.split(" ")[0]}
                  </T>
                  <View
                    style={{
                      height: i === 1 ? 66 : 44,
                      backgroundColor: p.place === 3 ? c.tennis : c.line,
                      width: "100%",
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <T role="heading">{p.place}</T>
                  </View>
                </View>
              ))}
            </View>
            <T role="caption" secondary>
              {you.effort.toLocaleString()} final effort · Open and GPS settle
              independently.
            </T>
          </>
        ) : (
          <>
            <Tap
              onPress={() => setExpanded((v) => !v)}
              label={
                expanded ? "Collapse nearby athletes" : "Expand your position"
              }
            >
              <View style={row}>
                <UserAvatar name={ahead.name} size={32} />
                <View style={{ flex: 1 }}>
                  <T role="label">
                    {(ahead.value - you.value).toFixed(1)} {meet.unit} to Jordan
                  </T>
                  <T role="caption" secondary>
                    {moment === "closing"
                      ? "One more outing could change the finish."
                      : "Your next place, at your own pace."}
                  </T>
                </View>
                <AppIcon name={expanded ? "back" : "chevron"} size={18} />
              </View>
            </Tap>
            {expanded && (
              <>
                <View
                  style={{
                    height: 5,
                    backgroundColor: c.line,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(100, (you.value / ahead.value) * 100)}%`,
                      height: 5,
                      backgroundColor: c.secondary,
                    }}
                  />
                </View>
                <T role="caption" secondary>
                  {(you.value - rows[3]!.value).toFixed(1)} {meet.unit} ahead of
                  Sam · {you.effort.toLocaleString()} effort
                </T>
                <Action
                  label="Compare with Jordan"
                  secondary
                  onPress={() =>
                    nav.push({ key: "chase", title: "The next place" })
                  }
                />
              </>
            )}
          </>
        )}
      </Surface>
      <View style={stack}>
        <View style={row}>
          <T role="heading" style={{ flex: 1 }}>
            The full field
          </T>
          <T role="caption" secondary>
            {meet.unit} / effort
          </T>
        </View>
        {rows.map((p) => (
          <Tap
            key={p.name}
            onPress={() =>
              nav.push({ key: "athlete", title: p.name, id: p.name })
            }
            style={{
              ...row,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <T role="label" style={{ width: 20 }}>
              {p.place}
            </T>
            <UserAvatar name={p.name} size={36} />
            <T role="label" style={{ flex: 1 }}>
              {p.place === 3 ? "You" : p.name}
            </T>
            <View style={{ alignItems: "flex-end" }}>
              <T role="label">{p.value.toFixed(1)}</T>
              <T role="caption" secondary>
                {p.effort.toLocaleString()}
              </T>
            </View>
            <AppIcon name="chevron" size={14} />
          </Tap>
        ))}
      </View>
      <Action
        label="How Open and GPS work"
        secondary
        onPress={() => nav.push({ key: "scoring", title: "Open & GPS" })}
      />
    </>
  );
}
/** Uses the product's actual field renderers. All controls share one fixture model. */
function LiveField({
  meet,
  gps,
  immersive,
}: {
  meet: Meet;
  gps: boolean;
  immersive: boolean;
}) {
  const nav = useStudyNav();
  const [dimension, setDimension] = useState<"2d" | "3d">("2d"),
    [fullscreen, setFullscreen] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [span, setSpan] = useState(
      fieldDefaultSpan(meet.unit === "min" ? "pts" : "mi"),
    ),
    [center, setCenter] = useState<number | null>(null),
    [unavailable, setUnavailable] = useState(false);
  const anchor = useRef<LaneAnchor | null>(null);
  const rows = board(meet, gps),
    you = rows[2]!;
  const strength = meet.id === "strength",
    unit = strength ? "pts" : "mi";
  const lanes: ArenaLane[] = rows.map((p) => ({
    id: p.name,
    name: p.name,
    you: p.place === 3,
    ghost: false,
    values: [0, 0, strength ? p.effort : p.value],
  }));
  const focus = rows.find((p) => p.name === selected);
  const current = center ?? (strength ? you.effort : you.value);
  const model: ArenaSceneMessage = {
    type: "arena-view",
    unit,
    view: { center: current, span },
    selected: selected ?? you.name,
    lanes: lanes.map((l) => ({
      id: l.id,
      name: l.name,
      initials: initialsFromName(l.name),
      you: l.you,
      value: l.values[2],
    })),
  };
  const choose = (id: string) => {
    setSelected(id);
    const lane = lanes.find((l) => l.id === id);
    if (lane) setCenter(lane.values[2]);
  };
  const controls = (
    <View style={row}>
      <View style={{ flex: 1 }}>
        <FocusSegments
          label="Field dimension"
          value={dimension}
          options={[
            { value: "2d", label: "2D map" },
            { value: "3d", label: "3D field" },
          ]}
          onChange={(v) => {
            setDimension(v);
            setUnavailable(false);
          }}
        />
      </View>
      <IconTap
        icon={fullscreen ? "back" : "expand"}
        label={fullscreen ? "Close full field" : "Expand field"}
        onPress={() => setFullscreen((v) => !v)}
      />
    </View>
  );
  const render = (full: boolean) => (
    <View style={{ gap: 8, flex: full ? 1 : undefined }}>
      {controls}
      {dimension === "3d" ? (
        <Arena3D
          model={model}
          onSelect={choose}
          onPan={setCenter}
          onUnavailable={() => {
            setUnavailable(true);
            setDimension("2d");
          }}
        />
      ) : (
        <LaneTrack
          lanes={lanes}
          unit={unit}
          showGhost={false}
          selectedId={selected ?? you.name}
          index={2}
          onSelect={(l) => choose(l.id)}
          view={model.view}
          onPan={setCenter}
          onZoom={setSpan}
          anchor={anchor}
          height={full ? 520 : immersive ? 390 : 320}
          fullscreen={full}
          active
          onExpand={() => setFullscreen(true)}
        />
      )}
      {unavailable && (
        <T role="caption" secondary>
          3D is unavailable here. The same field is shown in 2D.
        </T>
      )}
      <View style={row}>
        <Tap
          onPress={() => {
            setCenter(null);
            setSpan(fieldDefaultSpan(unit));
          }}
          label="Center field on you"
        >
          <T role="label">Center on you</T>
        </Tap>
        <T role="caption" secondary style={{ flex: 1, textAlign: "right" }}>
          {strength
            ? "Effort points · same field"
            : "Counted distance · same field"}
        </T>
      </View>
      {focus && (
        <Tap
          onPress={() => {
            setSelected(null);
            if (full) setFullscreen(false);
            nav.push({ key: "athlete", title: focus.name, id: focus.name });
          }}
          style={{
            ...row,
            padding: 12,
            borderRadius: 16,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <UserAvatar name={focus.name} size={36} />
          <View style={{ flex: 1 }}>
            <T role="label">{focus.name}</T>
            <T role="caption" secondary>
              #{focus.place} · {focus.value} {meet.unit} · {focus.effort} effort
            </T>
          </View>
          <AppIcon name="chevron" size={16} />
        </Tap>
      )}
    </View>
  );
  return (
    <>
      <View style={{ display: fullscreen ? "none" : "flex" }}>
        {!fullscreen && render(false)}
      </View>
      <Modal
        visible={fullscreen}
        animationType="slide"
        onRequestClose={() => setFullscreen(false)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: c.paper, padding: 16 }}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {fullscreen && render(true)}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

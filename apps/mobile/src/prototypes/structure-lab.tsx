import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, { Circle, Line, Path, Polygon, Polyline } from "react-native-svg";
import {
  LAYOUT_CONCEPTS,
  PROTOTYPE_DAYS,
  PROTOTYPE_PEOPLE,
  PROTOTYPE_SPORTS,
  PROTOTYPE_TABS,
  prototypeContest,
  type LayoutConceptId,
  type PrototypeTab,
} from "@fitness-battle/shared";
import { Ember } from "../ui/mascot/ember";

type Panel =
  | "suggestion"
  | "receipt"
  | "registration"
  | "awards"
  | "rankings"
  | "invite"
  | "manage"
  | "nudge"
  | "progress"
  | "settings"
  | "connections"
  | "setup"
  | "return"
  | "complete"
  | null;
type Concept = (typeof LAYOUT_CONCEPTS)[number];
type Registration = { sport: string; mode: string; track: string };

const panelTitles: Record<Exclude<Panel, null>, string> = {
  suggestion: "A little easy goes a long way.",
  receipt: "Your session receipt.",
  registration: "Find your next arena.",
  awards: "A week worth keeping.",
  rankings: "The bigger picture.",
  invite: "Better with your people.",
  manage: "Your crew, your rhythm.",
  nudge: "A little encouragement.",
  progress: "Look how far you’ve come.",
  settings: "Make it yours.",
  connections: "Your training, together.",
  setup: "Start where you are.",
  return: "That effort went somewhere.",
  complete: "You showed up. It shows.",
};

export default function StructureLab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ concept?: string; tab?: string }>();
  const [conceptId, setConceptId] = useState<LayoutConceptId>(
    () => LAYOUT_CONCEPTS.find((c) => c.id === params.concept)?.id ?? "trail",
  );
  const [tab, setTab] = useState<PrototypeTab>(
    () => PROTOTYPE_TABS.find((t) => t.toLowerCase() === params.tab) ?? "Home",
  );
  const [panel, setPanel] = useState<Panel>(null);
  const [scenario, setScenario] = useState("Everyday");
  const [receipt, setReceipt] = useState<(typeof PROTOTYPE_DAYS)[number]>(
    PROTOTYPE_DAYS[1],
  );
  const [registrations, setRegistrations] = useState<Registration[]>([
    { sport: "running", mode: "Solo", track: "GPS verified" },
    { sport: "strength", mode: "Sunday people", track: "Open" },
  ]);
  const [activeSport, setActiveSport] = useState("running");
  const [sport, setSport] = useState("running");
  const [family, setFamily] = useState("GPS");
  const [mode, setMode] = useState("Solo");
  const [scoreTrack, setScoreTrack] = useState("GPS verified");
  const [ghost, setGhost] = useState(true);
  const [crewView, setCrewView] = useState("Activity");
  const [cheers, setCheers] = useState<string[]>([]);
  const [name, setName] = useState("Alex Lee");
  const [crewName, setCrewName] = useState("Sunday people");
  const [notice, setNotice] = useState("");
  const [weekOpen, setWeekOpen] = useState(false);
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [units, setUnits] = useState("Kilometers");
  const [distance, setDistance] = useState("5K");
  const [range, setRange] = useState("12 weeks");
  const [setupStep, setSetupStep] = useState(0);
  const [calibrated, setCalibrated] = useState(false);
  const [nudge, setNudge] = useState(
    "A little fresh air? Join us for an easy one.",
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const emberLift = useRef(new Animated.Value(0)).current;
  const c = LAYOUT_CONCEPTS.find((c) => c.id === conceptId)!;
  const s = createStyles(c);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  function announce(message: string) {
    setNotice(message);
    AccessibilityInfo.announceForAccessibility(message);
  }
  function openSuggestion() {
    if (reduceMotion) {
      setPanel("suggestion");
      return;
    }
    Animated.sequence([
      Animated.timing(emberLift, {
        toValue: -14,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.spring(emberLift, { toValue: 0, useNativeDriver: true }),
    ]).start();
    setPanel("suggestion");
  }
  function previewScenario(value: string) {
    setScenario(value);
    if (["Empty arena", "New progress", "Week complete"].includes(value))
      setTab("Arena");
    if (value === "First visit") setTab("Home");
    setPanel(
      value === "New progress"
        ? "return"
        : value === "Week complete"
          ? "complete"
          : value === "First visit"
            ? "setup"
            : null,
    );
  }
  const joined = scenario === "Empty arena" ? [] : registrations;
  const active = joined.find((r) => r.sport === activeSport) ?? joined[0];
  const contest = prototypeContest(active?.sport ?? "running");
  const unit = contest.unit;
  const formatValue = (value: number) =>
    unit === "km" ? value.toFixed(1) : String(value);
  const delta = formatValue(
    Number((contest.total - contest.previous).toFixed(1)),
  );
  const copy = (value: string, muted = true) => (
    <Text style={muted ? s.copy : s.text}>{value}</Text>
  );
  const eyebrow = (value: string) => <Text style={s.eyebrow}>{value}</Text>;
  const title = (label: string, value: string, sub?: string) => (
    <View style={[s.heading, conceptId === "focus" && s.center]}>
      {eyebrow(label)}
      <Text style={s.title}>{value}</Text>
      {sub && copy(sub)}
    </View>
  );
  const button = (
    label: string,
    fn: () => void,
    secondary = false,
    disabled = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={fn}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        pressed && { opacity: 0.75 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: c.ink }]}>{label}</Text>
      <Text style={[s.buttonText, secondary && { color: c.ink }]}>↗</Text>
    </Pressable>
  );
  const row = (label: string, detail: string, fn: () => void, icon = "↗") => (
    <Pressable accessibilityRole="button" onPress={fn} style={s.menuRow}>
      <View style={s.menuIcon}>
        <Text style={s.icon}>{icon}</Text>
      </View>
      <View style={s.grow}>
        <Text style={s.rowTitle}>{label}</Text>
        <Text style={s.small}>{detail}</Text>
      </View>
      <Text style={s.text}>→</Text>
    </Pressable>
  );
  const section = (children: ReactNode, extra?: object) => (
    <View style={[s.card, extra]}>{children}</View>
  );
  const pill = (value: string) => (
    <View style={s.pill}>
      <Text style={s.pillText}>{value}</Text>
    </View>
  );
  const avatars = (
    <View style={s.avatarStack}>
      {PROTOTYPE_PEOPLE.map((p, i) => (
        <View
          key={p.name}
          style={[
            s.avatar,
            {
              backgroundColor: p.color,
              marginLeft: i ? -9 : 0,
              borderWidth: 2,
              borderColor: c.card,
            },
          ]}
        >
          <Text style={s.avatarText}>{p.initials}</Text>
        </View>
      ))}
      <View
        style={[
          s.avatar,
          {
            marginLeft: -9,
            backgroundColor: c.paper,
            borderWidth: 2,
            borderColor: c.card,
          },
        ]}
      >
        <Text style={[s.avatarText, { color: c.ink }]}>+4</Text>
      </View>
    </View>
  );
  const stats = (
    <View style={s.stats}>
      {[
        ["23.4", "km this week"],
        ["4 / 5", "sessions"],
        ["+18", "weekly Elo"],
      ].map(([v, l]) => (
        <View key={l}>
          <Text style={s.statValue}>{v}</Text>
          <Text style={s.small}>{l}</Text>
        </View>
      ))}
    </View>
  );
  const summary = section(
    <>
      {eyebrow("YOUR SEASON SO FAR")}
      <View style={s.stats}>
        {[
          ["142", "kilometers"],
          ["28", "sessions"],
          ["6", "weeks active"],
        ].map(([v, l]) => (
          <View key={l}>
            <Text style={s.statValue}>{v}</Text>
            <Text style={s.small}>{l}</Text>
          </View>
        ))}
      </View>
    </>,
  );
  const weekly = section(
    <>
      {eyebrow("WEEK 42 / OCTOBER 12—19")}
      {stats}
      <View style={s.weekBars}>
        {[38, 67, 45, 86, 64, 0, 0].map((v, i) => (
          <View key={i} style={s.weekColumn}>
            <View
              style={[
                s.weekBar,
                {
                  height: Math.max(4, v),
                  backgroundColor: i === 4 ? c.accent : c.color,
                },
              ]}
            />
            <Text style={s.small}>{"MTWTFSS"[i]}</Text>
          </View>
        ))}
      </View>
      {copy("Consistency over intensity. You’re finding your rhythm.")}
    </>,
  );
  const suggestion = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Today: open easy run recommendation"
      onPress={openSuggestion}
      style={s.suggestion}
    >
      <View style={s.suggestionCopy}>
        <Text
          style={[
            s.eyebrow,
            {
              color:
                conceptId === "focus"
                  ? c.muted
                  : conceptId === "orbit"
                    ? "#c6dca8"
                    : c.paper,
            },
          ]}
        >
          FRIDAY, OCTOBER 16
        </Text>
        <Text style={s.suggestionTitle}>
          {conceptId === "focus"
            ? "Make space for an easy one."
            : "A good day to take it easy."}
        </Text>
        <Text style={s.suggestionDetail}>Easy run · 5 km · about 30 min</Text>
        <Text style={s.suggestionLink}>Your daily suggestion ↗</Text>
      </View>
      <Animated.View
        style={[s.emberHero, { transform: [{ translateY: emberLift }] }]}
      >
        <Ember size={135} expression="happy" />
      </Animated.View>
    </Pressable>
  );
  const arrival = (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        setTab("Arena");
        setPanel("return");
      }}
      style={s.arrival}
    >
      <View style={s.noteIcon}>
        <Text style={s.avatarText}>↗</Text>
      </View>
      <View style={s.grow}>
        <Text style={s.rowTitle}>Your morning run is in.</Text>
        <Text style={s.small}>6.2 km added to your week</Text>
      </View>
      <Text style={s.text}>→</Text>
    </Pressable>
  );
  const path = (
    <View style={s.pathSection}>
      <View style={s.flexRow}>
        <View>
          {eyebrow("ONE DAY AT A TIME")}
          <Text style={s.h3}>Your recent rhythm</Text>
        </View>
        {pill("10 sessions")}
      </View>
      <NativeJourney
        concept={c}
        onToday={openSuggestion}
        onSession={(d) => {
          setReceipt(d);
          setPanel("receipt");
        }}
        emberLift={emberLift}
      />
    </View>
  );
  const registerStrip = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.chipScroll}
    >
      {joined.map((r) => (
        <Pressable
          key={r.sport}
          accessibilityRole="button"
          accessibilityState={{ selected: active?.sport === r.sport }}
          onPress={() => setActiveSport(r.sport)}
          style={[
            s.registrationChip,
            active?.sport === r.sport && {
              borderColor: c.color,
              borderWidth: 2,
            },
          ]}
        >
          <Text style={s.rowTitle}>
            {PROTOTYPE_SPORTS.find((s) => s.id === r.sport)?.name}
          </Text>
          <Text style={s.small}>
            {r.mode} · {r.sport === "sleep" ? "Sleep score" : r.track}
          </Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => setPanel("registration")}
        style={[s.registrationChip, { borderStyle: "dashed" }]}
      >
        <Text style={s.rowTitle}>＋ Register</Text>
      </Pressable>
    </ScrollView>
  );
  const board = section(
    <>
      <View style={s.flexRow}>
        <View>
          {eyebrow(`${contest.label.toUpperCase()} / WEEK 42`)}
          <Text style={s.h3}>
            {unit === "km"
              ? "Every kilometer counts."
              : unit === "score"
                ? "A little more balance."
                : "Keep showing up."}
          </Text>
        </View>
        {pill("3 days left")}
      </View>
      <View style={s.boardTotal}>
        <Text style={s.massive}>
          {formatValue(contest.total)}
          <Text style={s.unit}> {unit}</Text>
        </Text>
        <View>
          <Text style={s.rowTitle}>3rd of 8</Text>
          <Text style={s.small}>↑ 1 place this week</Text>
        </View>
      </View>
      {PROTOTYPE_PEOPLE.map((p, i) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${formatValue(contest.values[i]!)} ${unit}`}
          key={p.name}
          onPress={() =>
            announce(
              `${p.name} · ${p.elo} Elo · ${formatValue(contest.values[i]!)} ${unit}`,
            )
          }
          style={s.laneRow}
        >
          <Text style={s.laneInitial}>{p.initials}</Text>
          <View style={s.laneTrack}>
            <View
              style={[
                s.laneFill,
                {
                  width: `${(contest.values[i]! / (contest.values[0]! * 1.12)) * 100}%`,
                  backgroundColor: p.name === "You" ? c.accent : p.color,
                  opacity: p.name === "You" ? 1 : 0.5,
                },
              ]}
            />
            <Text
              style={[
                s.laneName,
                p.name === "You" && c.id === "orbit" && { color: "#29351e" },
              ]}
            >
              {p.name}
            </Text>
          </View>
          <Text style={s.laneValue}>{formatValue(contest.values[i]!)}</Text>
        </Pressable>
      ))}
      {ghost && (
        <View style={s.ghost}>
          <Text style={s.copy}>◌ Past you</Text>
          <Text style={s.rowTitle}>
            {formatValue(contest.previous)} {unit}
          </Text>
          <Text style={s.small}>Not ranked</Text>
        </View>
      )}
      <View style={s.flexRow}>
        <Text style={s.copy}>Show past you</Text>
        <Switch
          accessibilityLabel="Show past you"
          value={ghost}
          onValueChange={setGhost}
          trackColor={{ false: c.muted, true: c.color }}
          thumbColor={c.card}
        />
      </View>
      {copy(
        ghost
          ? `+${delta} ${unit} vs the same time last week`
          : "A comparison, not another competitor.",
      )}
    </>,
  );
  const listBoard = section(
    <>
      {eyebrow(`${contest.label.toUpperCase()} / WEEKLY CLASSIFICATION`)}
      <Text style={s.h3}>The weekly standings.</Text>
      {PROTOTYPE_PEOPLE.map((p, i) => (
        <Pressable
          key={p.name}
          accessibilityRole="button"
          onPress={() => announce(`${p.name} · ${p.elo} Elo`)}
          style={s.leaderRow}
        >
          <Text style={s.position}>{String(i + 1).padStart(2, "0")}</Text>
          <View style={s.grow}>
            <Text style={s.rowTitle}>{p.name}</Text>
            <Text style={s.small}>{p.elo} Elo</Text>
          </View>
          <Text style={s.rowTitle}>
            {formatValue(contest.values[i]!)} {unit}
          </Text>
        </Pressable>
      ))}
      <View style={s.flexRow}>
        <Text style={s.copy}>
          Past you · {formatValue(contest.previous)} {unit}
        </Text>
        <Switch
          value={ghost}
          onValueChange={setGhost}
          accessibilityLabel="Show past you"
          trackColor={{ true: c.color }}
        />
      </View>
      {ghost &&
        copy(
          `+${delta} ${unit} at the same elapsed point. Past you is not ranked.`,
        )}
    </>,
  );
  const empty = section(
    <View style={s.empty}>
      <Text style={[s.massive, { color: c.color }]}>◎</Text>
      {eyebrow("A NEW STARTING LINE")}
      <Text style={[s.title, { textAlign: "center" }]}>
        Your next chapter{"\n"}starts here.
      </Text>
      {copy(
        "Pick a sport. Join on your own or bring your crew. There’s a place for your effort.",
      )}
      {button("Find an arena", () => setPanel("registration"))}
    </View>,
  );
  const awards = section(
    <>
      <View style={s.flexRow}>
        <Text style={s.h3}>Your silver lining.</Text>
        <View style={s.medal}>
          <Text style={s.medalIcon}>✺</Text>
        </View>
      </View>
      {copy("2nd in last week’s running field.")}
      {copy("23.8 km · +24 Elo · October 5—12")}
      {button("Open your awards", () => setPanel("awards"), true)}
    </>,
  );
  const ranking = row(
    "Beyond this week",
    "All-time pace & race rankings",
    () => setPanel("rankings"),
    "↗",
  );
  const crewHero = (
    <View style={s.crewHero}>
      <Text
        style={[
          s.eyebrow,
          { color: conceptId === "orbit" ? "#d6e6b8" : c.paper },
        ]}
      >
        YOUR PEOPLE / 8 MEMBERS
      </Text>
      <View style={s.flexRow}>
        <Text style={s.crewTitle}>{crewName}</Text>
        <View style={s.crewSeal}>
          <Text style={s.sealText}>S / P{"\n"}EST. 2026</Text>
        </View>
      </View>
      <Text style={s.crewSubtitle}>Different paces. Same direction.</Text>
      <View style={[s.flexRow, { marginTop: 22 }]}>
        {avatars}
        <Pressable
          accessibilityRole="button"
          onPress={() => setPanel("invite")}
          style={s.inviteSmall}
        >
          <Text style={s.inviteSmallText}>Invite a friend ＋</Text>
        </Pressable>
      </View>
    </View>
  );
  const goal = section(
    <>
      <View style={s.flexRow}>
        {eyebrow("OUR SHARED WEEK")}
        {pill("72%")}
      </View>
      <View style={s.flexRow}>
        <Text style={s.goalTotal}>
          72.4 <Text style={s.unit}>/ 100 km</Text>
        </Text>
        {conceptId === "orbit" && (
          <ProgressRing color={c.color} muted={c.muted} />
        )}
      </View>
      <View style={s.goalBar}>
        <View style={[s.goalFill, { backgroundColor: c.color }]} />
      </View>
      {copy("27.6 km to our collective finish line.")}
      {button("Send a little encouragement", () => setPanel("nudge"), true)}
    </>,
  );
  const crewMembers = section(
    <>
      {eyebrow("THE PEOPLE BEHIND THE MILES")}
      {PROTOTYPE_PEOPLE.map((p) => (
        <View style={s.leaderRow} key={p.name}>
          <View style={[s.avatar, { backgroundColor: p.color }]}>
            <Text style={s.avatarText}>{p.initials}</Text>
          </View>
          <View style={s.grow}>
            <Text style={s.rowTitle}>{p.name === "You" ? name : p.name}</Text>
            <Text style={s.small}>
              {p.name === "You" ? "Crew owner" : "Member"}
            </Text>
          </View>
          <Text style={s.rowTitle}>{p.km} km</Text>
        </View>
      ))}
      {panel !== "manage" &&
        button("Manage crew", () => setPanel("manage"), true)}
    </>,
  );
  const feed = section(
    <>
      <View style={s.feedHead}>
        <Text style={s.h3}>The latest, together.</Text>
        <Segments
          values={["Activity", "Leaderboard"]}
          selected={crewView}
          onSelect={setCrewView}
          c={c}
        />
      </View>
      {crewView === "Activity"
        ? PROTOTYPE_PEOPLE.filter((p) => p.name !== "You").map((p, i) => (
            <View style={s.feedEntry} key={p.name}>
              <View style={[s.avatar, { backgroundColor: p.color }]}>
                <Text style={s.avatarText}>{p.initials}</Text>
              </View>
              <View style={s.grow}>
                <Text style={s.rowTitle}>
                  {p.name}{" "}
                  <Text style={s.small}>
                    {["2h ago", "4h ago", "Yesterday"][i]}
                  </Text>
                </Text>
                <Text style={[s.copy, { marginTop: 8 }]}>
                  {
                    [
                      "Found a little morning sunshine.",
                      "Lunch break, but make it a loop.",
                      "Slow miles with good company.",
                    ][i]
                  }
                </Text>
                <View style={s.workout}>
                  <Text style={s.h3}>
                    ↗ {["6.2 km", "4.5 km", "8.1 km"][i]}
                  </Text>
                  <Text style={s.small}>Easy run · GPS verified</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: cheers.includes(p.name) }}
                  onPress={() =>
                    setCheers((prev) =>
                      prev.includes(p.name)
                        ? prev.filter((n) => n !== p.name)
                        : [...prev, p.name],
                    )
                  }
                  style={[
                    s.cheer,
                    cheers.includes(p.name) && { backgroundColor: c.accent },
                  ]}
                >
                  <Text
                    style={[
                      s.small,
                      cheers.includes(p.name) && { color: "#27331d" },
                    ]}
                  >
                    {cheers.includes(p.name) ? "♥ Cheered" : "♡ Cheer"} ·{" "}
                    {7 + i + (cheers.includes(p.name) ? 1 : 0)}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        : PROTOTYPE_PEOPLE.map((p, i) => (
            <View key={p.name} style={s.leaderRow}>
              <Text style={s.position}>{i + 1}</Text>
              <Text style={[s.rowTitle, s.grow]}>{p.name}</Text>
              <Text style={s.rowTitle}>{p.km} km</Text>
            </View>
          ))}
    </>,
  );
  const profile = (
    <View
      style={[
        s.profile,
        conceptId === "focus" && s.profileCentered,
        conceptId === "club" && s.profileMagazine,
      ]}
    >
      <View style={s.profileAvatar}>
        <Text style={s.profileInitials}>AL</Text>
        <View style={s.profileBadge}>
          <Text style={s.avatarText}>↗</Text>
        </View>
      </View>
      <View style={conceptId === "focus" ? s.center : s.grow}>
        {eyebrow("ATHLETE / TORONTO")}
        <Text style={s.profileName}>{name}</Text>
        <Text style={s.small}>Not the fastest. Just getting better.</Text>
        <View
          style={{
            marginTop: 12,
            alignItems: conceptId === "focus" ? "center" : "flex-start",
          }}
        >
          {pill("Strider · 1,248 Elo")}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit athlete profile"
        onPress={() => setPanel("settings")}
        style={s.profileSettings}
      >
        <Text style={s.icon}>⚙</Text>
      </Pressable>
    </View>
  );
  const elo = section(
    <>
      {eyebrow("YOUR LEVEL IS MOVING")}
      <View style={s.flexRow}>
        <Text style={s.goalTotal}>
          1,248 <Text style={s.unit}>Elo</Text>
        </Text>
        <Text style={s.small}>+86 in 12 weeks</Text>
      </View>
      <NativeChart c={c} range={range} />
      <View style={s.flexRow}>
        <Text style={s.small}>Aug 1</Text>
        <Text style={s.small}>Oct 16</Text>
      </View>
      {button("Explore your progress", () => setPanel("progress"), true)}
    </>,
  );
  const settings = section(
    <>
      {eyebrow("YOUR SETUP")}
      {row(
        "Connections",
        "Bring your training together",
        () => setPanel("connections"),
        "↔",
      )}
      {row(
        "Preferences",
        "Sports, units & recommendations",
        () => setPanel("settings"),
        "◎",
      )}
      {row(
        "Notifications & privacy",
        "Only the updates you want",
        () => setPanel("settings"),
        "◷",
      )}
      {row(
        "Progress",
        "Statistics, trends & Elo history",
        () => setPanel("progress"),
        "↗",
      )}
    </>,
  );
  const disclosure = (
    label: string,
    open: boolean,
    toggle: () => void,
    children: ReactNode,
  ) => (
    <View style={s.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={s.disclosureHeader}
      >
        <Text style={s.rowTitle}>{label}</Text>
        <Text style={s.text}>{open ? "−" : "＋"}</Text>
      </Pressable>
      {open && children}
    </View>
  );

  function homeScreen() {
    switch (conceptId) {
      case "trail":
        return (
          <>
            {title(
              "YOUR DAILY STARTING POINT",
              `Good morning, ${name.split(" ")[0]}.`,
              "Small steps. A week that adds up.",
            )}
            {arrival}
            {suggestion}
            {path}
          </>
        );
      case "index":
        return (
          <>
            <View style={s.journalMast}>
              <Text style={s.journalTitle}>The training{"\n"}journal.</Text>
              <View>
                <Text style={s.journalNumber}>42</Text>
                {eyebrow("WEEK / 2026")}
              </View>
            </View>
            <View style={s.indexSummary}>{stats}</View>
            {suggestion}
            {path}
          </>
        );
      case "orbit":
        return (
          <>
            {title("YOUR DAILY SIGNAL", "Build a little momentum.")}
            <View style={s.bento}>
              <View style={s.bentoMain}>
                {eyebrow("WEEKLY VOLUME")}
                <Text style={s.bentoValue}>
                  23.4 <Text style={s.unit}>km</Text>
                </Text>
                {copy("+3.8 vs past you")}
              </View>
              <View style={s.bentoSide}>
                {eyebrow("SESSIONS")}
                <Text style={s.bentoValue}>04</Text>
                <Text style={s.small}>of 5 this week</Text>
              </View>
            </View>
            {suggestion}
            {path}
          </>
        );
      case "club":
        return (
          <>
            <View style={s.magazineMast}>
              <Text style={s.magazineTitle}>THE DAILY</Text>
              <Text style={s.small}>Friday edition{"\n"}No. 042</Text>
            </View>
            {suggestion}
            <View style={s.clubNote}>
              {avatars}
              <Text style={[s.copy, s.grow]}>
                Different paces.{"\n"}Same good feeling.
              </Text>
            </View>
            {path}
          </>
        );
      case "focus":
        return (
          <>
            {title("FRIDAY, OCTOBER 16", "Just one good move.")}
            {suggestion}
            {disclosure(
              "Your week at a glance",
              weekOpen,
              () => setWeekOpen(!weekOpen),
              weekly,
            )}
            {path}
            {arrival}
          </>
        );
    }
  }
  function arenaScreen() {
    const content = joined.length
      ? conceptId === "index"
        ? listBoard
        : board
      : empty;
    switch (conceptId) {
      case "trail":
        return (
          <>
            {title("A LITTLE FRIENDLY MOMENTUM", "Your effort has a place.")}
            {registerStrip}
            {content}
            {awards}
            {ranking}
          </>
        );
      case "index":
        return (
          <>
            {title("COMPETITION INDEX", "The weekly standings.")}
            <View style={s.indexSummary}>
              {eyebrow("12—19 OCT / CLOSES MONDAY 00:00 UTC")}
              {registerStrip}
            </View>
            {content}
            {ranking}
            {awards}
          </>
        );
      case "orbit":
        return (
          <>
            {title("YOUR ACTIVE ORBITS", "A week in motion.")}
            <View style={s.bento}>
              {[
                [String(joined.length).padStart(2, "0"), "ACTIVE"],
                ["1,248", "OPEN ELO"],
                ["+18", "THIS WEEK"],
              ].map(([v, l]) => (
                <View key={l} style={s.metricBox}>
                  {eyebrow(l)}
                  <Text style={s.metricValue}>{v}</Text>
                </View>
              ))}
            </View>
            {registerStrip}
            {content}
            <View style={s.bento}>
              <View style={s.grow}>{awards}</View>
            </View>
            {ranking}
          </>
        );
      case "club":
        return (
          <>
            <View style={s.magazineMast}>
              <Text style={s.magazineTitle}>THE ARENA</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPanel("registration")}
              >
                <Text style={s.small}>Find your field ↗</Text>
              </Pressable>
            </View>
            {awards}
            {registerStrip}
            {content}
            {ranking}
          </>
        );
      case "focus":
        return (
          <>
            {title("YOUR WEEK, YOUR PACE", "A little further than before.")}
            {registerStrip}
            {content}
            {disclosure(
              "Past competitions & awards",
              awardsOpen,
              () => setAwardsOpen(!awardsOpen),
              awards,
            )}
            {ranking}
          </>
        );
    }
  }
  function crewScreen() {
    switch (conceptId) {
      case "trail":
        return (
          <>
            {crewHero}
            {goal}
            {feed}
            {button("Crew settings", () => setPanel("manage"), true)}
          </>
        );
      case "index":
        return (
          <>
            {title("THE CLUB REGISTER", crewName)}
            {crewMembers}
            {goal}
            {feed}
          </>
        );
      case "orbit":
        return (
          <>
            {title("CONNECTED BY EFFORT", "Your inner circle.")}
            {goal}
            <View style={s.clubNote}>
              {avatars}
              <View style={s.grow}>
                <Text style={s.rowTitle}>{crewName}</Text>
                <Text style={s.small}>8 people, one shared goal</Text>
              </View>
            </View>
            {feed}
            {button("Manage your circle", () => setPanel("manage"), true)}
          </>
        );
      case "club":
        return (
          <>
            {crewHero}
            {feed}
            {goal}
            {crewMembers}
          </>
        );
      case "focus":
        return (
          <>
            {title("YOUR CIRCLE", crewName)}
            {goal}
            <View style={s.flexRow}>
              {avatars}
              {button("Invite", () => setPanel("invite"), true)}
            </View>
            {disclosure(
              "Catch up with the crew",
              feedOpen,
              () => setFeedOpen(!feedOpen),
              feed,
            )}
            {crewMembers}
          </>
        );
    }
  }
  function athleteScreen() {
    switch (conceptId) {
      case "trail":
        return (
          <>
            {profile}
            {summary}
            {elo}
            {settings}
          </>
        );
      case "index":
        return (
          <>
            {title("ATHLETE DOSSIER", "Your own kind of athlete.")}
            {profile}
            {settings}
            {summary}
            {elo}
          </>
        );
      case "orbit":
        return (
          <>
            {profile}
            {elo}
            {summary}
            {settings}
          </>
        );
      case "club":
        return (
          <>
            <View style={s.magazineMast}>
              <Text style={s.magazineTitle}>THE ATHLETE</Text>
              <Text style={s.small}>Always a work{"\n"}in progress.</Text>
            </View>
            {profile}
            {summary}
            {elo}
            {settings}
          </>
        );
      case "focus":
        return (
          <>
            {profile}
            {summary}
            {settings}
            <Pressable
              accessibilityRole="button"
              onPress={() => setPanel("progress")}
              style={s.focusProgress}
            >
              {eyebrow("THE LONG VIEW")}
              <Text style={s.focusProgressTitle}>
                You’re becoming{"\n"}your own benchmark.
              </Text>
              <NativeChart c={{ ...c, color: c.accent }} range={range} />
              <Text style={s.focusProgressLink}>Explore your progress ↗</Text>
            </Pressable>
          </>
        );
    }
  }
  const input = (
    label: string,
    value: string,
    onChange: (s: string) => void,
    multiline = false,
  ) => (
    <View style={s.field}>
      <Text style={s.small}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        maxLength={multiline ? 160 : 40}
        style={[
          s.input,
          multiline && { height: 110, textAlignVertical: "top" },
        ]}
        placeholderTextColor={c.muted}
      />
    </View>
  );
  function modalContent() {
    switch (panel) {
      case "suggestion":
        return (
          <>
            <View style={s.recommendation}>
              <Ember size={160} expression="happy" />
              {eyebrow("TODAY’S SUGGESTION")}
              <Text style={[s.title, { textAlign: "center" }]}>
                5 km. Easy does it.
              </Text>
              {copy("About 30 minutes · conversational pace")}
            </View>
            {section(
              <>
                <Text style={s.h3}>Why this fits today</Text>
                {copy(
                  "You’ve put in two solid runs this week. An easy session builds consistency and leaves room to recover.",
                )}
                {copy(
                  "A flexible suggestion, not a prescription. Rest is always an option.",
                )}
              </>,
            )}
            {button("Keep this suggestion", () => {
              setPanel(null);
              announce(
                "Easy run saved to your prototype plan. Your tracker records the activity.",
              );
            })}
            {button(
              "Take a rest day instead",
              () => {
                setPanel(null);
                announce("Rest day noted. See you tomorrow.");
              },
              true,
            )}
          </>
        );
      case "receipt":
        return (
          <>
            {eyebrow(`${receipt.day} / ${receipt.date}`)}
            <Text style={s.massive}>{receipt.value}</Text>
            {copy(receipt.detail)}
            {row(
              "Status",
              "Counted toward Week 42",
              () => announce("This session is already counted."),
              "✓",
            )}
            {copy("Sample receipt. No account activity has been changed.")}
            {button("See it in Arena", () => {
              setPanel(null);
              setTab("Arena");
            })}
          </>
        );
      case "registration":
        return (
          <>
            <Segments
              values={["GPS", "Non-GPS", "Health"]}
              selected={family}
              c={c}
              onSelect={(f) => {
                setFamily(f);
                setSport(
                  PROTOTYPE_SPORTS.find((s) => s.family === f && s.available)!
                    .id,
                );
                setScoreTrack(f === "GPS" ? "GPS verified" : "Open");
              }}
            />
            {PROTOTYPE_SPORTS.filter((s) => s.family === family).map(
              (sportOption) => (
                <Pressable
                  key={sportOption.id}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: sport === sportOption.id,
                    disabled: !sportOption.available,
                  }}
                  disabled={!sportOption.available}
                  onPress={() => setSport(sportOption.id)}
                  style={[
                    s.option,
                    sport === sportOption.id && {
                      borderColor: c.color,
                      borderWidth: 2,
                    },
                    !sportOption.available && { opacity: 0.4 },
                  ]}
                >
                  <View style={s.grow}>
                    <Text style={s.rowTitle}>{sportOption.name}</Text>
                    <Text style={s.small}>
                      {sportOption.available
                        ? `Weekly · ${sportOption.unit}`
                        : "Exploring next"}
                    </Text>
                  </View>
                  <Text style={s.text}>
                    {sport === sportOption.id ? "●" : "○"}
                  </Text>
                </Pressable>
              ),
            )}
            {eyebrow("HOW WILL YOU JOIN?")}
            <Segments
              values={["Solo", crewName]}
              selected={mode}
              onSelect={setMode}
              c={c}
            />
            {family === "GPS" && (
              <>
                {eyebrow("YOUR SCORE TRACK")}
                <Segments
                  values={["GPS verified", "Open"]}
                  selected={scoreTrack}
                  onSelect={setScoreTrack}
                  c={c}
                />
              </>
            )}
            {copy(
              "Monday—Monday · closes 00:00 UTC. Crew scores remain individual. Health uses its own score, not mileage.",
            )}
            {button(
              `Join ${PROTOTYPE_SPORTS.find((s) => s.id === sport)?.name}`,
              () => {
                setRegistrations((prev) => [
                  ...(scenario === "Empty arena" ? [] : prev).filter(
                    (r) => r.sport !== sport,
                  ),
                  { sport, mode, track: scoreTrack },
                ]);
                setActiveSport(sport);
                setScenario("Everyday");
                setPanel(null);
                setTab("Arena");
                announce("Registration saved in this prototype.");
              },
            )}
          </>
        );
      case "awards":
      case "complete":
        return (
          <>
            <View style={s.recommendation}>
              <Text style={s.bigMedal}>✺</Text>
              {eyebrow("RUNNING / OCTOBER 5—12")}
              <Text style={[s.title, { textAlign: "center" }]}>
                2nd place.{"\n"}First-class consistency.
              </Text>
              {copy("23.8 km · 5 counted sessions")}
              <Text style={s.goalTotal}>1,224 → 1,248</Text>
              {pill("+24 Elo")}
            </View>
            {copy(
              "Completed weeks keep their final place and rating change. New weeks begin Monday 00:00 UTC.",
            )}
            {row("Previous week · Running", "3rd place · +18 Elo", () =>
              announce("Previous result: 3rd of 8, 21.2 km, +18 Elo."),
            )}
            {button("Back to this week", () => {
              setPanel(null);
              setTab("Arena");
            })}
          </>
        );
      case "rankings":
        return (
          <>
            {copy("Distance times, separate from weekly effort.")}
            <Segments
              values={["5K", "10K", "Half", "Marathon"]}
              selected={distance}
              onSelect={setDistance}
              c={c}
            />
            {eyebrow(`ILLUSTRATIVE GLOBAL ${distance} TIMES`)}
            {PROTOTYPE_PEOPLE.map((p, i) => (
              <View key={p.name} style={s.leaderRow}>
                <Text style={s.position}>{i + 1}</Text>
                <Text style={[s.rowTitle, s.grow]}>{p.name}</Text>
                <Text style={s.rowTitle}>
                  {distance === "5K"
                    ? ["18:42", "19:08", "21:36", "22:10"][i]
                    : distance === "10K"
                      ? ["39:14", "40:29", "44:08", "45:12"][i]
                      : distance === "Half"
                        ? ["1:26:10", "1:29:22", "1:37:06", "1:41:20"][i]
                        : ["3:05:12", "3:12:44", "3:28:15", "3:34:09"][i]}
                </Text>
              </View>
            ))}
            {copy(
              "Sample times for interface evaluation. Published race rankings remain separate from training pace.",
            )}
          </>
        );
      case "invite":
        return (
          <>
            {avatars}
            {copy("A little company makes a long way feel shorter.")}
            <View style={s.code}>
              <Text selectable style={s.codeText}>
                SUNDAY42
              </Text>
            </View>
            {copy(
              "Select the code to copy. This illustrative invitation is not delivered to a real person.",
            )}
            {button("Done", () => setPanel(null))}
          </>
        );
      case "manage":
        return (
          <>
            {input("Crew name", crewName, setCrewName)}
            {crewMembers}
            {button(
              "Save crew name",
              () => {
                setPanel(null);
                announce("Crew name saved in this prototype.");
              },
              false,
              !crewName.trim(),
            )}
            {button("Invite a member", () => setPanel("invite"), true)}
          </>
        );
      case "nudge":
        return (
          <>
            {copy(
              "Encourage the crew without turning movement into an obligation.",
            )}
            {input("Message", nudge, setNudge, true)}
            {copy(`${nudge.length}/160 · preview only`)}
            {button(
              "Preview crew nudge",
              () => {
                setPanel(null);
                announce("Nudge preview saved. Nothing was sent.");
              },
              false,
              !nudge.trim(),
            )}
          </>
        );
      case "progress":
        return (
          <>
            <Segments
              values={["4 weeks", "12 weeks", "Year"]}
              selected={range}
              onSelect={setRange}
              c={c}
            />
            {eyebrow(`OPEN ELO / ${range.toUpperCase()}`)}
            <Text style={s.massive}>
              1,248
              <Text style={s.unit}>
                {" "}
                +{range === "4 weeks" ? "42" : range === "Year" ? "248" : "86"}
              </Text>
            </Text>
            <NativeChart c={c} range={range} />
            {summary}
            <View style={s.leaderRow}>
              <Text style={[s.rowTitle, s.grow]}>GPS-verified running Elo</Text>
              <Text style={s.rowTitle}>1,216</Text>
            </View>
            {copy(
              "Open and GPS-verified ratings are separate. Health has its own score. History here is illustrative.",
            )}
          </>
        );
      case "settings":
        return (
          <>
            {input("Display name", name, setName)}
            {eyebrow("DISTANCE UNITS")}
            <Segments
              values={["Kilometers", "Miles"]}
              selected={units}
              onSelect={setUnits}
              c={c}
            />
            <View style={s.flexRow}>
              <Text style={[s.copy, s.grow]}>
                Week summaries & crew updates
              </Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                accessibilityLabel="Week summaries and crew updates"
                trackColor={{ true: c.color }}
              />
            </View>
            <View style={s.leaderRow}>
              <Text style={[s.rowTitle, s.grow]}>Profile visibility</Text>
              <Text style={s.small}>Crew only</Text>
            </View>
            {copy(
              "Units are saved for this prototype session. Fixture distances remain labeled in km.",
            )}
            {button(
              "Save preferences",
              () => {
                setPanel(null);
                announce("Preferences saved for this prototype session.");
              },
              false,
              !name.trim(),
            )}
          </>
        );
      case "connections":
        return (
          <>
            {copy("Your connected sources will keep your effort together.")}
            {[
              "Strava",
              "Garmin",
              "Apple Health",
              "Health Connect",
              "WHOOP",
              "Oura",
            ]
              .filter(
                (p) =>
                  p !==
                  (Platform.OS === "android"
                    ? "Apple Health"
                    : "Health Connect"),
              )
              .map((p, i) =>
                row(
                  p,
                  i === 0
                    ? "Sample connection · 2 hours ago"
                    : p === "Apple Health"
                      ? "iOS device workouts"
                      : p === "Health Connect"
                        ? "Android device workouts"
                        : "Not connected",
                  () =>
                    announce(
                      `${p}: connection preview only. No authorization started.`,
                    ),
                  "↔",
                ),
              )}
            {button(
              calibrated
                ? "History calibration complete ✓"
                : "One-time history setup",
              () => {
                setSetupStep(2);
                setPanel("setup");
              },
              true,
            )}
          </>
        );
      case "setup":
        return (
          <>
            <Segments
              values={["You", "Connect", "History"]}
              selected={["You", "Connect", "History"][setupStep]!}
              onSelect={(v) =>
                setSetupStep(["You", "Connect", "History"].indexOf(v))
              }
              c={c}
            />
            {setupStep === 0 ? (
              <>
                {copy("Make this space feel like you.")}
                {input("Your name", name, setName)}
                {eyebrow("PRIMARY SPORT")}
                <Segments
                  values={["Running", "Cycling", "Walking", "Strength"]}
                  selected={
                    PROTOTYPE_SPORTS.find((s) => s.id === sport)?.name ??
                    "Running"
                  }
                  onSelect={(v) => setSport(v.toLowerCase())}
                  c={c}
                />
              </>
            ) : setupStep === 1 ? (
              <>
                {title(
                  "BRING YOUR TRAINING WITH YOU",
                  "Connect when you’re ready.",
                )}
                {copy(
                  "Connect a tracker from Athlete → Connections. This study does not request access to your accounts.",
                )}
                {button(
                  "Preview tracker connection",
                  () =>
                    announce("Connection step previewed. No authorization."),
                  true,
                )}
              </>
            ) : (
              <>
                {title(
                  "ONE-TIME / OPTIONAL",
                  calibrated
                    ? "Your starting point is set."
                    : "A starting point, not a blank slate.",
                )}
                {copy(
                  "Optional one-time 90-day history import. This prototype marks the step complete without importing or inventing workouts.",
                )}
                {button(
                  calibrated
                    ? "History step completed ✓"
                    : "Preview history setup",
                  () => setCalibrated(true),
                  true,
                  calibrated,
                )}
              </>
            )}
            {button(setupStep < 2 ? "Continue" : "Meet your Home", () => {
              if (setupStep < 2) setSetupStep(setupStep + 1);
              else {
                setPanel(null);
                setTab("Home");
                announce("Setup preview complete. Welcome in.");
              }
            })}
          </>
        );
      case "return":
        return (
          <>
            <View style={s.recommendation}>
              <Ember size={160} expression="happy" />
              {eyebrow("WELCOME BACK")}
              <Text style={[s.title, { textAlign: "center" }]}>
                6.2 km further.{"\n"}One place higher.
              </Text>
              {copy("Your morning run moved you from 4th to 3rd.")}
            </View>
            {button("See your new position", () => {
              setTab("Arena");
              setPanel(null);
            })}
            {button(
              "Continue to Home",
              () => {
                setTab("Home");
                setPanel(null);
              },
              true,
            )}
          </>
        );
      default:
        return null;
    }
  }
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.labHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close design study"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/today")
          }
        >
          <Text style={s.labBack}>←</Text>
        </Pressable>
        <View style={s.grow}>
          <Text style={s.labTitle}>INTERFACE STUDIO</Text>
          <Text style={s.small}>Native prototypes · 5 directions × 4 tabs</Text>
        </View>
        <View style={s.sampleBadge}>
          <Text style={s.sampleText}>LOCAL</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.directionScroll}
        contentContainerStyle={s.directionRow}
      >
        {LAYOUT_CONCEPTS.map((d, i) => (
          <Pressable
            key={d.id}
            accessibilityRole="button"
            accessibilityState={{ selected: conceptId === d.id }}
            onPress={() => {
              setConceptId(d.id);
              setPanel(null);
            }}
            style={[
              s.directionButton,
              conceptId === d.id && {
                backgroundColor: c.ink,
                borderColor: c.ink,
              },
            ]}
          >
            <Text
              style={[
                s.directionNumber,
                conceptId === d.id && { color: c.paper },
              ]}
            >
              {String(i + 1).padStart(2, "0")}
            </Text>
            <Text
              style={[
                s.directionName,
                conceptId === d.id && { color: c.paper },
              ]}
            >
              {d.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.scenarioScroll}
        contentContainerStyle={s.scenarioRow}
      >
        {[
          "Everyday",
          "Empty arena",
          "New progress",
          "Week complete",
          "First visit",
        ].map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: scenario === v }}
            onPress={() => previewScenario(v)}
            style={[
              s.scenarioButton,
              scenario === v && { borderBottomColor: c.color },
            ]}
          >
            <Text style={[s.small, scenario === v && { color: c.ink }]}>
              {v}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        key={`${conceptId}-${tab}`}
        style={s.main}
        contentContainerStyle={s.content}
      >
        {tab === "Home"
          ? homeScreen()
          : tab === "Arena"
            ? arenaScreen()
            : tab === "Crew"
              ? crewScreen()
              : athleteScreen()}
        <Text style={s.prototypeNote}>
          {c.name} · {c.layout}
          {"\n"}Sample content. No account changes.
        </Text>
      </ScrollView>
      <View style={s.dock}>
        {PROTOTYPE_TABS.map((t) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            accessibilityLabel={t}
            key={t}
            onPress={() => setTab(t)}
            style={[s.dockItem, tab === t && { backgroundColor: c.accent }]}
          >
            <NativeTabIcon tab={t} color={tab === t ? "#293423" : c.muted} />
            <Text style={[s.dockLabel, tab === t && { color: "#293423" }]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={panel !== null}
        transparent
        animationType={reduceMotion ? "none" : "slide"}
        onRequestClose={() => setPanel(null)}
      >
        <KeyboardAvoidingView
          style={s.modalRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            style={s.modalBackdrop}
            onPress={() => setPanel(null)}
          />
          <SafeAreaView
            edges={["bottom"]}
            style={s.sheet}
            accessibilityViewIsModal
          >
            <View style={s.sheetHandle} />
            <View style={s.sheetTop}>
              <Text style={s.eyebrow}>OVERTAEK / {panel?.toUpperCase()}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={() => setPanel(null)}
                style={s.close}
              >
                <Text style={s.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.sheetContent}
            >
              <Text accessibilityRole="header" style={s.sheetTitle}>
                {panel ? panelTitles[panel] : ""}
              </Text>
              <Text style={s.sheetDescription}>
                {panel === "registration"
                  ? "Choose a weekly competition and how you want to participate."
                  : "A closer look, without losing your place."}
              </Text>
              {modalContent()}
            </ScrollView>
          </SafeAreaView>
          {notice ? (
            <View
              style={[s.notice, { bottom: 30 }]}
              accessibilityLiveRegion="polite"
            >
              <Text style={s.noticeText}>✓ {notice}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss message"
                onPress={() => setNotice("")}
              >
                <Text style={s.noticeText}>×</Text>
              </Pressable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
      {notice && !panel ? (
        <View style={s.notice} accessibilityLiveRegion="polite">
          <Text style={s.noticeText}>✓ {notice}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            onPress={() => setNotice("")}
          >
            <Text style={s.noticeText}>×</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Segments({
  values,
  selected,
  onSelect,
  c,
}: {
  values: string[];
  selected: string;
  onSelect: (v: string) => void;
  c: Concept;
}) {
  const s = createStyles(c);
  return (
    <View style={s.segments}>
      {values.map((v) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === v }}
          key={v}
          onPress={() => onSelect(v)}
          style={[
            s.segment,
            selected === v && { backgroundColor: c.card, shadowOpacity: 0.06 },
          ]}
        >
          <Text
            style={[
              s.segmentText,
              selected === v && {
                color: c.id === "orbit" ? c.accent : c.color,
                fontFamily: "DMSans_700Bold",
              },
            ]}
          >
            {v}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function NativeChart({
  c,
  range,
}: {
  c: { color: string; accent: string; muted: string };
  range: string;
}) {
  const points =
    range === "4 weeks"
      ? "0,100 45,80 90,86 135,62 180,64 225,32 270,35 320,12"
      : range === "Year"
        ? "0,115 45,105 90,110 135,78 180,87 225,53 270,35 320,12"
        : "0,108 30,99 60,104 90,80 120,86 150,61 180,69 210,47 240,51 270,24 295,29 320,12";
  return (
    <Svg
      width="100%"
      height={150}
      viewBox="0 0 330 140"
      accessibilityLabel={`Illustrative increasing Elo trend over ${range}`}
      accessible
    >
      <Line x1="0" y1="40" x2="320" y2="40" stroke={c.muted} opacity={0.2} />
      <Line x1="0" y1="80" x2="320" y2="80" stroke={c.muted} opacity={0.2} />
      <Line x1="0" y1="120" x2="320" y2="120" stroke={c.muted} opacity={0.2} />
      <Polygon
        points={`0,130 ${points} 320,130`}
        fill={c.accent}
        opacity={0.2}
      />
      <Polyline
        points={points}
        stroke={c.color}
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
      />
      <Circle cx="320" cy="12" r="5" fill={c.color} />
    </Svg>
  );
}
function ProgressRing({ color, muted }: { color: string; muted: string }) {
  return (
    <Svg
      width={74}
      height={74}
      viewBox="0 0 80 80"
      accessibilityLabel="72 percent of shared goal"
      accessible
    >
      <Circle
        cx="40"
        cy="40"
        r="30"
        fill="none"
        stroke={muted}
        strokeWidth="6"
        opacity={0.2}
      />
      <Circle
        cx="40"
        cy="40"
        r="30"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray="136 189"
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
    </Svg>
  );
}
function NativeJourney({
  concept: c,
  onToday,
  onSession,
  emberLift,
}: {
  concept: Concept;
  onToday: () => void;
  onSession: (d: (typeof PROTOTYPE_DAYS)[number]) => void;
  emberLift: Animated.Value;
}) {
  const s = createStyles(c);
  return (
    <View style={s.journey}>
      <Svg
        width="100%"
        height={1570}
        viewBox="0 0 380 1570"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path
          d="M220 20 C220 90 100 80 100 160 S280 210 280 290 S100 340 100 430 S280 480 280 570 S100 620 100 710 S280 760 280 850 S100 900 100 990 S280 1040 280 1130 S100 1180 100 1270 S280 1320 280 1410 S190 1480 190 1540"
          stroke={
            c.id === "orbit"
              ? "#46543c"
              : c.id === "index"
                ? "#d0dbcf"
                : "#dfd7e4"
          }
          strokeWidth={c.id === "index" ? 5 : 13}
          strokeDasharray="1 23"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={s.future}>
        <Text style={[s.icon, { opacity: 0.3, fontSize: 33 }]}>○</Text>
        <Text style={s.small}>Tomorrow{"\n"}Room for what’s next</Text>
      </View>
      {PROTOTYPE_DAYS.map((d, i) => (
        <View
          key={d.date}
          style={[s.stop, { top: 115 + i * 128, left: i % 2 ? "29%" : "9%" }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              i === 0
                ? "Today: open exercise recommendation"
                : `${d.day}, ${d.date}, ${d.value}: open session receipt`
            }
            onPress={() => (i === 0 ? onToday() : onSession(d))}
            style={({ pressed }) => [
              s.dayTile,
              i === 0 && { backgroundColor: c.accent },
              pressed && { transform: [{ translateY: -4 }] },
            ]}
          >
            {i === 0 ? (
              <Animated.View
                style={[
                  s.pathEmber,
                  { transform: [{ translateY: emberLift }] },
                ]}
              >
                <Ember size={105} expression="happy" />
              </Animated.View>
            ) : (
              <>
                <View style={s.tileTick}>
                  <Text style={s.tickText}>✓</Text>
                </View>
                <Text style={s.tileValue}>{d.value}</Text>
                <Text style={s.small}>{d.day}</Text>
              </>
            )}
          </Pressable>
          <View style={s.stopLabel}>
            <Text style={s.date}>{d.date}</Text>
            <Text style={s.stopTitle}>
              {i === 0 ? "You are here" : d.detail.split(" · ")[0]}
            </Text>
            {i === 0 && (
              <Text style={s.stopDescription}>
                Tap Ember for{"\n"}your next move ↗
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(c: Concept) {
  const border = c.id === "orbit" ? "#ffffff12" : "#00000012";
  const editorial = c.id === "index";
  const orbit = c.id === "orbit";
  const focus = c.id === "focus";
  const club = c.id === "club";
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.paper },
    grow: { flex: 1 },
    center: { alignItems: "center" },
    text: { fontFamily: "DMSans_400Regular", fontSize: 13, color: c.ink },
    copy: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      lineHeight: 20,
      color: c.muted,
      marginVertical: 7,
    },
    small: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      lineHeight: 17,
      color: c.muted,
    },
    eyebrow: {
      fontFamily: "DMSans_700Bold",
      fontSize: 8,
      letterSpacing: 1.4,
      lineHeight: 14,
      color: c.muted,
      marginBottom: 9,
    },
    title: {
      fontFamily: club ? "NunitoSans_900Black" : "DMSans_400Regular",
      fontSize: focus ? 36 : 32,
      letterSpacing: -1.3,
      lineHeight: focus ? 40 : 37,
      color: c.ink,
      marginBottom: 8,
    },
    h3: {
      fontFamily: "DMSans_500Medium",
      fontSize: 18,
      letterSpacing: -0.6,
      color: c.ink,
    },
    heading: { marginVertical: 12, marginBottom: 24 },
    flexRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    card: {
      backgroundColor: editorial ? "transparent" : c.card,
      borderRadius: editorial ? 0 : club ? 5 : focus ? 23 : 17,
      borderWidth: editorial ? 0 : 1,
      borderBottomWidth: 1,
      borderColor: border,
      padding: editorial ? 19 : 21,
      marginBottom: 18,
      gap: 7,
    },
    button: {
      minHeight: 48,
      paddingHorizontal: 18,
      paddingVertical: 14,
      backgroundColor: c.color,
      borderRadius: editorial ? 2 : 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      marginTop: 10,
    },
    secondary: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: border,
    },
    buttonText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: c.paper },
    rowTitle: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      color: c.ink,
      lineHeight: 18,
    },
    icon: { fontSize: 20, color: c.ink },
    pill: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 20,
      alignSelf: "flex-start",
    },
    pillText: { fontFamily: "DMSans_400Regular", fontSize: 9, color: c.muted },
    labHeader: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderColor: border,
    },
    labBack: { fontSize: 22, color: c.ink, padding: 6 },
    labTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 9,
      letterSpacing: 1.5,
      color: c.ink,
      marginBottom: 3,
    },
    sampleBadge: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 5,
      padding: 5,
    },
    sampleText: { fontFamily: "DMSans_700Bold", fontSize: 8, color: c.muted },
    directionScroll: { flexGrow: 0, maxHeight: 68 },
    directionRow: { paddingHorizontal: 18, paddingVertical: 12, gap: 8 },
    directionButton: {
      flexDirection: "row",
      gap: 9,
      alignItems: "center",
      borderWidth: 1,
      borderColor: border,
      borderRadius: 9,
      paddingVertical: 9,
      paddingHorizontal: 13,
    },
    directionNumber: {
      fontFamily: "DMSans_400Regular",
      fontSize: 9,
      color: c.muted,
    },
    directionName: {
      fontFamily: "DMSans_500Medium",
      fontSize: 11,
      color: c.ink,
    },
    scenarioScroll: {
      flexGrow: 0,
      maxHeight: 39,
      borderBottomWidth: 1,
      borderColor: border,
    },
    scenarioRow: { paddingHorizontal: 19, gap: 20 },
    scenarioButton: {
      paddingVertical: 7,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    main: { flex: 1 },
    content: {
      paddingHorizontal: 22,
      paddingTop: 16,
      paddingBottom: 25,
      maxWidth: 640,
      width: "100%",
      alignSelf: "center",
    },
    dock: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: 8,
      paddingBottom: 10,
      paddingHorizontal: 12,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderColor: border,
    },
    dockItem: {
      alignItems: "center",
      gap: 3,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: focus ? 24 : 13,
    },
    dockIcon: { fontSize: 25, lineHeight: 28, color: c.muted },
    dockLabel: { fontFamily: "DMSans_500Medium", fontSize: 9, color: c.muted },
    stats: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginVertical: 15,
    },
    statValue: {
      fontFamily: "DMSans_400Regular",
      fontSize: 29,
      letterSpacing: -1.2,
      color: c.ink,
      marginBottom: 4,
    },
    weekBars: {
      flexDirection: "row",
      gap: 12,
      height: 110,
      marginTop: 12,
      marginBottom: 7,
    },
    weekColumn: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 8,
    },
    weekBar: { width: "100%", borderRadius: 4 },
    suggestion: {
      position: "relative",
      minHeight: club ? 280 : focus ? 265 : 225,
      backgroundColor: focus ? c.card : orbit ? "#2c3b27" : c.color,
      borderWidth: 1,
      borderColor: focus ? border : orbit ? "#d6f77530" : "transparent",
      borderRadius: club ? 12 : editorial ? 2 : 23,
      padding: 25,
      marginBottom: 22,
      overflow: "hidden",
      borderTopLeftRadius: club ? 55 : editorial ? 2 : 23,
    },
    suggestionCopy: { width: "75%", zIndex: 1, gap: 12 },
    suggestionTitle: {
      fontFamily: club ? "NunitoSans_900Black" : "DMSans_400Regular",
      fontSize: 31,
      letterSpacing: -1.2,
      lineHeight: 35,
      color: focus ? c.ink : orbit ? "#f0f5e9" : c.paper,
    },
    suggestionDetail: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: focus ? c.muted : orbit ? "#d9e6c9" : c.paper,
      marginTop: 4,
    },
    suggestionLink: {
      fontFamily: "DMSans_500Medium",
      fontSize: 10,
      color: focus ? c.ink : orbit ? "#d6f775" : c.paper,
      marginTop: 12,
    },
    emberHero: { position: "absolute", right: -5, bottom: 4, zIndex: 2 },
    arrival: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: orbit ? "#2b3628" : c.card,
      borderWidth: 1,
      borderColor: border,
      marginBottom: 20,
    },
    noteIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    pathSection: { marginTop: 10 },
    journey: {
      height: 1570,
      position: "relative",
      marginTop: 15,
      backgroundColor: focus || editorial ? "transparent" : c.card,
      borderRadius: editorial ? 0 : 20,
      borderWidth: focus || editorial ? 0 : 1,
      borderColor: border,
    },
    future: {
      position: "absolute",
      top: 14,
      left: "38%",
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    stop: {
      position: "absolute",
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
      height: 90,
    },
    dayTile: {
      width: 82,
      height: 70,
      backgroundColor: c.card,
      borderRadius: editorial ? 3 : 19,
      borderWidth: 1,
      borderBottomWidth: 5,
      borderColor: orbit ? "#425039" : editorial ? "#c6d3c4" : "#d8cddc",
      justifyContent: "center",
      alignItems: "center",
      transform: [{ rotate: editorial ? "0deg" : "-6deg" }],
    },
    pathEmber: { position: "absolute", bottom: 6, left: -13 },
    tileTick: {
      position: "absolute",
      right: -5,
      top: -8,
      backgroundColor: c.accent,
      borderRadius: 12,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: c.paper,
    },
    tickText: { fontSize: 9, color: "#26351f" },
    tileValue: {
      fontFamily: "DMSans_700Bold",
      fontSize: 14,
      color: c.ink,
      marginBottom: 3,
    },
    stopLabel: { maxWidth: 122, gap: 5 },
    date: {
      fontFamily: "DMSans_400Regular",
      fontSize: 8,
      letterSpacing: 1,
      color: c.muted,
    },
    stopTitle: {
      fontFamily: "DMSans_500Medium",
      fontSize: 10,
      color: c.ink,
      lineHeight: 15,
    },
    stopDescription: {
      fontFamily: "DMSans_400Regular",
      fontSize: 9,
      color: c.muted,
      lineHeight: 14,
    },
    journalMast: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      borderBottomWidth: 2,
      borderColor: c.ink,
      paddingBottom: 17,
      marginVertical: 14,
    },
    journalTitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 37,
      lineHeight: 40,
      letterSpacing: -1.7,
      color: c.ink,
    },
    journalNumber: {
      fontFamily: "NunitoSans_900Black",
      fontSize: 61,
      lineHeight: 68,
      color: c.ink,
      letterSpacing: -3,
    },
    indexSummary: {
      borderBottomWidth: 1,
      borderColor: border,
      marginBottom: 22,
    },
    bento: { flexDirection: "row", gap: 12, marginBottom: 20 },
    bentoMain: {
      flex: 1.5,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 20,
    },
    bentoSide: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 20,
    },
    bentoValue: {
      fontFamily: "DMSans_400Regular",
      fontSize: 38,
      color: c.color,
      letterSpacing: -2,
    },
    metricBox: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    metricValue: {
      fontFamily: "DMSans_400Regular",
      fontSize: 26,
      color: c.color,
      letterSpacing: -1,
    },
    magazineMast: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 2,
      borderColor: c.ink,
      paddingBottom: 15,
      marginTop: 8,
      marginBottom: 25,
    },
    magazineTitle: {
      fontFamily: "NunitoSans_900Black",
      fontSize: 27,
      letterSpacing: -1,
      color: c.ink,
    },
    clubNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      paddingVertical: 5,
      marginBottom: 20,
    },
    disclosure: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 15,
      marginBottom: 20,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    disclosureHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
    },
    chipScroll: { gap: 9, paddingBottom: 20 },
    registrationChip: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: editorial ? 2 : 11,
      backgroundColor: c.card,
      paddingVertical: 11,
      paddingHorizontal: 15,
      minHeight: 60,
      justifyContent: "center",
      gap: 3,
    },
    boardTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginVertical: 24,
    },
    massive: {
      fontFamily: "DMSans_400Regular",
      fontSize: 59,
      letterSpacing: -3,
      color: orbit ? c.accent : c.ink,
    },
    unit: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      letterSpacing: 0,
      color: c.muted,
    },
    laneRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 13,
    },
    laneInitial: {
      fontFamily: "DMSans_500Medium",
      fontSize: 8,
      color: c.muted,
      width: 23,
    },
    laneTrack: {
      flex: 1,
      height: 40,
      backgroundColor: c.paper,
      borderRadius: 8,
      overflow: "hidden",
      justifyContent: "center",
    },
    laneFill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 8,
    },
    laneName: {
      fontFamily: "DMSans_500Medium",
      fontSize: 11,
      color: c.ink,
      paddingLeft: 10,
    },
    laneValue: {
      fontFamily: "DMSans_700Bold",
      fontSize: 10,
      color: c.ink,
      width: 29,
      textAlign: "right",
    },
    ghost: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: border,
      borderRadius: 8,
      marginVertical: 8,
    },
    leaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderColor: border,
    },
    position: {
      fontFamily: "DMSans_400Regular",
      fontSize: 22,
      letterSpacing: -1,
      color: c.muted,
      minWidth: 25,
    },
    empty: { alignItems: "center", paddingVertical: 30, gap: 15 },
    medal: {
      width: 47,
      height: 47,
      borderRadius: 24,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    medalIcon: { fontSize: 39, lineHeight: 43, color: "#344027" },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 19,
      borderBottomWidth: 1,
      borderColor: border,
    },
    menuIcon: {
      width: 33,
      height: 33,
      borderRadius: 11,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    crewHero: {
      padding: 25,
      backgroundColor: orbit ? "#2d3c26" : c.color,
      borderRadius: club ? 8 : 20,
      borderTopRightRadius: club ? 55 : 20,
      marginBottom: 22,
    },
    crewTitle: {
      fontFamily: club ? "NunitoSans_900Black" : "DMSans_400Regular",
      fontSize: club ? 43 : 38,
      letterSpacing: -1.8,
      lineHeight: club ? 45 : 40,
      color: orbit ? "#e6f0d8" : c.paper,
      flex: 1,
      marginTop: 6,
    },
    crewSubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: orbit ? "#c6d8b0" : c.paper,
      opacity: 0.7,
      marginTop: 12,
    },
    crewSeal: {
      height: 67,
      width: 67,
      borderRadius: 40,
      borderWidth: 1,
      borderColor: orbit ? "#c6d8b0" : c.paper,
      justifyContent: "center",
      alignItems: "center",
      transform: [{ rotate: "12deg" }],
    },
    sealText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      lineHeight: 17,
      textAlign: "center",
      color: orbit ? "#c6d8b0" : c.paper,
    },
    avatarStack: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    avatar: {
      width: 35,
      height: 35,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { fontFamily: "DMSans_700Bold", fontSize: 9, color: "#283125" },
    inviteSmall: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: orbit ? "#c6d8b0" : c.paper,
      borderRadius: 25,
    },
    inviteSmallText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: orbit ? "#c6d8b0" : c.paper,
    },
    goalTotal: {
      fontFamily: "DMSans_400Regular",
      fontSize: 38,
      letterSpacing: -1.4,
      color: c.ink,
      marginVertical: 9,
    },
    goalBar: {
      height: 9,
      backgroundColor: c.paper,
      borderRadius: 8,
      marginVertical: 9,
      overflow: "hidden",
    },
    goalFill: { height: "100%", width: "72%", borderRadius: 8 },
    feedHead: { gap: 17 },
    feedEntry: {
      flexDirection: "row",
      gap: 12,
      paddingTop: 23,
      marginTop: 19,
      borderTopWidth: 1,
      borderColor: border,
    },
    workout: {
      gap: 6,
      backgroundColor: c.paper,
      padding: 14,
      borderRadius: 9,
      marginVertical: 13,
    },
    cheer: {
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 30,
      alignSelf: "flex-start",
    },
    profile: {
      flexDirection: "row",
      gap: 18,
      alignItems: "center",
      marginTop: 18,
      marginBottom: 30,
      position: "relative",
    },
    profileCentered: {
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 20,
      gap: 20,
    },
    profileMagazine: {
      backgroundColor: c.card,
      padding: 23,
      borderRadius: 8,
      borderTopRightRadius: 50,
    },
    profileAvatar: {
      width: focus ? 86 : club ? 68 : 75,
      height: focus ? 86 : club ? 68 : 75,
      borderRadius: focus || club ? 50 : 28,
      backgroundColor: c.color,
      alignItems: "center",
      justifyContent: "center",
    },
    profileInitials: {
      fontFamily: "DMSans_400Regular",
      fontSize: 29,
      color: c.paper,
      letterSpacing: -1.5,
    },
    profileBadge: {
      position: "absolute",
      bottom: -4,
      right: -4,
      width: 26,
      height: 26,
      borderRadius: 14,
      borderWidth: 3,
      borderColor: c.paper,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    profileName: {
      fontFamily: club ? "NunitoSans_900Black" : "DMSans_400Regular",
      fontSize: focus ? 37 : 30,
      letterSpacing: -1,
      color: c.ink,
      marginBottom: 7,
    },
    profileSettings: { position: "absolute", top: -8, right: 0, padding: 5 },
    focusProgress: {
      backgroundColor: c.color,
      padding: 28,
      borderRadius: 25,
      marginTop: 20,
    },
    focusProgressTitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 28,
      lineHeight: 33,
      letterSpacing: -1,
      color: c.paper,
      marginVertical: 10,
    },
    focusProgressLink: {
      fontFamily: "DMSans_500Medium",
      fontSize: 11,
      color: c.paper,
      marginTop: 5,
    },
    prototypeNote: {
      fontFamily: "DMSans_400Regular",
      fontSize: 9,
      lineHeight: 17,
      color: c.muted,
      textAlign: "center",
      marginTop: 25,
    },
    modalRoot: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#10182180",
    },
    sheet: {
      maxHeight: "92%",
      backgroundColor: c.paper,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 10,
    },
    sheetHandle: {
      width: 35,
      height: 4,
      backgroundColor: orbit ? "#ffffff30" : "#00000020",
      borderRadius: 3,
      alignSelf: "center",
      marginBottom: 15,
    },
    sheetTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 25,
      paddingBottom: 4,
    },
    sheetContent: { paddingHorizontal: 25, paddingBottom: 30, gap: 15 },
    sheetTitle: {
      fontFamily: "DMSans_500Medium",
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -1,
      color: c.ink,
      marginTop: 10,
      marginRight: 15,
    },
    sheetDescription: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      lineHeight: 18,
      color: c.muted,
      marginBottom: 10,
    },
    close: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    closeText: { fontSize: 23, color: c.ink },
    recommendation: {
      alignItems: "center",
      padding: 23,
      borderRadius: 18,
      backgroundColor: c.card,
      gap: 10,
    },
    bigMedal: { fontSize: 95, lineHeight: 105, color: c.color },
    field: { gap: 8 },
    input: {
      borderWidth: 1,
      borderColor: border,
      borderRadius: 9,
      backgroundColor: c.card,
      padding: 13,
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: c.ink,
      minHeight: 48,
    },
    segments: {
      flexDirection: "row",
      padding: 4,
      gap: 3,
      borderRadius: 9,
      backgroundColor: orbit ? "#11181e" : "#e9ece7",
    },
    segment: {
      flex: 1,
      paddingVertical: 11,
      paddingHorizontal: 6,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
    },
    segmentText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      color: c.muted,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 15,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 11,
      backgroundColor: c.card,
      minHeight: 66,
    },
    code: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: border,
      padding: 23,
      borderRadius: 10,
    },
    codeText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 28,
      color: c.ink,
      letterSpacing: 4,
      textAlign: "center",
    },
    notice: {
      position: "absolute",
      left: 20,
      right: 20,
      bottom: 100,
      padding: 18,
      backgroundColor: "#283526",
      borderRadius: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
      zIndex: 30,
      elevation: 30,
    },
    noticeText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      lineHeight: 19,
      color: "#edf4e9",
      flexShrink: 1,
    },
  });
}

function NativeTabIcon({ tab, color }: { tab: PrototypeTab; color: string }) {
  const paths: Record<PrototypeTab, string> = {
    Home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
    Arena: "M4 20V5m0 1c5-5 11 5 16 0v9c-5 5-11-5-16 0",
    Crew: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    Athlete:
      "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  };
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={paths[tab]}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

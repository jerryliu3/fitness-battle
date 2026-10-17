"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Ember } from "@/components/mascot/ember";
import {
  LAYOUT_CONCEPTS,
  PROTOTYPE_TABS,
  PROTOTYPE_DAYS,
  PROTOTYPE_PEOPLE,
  PROTOTYPE_SPORTS,
  prototypeContest,
  type LayoutConceptId,
  type PrototypeTab,
} from "@fitness-battle/shared";
import "./structure.css";

type Panel =
  | "recommendation"
  | "session"
  | "register"
  | "awards"
  | "rankings"
  | "invite"
  | "manage"
  | "nudge"
  | "progress"
  | "settings"
  | "connections"
  | "onboarding"
  | "return"
  | "complete"
  | null;
type Registration = { sport: string; mode: string; track: string };
const icons: Record<PrototypeTab, string> = {
  Home: "⌂",
  Arena: "◫",
  Crew: "◉",
  Athlete: "♙",
};
const titles: Record<Exclude<Panel, null>, string> = {
  recommendation: "A little easy goes a long way.",
  session: "Session receipt",
  register: "Find your next arena.",
  awards: "A week worth keeping.",
  rankings: "The bigger picture.",
  invite: "Better with your people.",
  manage: "Your crew, your rhythm.",
  nudge: "A little encouragement.",
  progress: "Look how far you’ve come.",
  settings: "Make it yours.",
  connections: "Your training, together.",
  onboarding: "Start where you are.",
  return: "That effort went somewhere.",
  complete: "You showed up. It shows.",
};
function themeStyle(id: LayoutConceptId): CSSProperties {
  const c = LAYOUT_CONCEPTS.find((c) => c.id === id)!;
  return {
    "--s-bg": c.paper,
    "--s-ink": c.ink,
    "--s-muted": c.muted,
    "--s-card": c.card,
    "--s-brand": c.color,
    "--s-accent": c.accent,
  } as CSSProperties;
}

export function StructureLab() {
  const [concept, setConcept] = useState<LayoutConceptId>("trail");
  const [tab, setTab] = useState<PrototypeTab>("Home");
  const [viewport, setViewport] = useState<"wide" | "phone">("wide");
  const [compare, setCompare] = useState(false);
  const [scenario, setScenario] = useState("normal");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = LAYOUT_CONCEPTS.find((c) => c.id === q.get("concept"));
    const t = PROTOTYPE_TABS.find((t) => t.toLowerCase() === q.get("tab"));
    if (c) setConcept(c.id);
    if (t) setTab(t);
    if (q.get("view") === "phone") setViewport("phone");
  }, []);
  function select(c: LayoutConceptId, t = tab) {
    setConcept(c);
    setTab(t);
    setCompare(false);
    if (c !== concept) setScenario("normal");
    const q = new URLSearchParams({
      concept: c,
      tab: t.toLowerCase(),
      view: viewport,
    });
    window.history.replaceState(null, "", `?${q}`);
  }
  const direction = LAYOUT_CONCEPTS.find((c) => c.id === concept)!;
  return (
    <div className="structure-studio">
      <header className="studio-top">
        <a href="/design" className="studio-wordmark">
          overtaek<span>®</span>
        </a>
        <span className="studio-label">INTERFACE STUDY / 2026</span>
        <span className="studio-status">
          <i /> Interactive code prototypes
        </span>
      </header>
      <section className="studio-intro">
        <div>
          <p className="studio-label">ONE PRODUCT. FIVE PERSPECTIVES.</p>
          <h1>
            A better place
            <br />
            for every part of you.
          </h1>
        </div>
        <div>
          <p>
            Four clear destinations. Five distinct ways to get there.
            <br />
            Explore the layouts, open the details, and find your rhythm.
          </p>
          <button
            className="studio-compare"
            onClick={() => setCompare(!compare)}
          >
            {compare ? "Back to prototype ↗" : "Compare all 20 screens ↗"}
          </button>
        </div>
      </section>
      <nav className="direction-picker" aria-label="Design direction">
        {LAYOUT_CONCEPTS.map((c, i) => (
          <button
            key={c.id}
            aria-pressed={concept === c.id}
            onClick={() => select(c.id)}
          >
            <span
              className="direction-swatch"
              style={{ background: c.paper, color: c.color }}
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              <i style={{ background: c.accent }} />
            </span>
            <span>
              <b>{c.name}</b>
              <small>
                {
                  [
                    "Guided journey",
                    "Athlete’s journal",
                    "Training system",
                    "Your club magazine",
                    "Room to move",
                  ][i]
                }
              </small>
            </span>
            <span className="direction-check">
              {concept === c.id ? "↗" : "○"}
            </span>
          </button>
        ))}
      </nav>
      {compare ? (
        <div className="concept-matrix">
          {LAYOUT_CONCEPTS.map((c) => (
            <section key={c.id}>
              <h2>{c.name}</h2>
              <p>{c.description}</p>
              {PROTOTYPE_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => select(c.id, t)}
                  style={themeStyle(c.id)}
                >
                  <span>
                    {icons[t]} {t}
                  </span>
                  <div className={`matrix-art art-${c.id}`}>
                    <i />
                    <i />
                    <i />
                    <b>
                      {t === "Home"
                        ? "Your next move"
                        : t === "Arena"
                          ? "23.4 km"
                          : t === "Crew"
                            ? "Sunday people"
                            : "Alex Lee"}
                    </b>
                  </div>
                  <small>{c.layout} ↗</small>
                </button>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="studio-toolbar">
            <div>
              <b>{direction.eyebrow}</b>
              <span>{direction.layout}</span>
            </div>
            <div className="studio-tools">
              <label className="scenario-label">
                Flow{" "}
                <select
                  aria-label="Preview scenario"
                  value={scenario}
                  onChange={(e) => {
                    setScenario(e.target.value);
                    if (
                      ["empty", "return", "complete"].includes(e.target.value)
                    )
                      setTab("Arena");
                    if (e.target.value === "onboarding") setTab("Home");
                  }}
                >
                  <option value="normal">Everyday</option>
                  <option value="empty">No registrations</option>
                  <option value="return">New progress</option>
                  <option value="complete">Week complete</option>
                  <option value="onboarding">First visit</option>
                </select>
              </label>
              <div className="view-switch">
                <button
                  aria-pressed={viewport === "wide"}
                  onClick={() => setViewport("wide")}
                >
                  Web
                </button>
                <button
                  aria-pressed={viewport === "phone"}
                  onClick={() => setViewport("phone")}
                >
                  Phone
                </button>
              </div>
            </div>
          </div>
          <div className={`prototype-viewport viewport-${viewport}`}>
            <DesignSurface
              concept={concept}
              tab={tab}
              onTab={(t) => select(concept, t)}
              scenario={scenario}
              onScenarioHandled={() => setScenario("normal")}
            />
          </div>
          <footer className="studio-foot">
            <p>
              <b>{direction.name}</b> — {direction.description}
            </p>
            <span>
              Sample content · local interactions · no account changes
            </span>
          </footer>
        </>
      )}
    </div>
  );
}

function DesignSurface({
  concept,
  tab,
  onTab,
  scenario,
  onScenarioHandled,
}: {
  concept: LayoutConceptId;
  tab: PrototypeTab;
  onTab: (tab: PrototypeTab) => void;
  scenario: string;
  onScenarioHandled: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
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
  const [track, setTrack] = useState("GPS verified");
  const [ghost, setGhost] = useState(true);
  const [cheers, setCheers] = useState<string[]>([]);
  const [crewView, setCrewView] = useState("Activity");
  const [rankDistance, setRankDistance] = useState("5K");
  const [progressRange, setProgressRange] = useState("12 weeks");
  const [notice, setNotice] = useState("");
  const [nickname, setNickname] = useState("Alex Lee");
  const [crewName, setCrewName] = useState("Sunday people");
  const [nudge, setNudge] = useState(
    "A little fresh air? Join us for an easy one.",
  );
  const [notification, setNotification] = useState(true);
  const [metric, setMetric] = useState("Kilometers");
  const [calibrated, setCalibrated] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const [boardTrack, setBoardTrack] = useState("GPS verified");
  useEffect(() => {
    setPanel(
      scenario === "return"
        ? "return"
        : scenario === "complete"
          ? "complete"
          : scenario === "onboarding"
            ? "onboarding"
            : null,
    );
  }, [scenario]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const joined = scenario !== "empty" ? registrations : [];
  const selectedRegistration =
    joined.find((r) => r.sport === activeSport) ?? joined[0];
  const contest = prototypeContest(selectedRegistration?.sport ?? "running");
  const unit = contest.unit;
  const formatValue = (value: number) =>
    unit === "km" ? value.toFixed(1) : String(value);
  const delta = formatValue(
    Number((contest.total - contest.previous).toFixed(1)),
  );
  const action = (label: string, p: Panel, secondary = false) => (
    <button
      className={secondary ? "s-button secondary" : "s-button"}
      onClick={() => setPanel(p)}
    >
      {label}
      <span>↗</span>
    </button>
  );
  const head = (label: string, title: string, subtitle?: string) => (
    <header className="s-section-head">
      <div>
        <p className="s-eyebrow">{label}</p>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
  const stats = (
    <div className="s-stats">
      <div>
        <b>
          23.4<small> km</small>
        </b>
        <span>This week</span>
      </div>
      <div>
        <b>
          4<small> / 5</small>
        </b>
        <span>Sessions</span>
      </div>
      <div>
        <b>+18</b>
        <span>Weekly Effort Score</span>
      </div>
    </div>
  );
  const suggestion = (
    <button
      className="suggestion-card"
      onClick={() => setPanel("recommendation")}
    >
      <span className="suggestion-text">
        <span className="s-eyebrow">FRIDAY, OCTOBER 16</span>
        <strong>
          {concept === "focus"
            ? "Make space for an easy one."
            : "A good day to take it easy."}
        </strong>
        <span>Easy run · 5 km · about 30 min</span>
        <span className="suggestion-link">
          Your daily suggestion <b>↗</b>
        </span>
      </span>
      <Ember className="suggestion-ember" expression="happy" />
    </button>
  );
  const path = (
    <section className="s-path-panel">
      <div className="s-row">
        <div>
          <p className="s-eyebrow">ONE DAY AT A TIME</p>
          <h3>Your recent rhythm</h3>
        </div>
        <span className="s-pill">Last 10 sessions</span>
      </div>
      <RoutePath
        variant={concept}
        onToday={() => setPanel("recommendation")}
        onSession={(d) => {
          setReceipt(d);
          setPanel("session");
        }}
      />
    </section>
  );
  const weekly = (
    <section className="s-card weekly-card">
      <p className="s-eyebrow">THIS WEEK / 12—19 OCT</p>
      {stats}
      <div className="s-week-bars">
        {[38, 67, 45, 86, 64, 0, 0].map((n, i) => (
          <div key={i}>
            <i style={{ height: `${Math.max(n, 4)}%` }} />
            <span>{"MTWTFSS"[i]}</span>
          </div>
        ))}
      </div>
      <p className="s-caption">
        Consistency over intensity. You’re finding your rhythm.
      </p>
    </section>
  );
  const miniArrival = (
    <button
      className="s-inline-note"
      onClick={() => {
        onTab("Arena");
        setPanel("return");
      }}
    >
      <span className="note-icon">↗</span>
      <span>
        <b>Your morning run is in.</b>
        <small>6.2 km added to your week</small>
      </span>
      <b>→</b>
    </button>
  );
  const awards = (
    <section className="s-card awards-card">
      <div className="s-row">
        <h3>Your silver lining.</h3>
        <span className="award-medal">✺</span>
      </div>
      <p>2nd in last week’s running field.</p>
      <span className="s-caption">23.8 km · +24 Effort Score · October 5—12</span>
      {action("Open your awards", "awards", true)}
    </section>
  );
  const rankings = (
    <button className="ranking-link" onClick={() => setPanel("rankings")}>
      <span className="ranking-icon">↗</span>
      <span>
        <b>Beyond this week</b>
        <small>All-time pace & race rankings</small>
      </span>
      <span>→</span>
    </button>
  );
  const board = (
    <section className="s-card board-card">
      <div className="s-row">
        <div>
          <p className="s-eyebrow">{contest.label.toUpperCase()} / WEEK 42</p>
          <h3>
            {unit === "km"
              ? "Every kilometer counts."
              : unit === "score"
                ? "A little more balance."
                : "Keep showing up."}
          </h3>
        </div>
        <span className="s-pill">3 days left</span>
      </div>
      <div className="s-board-total">
        <strong>
          {formatValue(contest.total)}
          <small>{unit}</small>
        </strong>
        <span>
          3rd of 8<br />
          <b>↑ 1 place this week</b>
        </span>
      </div>
      <div className="s-lanes">
        {PROTOTYPE_PEOPLE.map((p, i) => (
          <button
            key={p.name}
            onClick={() => {
              setNotice(
                `${p.name} · Effort Score ${p.elo} · ${formatValue(contest.values[i]!)} ${unit} this week`,
              );
            }}
            className={p.name === "You" ? "is-you" : ""}
          >
            <span>{p.initials}</span>
            <div>
              <i
                style={{
                  width: `${(contest.values[i]! / (contest.values[0]! * 1.12)) * 100}%`,
                  background: p.name === "You" ? "var(--s-accent)" : p.color,
                }}
              />
              <b>{p.name}</b>
            </div>
            <strong>{formatValue(contest.values[i]!)}</strong>
          </button>
        ))}
        {ghost && (
          <div className="ghost-lane">
            <span>◌</span>
            <p>
              Past you{" "}
              <b>
                {formatValue(contest.previous)} {unit}
              </b>
            </p>
            <small>Comparison only</small>
          </div>
        )}
      </div>
      <div className="s-row board-footer">
        <label className="s-switch">
          <input
            type="checkbox"
            checked={ghost}
            onChange={(e) => setGhost(e.target.checked)}
          />
          <span />
          Show past you
        </label>
        <span className="s-caption">
          {ghost ? `+${delta} ${unit} vs last week` : "Same time, last week"}
        </span>
      </div>
    </section>
  );
  const registrationStrip = (
    <div className="registration-strip">
      {joined.map((r) => (
        <button
          key={r.sport}
          aria-pressed={selectedRegistration?.sport === r.sport}
          onClick={() => {
            setActiveSport(r.sport);
            setBoardTrack(r.track);
          }}
        >
          <i />
          {PROTOTYPE_SPORTS.find((s) => s.id === r.sport)?.name}
          <small>
            {r.mode} · {r.sport === "sleep" ? "Sleep score" : r.track}
          </small>
        </button>
      ))}
      <button className="add-registration" onClick={() => setPanel("register")}>
        ＋ Register
      </button>
    </div>
  );
  const empty = (
    <section className="s-card empty-arena">
      <span className="empty-orbits">◎</span>
      <p className="s-eyebrow">A NEW STARTING LINE</p>
      <h3>
        Your next chapter
        <br />
        starts here.
      </h3>
      <p>
        Pick a sport. Join on your own or bring your crew.
        <br />
        There’s a place for your kind of effort.
      </p>
      {action("Find an arena", "register")}
    </section>
  );
  const crewHero = (
    <section className="crew-feature">
      <span className="s-eyebrow">YOUR PEOPLE / 8 MEMBERS</span>
      <div className="crew-feature-title">
        <h2>
          {crewName.split(" ").map((w, i) => (
            <span key={i}>{w} </span>
          ))}
          <small>Different paces. Same direction.</small>
        </h2>
        <div className="crew-seal">
          S
          <span>
            EST.
            <br />
            2026
          </span>
          P
        </div>
      </div>
      <div className="s-row">
        <Avatars />
        <button className="s-small-button" onClick={() => setPanel("invite")}>
          Invite a friend ＋
        </button>
      </div>
    </section>
  );
  const crewGoal = (
    <section className="s-card">
      <div className="s-row">
        <p className="s-eyebrow">OUR SHARED WEEK</p>
        <span className="s-pill">72%</span>
      </div>
      <h3 className="goal-total">
        72.4 <small>/ 100 km</small>
      </h3>
      <div className="s-progress-bar">
        <i style={{ width: "72%" }} />
      </div>
      <p className="s-caption">27.6 km to our collective finish line.</p>
      <div className="s-row">
        <span className="s-caption">Every pace belongs here.</span>
        <button className="s-text-button" onClick={() => setPanel("nudge")}>
          Send a nudge ↗
        </button>
      </div>
    </section>
  );
  const feed = (
    <section className="s-card feed-card">
      <div className="s-row">
        <h3>The latest, together.</h3>
        <div className="s-segment">
          {["Activity", "Leaderboard"].map((v) => (
            <button
              key={v}
              aria-pressed={crewView === v}
              onClick={() => setCrewView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {crewView === "Activity"
        ? PROTOTYPE_PEOPLE.filter((p) => p.name !== "You").map((p, i) => (
            <article className="feed-entry" key={p.name}>
              <span className="s-avatar" style={{ background: p.color }}>
                {p.initials}
              </span>
              <div>
                <b>
                  {p.name} <small>{["2h ago", "4h ago", "Yesterday"][i]}</small>
                </b>
                <p>
                  {
                    [
                      "Found a little morning sunshine.",
                      "Lunch break, but make it a loop.",
                      "Slow miles with good company.",
                    ][i]
                  }
                </p>
                <div className="feed-workout">
                  <span>↗ {["6.2 km", "4.5 km", "8.1 km"][i]}</span>
                  <small>Easy run · GPS verified</small>
                </div>
                <button
                  className={`cheer-button ${cheers.includes(p.name) ? "cheered" : ""}`}
                  onClick={() =>
                    setCheers((prev) =>
                      prev.includes(p.name)
                        ? prev.filter((n) => n !== p.name)
                        : [...prev, p.name],
                    )
                  }
                >
                  {cheers.includes(p.name) ? "♥ Cheered" : "♡ Cheer"} ·{" "}
                  {7 + i + (cheers.includes(p.name) ? 1 : 0)}
                </button>
              </div>
            </article>
          ))
        : PROTOTYPE_PEOPLE.map((p, i) => (
            <div className="s-list-row" key={p.name}>
              <b>{i + 1}</b>
              <span className="s-avatar" style={{ background: p.color }}>
                {p.initials}
              </span>
              <span className="s-grow">{p.name}</span>
              <b>{p.km} km</b>
            </div>
          ))}
    </section>
  );
  const memberRail = (
    <section className="s-card">
      <p className="s-eyebrow">A LITTLE ACCOUNTABILITY</p>
      <h3>We go further together.</h3>
      <Avatars />
      <p className="s-caption">Maya, Jordan, Sam + 4 more</p>
      {action("Crew settings", "manage", true)}
      {action("Invite someone", "invite", true)}
    </section>
  );
  const profile = (
    <section className="profile-feature">
      <div className="profile-avatar">
        AL<span>↗</span>
      </div>
      <div>
        <p className="s-eyebrow">ATHLETE / TORONTO</p>
        <h2>{nickname}</h2>
        <p>Not the fastest. Just getting better.</p>
        <span className="s-pill">↗ Strider · 1,248 Effort Score</span>
      </div>
      <button
        className="s-icon-button"
        aria-label="Edit profile and settings"
        onClick={() => setPanel("settings")}
      >
        ⚙
      </button>
    </section>
  );
  const elo = (
    <section className="s-card elo-card">
      <p className="s-eyebrow">YOUR LEVEL IS MOVING</p>
      <div className="s-row">
        <strong>
          1,248<small>Effort Score</small>
        </strong>
        <span className="s-positive">+86 in 12 weeks</span>
      </div>
      <TrendChart />
      <div className="s-row">
        <span className="s-caption">Aug 1</span>
        <span className="s-caption">Oct 16</span>
      </div>
      {action("Explore your progress", "progress", true)}
    </section>
  );
  const settingsList = (
    <section className="s-card settings-list">
      <p className="s-eyebrow">YOUR SETUP</p>
      {(
        [
          {
            icon: "↔",
            title: "Connections",
            sub: "Bring your training together",
            p: "connections",
          },
          {
            icon: "◎",
            title: "Preferences",
            sub: "Sports, units & recommendations",
            p: "settings",
          },
          {
            icon: "◷",
            title: "Notifications & privacy",
            sub: "Only the updates you want",
            p: "settings",
          },
          {
            icon: "↗",
            title: "Progress",
            sub: "Statistics, trends & effort score history",
            p: "progress",
          },
        ] as const
      ).map((item) => (
        <button key={item.title} onClick={() => setPanel(item.p)}>
          <span className="settings-icon">{item.icon}</span>
          <span className="s-grow">
            <b>{item.title}</b>
            <small>{item.sub}</small>
          </span>
          <span>→</span>
        </button>
      ))}
    </section>
  );
  const summary = (
    <section className="s-card">
      <p className="s-eyebrow">YOUR SEASON SO FAR</p>
      <div className="athlete-summary">
        <div>
          <b>142</b>
          <small>kilometers</small>
        </div>
        <div>
          <b>28</b>
          <small>sessions</small>
        </div>
        <div>
          <b>6</b>
          <small>weeks active</small>
        </div>
      </div>
    </section>
  );

  function home() {
    switch (concept) {
      case "trail":
        return (
          <>
            {head(
              "YOUR DAILY STARTING POINT",
              `Good morning, ${nickname.split(" ")[0]}.`,
              "Small steps. A week that adds up.",
            )}
            {miniArrival}
            {suggestion}
            <div className="s-two-col path-layout">
              {path}
              <aside>
                {weekly}
                <button
                  className="s-button secondary"
                  onClick={() => onTab("Arena")}
                >
                  See your arena <span>↗</span>
                </button>
              </aside>
            </div>
          </>
        );
      case "index":
        return (
          <>
            {head("FRIDAY / 16 OCTOBER", "The training journal.")}
            <div className="journal-layout">
              <aside>
                <span className="journal-number">42</span>
                <p>WEEK OF THE YEAR</p>
                {weekly}
                {miniArrival}
              </aside>
              <div>
                {suggestion}
                {path}
              </div>
            </div>
          </>
        );
      case "orbit":
        return (
          <>
            {head("YOUR DAILY SIGNAL", "Build a little momentum.")}
            <div className="orbit-grid">
              <div className="orbit-main">
                {suggestion}
                {path}
              </div>
              <aside>
                {weekly}
                {miniArrival}
                <section className="s-card">
                  <p className="s-eyebrow">IN BALANCE</p>
                  <div className="orbit-score">
                    82<small>Readiness / 100</small>
                  </div>
                  <p className="s-caption">Sample signal · keep today easy.</p>
                </section>
              </aside>
            </div>
          </>
        );
      case "club":
        return (
          <>
            <div className="magazine-mast">
              <span>THE DAILY</span>
              <b>Friday edition / No. 042</b>
            </div>
            <div className="club-home">
              <div>
                {suggestion}
                <div className="s-row">
                  <h3>The week, in little wins.</h3>
                  <span>↓</span>
                </div>
                {path}
              </div>
              <aside>
                {head("YOUR PERSONAL FIELD NOTES", "Good things add up.")}
                {weekly}
                {miniArrival}
              </aside>
            </div>
          </>
        );
      case "focus":
        return (
          <div className="focus-stack">
            {head("FRIDAY, OCTOBER 16", "Just one good move.")}
            {suggestion}
            <details className="focus-disclosure">
              <summary>
                Your week at a glance <span>＋</span>
              </summary>
              {weekly}
            </details>
            {path}
            {miniArrival}
          </div>
        );
    }
  }
  function arena() {
    const content = joined.length ? board : empty;
    switch (concept) {
      case "trail":
        return (
          <>
            {head("A LITTLE FRIENDLY MOMENTUM", "Your effort has a place.")}
            {registrationStrip}
            <div className="s-two-col">
              {content}
              <aside>
                {awards}
                {rankings}
              </aside>
            </div>
          </>
        );
      case "index":
        return (
          <>
            {head("COMPETITION INDEX", "The weekly standings.")}
            <div className="journal-layout">
              <aside>
                {registrationStrip}
                {awards}
                {rankings}
              </aside>
              <div>
                <div className="s-row">
                  <p className="s-caption">Week 42 · closes Monday 00:00 UTC</p>
                  <span className="s-pill">
                    {selectedRegistration?.sport === "sleep"
                      ? "Sleep score"
                      : (selectedRegistration?.track ?? boardTrack)}
                  </span>
                </div>
                {content}
              </div>
            </div>
          </>
        );
      case "orbit":
        return (
          <>
            {head("YOUR ACTIVE ORBITS", "A week in motion.")}
            <div className="orbit-metrics">
              <div>
                <span>ACTIVE ARENAS</span>
                <b>{joined.length.toString().padStart(2, "0")}</b>
              </div>
              <div>
                <span>OPEN EFFORT SCORE</span>
                <b>1,248</b>
              </div>
              <div>
                <span>WEEKLY SHIFT</span>
                <b>+18 ↗</b>
              </div>
            </div>
            {registrationStrip}
            <div className="orbit-grid">
              <div>{content}</div>
              <aside>
                {awards}
                {rankings}
              </aside>
            </div>
          </>
        );
      case "club":
        return (
          <>
            <div className="magazine-mast">
              <span>THE ARENA</span>
              <button
                className="s-text-button"
                onClick={() => setPanel("register")}
              >
                Find your field ↗
              </button>
            </div>
            <div className="club-arena">
              <aside>
                {awards}
                {rankings}
              </aside>
              <div>
                {registrationStrip}
                {content}
              </div>
            </div>
          </>
        );
      case "focus":
        return (
          <div className="focus-stack">
            {head("YOUR WEEK, YOUR PACE", "A little further than before.")}
            {registrationStrip}
            {content}
            <details className="focus-disclosure">
              <summary>
                Past competitions & awards <span>＋</span>
              </summary>
              {awards}
            </details>
            {rankings}
          </div>
        );
    }
  }
  function crew() {
    switch (concept) {
      case "trail":
        return (
          <>
            {crewHero}
            <div className="s-two-col">
              <div>
                {crewGoal}
                {feed}
              </div>
              <aside>{memberRail}</aside>
            </div>
          </>
        );
      case "index":
        return (
          <>
            {head("THE CLUB REGISTER", crewName)}
            <div className="journal-layout">
              <aside>
                {memberRail}
                {crewGoal}
              </aside>
              <div>{feed}</div>
            </div>
          </>
        );
      case "orbit":
        return (
          <>
            {head("CONNECTED BY EFFORT", "Your inner circle.")}
            <div className="orbit-grid">
              <div>
                {crewGoal}
                {feed}
              </div>
              <aside>
                {crewHero}
                {memberRail}
              </aside>
            </div>
          </>
        );
      case "club":
        return (
          <>
            {crewHero}
            <div className="club-feed-layout">
              <div>{feed}</div>
              <aside>
                {crewGoal}
                {memberRail}
              </aside>
            </div>
          </>
        );
      case "focus":
        return (
          <div className="focus-stack">
            {head("YOUR CIRCLE", crewName)}
            {crewGoal}
            <div className="s-row">
              <Avatars />
              {action("Invite", "invite", true)}
            </div>
            {feed}
            <details className="focus-disclosure">
              <summary>
                Manage your crew <span>＋</span>
              </summary>
              {memberRail}
            </details>
          </div>
        );
    }
  }
  function athlete() {
    switch (concept) {
      case "trail":
        return (
          <>
            {profile}
            {summary}
            <div className="s-two-col">
              {elo}
              <aside>{settingsList}</aside>
            </div>
          </>
        );
      case "index":
        return (
          <>
            {head("ATHLETE DOSSIER", "Your own kind of athlete.")}
            <div className="journal-layout">
              <aside>
                {profile}
                {settingsList}
              </aside>
              <div>
                {summary}
                {elo}
              </div>
            </div>
          </>
        );
      case "orbit":
        return (
          <>
            <div className="orbit-grid">
              <div>
                {profile}
                {elo}
              </div>
              <aside>
                {summary}
                {settingsList}
              </aside>
            </div>
          </>
        );
      case "club":
        return (
          <>
            <div className="magazine-mast">
              <span>THE ATHLETE</span>
              <b>Always a work in progress.</b>
            </div>
            {profile}
            <div className="club-feed-layout">
              <div>
                {summary}
                {elo}
              </div>
              <aside>{settingsList}</aside>
            </div>
          </>
        );
      case "focus":
        return (
          <div className="focus-stack">
            {profile}
            {summary}
            {settingsList}
            <button
              className="focus-progress"
              onClick={() => setPanel("progress")}
            >
              <span>THE LONG VIEW</span>
              <h3>
                You’re becoming
                <br />
                your own benchmark.
              </h3>
              <TrendChart />
              <b>Explore your progress ↗</b>
            </button>
          </div>
        );
    }
  }
  function panelContent() {
    switch (panel) {
      case "recommendation":
        return (
          <>
            <div className="recommendation-visual">
              <Ember className="modal-ember" expression="happy" />
              <span className="s-eyebrow">TODAY’S SUGGESTION</span>
              <strong>5 km. Easy does it.</strong>
              <p>About 30 minutes · conversational pace</p>
            </div>
            <div className="s-card">
              <h3>Why this fits today</h3>
              <p>
                You’ve put in two solid runs this week. An easy session builds
                consistency and leaves room to recover.
              </p>
              <p className="s-caption">
                A flexible suggestion, not a prescription. Rest is always an
                option.
              </p>
            </div>
            <button
              className="s-button"
              onClick={() => {
                setPanel(null);
                setNotice(
                  "Easy run saved to your plan. Your tracker will record the activity.",
                );
              }}
            >
              Keep this suggestion <span>✓</span>
            </button>
            <button
              className="s-text-button"
              onClick={() => {
                setPanel(null);
                setNotice("Rest day noted. See you tomorrow.");
              }}
            >
              Take a rest day instead
            </button>
          </>
        );
      case "session":
        return (
          <>
            <p className="s-eyebrow">
              {receipt.day} / {receipt.date}
            </p>
            <div className="receipt-total">{receipt.value}</div>
            <p>{receipt.detail}</p>
            <div className="s-list-row">
              <span className="s-grow">Status</span>
              <span className="s-pill">✓ Counted</span>
            </div>
            <div className="s-list-row">
              <span className="s-grow">Counts toward</span>
              <b>Week 42</b>
            </div>
            <p className="s-caption">
              This receipt connects your activity to your weekly progress.
              Prototype sample.
            </p>
            <button
              className="s-button"
              onClick={() => {
                setPanel(null);
                onTab("Arena");
              }}
            >
              See it in Arena →
            </button>
          </>
        );
      case "register":
        return (
          <>
            <div className="s-segment">
              {["GPS", "Non-GPS", "Health"].map((f) => (
                <button
                  key={f}
                  aria-pressed={family === f}
                  onClick={() => {
                    setFamily(f);
                    const s = PROTOTYPE_SPORTS.find(
                      (s) => s.family === f && s.available,
                    )!;
                    setSport(s.id);
                    setTrack(f === "GPS" ? "GPS verified" : "Open");
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="sport-options">
              {PROTOTYPE_SPORTS.filter((s) => s.family === family).map((s) => (
                <button
                  disabled={!s.available}
                  key={s.id}
                  aria-pressed={sport === s.id}
                  onClick={() => setSport(s.id)}
                >
                  <span>
                    {s.name}
                    <small>
                      {s.available ? `Weekly · ${s.unit}` : "Exploring next"}
                    </small>
                  </span>
                  <span>{sport === s.id ? "●" : "○"}</span>
                </button>
              ))}
            </div>
            <fieldset>
              <legend>How will you join?</legend>
              <div className="s-choice-row">
                {["Solo", crewName].map((m) => (
                  <button
                    key={m}
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                  >
                    <b>{m === "Solo" ? "On my own" : "With my crew"}</b>
                    <small>
                      {m === "Solo" ? "Find a similar field" : crewName}
                    </small>
                  </button>
                ))}
              </div>
            </fieldset>
            {family === "GPS" && (
              <fieldset>
                <legend>Your score track</legend>
                <div className="s-choice-row">
                  {["GPS verified", "Open"].map((t) => (
                    <button
                      key={t}
                      aria-pressed={track === t}
                      onClick={() => setTrack(t)}
                    >
                      <b>{t}</b>
                      <small>
                        {t === "Open"
                          ? "Eligible open activity"
                          : "Recorded GPS activity"}
                      </small>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <p className="s-caption">
              Monday—Monday · closes 00:00 UTC. Crew entries stay individual;
              this is not team-versus-team scoring. Health uses its own score,
              not mileage.
            </p>
            <button
              className="s-button"
              onClick={() => {
                setRegistrations((prev) => [
                  ...(scenario === "empty" ? [] : prev).filter(
                    (r) => r.sport !== sport,
                  ),
                  { sport, mode, track },
                ]);
                onScenarioHandled();
                setActiveSport(sport);
                setBoardTrack(track);
                setPanel(null);
                onTab("Arena");
                setNotice(
                  "Registration saved in this prototype. Your arena is ready.",
                );
              }}
            >
              Join {PROTOTYPE_SPORTS.find((s) => s.id === sport)?.name}{" "}
              <span>→</span>
            </button>
          </>
        );
      case "awards":
      case "complete":
        return (
          <>
            <div className="award-reveal">
              <span>✺</span>
              <p className="s-eyebrow">RUNNING / OCTOBER 5—12</p>
              <h3>
                2nd place.
                <br />
                First-class consistency.
              </h3>
              <p>23.8 km · 5 counted sessions</p>
              <b>
                1,224 → 1,248 Effort Score <span>+24</span>
              </b>
            </div>
            <div className="s-list-row">
              <span className="s-grow">Previous week · Running</span>
              <b>3rd · +18 Effort Score</b>
            </div>
            <p className="s-caption">
              Completed weeks keep their final place and rating change. New
              weeks start at Monday 00:00 UTC.
            </p>
            <button
              className="s-button"
              onClick={() => {
                setPanel(null);
                onTab("Arena");
              }}
            >
              Back to this week →
            </button>
          </>
        );
      case "rankings":
        return (
          <>
            <p>Distance times, separate from your weekly effort score.</p>
            <div className="s-segment">
              {["5K", "10K", "Half", "Marathon"].map((d) => (
                <button
                  key={d}
                  aria-pressed={rankDistance === d}
                  onClick={() => setRankDistance(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="s-eyebrow">
              ILLUSTRATIVE GLOBAL {rankDistance} TIMES
            </p>
            {["Maya Chen", "Jordan Lee", "Alex Lee", "Sam Rivera"].map(
              (name, i) => (
                <div className="s-list-row" key={name}>
                  <b>{i + 1}</b>
                  <span className="s-grow">{name}</span>
                  <b>
                    {rankDistance === "5K"
                      ? ["18:42", "19:08", "21:36", "22:10"][i]
                      : rankDistance === "10K"
                        ? ["39:14", "40:29", "44:08", "45:12"][i]
                        : rankDistance === "Half"
                          ? ["1:26:10", "1:29:22", "1:37:06", "1:41:20"][i]
                          : ["3:05:12", "3:12:44", "3:28:15", "3:34:09"][i]}
                  </b>
                </div>
              ),
            )}
            <p className="s-caption">
              Sample rankings for interface evaluation. Published race results
              live in their own source-attributed board.
            </p>
            <a className="s-button secondary" href="/rankings">
              Open published race rankings ↗
            </a>
          </>
        );
      case "invite":
        return (
          <>
            <Avatars />
            <p>A little company makes a long way feel shorter.</p>
            <label className="s-field">
              Crew invite code
              <input value="SUNDAY42" readOnly />
            </label>
            <button
              className="s-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText("SUNDAY42");
                  setNotice("Invite code copied.");
                } catch {
                  setNotice("Invite code: SUNDAY42");
                }
              }}
            >
              Copy invite code <span>↗</span>
            </button>
            <p className="s-caption">
              This code is illustrative. Prototype invitations are not sent.
            </p>
          </>
        );
      case "manage":
        return (
          <>
            <label className="s-field">
              Crew name
              <input
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
              />
            </label>
            <p className="s-eyebrow">MEMBERS / 8</p>
            {PROTOTYPE_PEOPLE.map((p) => (
              <div key={p.name} className="s-list-row">
                <span className="s-avatar" style={{ background: p.color }}>
                  {p.initials}
                </span>
                <span className="s-grow">
                  {p.name === "You" ? nickname : p.name}
                </span>
                <span className="s-caption">
                  {p.name === "You" ? "Owner" : "Member"}
                </span>
              </div>
            ))}
            <button
              className="s-button"
              disabled={!crewName.trim()}
              onClick={() => {
                setPanel(null);
                setNotice("Crew name updated in this prototype.");
              }}
            >
              Save crew <span>✓</span>
            </button>
            <button
              className="s-button secondary"
              onClick={() => setPanel("invite")}
            >
              Invite a member ＋
            </button>
          </>
        );
      case "nudge":
        return (
          <>
            <p>
              Encourage the crew without turning movement into an obligation.
            </p>
            <label className="s-field">
              Message
              <textarea
                value={nudge}
                onChange={(e) => setNudge(e.target.value)}
                maxLength={160}
              />
            </label>
            <span className="s-caption">{nudge.length}/160 · preview only</span>
            <button
              className="s-button"
              disabled={!nudge.trim()}
              onClick={() => {
                setPanel(null);
                setNotice("Nudge preview saved. Nothing was sent.");
              }}
            >
              Preview crew nudge <span>↗</span>
            </button>
          </>
        );
      case "progress":
        return (
          <>
            <div className="s-segment">
              {["4 weeks", "12 weeks", "Year"].map((r) => (
                <button
                  key={r}
                  aria-pressed={progressRange === r}
                  onClick={() => setProgressRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="s-eyebrow">
              OPEN EFFORT SCORE / {progressRange.toUpperCase()}
            </p>
            <div className="receipt-total">
              1,248{" "}
              <small>
                +
                {progressRange === "4 weeks"
                  ? "42"
                  : progressRange === "Year"
                    ? "248"
                    : "86"}
              </small>
            </div>
            <TrendChart range={progressRange} />
            {summary}
            <div className="s-list-row">
              <span className="s-grow">GPS-verified running effort score</span>
              <b>1,216</b>
            </div>
            <p className="s-caption">
              Open and GPS-verified ratings are separate. Health has its own
              score. Charts here use illustrative history.
            </p>
          </>
        );
      case "settings":
        return (
          <>
            <label className="s-field">
              Display name
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={32}
              />
            </label>
            <label className="s-field">
              Distance units
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
              >
                <option>Kilometers</option>
                <option>Miles</option>
              </select>
            </label>
            <label className="s-list-row s-switch">
              <span className="s-grow">Week summaries & crew updates</span>
              <input
                type="checkbox"
                checked={notification}
                onChange={(e) => setNotification(e.target.checked)}
              />
              <span />
            </label>
            <div className="s-list-row">
              <span className="s-grow">Profile visibility</span>
              <b>Crew only</b>
            </div>
            <p className="s-caption">
              Unit choice is saved for this prototype session. Fixture distances
              remain labeled in km.
            </p>
            <button
              className="s-button"
              disabled={!nickname.trim()}
              onClick={() => {
                setPanel(null);
                setNotice("Preferences saved for this prototype session.");
              }}
            >
              Save preferences <span>✓</span>
            </button>
          </>
        );
      case "connections":
        return (
          <>
            <p>Your connected sources will keep your effort together.</p>
            {[
              "Strava",
              "Garmin",
              "Apple Health",
              "Health Connect",
              "WHOOP",
              "Oura",
            ].map((s, i) => (
              <div className="s-list-row" key={s}>
                <span className="s-grow">
                  <b>{s}</b>
                  <small>
                    {i === 0
                      ? "Sample connection · 2 hours ago"
                      : i === 2
                        ? "iOS app"
                        : i === 3
                          ? "Android app"
                          : "Not connected"}
                  </small>
                </span>
                <button
                  className="s-small-button"
                  onClick={() =>
                    setNotice(
                      `${s}: connection preview only; no authorization was started.`,
                    )
                  }
                >
                  {i === 0 ? "Sync" : "Connect"}
                </button>
              </div>
            ))}
            <button
              className="s-button secondary"
              onClick={() => {
                setSetupStep(2);
                setPanel("onboarding");
              }}
            >
              {calibrated
                ? "History calibration complete ✓"
                : "One-time history setup ↗"}
            </button>
            <p className="s-caption">
              Cloud connections need provider authorization. Device health needs
              a compatible native build.
            </p>
          </>
        );
      case "onboarding":
        return (
          <>
            <div className="setup-steps">
              {["You", "Connect", "History"].map((s, i) => (
                <button
                  key={s}
                  aria-pressed={setupStep === i}
                  onClick={() => setSetupStep(i)}
                >
                  {i + 1} {s}
                </button>
              ))}
            </div>
            {setupStep === 0 ? (
              <>
                <p>Make this space feel like you.</p>
                <label className="s-field">
                  Your name
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>
                <label className="s-field">
                  Primary sport
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                  >
                    {PROTOTYPE_SPORTS.filter((s) => s.available).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : setupStep === 1 ? (
              <>
                <h3>Bring your training with you.</h3>
                <p>
                  Connect a tracker later from Athlete → Connections. This study
                  doesn’t request access to your accounts.
                </p>
                <button
                  className="s-button secondary"
                  onClick={() =>
                    setNotice(
                      "Connection step previewed. No external authorization.",
                    )
                  }
                >
                  Preview tracker connection ↗
                </button>
              </>
            ) : (
              <>
                <h3>
                  {calibrated
                    ? "Your starting point is set."
                    : "A starting point, not a blank slate."}
                </h3>
                <p>
                  Optional one-time import of 90 days of history. The prototype
                  marks this step complete without importing or inventing
                  workouts.
                </p>
                <button
                  className="s-button secondary"
                  disabled={calibrated}
                  onClick={() => setCalibrated(true)}
                >
                  {calibrated
                    ? "History step completed ✓"
                    : "Preview one-time history setup"}
                </button>
              </>
            )}
            <button
              className="s-button"
              onClick={() =>
                setupStep < 2
                  ? setSetupStep(setupStep + 1)
                  : (setPanel(null),
                    setNotice("Setup preview complete. Welcome in."))
              }
            >
              {setupStep < 2 ? "Continue" : "Meet your Home"} →
            </button>
          </>
        );
      case "return":
        return (
          <>
            <div className="award-reveal">
              <Ember className="modal-ember" expression="happy" />
              <p className="s-eyebrow">WELCOME BACK</p>
              <h3>
                6.2 km further.
                <br />
                One place higher.
              </h3>
              <p>Your morning run moved you from 4th to 3rd.</p>
            </div>
            <button
              className="s-button"
              onClick={() => {
                setPanel(null);
                onTab("Arena");
              }}
            >
              See your new position →
            </button>
            <button
              className="s-text-button"
              onClick={() => {
                setPanel(null);
                onTab("Home");
              }}
            >
              Continue to Home
            </button>
          </>
        );
      default:
        return null;
    }
  }
  return (
    <div className={`s-app concept-${concept}`} style={themeStyle(concept)}>
      <aside className="s-sidebar">
        <div className="s-logo">
          overtaek<span>®</span>
        </div>
        <p className="s-eyebrow">A LITTLE FURTHER, TOGETHER.</p>
        <nav aria-label="Application tabs">
          {PROTOTYPE_TABS.map((t) => (
            <button
              key={t}
              aria-current={tab === t ? "page" : undefined}
              onClick={() => {
                onTab(t);
                setPanel(null);
              }}
            >
              <TabIcon tab={t} />
              {t}
              <small>↗</small>
            </button>
          ))}
        </nav>
        <button className="sidebar-athlete" onClick={() => onTab("Athlete")}>
          <span className="s-avatar">AL</span>
          <span>
            <b>{nickname}</b>
            <small>Strider · 1,248</small>
          </span>
        </button>
      </aside>
      <div className="s-app-body">
        <header className="s-app-top">
          <span>
            {tab} <i>/</i> Your own kind of progress
          </span>
          <button
            className="s-icon-button"
            aria-label="Open notifications preferences"
            onClick={() => setPanel("settings")}
          >
            ◷
          </button>
        </header>
        <main
          className={`s-content screen-${tab.toLowerCase()}`}
          key={`${concept}-${tab}`}
        >
          {tab === "Home"
            ? home()
            : tab === "Arena"
              ? arena()
              : tab === "Crew"
                ? crew()
                : athlete()}
        </main>
      </div>
      <nav className="s-bottom-nav" aria-label="Application tabs">
        {PROTOTYPE_TABS.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => onTab(t)}
          >
            <TabIcon tab={t} />
            <b>{t}</b>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="s-toast" role="status">
          <span>✓</span>
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <Dialog.Root
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="structure-overlay" />
          <Dialog.Content
            className={`structure-dialog concept-${concept}`}
            style={themeStyle(concept)}
          >
            <div className="s-sheet-handle" />
            <Dialog.Close className="s-modal-close" aria-label="Close dialog">
              ×
            </Dialog.Close>
            <p className="s-eyebrow">OVERTAEK / {panel?.toUpperCase()}</p>
            <Dialog.Title>{panel ? titles[panel] : ""}</Dialog.Title>
            <Dialog.Description className="s-dialog-description">
              {panel === "register"
                ? "Choose a weekly competition and how you want to participate."
                : "A closer look, without losing your place."}
            </Dialog.Description>
            <div className="s-dialog-body">{panelContent()}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Avatars() {
  return (
    <div className="s-avatar-stack">
      {PROTOTYPE_PEOPLE.map((p) => (
        <span className="s-avatar" key={p.name} style={{ background: p.color }}>
          {p.initials}
        </span>
      ))}
      <span className="s-avatar more">+4</span>
    </div>
  );
}
function TrendChart({ range = "12 weeks" }: { range?: string }) {
  const points =
    range === "4 weeks"
      ? "0,88 45,76 90,80 135,50 180,58 225,28 270,30 320,8"
      : range === "Year"
        ? "0,115 45,105 90,110 135,78 180,87 225,53 270,35 320,8"
        : "0,108 30,99 60,104 90,80 120,86 150,61 180,69 210,47 240,51 270,24 295,29 320,8";
  return (
    <svg
      className="trend-chart"
      viewBox="0 0 320 130"
      role="img"
      aria-label={`Illustrative increasing effort score trend over ${range}`}
    >
      <path
        d="M0 30H320M0 70H320M0 110H320"
        stroke="currentColor"
        opacity=".12"
      />
      <polygon
        points={`0,130 ${points} 320,130`}
        fill="var(--s-accent)"
        opacity=".2"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--s-brand)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="320" cy="8" r="5" fill="var(--s-brand)" />
    </svg>
  );
}
function RoutePath({
  variant,
  onToday,
  onSession,
}: {
  variant: LayoutConceptId;
  onToday: () => void;
  onSession: (d: (typeof PROTOTYPE_DAYS)[number]) => void;
}) {
  return (
    <div
      className={`route-scroll route-${variant}`}
      tabIndex={0}
      role="region"
      aria-label="Scrollable journey: today and last ten sessions"
    >
      <div className="route-inner">
        <svg
          className="route-line"
          viewBox="0 0 420 1540"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M245 25 C245 85 115 75 115 160 S300 200 300 290 S115 340 115 430 S300 480 300 570 S115 620 115 710 S300 760 300 850 S115 900 115 990 S300 1040 300 1130 S115 1180 115 1270 S300 1320 300 1410 S200 1480 200 1540" />
        </svg>
        <div className="route-future">
          <span>○</span>
          <small>Tomorrow · room for what’s next</small>
        </div>
        {PROTOTYPE_DAYS.map((d, i) => (
          <div
            key={d.date}
            className={`route-stop stop-${i % 2} ${i === 0 ? "is-today" : ""}`}
            style={{ top: `${112 + i * 128}px` }}
          >
            <button
              onClick={() => (i === 0 ? onToday() : onSession(d))}
              className="route-tile"
              aria-label={
                i === 0
                  ? "Today: open exercise recommendation"
                  : `${d.day}, ${d.date}, ${d.value}: open session receipt`
              }
            >
              {i === 0 ? (
                <Ember className="path-ember" expression="happy" />
              ) : (
                <>
                  <span className="tile-check">✓</span>
                  <b>{d.value}</b>
                  <small>{d.day}</small>
                </>
              )}
            </button>
            <span className="route-label">
              <small>{d.date}</small>
              <b>{i === 0 ? "You are here" : d.detail.split(" · ")[0]}</b>
              {i === 0 && <span>Tap Ember for your next move ↗</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabIcon({ tab }: { tab: PrototypeTab }) {
  const paths: Record<PrototypeTab, string> = {
    Home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
    Arena: "M4 20V5m0 1c5-5 11 5 16 0v9c-5 5-11-5-16 0",
    Crew: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    Athlete:
      "M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  };
  return (
    <svg
      className="s-nav-icon"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[tab]} />
    </svg>
  );
}

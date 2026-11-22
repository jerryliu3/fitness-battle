"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { CompeteIcon, EventArt } from "@/features/arena/event-home";
import "./special-events-lab.css";

type ProtoTab = "survivor" | "relay" | "bracket" | "map" | "integrated";
type CutPhase = "idle" | "climbing" | "cutting" | "verdict";
type RelayPhase = "idle" | "finishing" | "handoff" | "verdict";
type BracketPhase = "idle" | "surging" | "advancing" | "verdict";

const SURVIVOR_BASE = [
  { id: "carla", name: "Carla", initials: "CD", color: "#1f9f6a", startMi: 4.1, endMi: 6.4, you: false },
  { id: "marcus", name: "Marcus", initials: "MV", color: "#3b82f6", startMi: 3.9, endMi: 5.1, you: false },
  { id: "elena", name: "Elena", initials: "ER", color: "#8b5cf6", startMi: 3.7, endMi: 4.9, you: false },
  { id: "bob", name: "Bob", initials: "BC", color: "#f59e0b", startMi: 3.5, endMi: 4.6, you: false },
  { id: "you", name: "You", initials: "AL", color: "#7ab800", startMi: 3.3, endMi: 5.8, you: true },
  { id: "dana", name: "Dana", initials: "DS", color: "#ef4444", startMi: 3.1, endMi: 3.4, you: false },
];

const RELAY_DAYS = [
  { day: "M", date: "17", name: "Alice", initials: "AL", color: "#7ab800", mi: 6.2, you: true },
  { day: "T", date: "18", name: "Bob", initials: "BC", color: "#3b82f6", mi: 5.4, you: false },
  { day: "W", date: "19", name: "Carla", initials: "CD", color: "#8b5cf6", mi: 7.1, you: false },
  { day: "T", date: "20", name: "You", initials: "AL", color: "#7ab800", mi: 4.8, you: true, today: true },
  { day: "F", date: "21", name: "Elena", initials: "ER", color: "#f59e0b", mi: 0, you: false },
  { day: "S", date: "22", name: "Test", initials: "TA", color: "#10b981", mi: 0, you: false },
  { day: "S", date: "23", name: "Carla", initials: "CD", color: "#8b5cf6", mi: 0, you: false },
];

const SQUADS_BASE = [
  {
    id: "ldn1", flag: "🇬🇧", code: "LDN", name: "London", startTotal: 38.2, endTotal: 39.4, you: false,
    members: [],
  },
  {
    id: "nyc1", flag: "🇺🇸", code: "NYC", name: "New York #1", startTotal: 36.8, endTotal: 42.6, you: true,
    members: [
      { name: "Alice", initials: "AL", color: "#7ab800", startMi: 14.6, endMi: 17.8, you: true },
      { name: "Carla", initials: "CD", color: "#1f9f6a", startMi: 12.8, endMi: 14.6, you: false },
      { name: "Bob", initials: "BC", color: "#3b82f6", startMi: 9.4, endMi: 10.2, you: false },
    ],
  },
  {
    id: "tyo1", flag: "🇯🇵", code: "TYO", name: "Tokyo", startTotal: 34.9, endTotal: 36.1, you: false,
    members: [],
  },
  {
    id: "nyc2", flag: "🇺🇸", code: "NYC", name: "New York #2", startTotal: 30.5, endTotal: 31.8, you: false,
    members: [],
  },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function EventCourseCanvas({ mode, height = 220 }: { mode: "survivor" | "duel" | "relay" | "squads"; height?: number }) {
  return (
    <div className="se-track-canvas" style={{ height }}>
      <EventArt event={mode === "duel" ? "cycling" : "running"} gold />
      <svg viewBox="0 0 360 220" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M 28 175 C 95 160, 120 65, 200 90 C 265 110, 295 55, 335 45" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 28 175 C 95 160, 120 65, 200 90 C 265 110, 295 55, 335 45" fill="none" stroke="var(--lime)" strokeWidth="2.5" strokeDasharray="6 6" />
        {mode === "survivor" && (
          <>
            <line x1="115" y1="80" x2="115" y2="175" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" />
            <text x="120" y="168" fill="#fca5a5" fontSize="10">CUT LINE (4.6 mi)</text>
            <circle cx="80" cy="155" r="9" fill="#ef4444" opacity="0.5" />
            <circle cx="170" cy="86" r="10" fill="#3b82f6" />
            <circle cx="222" cy="96" r="11" fill="#b7f255" stroke="#12141a" strokeWidth="2.5" />
            <circle cx="268" cy="80" r="10" fill="#1f9f6a" />
          </>
        )}
        {mode === "duel" && (
          <>
            <line x1="175" y1="86" x2="258" y2="82" stroke="#b7f255" strokeWidth="2" strokeDasharray="3 3" />
            <text x="195" y="72" fill="#b7f255" fontSize="11">+2.4 mi</text>
            <circle cx="175" cy="86" r="12" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
            <circle cx="258" cy="82" r="13" fill="#b7f255" stroke="#12141a" strokeWidth="2.5" />
          </>
        )}
        {mode === "relay" && (
          <>
            <circle cx="248" cy="85" r="22" fill="rgba(183,242,85,0.22)" />
            <rect x="226" y="72" width="44" height="24" rx="12" fill="#b7f255" />
            <text x="234" y="88" fill="#12141a" fontSize="11" fontWeight="700">WKD</text>
            <rect x="152" y="78" width="44" height="24" rx="12" fill="#475569" />
            <text x="160" y="94" fill="#fff" fontSize="11" fontWeight="700">HBR</text>
          </>
        )}
        {mode === "squads" && (
          <>
            <rect x="228" y="68" width="64" height="26" rx="13" fill="#b7f255" />
            <text x="236" y="85" fill="#12141a" fontSize="11" fontWeight="700">🇺🇸 NYC</text>
            <rect x="150" y="78" width="62" height="26" rx="13" fill="#fff" />
            <text x="158" y="95" fill="#12141a" fontSize="11" fontWeight="700">🇬🇧 LDN</text>
            <rect x="82" y="138" width="62" height="26" rx="13" fill="#cbd5e1" />
            <text x="90" y="155" fill="#12141a" fontSize="11" fontWeight="700">🇯🇵 TYO</text>
          </>
        )}
      </svg>
    </div>
  );
}

export function SpecialEventsLab() {
  const [tab, setTab] = useState<ProtoTab>("survivor");
  const timers = useRef<number[]>([]);
  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // Prototype A — Choreographed Survivor Cut Experience
  const [cutPhase, setCutPhase] = useState<CutPhase>("idle");
  const [cutOutcome, setCutOutcome] = useState<"survived" | "eliminated">("survived");
  const [cutProgress, setCutProgress] = useState(1);
  const [inDanger, setInDanger] = useState(false);
  const [spectatingSurvivor, setSpectatingSurvivor] = useState(false);

  function playSurvivorSequence(outcome: "survived" | "eliminated") {
    clearTimers();
    setSpectatingSurvivor(false);
    setInDanger(outcome === "eliminated");
    setCutOutcome(outcome);
    setCutProgress(0);
    setCutPhase("climbing");

    const started = performance.now();
    const duration = 2600;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / duration);
      setCutProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    timers.current.push(
      window.setTimeout(() => setCutPhase("cutting"), 2850),
      window.setTimeout(() => setCutPhase("verdict"), 4300),
    );
  }

  // Prototype B — Choreographed Relay Handoff
  const [relayPhase, setRelayPhase] = useState<RelayPhase>("idle");
  const [relayOutcome, setRelayOutcome] = useState<"yours" | "teammate">("yours");
  const [relayWedMi, setRelayWedMi] = useState(7.1);
  const [activeBatonIndex, setActiveBatonIndex] = useState(3);
  const [crewSpectator, setCrewSpectator] = useState(false);
  const [pickedDay, setPickedDay] = useState(3);

  function playRelaySequence(outcome: "yours" | "teammate") {
    clearTimers();
    setRelayOutcome(outcome);
    setActiveBatonIndex(2); // Starts on Wed (Carla)
    setRelayWedMi(3.2);
    setRelayPhase("finishing");

    const started = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / 2200);
      setRelayWedMi(lerp(3.2, 7.1, 1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    timers.current.push(
      window.setTimeout(() => {
        setRelayPhase("handoff");
        setActiveBatonIndex(3); // Baton slides Wed -> Thu
        setPickedDay(3);
      }, 2400),
      window.setTimeout(() => setRelayPhase("verdict"), 3800),
    );
  }

  // Prototype C — Choreographed 1v1 Surge & Squad Lead Change
  const [subModeC, setSubModeC] = useState<"bracket" | "squads">("bracket");
  const [bracketPhase, setBracketPhase] = useState<BracketPhase>("idle");
  const [duelPct, setDuelPct] = useState(58);
  const [duelMi, setDuelMi] = useState(24.2);
  const [squadProgress, setSquadProgress] = useState(1);
  const [expandedSquad, setExpandedSquad] = useState(true);
  const [squadSpectator, setSquadSpectator] = useState(false);

  function playBracketSequence() {
    clearTimers();
    setSubModeC("bracket");
    setDuelPct(45);
    setDuelMi(19.6);
    setBracketPhase("surging");

    const started = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / 2400);
      const ease = 1 - Math.pow(1 - p, 3);
      setDuelPct(lerp(45, 58, ease));
      setDuelMi(lerp(19.6, 24.2, ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    timers.current.push(
      window.setTimeout(() => setBracketPhase("advancing"), 2600),
      window.setTimeout(() => setBracketPhase("verdict"), 4000),
    );
  }

  function playSquadSurge() {
    clearTimers();
    setSubModeC("squads");
    setSquadSpectator(false);
    setExpandedSquad(true);
    setSquadProgress(0);
    const started = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / 2600);
      setSquadProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Prototype D & E
  const [mapMode, setMapMode] = useState<"survivor" | "duel" | "relay" | "squads">("survivor");
  const [integratedMode, setIntegratedMode] = useState<"survivor" | "duel" | "relay" | "squads">("survivor");
  const [viewDim, setViewDim] = useState<"3d" | "2d">("3d");
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const survivorOrder = SURVIVOR_BASE.map((r) => {
    const target = r.you && inDanger ? 2.9 : r.endMi;
    const mi = lerp(r.startMi, target, cutProgress);
    const delta = mi - r.startMi;
    return { ...r, mi, delta };
  }).sort((a, b) => b.mi - a.mi);

  const squadsOrder = SQUADS_BASE.map((sq) => ({
    ...sq,
    total: lerp(sq.startTotal, sq.endTotal, squadProgress),
    members: sq.members.map((m) => ({ ...m, mi: lerp(m.startMi, m.endMi, squadProgress) })),
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="se-lab">
      <header className="se-lab-head">
        <div>
          <AppText role="caption" secondary>UX & MOTION SANDBOX · /ux/special-events</AppText>
          <AppHeading role="display">Special Events Prototypes</AppHeading>
        </div>
        <div className="se-lab-tabs" role="tablist" aria-label="Prototype selector">
          {([
            ["survivor", "A · Survivor Cut"],
            ["relay", "B · Relay Handoff"],
            ["bracket", "C · Bracket & Squads"],
            ["map", "D · Event Lanes"],
            ["integrated", "E · 2D / 3D Integration"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "fb-btn" : "fb-btn-line"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="se-lab-stage">
        <div className="se-phone" aria-label="Mobile prototype preview">
          {tab === "survivor" && (
            <>
              <div className="se-phone-bar">
                <AppText role="label">← Back</AppText>
                <div style={{ textAlign: "center" }}>
                  <AppText role="label">Daily Survivor</AppText>
                  <AppText role="caption" secondary>
                    {cutPhase === "climbing" ? "Replaying Day 3 distances…" : cutPhase === "cutting" ? "Applying midnight cut…" : "Day 4 of 7 · Resets 12:00 AM ET"}
                  </AppText>
                </div>
                <CompeteIcon name="running" size={20} />
              </div>

              <div className="se-phone-body">
                {spectatingSurvivor ? (
                  <div className="se-spectator-bar">
                    <AppText role="caption">Eliminated Day 3 · Watching Heat 1 live</AppText>
                    <span className="se-pill se-pill-gold"><AppText role="caption">LIVE</AppText></span>
                  </div>
                ) : (
                  <div className="se-card se-card-dark">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={`se-pill ${inDanger ? "se-pill-danger" : "se-pill-lime"}`}>
                        <AppText role="caption">{inDanger ? "BELOW CUT LINE" : "ABOVE CUT LINE"}</AppText>
                      </span>
                      <AppText role="caption">4h 18m left</AppText>
                    </div>
                    <AppHeading role="heading">
                      {inDanger ? "0.5 mi behind safety" : "+1.2 mi above elimination"}
                    </AppHeading>
                    <AppText role="caption">
                      Top 5 advance at midnight ET · Bottom 1 eliminated tonight
                    </AppText>
                  </div>
                )}

                <div style={{ display: "grid", gap: 6 }}>
                  {survivorOrder.map((r, idx) => {
                    const isDropped = idx === 5 && (cutPhase === "cutting" || cutPhase === "verdict");
                    return (
                      <div key={r.id}>
                        <motion.div
                          layout
                          transition={{ type: "spring", stiffness: 180, damping: 24 }}
                          animate={isDropped ? { y: 10, opacity: 0.35, scale: 0.97 } : { y: 0, opacity: idx === 5 ? 0.65 : 1, scale: 1 }}
                          className={`se-row ${r.you && !spectatingSurvivor ? "se-row-you" : ""} ${idx === 5 ? "se-row-out" : ""}`}
                        >
                          <AppText role="caption" secondary>{idx + 1}</AppText>
                          <span className="se-avatar" style={{ background: r.color }}>
                            <AppText role="caption">{r.initials}</AppText>
                          </span>
                          <AppText role="label" style={{ flex: 1 }}>
                            {r.name}{r.you && !spectatingSurvivor ? " · You" : ""}
                          </AppText>
                          {cutPhase === "climbing" && r.delta > 0.05 && (
                            <span className="se-delta"><AppText role="caption">+{r.delta.toFixed(1)}</AppText></span>
                          )}
                          {isDropped ? (
                            <span className="se-pill se-pill-danger"><AppText role="caption">OUT</AppText></span>
                          ) : (
                            <AppText role="caption">{r.mi.toFixed(1)} mi</AppText>
                          )}
                        </motion.div>
                        {idx === 4 && cutPhase !== "climbing" && (
                          <motion.div
                            className="se-cut-divider"
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                            style={{ margin: "6px 0 2px", transformOrigin: "left center" }}
                          >
                            <AppText role="caption">ELIMINATION CUT · TOP 5 ADVANCE</AppText>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence>
                {cutPhase === "verdict" && (
                  <motion.div className="se-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      style={{ display: "grid", gap: 14, textAlign: "center", justifyItems: "center" }}
                    >
                      <span className={`se-pill ${cutOutcome === "survived" ? "se-pill-lime" : "se-pill-danger"}`}>
                        <AppText role="caption">DAY 3 CUT VERDICT</AppText>
                      </span>
                      <AppHeading role="display">
                        {cutOutcome === "survived" ? "YOU SURVIVED" : "ELIMINATED · 6TH"}
                      </AppHeading>
                      <AppParagraph typographyRole="support">
                        {cutOutcome === "survived"
                          ? "You surged from #5 → #2 (+2.5 mi) and cleared the cut. Dana was eliminated. Scores reset to 0 for Day 4."
                          : "Finished 0.5 mi shy of the Day 3 cut. Your heat keeps racing through Sunday."}
                      </AppParagraph>
                      <button
                        type="button"
                        className="fb-btn"
                        style={{ width: "100%" }}
                        onClick={() => {
                          setSpectatingSurvivor(cutOutcome === "eliminated");
                          setCutPhase("idle");
                        }}
                      >
                        {cutOutcome === "survived" ? "Enter Day 4 →" : "Watch the rest of the heat →"}
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {tab === "relay" && (
            <>
              <div className="se-phone-bar">
                <AppText role="label">← Back</AppText>
                <div style={{ textAlign: "center" }}>
                  <AppText role="label">Crew Relay</AppText>
                  <AppText role="caption" secondary>
                    {relayPhase === "finishing" ? "Closing Wednesday leg…" : relayPhase === "handoff" ? "Passing baton to Thursday…" : "Weekday miles vs Harbor Track"}
                  </AppText>
                </div>
                <CompeteIcon name="running" size={20} />
              </div>

              <div className="se-phone-body">
                {crewSpectator && (
                  <div className="se-spectator-bar">
                    <AppText role="caption">Weekday miles is racing · Crew spectator view</AppText>
                    <span className="se-pill se-pill-gold"><AppText role="caption">WATCH</AppText></span>
                  </div>
                )}

                <div className="se-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <AppText role="label">7-Day Baton Track</AppText>
                    <span className="se-pill se-pill-lime">
                      <AppText role="caption">{activeBatonIndex === 2 ? "HANDOFF · WED" : "TODAY · THU"}</AppText>
                    </span>
                  </div>
                  <div className="se-baton-strip">
                    {RELAY_DAYS.map((d, i) => {
                      const isActive = i === activeBatonIndex;
                      const mi = i === 2 ? relayWedMi : d.mi;
                      return (
                        <button
                          key={d.date}
                          type="button"
                          className="se-baton-day"
                          data-today={isActive}
                          onClick={() => setPickedDay(i)}
                        >
                          <AppText role="caption" secondary>{d.day}</AppText>
                          <motion.span
                            layout
                            animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                            transition={{ duration: 0.45 }}
                            className="se-avatar"
                            style={{ width: 26, height: 26, background: d.color }}
                          >
                            <AppText role="caption">{d.initials}</AppText>
                          </motion.span>
                          <AppText role="caption">{mi > 0 ? mi.toFixed(1) : "—"}</AppText>
                        </button>
                      );
                    })}
                  </div>
                  <AppText role="caption" secondary>
                    {RELAY_DAYS[pickedDay]?.name} ({RELAY_DAYS[pickedDay]?.day} {RELAY_DAYS[pickedDay]?.date}):{" "}
                    {RELAY_DAYS[pickedDay]?.mi ? `${(pickedDay === 2 ? relayWedMi : RELAY_DAYS[pickedDay]!.mi).toFixed(1)} mi counted for crew` : "Upcoming baton leg"}
                  </AppText>
                </div>

                {(() => {
                  const wkdTotal = 16.4 + relayWedMi;
                  const hbrTotal = 20.9;
                  const maxMi = Math.max(wkdTotal, hbrTotal);
                  return (
                    <div className="se-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="se-crew-tag"><AppText role="caption">WKD</AppText></span>
                          <AppText role="label">Weekday miles</AppText>
                        </div>
                        <AppText role="label">{wkdTotal.toFixed(1)} mi</AppText>
                      </div>
                      <div className="se-seg-bar">
                        <div style={{ width: `${(wkdTotal / maxMi) * 100}%`, display: "flex", gap: 2, height: "100%" }}>
                          <div style={{ flex: 6.2, background: "#7ab800" }} />
                          <div style={{ flex: 5.4, background: "#3b82f6" }} />
                          <div style={{ flex: relayWedMi, background: "#8b5cf6" }} />
                          <div style={{ flex: 4.8, background: "#7ab800" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="se-crew-tag"><AppText role="caption">HBR</AppText></span>
                          <AppText role="label">Harbor Track Club</AppText>
                        </div>
                        <AppText role="caption" secondary>{hbrTotal.toFixed(1)} mi</AppText>
                      </div>
                      <div className="se-seg-bar">
                        <div style={{ width: `${(hbrTotal / maxMi) * 100}%`, display: "flex", gap: 2, height: "100%" }}>
                          <div style={{ flex: 6.1, background: "#64748b" }} />
                          <div style={{ flex: 5.8, background: "#475569" }} />
                          <div style={{ flex: 4.9, background: "#94a3b8" }} />
                          <div style={{ flex: 4.1, background: "#334155" }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <AnimatePresence>
                {relayPhase === "verdict" && (
                  <motion.div className="se-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div initial={{ x: -28, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ display: "grid", gap: 14, textAlign: "center", justifyItems: "center" }}>
                      <span className="se-pill se-pill-lime"><AppText role="caption">BATON HANDOFF · THU</AppText></span>
                      <AppHeading role="display">
                        {relayOutcome === "yours" ? "YOU HAVE THE BATON" : "ALICE IS ON THE BATON"}
                      </AppHeading>
                      <AppParagraph typographyRole="support">
                        {relayOutcome === "yours"
                          ? "Carla closed Wednesday at 7.1 mi (+2.6 mi crew lead). Every verified mile you log today counts for Weekday miles."
                          : "Cheer Alice on today — your runs still count toward your regular weekly Running field."}
                      </AppParagraph>
                      <button type="button" className="fb-btn" style={{ width: "100%" }} onClick={() => setRelayPhase("idle")}>
                        {relayOutcome === "yours" ? "Let’s roll →" : "View live relay →"}
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {tab === "bracket" && (
            <>
              <div className="se-phone-bar">
                <AppText role="label">← Back</AppText>
                <div style={{ textAlign: "center" }}>
                  <AppText role="label">{subModeC === "bracket" ? "Knockout Cup" : "Metro 3v3"}</AppText>
                  <AppText role="caption" secondary>{subModeC === "bracket" ? "Semifinals · Week 2 of 3" : "City Squads · Live"}</AppText>
                </div>
                <CompeteIcon name={subModeC === "bracket" ? "cycling" : "running"} size={20} />
              </div>

              <div className="se-phone-body">
                {subModeC === "bracket" ? (
                  <>
                    <div className="se-card se-card-dark">
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <AppText role="label">You · {duelMi.toFixed(1)} mi</AppText>
                        <AppText role="caption">Marcus · 21.8 mi</AppText>
                      </div>
                      <div className="se-seg-bar" style={{ background: "rgba(255,255,255,0.16)" }}>
                        <div style={{ width: `${duelPct}%`, background: "var(--lime)", height: "100%", transition: "width 80ms linear" }} />
                      </div>
                      <AppText role="caption">
                        {duelMi >= 21.8 ? `+${(duelMi - 21.8).toFixed(1)} mi ahead · Advancing to Final` : `${(21.8 - duelMi).toFixed(1)} mi behind Marcus`}
                      </AppText>
                    </div>

                    <div className="se-card">
                      <AppText role="label">Tournament Bracket</AppText>
                      <div className="se-bracket">
                        <div className="se-bracket-col">
                          <AppText role="caption" secondary>QF</AppText>
                          <div className="se-match-box" data-active="true">
                            <AppText role="caption">You ✓</AppText>
                            <AppText role="caption" secondary>Dana</AppText>
                          </div>
                          <div className="se-match-box">
                            <AppText role="caption">Marcus ✓</AppText>
                            <AppText role="caption" secondary>Bob</AppText>
                          </div>
                        </div>
                        <div className="se-bracket-col">
                          <AppText role="caption" secondary>SF</AppText>
                          <div className="se-match-box" data-active="true">
                            <AppText role="caption">You · {duelMi.toFixed(1)}{bracketPhase === "advancing" || bracketPhase === "verdict" ? " ✓" : ""}</AppText>
                            <AppText role="caption" secondary>Marcus · 21.8</AppText>
                          </div>
                          <div className="se-match-box">
                            <AppText role="caption">Carla · 26.0 ✓</AppText>
                            <AppText role="caption" secondary>Elena · 22.4</AppText>
                          </div>
                        </div>
                        <div className="se-bracket-col">
                          <AppText role="caption" secondary>FINAL</AppText>
                          <div className="se-match-box" data-active={bracketPhase === "advancing" || bracketPhase === "verdict"}>
                            <AppText role="caption">{bracketPhase === "advancing" || bracketPhase === "verdict" ? "You" : "TBD"}</AppText>
                            <AppText role="caption" secondary>Carla</AppText>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {squadSpectator && (
                      <div className="se-spectator-bar">
                        <AppText role="caption">Watching live · Equal 3-athlete city squads matched</AppText>
                        <span className="se-pill se-pill-gold"><AppText role="caption">LIVE</AppText></span>
                      </div>
                    )}
                    <div style={{ display: "grid", gap: 8 }}>
                      {squadsOrder.map((sq, idx) => (
                        <motion.div
                          key={sq.id}
                          layout
                          transition={{ type: "spring", stiffness: 180, damping: 24 }}
                          className="se-card"
                          style={{ borderColor: sq.you && !squadSpectator ? "var(--lime-deep)" : undefined }}
                        >
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 10, cursor: sq.you ? "pointer" : "default" }}
                            onClick={() => { if (sq.you) setExpandedSquad((v) => !v); }}
                          >
                            <AppText role="caption" secondary>{idx + 1}</AppText>
                            <span className="se-pill"><AppText role="caption">{sq.flag} {sq.code}</AppText></span>
                            <div style={{ flex: 1 }}>
                              <AppText role="label">{sq.name}{sq.you && !squadSpectator ? " · Your squad" : ""}</AppText>
                            </div>
                            <AppText role="label">{sq.total.toFixed(1)} mi</AppText>
                          </div>
                          {sq.you && !squadSpectator && expandedSquad && (
                            <div style={{ display: "grid", gap: 6, paddingTop: 6, borderTop: "1px solid var(--line)" }}>
                              {sq.members.map((m) => (
                                <div key={m.name} style={{ display: "grid", gap: 3 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <AppText role="caption">{m.name}{m.you ? " · You" : ""}</AppText>
                                    <AppText role="caption">{m.mi.toFixed(1)} mi ({Math.round((m.mi / sq.total) * 100)}%)</AppText>
                                  </div>
                                  <div className="se-seg-bar" style={{ height: 6 }}>
                                    <div style={{ width: `${(m.mi / sq.total) * 100}%`, background: m.color }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <AnimatePresence>
                {bracketPhase === "verdict" && (
                  <motion.div className="se-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ display: "grid", gap: 14, textAlign: "center", justifyItems: "center" }}>
                      <span className="se-pill se-pill-lime"><AppText role="caption">SEMIFINAL VICTORY</AppText></span>
                      <AppHeading role="display">ON TO THE FINAL</AppHeading>
                      <AppParagraph typographyRole="support">You surged past Marcus 24.2 mi to 21.8 mi. Next up: Carla (1,205 Effort) starting Monday 6:00 AM ET.</AppParagraph>
                      <button type="button" className="fb-btn" style={{ width: "100%" }} onClick={() => setBracketPhase("idle")}>
                        View Final matchup →
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {tab === "map" && (
            <>
              <div className="se-phone-bar">
                <AppText role="label">← Back</AppText>
                <div style={{ textAlign: "center" }}>
                  <AppText role="label">Event Course Lanes</AppText>
                  <AppText role="caption" secondary>Live Special Event markers</AppText>
                </div>
                <CompeteIcon name="running" size={20} />
              </div>
              <div className="se-phone-body">
                <EventCourseCanvas mode={mapMode} />
                <div className="se-card">
                  <AppText role="label">
                    {mapMode === "survivor" && "Daily Survivor · Cut-Line Sweeper"}
                    {mapMode === "duel" && "1v1 Knockout · Pure 2-Racer Duel"}
                    {mapMode === "relay" && "Crew Relay · Pulsing Baton Crest"}
                    {mapMode === "squads" && "City / Country Squads · Team Flag Crests"}
                  </AppText>
                  <AppText role="caption" secondary>
                    {mapMode === "survivor" && "Red cut-line sweeper tracks the bottom advancing athlete; eliminated dots dim behind."}
                    {mapMode === "duel" && "Only you and your bracket rival appear on the course with a live distance gap tether."}
                    {mapMode === "relay" && "Crew tags move as a single team crest with a pulsing tennis-lime halo for today’s active baton carrier."}
                    {mapMode === "squads" && "Each pooled squad moves as a clean flag + metro crest pill rather than cluttering the map."}
                  </AppText>
                </div>
              </div>
            </>
          )}

          {tab === "integrated" && (
            <div className="se-stage-shell">
              {/* Top floating HUD over 3D Course or 2D Chart */}
              <div className="se-stage-hud">
                <span className="se-hud-chip"><AppText role="caption">← Compete</AppText></span>
                <span className="se-hud-chip">
                  <AppText role="caption">
                    {integratedMode === "survivor" && "SAFE · +1.2 mi"}
                    {integratedMode === "duel" && "SEMIFINAL · +2.4 mi"}
                    {integratedMode === "relay" && "BATON · YOU TODAY"}
                    {integratedMode === "squads" && "🇺🇸 NYC #1 · 1ST"}
                  </AppText>
                </span>
                <button
                  type="button"
                  className="se-hud-chip"
                  style={{ cursor: "pointer" }}
                  onClick={() => setViewDim((d) => (d === "3d" ? "2d" : "3d"))}
                >
                  <AppText role="caption">{viewDim === "3d" ? "3D Map" : "2D Chart"}</AppText>
                </button>
              </div>

              {viewDim === "3d" ? (
                <EventCourseCanvas mode={integratedMode} height={sheetExpanded ? 190 : 350} />
              ) : (
                <div style={{ height: sheetExpanded ? 190 : 350, padding: "54px 16px 16px", background: "#141923", display: "grid", alignContent: "center" }}>
                  <svg viewBox="0 0 340 160" style={{ width: "100%", height: "100%" }}>
                    <line x1="16" y1="120" x2="324" y2="120" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" />
                    <text x="20" y="114" fill="#fca5a5" fontSize="10">
                      {integratedMode === "survivor" ? "Cut line · 4.6 mi" : "Rival pace"}
                    </text>
                    <path d="M 16 142 L 90 128 L 165 102 L 245 78 L 320 44" fill="none" stroke="#b7f255" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 16 144 L 90 132 L 165 114 L 245 96 L 320 74" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="320" cy="44" r="5" fill="#b7f255" />
                  </svg>
                </div>
              )}

              {/* Bottom Integrated CompeteSheet */}
              <motion.div layout className="se-sheet">
                <button
                  type="button"
                  onClick={() => setSheetExpanded((v) => !v)}
                  style={{ border: 0, background: "transparent", cursor: "pointer", padding: 0 }}
                  aria-label="Toggle bottom sheet height"
                >
                  <div className="se-sheet-handle" />
                </button>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <AppText role="label">
                      {integratedMode === "survivor" && "Daily Survivor · Day 4"}
                      {integratedMode === "duel" && "Knockout Cup · Semifinal"}
                      {integratedMode === "relay" && "Crew Relay · Weekday miles"}
                      {integratedMode === "squads" && "Metro 3v3 · City Squads"}
                    </AppText>
                    <AppText role="caption" secondary>
                      {sheetExpanded ? "Expanded sheet · tap handle to peek" : "Peek sheet · tap handle to expand"}
                    </AppText>
                  </div>
                  <span className="se-pill se-pill-lime"><AppText role="caption">LIVE</AppText></span>
                </div>

                {integratedMode === "relay" ? (
                  <div className="se-baton-strip">
                    {RELAY_DAYS.map((d) => (
                      <div key={d.date} className="se-baton-day" data-today={Boolean(d.today)}>
                        <AppText role="caption" secondary>{d.day}</AppText>
                        <span className="se-avatar" style={{ width: 22, height: 22, background: d.color }}>
                          <AppText role="caption">{d.initials[0]}</AppText>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {(integratedMode === "squads" ? squadsOrder.slice(0, sheetExpanded ? 4 : 2) : survivorOrder.slice(0, sheetExpanded ? 5 : 3)).map((item, idx) => (
                      <div key={item.id} className={`se-row ${item.you ? "se-row-you" : ""}`}>
                        <AppText role="caption" secondary>{idx + 1}</AppText>
                        <AppText role="label" style={{ flex: 1 }}>
                          {"flag" in item ? `${item.flag} ${item.name}` : item.name}{item.you ? " · You" : ""}
                        </AppText>
                        <AppText role="caption">
                          {("total" in item ? item.total : item.mi).toFixed(1)} mi
                        </AppText>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </div>

        {/* Interactive Controls Panel */}
        <aside className="se-controls" aria-label="Prototype controls">
          <AppHeading role="heading">
            {tab === "survivor" && "A · Choreographed Survivor Cut"}
            {tab === "relay" && "B · Choreographed Relay Handoff"}
            {tab === "bracket" && "C · 1v1 Surge & Squad Lead Change"}
            {tab === "map" && "D · Event Course Lanes"}
            {tab === "integrated" && "E · Integrated 2D / 3D Event View"}
          </AppHeading>
          <AppParagraph typographyRole="support">
            {tab === "survivor" && "Plays the full 3-beat sequence: distances count up & rows overtake → red cut line sweeps & drops #6 → full-screen verdict."}
            {tab === "relay" && "Plays Wednesday’s final miles ticking up → baton sliding across the 7-day strip onto Today → morning handoff reveal."}
            {tab === "bracket" && "Plays your semifinal surge overtaking Marcus into the Final, or NYC #1 surging past London with teammate bar breakdown."}
            {tab === "map" && "Switch between the 4 Special Event course marker styles."}
            {tab === "integrated" && "Preview how Special Events slot directly into Overtaek’s 3D Map / 2D Chart + bottom CompeteSheet shell."}
          </AppParagraph>

          {tab === "survivor" && (
            <div className="se-control-group">
              <button type="button" className="fb-btn" onClick={() => playSurvivorSequence("survived")}>
                Play Full Cut: Survived (#5 → #2)
              </button>
              <button type="button" className="fb-btn-line" onClick={() => playSurvivorSequence("eliminated")}>
                Play Full Cut: Eliminated → Watch
              </button>
              <button type="button" className="fb-btn-line" onClick={() => { setSpectatingSurvivor(false); setInDanger((v) => !v); }}>
                Toggle: {inDanger ? "Safe (+1.2 mi)" : "Danger (-0.5 mi)"}
              </button>
            </div>
          )}

          {tab === "relay" && (
            <div className="se-control-group">
              <button type="button" className="fb-btn" onClick={() => playRelaySequence("yours")}>
                Play Full Handoff: Your Baton
              </button>
              <button type="button" className="fb-btn-line" onClick={() => playRelaySequence("teammate")}>
                Play Full Handoff: Teammate
              </button>
              <button type="button" className="fb-btn-line" onClick={() => setCrewSpectator((v) => !v)}>
                {crewSpectator ? "Opted-In View" : "Non-Participating Crewmate"}
              </button>
            </div>
          )}

          {tab === "bracket" && (
            <div className="se-control-group">
              <button type="button" className="fb-btn" onClick={playBracketSequence}>
                Play 1v1 Semifinal Surge → Final
              </button>
              <button type="button" className="fb-btn-line" onClick={playSquadSurge}>
                Play Squad Surge (NYC #1 → 1st)
              </button>
              {subModeC === "squads" && (
                <button type="button" className="fb-btn-line" onClick={() => setSquadSpectator((v) => !v)}>
                  {squadSpectator ? "Seated Squad View" : "Unseated Spectator View"}
                </button>
              )}
            </div>
          )}

          {tab === "map" && (
            <div className="se-control-group">
              {([
                ["survivor", "Survivor Cut Sweeper"],
                ["duel", "1v1 Head-to-Head"],
                ["relay", "Crew Relay Baton Crest"],
                ["squads", "City / Country Crests"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" className={mapMode === id ? "fb-btn" : "fb-btn-line"} onClick={() => setMapMode(id)}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {tab === "integrated" && (
            <div className="se-control-group">
              {([
                ["survivor", "Daily Survivor"],
                ["duel", "1v1 Bracket"],
                ["relay", "Crew Relay"],
                ["squads", "City Squads"],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" className={integratedMode === id ? "fb-btn" : "fb-btn-line"} onClick={() => setIntegratedMode(id)}>
                  {label}
                </button>
              ))}
              <button type="button" className="fb-btn-line" onClick={() => setViewDim((d) => (d === "3d" ? "2d" : "3d"))}>
                Switch to {viewDim === "3d" ? "2D Chart" : "3D Map"}
              </button>
              <button type="button" className="fb-btn-line" onClick={() => setSheetExpanded((v) => !v)}>
                {sheetExpanded ? "Peek Sheet" : "Expand Sheet"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

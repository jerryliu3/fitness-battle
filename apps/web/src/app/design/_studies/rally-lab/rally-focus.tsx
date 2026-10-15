"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Activity } from "../design-lab/data";
import { NavIcon } from "@/features/brand/brand-art";
import { laneRunners } from "../evolution-lab/model";
import { Mascot } from "../worlds-lab/mascot";
import { imports, references, snapshot, gapText } from "../worlds-lab/model";
import type { WorldProps } from "../worlds-lab/types";
import { ActivityRing } from "./activity-ring";
import { Matchup } from "./matchup";
import { DistanceField } from "./field";
import "@/features/rally/rally-shell.css";
import "./rally-focus.css";

const views = ["week", "matchups", "moves", "you"] as const;
type View = (typeof views)[number];
const nav = {
  week: { name: "My week", icon: "track" },
  matchups: { name: "Matchups", icon: "field" },
  moves: { name: "Moves", icon: "splits" },
  you: { name: "You", icon: "athlete" },
} as const;
const allReferences = [references[0], ...laneRunners.filter((r) => !r.you)];

export function RallyFocus() {
  const [view, setView] = useState<View>("week"),
    [ink, setInk] = useState(true);
  const [cutoff, setCutoff] = useState(3),
    [referenceId, setReferenceId] = useState("ghost"),
    [playing, setPlaying] = useState(false);
  const [detail, setDetail] = useState<{
    title: string;
    body: ReactNode;
    kind: "activity" | "info";
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reference =
      allReferences.find((r) => r.id === referenceId) ?? references[0],
    week = snapshot(cutoff, reference);
  useEffect(() => {
    function restore() {
      const q = new URLSearchParams(window.location.search),
        v = q.get("view");
      setView(views.includes(v as View) ? (v as View) : "week");
      setInk(q.get("ink") !== "off");
      setCutoff(3);
      setReferenceId("ghost");
      setPlaying(false);
      setDetail(null);
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let step = 0;
    const timer = window.setInterval(() => {
      step++;
      setCutoff(step);
      if (step === 3) {
        window.clearInterval(timer);
        setPlaying(false);
      }
    }, 1250);
    return () => window.clearInterval(timer);
  }, [playing]);
  useEffect(() => {
    if (detail && !dialog.current?.open) dialog.current?.showModal();
    if (!detail && dialog.current?.open) dialog.current.close();
  }, [detail]);
  function navigate(next: View) {
    setView(next);
    setCutoff(3);
    setPlaying(false);
    setDetail(null);
    window.history.pushState(
      null,
      "",
      `/design/rally?view=${next}&ink=${ink ? "on" : "off"}`,
    );
    window.scrollTo(0, 0);
  }
  function toggleInk(next: boolean) {
    setInk(next);
    window.history.replaceState(
      null,
      "",
      `/design/rally?view=${view}&ink=${next ? "on" : "off"}`,
    );
  }
  function activity(a: Activity) {
    const index = imports.findIndex((i) => i.id === a.id),
      at = snapshot(index + 1, reference);
    setDetail({
      title: a.title,
      kind: "activity",
      body: (
        <>
          <p className="rf-kicker">
            {a.day} · {a.date}, 2026 · Counted sample import
          </p>
          <div className="rf-receipt-poster">
            <div>
              <span className="rf-sticker">NICE MOVE!</span>
              <h3>
                THAT ONE
                <br />
                COUNTED.
              </h3>
            </div>
            <Mascot concept="rally" decorative={false} />
          </div>
          <div className="rf-receipt-frames">
            <section>
              <span>01 / THE MOVE</span>
              <strong>
                {a.km}
                <small>km</small>
              </strong>
              <p>{a.minutes} min · Running</p>
            </section>
            <section>
              <span>02 / YOUR WEEK AFTER IT</span>
              <strong>
                {at.total.toFixed(1)}
                <small>km</small>
              </strong>
              <p>
                {index + 1} counted {index === 0 ? "outing" : "outings"}
              </p>
            </section>
            <section>
              <span>03 / SAME {a.day.toUpperCase()} CUTOFF</span>
              <strong className="rf-receipt-gap">{gapText(at.gap)}</strong>
              <p>
                {reference.ghost
                  ? "of your previous week"
                  : `compared with ${reference.name.split(" ")[0]}`}{" "}
                ({at.against.toFixed(1)} km)
              </p>
            </section>
          </div>
          <p className="rf-receipt-note">{a.note}</p>
          <p className="rf-source-note">
            An illustrative tracker import, counted once. This prototype uses
            sample activities.
          </p>
        </>
      ),
    });
  }
  function info(title: string, body: ReactNode) {
    setDetail({ title, body, kind: "info" });
  }
  const props: WorldProps = {
    week,
    reference,
    playing,
    onCutoff: (n) => {
      setCutoff(n);
      setPlaying(false);
    },
    onReference: (id) => {
      setReferenceId(id);
      setPlaying(false);
    },
    onActivity: activity,
    onReplay: () => {
      if (playing) setPlaying(false);
      else {
        setCutoff(0);
        setPlaying(true);
      }
    },
    onGroups: () =>
      info(
        "Good company, when you want it.",
        <>
          <Mascot concept="rally" />
          <p>
            Sunday Miles is an optional nine-person sample club. Your own week
            stays the main event.
          </p>
          <button className="rf-primary" onClick={() => navigate("matchups")}>
            View the sample field ↗
          </button>
          <p className="rf-source-note">
            Group preview. No membership is changed.
          </p>
        </>,
      ),
  };
  const selected = imports[Math.max(0, week.cutoff - 1)]!;
  const hero = {
    week: [
      "YOUR WEEK / WEEK 42",
      "SMALL MOVES.",
      "GOOD GAME.",
      "A little movement. All your own work.",
    ],
    matchups: [
      "YOUR KIND OF COMPETITION",
      "FIND YOUR",
      "NEXT MATCHUP.",
      "Start with past you. Add a little company when you want it.",
    ],
    moves: [
      "YOUR COUNTED MOVEMENT",
      "THAT ONE",
      "COUNTED.",
      "Every outing has a place in your week.",
    ],
    you: [
      "YOUR ATHLETE CARD",
      "YOUR GAME.",
      "YOUR OWN PACE.",
      "A record of the movement you already did.",
    ],
  }[view];
  return (
    <div className="rally-focus" data-view={view} data-ink={ink ? "on" : "off"}>
      <a className="rf-skip" href="#rf-main">
        Skip to my week
      </a>
      <div className="rf-lab-bar">
        <Link href="/design">← Design lab</Link>
        <span>Focused direction · Ace locked</span>
        <label>
          <input
            type="checkbox"
            checked={ink}
            onChange={(e) => toggleInk(e.target.checked)}
          />
          Comic accents
        </label>
        <button
          onClick={() =>
            info(
              "The direction, brought together.",
              <>
                <dl className="rf-decisions">
                  <dt>Locked</dt>
                  <dd>
                    Rally’s structure, plum/tennis palette, and the original Ace
                    mascot.
                  </dd>
                  <dt>Carried forward</dt>
                  <dd>
                    Loop’s small-move rings: each recorded outing is a tangible
                    part of the week.
                  </dd>
                  <dt>Optional layer</dt>
                  <dd>
                    Flip’s inked borders, speech bubbles, halftones and
                    expressive type, confined to highlights and receipts.
                  </dd>
                </dl>
                <p>
                  Individual progress first. Friendly comparison next. Groups
                  when you want them.
                </p>
                <p className="rf-source-note">
                  Use “Comic accents” to compare the treatments without changing
                  your matchup or mileage.
                </p>
              </>,
            )
          }
        >
          Design decisions ↗
        </button>
      </div>
      <div className="rf-app">
        <header className="rf-header">
          <button className="rf-wordmark" onClick={() => navigate("week")}>
            RALLY<span>EVERYDAY PLAY.</span>
          </button>
          <nav aria-label="Rally app navigation">
            {views.map((id) => (
              <button
                key={id}
                onClick={() => navigate(id)}
                aria-current={view === id ? "page" : undefined}
              >
                <NavIcon kind={nav[id].icon} />
                <span>{nav[id].name}</span>
              </button>
            ))}
          </nav>
          <button className="rf-club" onClick={props.onGroups}>
            Clubhouse ↗
          </button>
        </header>
        <div className="rf-demo-line">
          <span>Running · Oct 12–19, 2026 UTC</span>
          <span>Sample imports · {week.label} snapshot</span>
        </div>
        <main id="rf-main">
          <section className="rf-hero">
            <div>
              <p className="rf-kicker">{hero[0]}</p>
              <h1>
                {hero[1]}
                <br />
                <em>{hero[2]}</em>
              </h1>
              <p>{hero[3]}</p>
            </div>
            <div className="rf-hero-ace">
              <Mascot concept="rally" decorative={false} />
              <span>ACE / IN YOUR CORNER</span>
            </div>
          </section>
          {view === "week" && (
            <>
              <div className="rf-week-layout">
                <div>
                  <Matchup {...props} />
                  <button
                    className="rf-matchup-link"
                    onClick={() => navigate("matchups")}
                  >
                    Choose a different matchup <span>↗</span>
                  </button>
                </div>
                <section className="rf-small-moves">
                  <header>
                    <div>
                      <p className="rf-kicker">YOUR SMALL MOVES</p>
                      <h2>They all add up.</h2>
                    </div>
                    <button onClick={() => navigate("moves")}>
                      All moves ↗
                    </button>
                  </header>
                  <div className="rf-small-ring-list">
                    {imports.map((a, i) => (
                      <ActivityRing
                        key={a.id}
                        activity={a}
                        counted={week.cutoff >= i + 1}
                        onOpen={() => activity(a)}
                      />
                    ))}
                  </div>
                  <p className="rf-ring-caption">
                    Each ring uses the same 10 km distance scale.
                  </p>
                </section>
              </div>
              <section className="rf-highlight">
                <div className="rf-highlight-art">
                  <span className="rf-sticker">
                    {week.cutoff === 0 ? "READY!" : "GOOD MOVE!"}
                  </span>
                  <Mascot concept="rally" />
                </div>
                <div className="rf-highlight-copy">
                  <p className="rf-kicker">A MOMENT FROM YOUR WEEK</p>
                  <h2>
                    {week.cutoff === 0 ? "A fresh page." : selected.title}
                  </h2>
                  <p>
                    {week.cutoff === 0
                      ? "The start of your week. Zero kilometres; room for what comes next."
                      : selected.note}
                  </p>
                </div>
                <button
                  disabled={week.cutoff === 0}
                  onClick={() => activity(selected)}
                >
                  {week.cutoff === 0
                    ? "The story is ready"
                    : `+${selected.km} km / Read the moment`}{" "}
                  ↗
                </button>
              </section>
            </>
          )}
          {view === "matchups" && (
            <>
              <section className="rf-matchup-choice">
                <p className="rf-kicker">CHOOSE YOUR MATCHUP</p>
                <div>
                  {references.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => props.onReference(r.id)}
                      aria-pressed={reference.id === r.id}
                    >
                      {r.ghost
                        ? "Me vs. past me"
                        : `Me vs. ${r.name.split(" ")[0]}`}
                    </button>
                  ))}
                  <label>
                    More runners
                    <select
                      aria-label="Choose comparison runner"
                      value={reference.id}
                      onChange={(e) => props.onReference(e.target.value)}
                    >
                      {allReferences.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
              <div className="rf-matchups-layout">
                <Matchup {...props} />
                <DistanceField {...props} />
              </div>
            </>
          )}
          {view === "moves" && (
            <>
              <section className="rf-moves-summary">
                <span className="rf-kicker">THREE IMPORTS. COUNTED ONCE.</span>
                <strong>
                  19.2<small>km, together</small>
                </strong>
                <p>
                  Three ordinary outings made this week.
                  <br />
                  Open a ring to see its part in the story.
                </p>
              </section>
              <div className="rf-moves-grid">
                {imports.map((a) => (
                  <ActivityRing
                    key={a.id}
                    activity={a}
                    onOpen={() => activity(a)}
                  />
                ))}
              </div>
              <p className="rf-ring-caption">
                A shared 10 km distance scale. The filled arc shows mileage;
                “Counted” records the completed import.
              </p>
              <section className="rf-moves-note">
                <Mascot concept="rally" />
                <div>
                  <p className="rf-kicker">ACE’S CALL</p>
                  <h2>Good work looks like getting out.</h2>
                  <p>
                    Long, short, steady, easy. These are your moves to keep.
                  </p>
                </div>
              </section>
            </>
          )}
          {view === "you" && (
            <>
              <div className="rf-you-layout">
                <section className="rf-athlete-card">
                  <span className="rf-kicker">YOUR ATHLETE CARD / WEEK 42</span>
                  <Mascot concept="rally" decorative={false} />
                  <div>
                    <strong>YOU</strong>
                    <span>YOUR OWN KIND OF ATHLETE.</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Distance</dt>
                      <dd>
                        19.2<small>km</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Outings</dt>
                      <dd>3</dd>
                    </div>
                    <div>
                      <dt>Time moving</dt>
                      <dd>
                        109<small>min</small>
                      </dd>
                    </div>
                  </dl>
                </section>
                <div className="rf-you-side">
                  <section className="rf-week-record">
                    <p className="rf-kicker">SAME POINT. TWO WEEKS.</p>
                    <h2>
                      A little more
                      <br />
                      of your own work.
                    </h2>
                    <div>
                      <span>
                        This week<small>Oct 12–19 · Thursday snapshot</small>
                      </span>
                      <strong>
                        19.2<small>km</small>
                      </strong>
                    </div>
                    <div>
                      <span>
                        Previous week<small>Oct 5–12 · Thursday snapshot</small>
                      </span>
                      <strong>
                        16.0<small>km</small>
                      </strong>
                    </div>
                    <button
                      onClick={() => {
                        setReferenceId("ghost");
                        navigate("week");
                      }}
                    >
                      Replay the comparison ↗
                    </button>
                  </section>
                  <section className="rf-tracker-card">
                    <span className="rf-kicker">TRACKER IMPORTS</span>
                    <b className="rf-demo-badge">Sample data</b>
                    <h2>Your moves find their way here.</h2>
                    <p>
                      Three illustrative running imports. The prototype isn’t
                      connected to a tracker.
                    </p>
                    <button onClick={() => navigate("moves")}>
                      View counted moves ↗
                    </button>
                  </section>
                </div>
              </div>
            </>
          )}
        </main>
        <footer className="rf-product-footer">
          <span>GOOD COMPANY. GOOD GAME.</span>
          <p>
            Move at your own pace.
            <br />
            Ace is in your corner.
          </p>
        </footer>
      </div>
      <footer className="rf-lab-footer">
        <span>Rally structure · Loop rings · Optional Flip accents</span>
        <Link href="/design/evolution">Earlier explorations ↗</Link>
      </footer>
      <dialog
        ref={dialog}
        className={`rf-dialog rf-dialog-${detail?.kind ?? "info"}`}
        aria-labelledby="rf-detail-title"
        onClose={() => setDetail(null)}
        onCancel={() => setDetail(null)}
      >
        <header>
          <h2 id="rf-detail-title">{detail?.title}</h2>
          <button aria-label="Close detail" onClick={() => setDetail(null)}>
            ×
          </button>
        </header>
        <div>{detail?.body}</div>
        <button className="rf-dialog-done" onClick={() => setDetail(null)}>
          Back to Rally
        </button>
      </dialog>
    </div>
  );
}

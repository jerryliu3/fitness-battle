"use client";

import { useState } from "react";
import { Bo, CohortPlot, RaceTrack, WeekTrail } from "./charts";
import {
  activities,
  athletes,
  checkpointLabels,
  previousWeek,
  type Athlete,
  type Checkpoint,
  type Comparison,
  type ViewId,
} from "./data";

export interface ExperienceProps {
  view: ViewId;
  onActivity: (id: string) => void;
  onPerson: (person: Athlete) => void;
  onSource: () => void;
  onNavigate: (view: ViewId) => void;
  onDetail: (title: string, copy: string) => void;
}

export function FieldList({
  onPerson,
  compact = false,
}: {
  onPerson: ExperienceProps["onPerson"];
  compact?: boolean;
}) {
  const rows = compact ? athletes.slice(2, 5) : athletes;
  return (
    <ol className="field-list">
      {rows.map((p) => (
        <li key={p.id}>
          <button
            className={p.you ? "person-row your-row" : "person-row"}
            onClick={() => onPerson(p)}
          >
            <span className="place">{athletes.indexOf(p) + 1}</span>
            <span className="person-avatar">{p.initials}</span>
            <span className="person-name">
              {p.name}
              <small>{p.activities} counted activities</small>
            </span>
            <span className="person-points">
              {p.points}
              <small>pts</small>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function ActivityEntries({
  onActivity,
  journal = false,
}: {
  onActivity: ExperienceProps["onActivity"];
  journal?: boolean;
}) {
  return (
    <div className={`activity-entries ${journal ? "journal-entries" : ""}`}>
      {activities.map((a, i) => (
        <button
          className="activity-entry"
          key={a.id}
          onClick={() => onActivity(a.id)}
        >
          <span className="entry-date">
            {journal ? a.date : `0${3 - i}`}
            <small>{a.day}</small>
          </span>
          <span className="entry-text">
            <strong>{a.title}</strong>
            <span>
              {a.km} km · {a.minutes} min · Counted
            </span>
            {journal && <em>{a.note}</em>}
          </span>
          <span className="entry-points">
            +{a.points}
            <small>pts</small>
          </span>
        </button>
      ))}
    </div>
  );
}

export function SplitExperience(props: ExperienceProps) {
  const { view, onPerson, onActivity, onNavigate, onSource, onDetail } = props;
  const [comparison, setComparison] = useState<Comparison>(
    view === "compare" ? "field" : "self",
  );
  const [checkpoint, setCheckpoint] = useState<Checkpoint>(2);
  const [fullField, setFullField] = useState(false);
  if (view === "activity")
    return (
      <>
        <div className="split-title">
          <p className="kicker">The work behind the line</p>
          <h1>YOUR SPLITS.</h1>
        </div>
        <div className="split-log">
          <ActivityEntries onActivity={onActivity} />
          <div className="split-log-total">
            <span>Three sessions. Counted.</span>
            <strong>
              96 <small>effort pts</small>
            </strong>
          </div>
        </div>
        <Benchmark onDetail={onDetail} />
        <button className="product-link" onClick={onSource}>
          Strava demo · See source receipt ↗
        </button>
      </>
    );
  if (view === "profile")
    return (
      <>
        <div className="athlete-bib">
          <span>ATHLETE / 004</span>
          <h1>
            JERRY
            <br />
            LIU<span>↗</span>
          </h1>
          <div>RUNNING / NEW YORK</div>
        </div>
        <div className="split-records">
          <div>
            <small>This week</small>
            <strong>
              19.2 <em>km</em>
            </strong>
          </div>
          <div>
            <small>Time moving</small>
            <strong>
              109 <em>min</em>
            </strong>
          </div>
          <div>
            <small>Field position</small>
            <strong>
              04 <em>/ 12</em>
            </strong>
          </div>
        </div>
        <button
          className="product-cta"
          onClick={() =>
            onDetail(
              "Your previous-week ghost",
              "80 effort points at the same Thursday cutoff. Your current week has 96 points. This compares sample activity totals, not fitness or ability.",
            )
          }
        >
          Inspect your previous week ↗
        </button>
        <button className="product-link" onClick={onSource}>
          Source and preferences ↗
        </button>
      </>
    );
  return (
    <>
      <div className="split-title">
        <p className="kicker">Oct 12–19 / Weekly running</p>
        <h1>
          {view === "compare" ? (
            <>
              FIND YOUR
              <br />
              CLOSE CONTEST.
            </>
          ) : (
            <>
              CHASE YOUR
              <br />
              <span>OWN LINE.</span>
            </>
          )}
        </h1>
      </div>
      <div className="split-layout">
        <div className="track-board">
          <div className="mode-switch" aria-label="Comparison mode">
            <button
              aria-pressed={comparison === "self"}
              onClick={() => {
                setComparison("self");
                setFullField(false);
              }}
            >
              Your previous week
            </button>
            <button
              aria-pressed={comparison === "field"}
              onClick={() => setComparison("field")}
            >
              Nearby rivals
            </button>
          </div>
          <RaceTrack
            comparison={comparison}
            checkpoint={checkpoint}
            onSelect={(p) =>
              checkpoint === 2
                ? onPerson(p)
                : onDetail(
                    `${p.you ? "Your" : p.name} ${checkpointLabels[checkpoint]} checkpoint`,
                    `${p.checkpoints[checkpoint]} sample effort points accumulated by this cutoff. The Thursday total is ${p.points}. These are accumulated score checkpoints, not a live race or a prescribed workout target.`,
                  )
            }
          />
          <div className="checkpoint-control">
            <label htmlFor="split-checkpoint">
              Rewind the week <strong>{checkpointLabels[checkpoint]}</strong>
            </label>
            <input
              id="split-checkpoint"
              aria-label="Activity checkpoint"
              type="range"
              min="0"
              max="2"
              step="1"
              value={checkpoint}
              onChange={(e) =>
                setCheckpoint(Number(e.target.value) as Checkpoint)
              }
            />
            <div>
              <span>Mon</span>
              <span>Tue</span>
              <span>Thu</span>
            </div>
          </div>
        </div>
        <aside className="split-verdict" aria-live="polite">
          <p className="kicker">
            {comparison === "self" ? "Against yourself" : "Against the field"}
          </p>
          <strong>
            {comparison === "self"
              ? `+${athletes[3]!.checkpoints[checkpoint] - previousWeek[checkpoint]}`
              : `0${[...athletes].sort((a, b) => b.checkpoints[checkpoint] - a.checkpoints[checkpoint]).findIndex((a) => a.you) + 1}`}
          </strong>
          <h2>
            {comparison === "self"
              ? "points ahead of your own week."
              : "your place at this cutoff."}
          </h2>
          <p>
            {comparison === "self"
              ? "Same point in the week. A little more movement in the books."
              : "Your field stays together until the week closes."}
          </p>
          <button
            className="product-cta"
            onClick={() => onNavigate("activity")}
          >
            See what counted ↗
          </button>
          <button
            className="product-link"
            onClick={() => {
              setComparison("field");
              setFullField((v) => !v);
            }}
          >
            {" "}
            {fullField ? "Hide full field" : "Open full field"} ↗
          </button>
        </aside>
      </div>
      {fullField && (
        <section className="expanded-field">
          <h2>All 12 athletes · latest Thursday standings</h2>
          <FieldList onPerson={onPerson} />
        </section>
      )}
      <div className="split-bottom">
        <span>
          YOUR FIELD <strong>4TH / 12</strong>
        </span>
        <span>
          YOUR WEEK <strong>96 EFFORT PTS</strong>
        </span>
        <button onClick={onSource}>STRAVA DEMO ↗</button>
      </div>
    </>
  );
}

export function BounceExperience({
  view,
  onActivity,
  onPerson,
  onNavigate,
  onDetail,
  onSource,
}: ExperienceProps) {
  if (view === "compare")
    return (
      <>
        <div className="bounce-heading">
          <p className="kicker">This week's running league</p>
          <h1>
            A little friendly
            <br />
            competition.
          </h1>
        </div>
        <div className="bounce-rank">
          <Bo />
          <div>
            <span>You're in the mix!</span>
            <strong>
              4th <small>of 12</small>
            </strong>
            <p>96 effort points. Three good moves.</p>
          </div>
        </div>
        <FieldList onPerson={onPerson} />
        <p className="product-note">
          Weekly field · Mon–Mon, UTC · Same running rule
        </p>
      </>
    );
  if (view === "activity")
    return (
      <>
        <div className="bounce-heading">
          <p className="kicker">Already done. Automatically here.</p>
          <h1>Your good moves.</h1>
        </div>
        <div className="move-stickers">
          {activities.map((a) => (
            <button
              key={a.id}
              className="move-sticker"
              onClick={() => onActivity(a.id)}
            >
              <span className="sticker-check">✓</span>
              <div>
                <small>{a.day}</small>
                <h2>{a.title}</h2>
                <p>
                  {a.km} km · {a.minutes} min
                </p>
              </div>
              <strong>
                +{a.points}
                <small>pts</small>
              </strong>
            </button>
          ))}
        </div>
        <button className="product-link" onClick={onSource}>
          How did they get here? Strava demo ↗
        </button>
        <Benchmark onDetail={onDetail} />
      </>
    );
  if (view === "profile")
    return (
      <>
        <div className="bounce-heading">
          <p className="kicker">A collection, not a streak</p>
          <h1>
            Good weeks
            <br />
            are keepers.
          </h1>
        </div>
        <div className="keeps-grid">
          {[8, 7, 6].map((n, i) => (
            <button
              key={n}
              className={`week-keep keep-${i}`}
              onClick={() =>
                onDetail(
                  `Week ${n} · Sample archive`,
                  i === 0
                    ? "Your current sample week: 96 effort points from three counted activities. This week is still open."
                    : "A past week opens its final standings and source receipts. This card is a fictional history fixture, not an observed workout record.",
                )
              }
            >
              <span>WEEK 0{n}</span>
              {i === 0 ? (
                <Bo />
              ) : (
                <span className="keep-shape">{i === 1 ? "↗" : "✳"}</span>
              )}
              <strong>
                {i === 0
                  ? "Still bouncing."
                  : i === 1
                    ? "Back again."
                    : "Made a start."}
              </strong>
              <small>
                {i === 0 ? "Current week · 96 pts" : "Archived week preview"}
              </small>
            </button>
          ))}
        </div>
        <button className="product-link" onClick={onSource}>
          Your source and preferences ↗
        </button>
      </>
    );
  return (
    <>
      <div className="bounce-home">
        <div className="bounce-intro">
          <p className="kicker">Your week has a little bounce.</p>
          <h1>
            Look at
            <br />
            <span>you go.</span>
          </h1>
          <Bo />
          <div className="bounce-bubble">
            3 moves.
            <br />
            All yours.
          </div>
          <p>Keep your routine. We'll keep the week.</p>
        </div>
        <div className="bounce-journey">
          <div className="trail-header">
            <strong>
              96 <small>effort pts</small>
            </strong>
            <span>+16 vs your previous Thursday</span>
          </div>
          <WeekTrail onOpen={onActivity} />
          <p className="product-note">
            Completed imports · No workout tasks to tick off
          </p>
        </div>
      </div>
      <button
        className="bounce-league-link"
        onClick={() => onNavigate("compare")}
      >
        <span className="league-token">04</span>
        <span>
          <strong>Meet your weekly league</strong>
          <small>You're 4th of 12. See who's around you.</small>
        </span>
        <span>↗</span>
      </button>
    </>
  );
}

export function FolioExperience({
  view,
  onActivity,
  onPerson,
  onSource,
  onNavigate,
  onDetail,
}: ExperienceProps) {
  const [against, setAgainst] = useState<"past" | "maya">("past");
  if (view === "activity")
    return (
      <>
        <div className="folio-heading">
          <p className="kicker">The activity ledger / 03 entries</p>
          <h1>
            Notes from
            <br />
            <em>out there.</em>
          </h1>
        </div>
        <ActivityEntries onActivity={onActivity} journal />
        <Benchmark onDetail={onDetail} />
        <button className="product-link" onClick={onSource}>
          Every entry retains its source. Inspect yours ↗
        </button>
      </>
    );
  if (view === "compare")
    return (
      <>
        <div className="folio-heading">
          <p className="kicker">A useful point of reference</p>
          <h1>
            Side by
            <br />
            <em>side.</em>
          </h1>
        </div>
        <label className="folio-select">
          Compare your week with{" "}
          <select
            value={against}
            onChange={(e) => setAgainst(e.target.value as "past" | "maya")}
          >
            <option value="past">Your previous week</option>
            <option value="maya">Maya Chen</option>
          </select>
        </label>
        <table className="folio-comparison">
          <caption>At the same Thursday cutoff · Running</caption>
          <thead>
            <tr>
              <th scope="col">The record</th>
              <th scope="col">You</th>
              <th scope="col">
                {against === "past" ? "Previous week" : "Maya"}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Effort points</th>
              <td>96</td>
              <td>{against === "past" ? 80 : 101}</td>
            </tr>
            <tr>
              <th scope="row">Counted activities</th>
              <td>3</td>
              <td>3</td>
            </tr>
            <tr>
              <th scope="row">Current field place</th>
              <td>4th</td>
              <td>{against === "past" ? "—" : "3rd"}</td>
            </tr>
          </tbody>
        </table>
        <p className="folio-observation">
          {against === "past" ? (
            <>
              Sixteen more points.
              <br />
              <em>The same three sessions.</em>
            </>
          ) : (
            <>
              Five points between you.
              <br />
              <em>A close contest, this week.</em>
            </>
          )}
        </p>
        <details className="folio-field">
          <summary>Read the complete field · 12 athletes</summary>
          <FieldList onPerson={onPerson} />
        </details>
      </>
    );
  if (view === "profile")
    return (
      <>
        <div className="folio-heading">
          <p className="kicker">Jerry Liu / The collected weeks</p>
          <h1>
            A record
            <br />
            <em>of returning.</em>
          </h1>
        </div>
        <div className="folio-archive">
          {[8, 7, 6, 5].map((n, i) => (
            <button
              key={n}
              onClick={() =>
                onDetail(
                  `Edition 0${n}`,
                  i === 0
                    ? "Current week: three running activities, 19.2 km, 109 minutes, and 96 sample effort points. Provisional 4th of 12."
                    : "This archive preview would open a period's final result and dated activity ledger. It is a fictional presentation fixture.",
                )
              }
            >
              <span>0{n}</span>
              <div>
                <p>
                  {i === 0
                    ? "An ordinary week. Worth keeping."
                    : i === 1
                      ? "The week before this one."
                      : i === 2
                        ? "A week with room to breathe."
                        : "The first page."}
                </p>
                <small>
                  {i === 0
                    ? "Oct 12–19 · In progress"
                    : "Past edition · Sample archive"}
                </small>
              </div>
              <span>↗</span>
            </button>
          ))}
        </div>
        <button className="product-link" onClick={onSource}>
          Sources, identity, and preferences ↗
        </button>
      </>
    );
  return (
    <>
      <div className="folio-edition-line">
        <span>THE PERSONAL EDITION</span>
        <span>NO. 08 / OCTOBER 2026</span>
      </div>
      <div className="folio-cover">
        <p className="kicker">Jerry, lately.</p>
        <h1>
          An ordinary week.
          <br />
          <em>Worth keeping.</em>
        </h1>
        <p className="folio-lede">
          Three times you got out there. Nineteen kilometers you made your own.
          A little more movement than this time last week.
        </p>
      </div>
      <div className="folio-record">
        <div>
          <small>THE EFFORT</small>
          <strong>96</strong>
          <span>weekly points</span>
        </div>
        <div>
          <small>THE CONTEXT</small>
          <strong>
            04<span>/12</span>
          </strong>
          <span>in the running field</span>
        </div>
        <div>
          <small>THE DIFFERENCE</small>
          <strong>+16</strong>
          <span>vs your previous Thursday</span>
        </div>
      </div>
      <div className="folio-bottom">
        <section>
          <h2>From this week's ledger</h2>
          {activities.slice(0, 2).map((a) => (
            <button
              className="folio-ledger-line"
              key={a.id}
              onClick={() => onActivity(a.id)}
            >
              <span>{a.date}</span>
              <strong>{a.title}</strong>
              <span>{a.km} km ↗</span>
            </button>
          ))}
        </section>
        <aside>
          <p>
            There's a record behind
            <br />
            <em>every number.</em>
          </p>
          <button
            className="product-link"
            onClick={() => onNavigate("compare")}
          >
            Compare this edition ↗
          </button>
        </aside>
      </div>
    </>
  );
}

export function VectorExperience({
  view,
  onActivity,
  onPerson,
  onSource,
  onDetail,
}: ExperienceProps) {
  const [selected, setSelected] = useState("you");
  const [nearby, setNearby] = useState(false);
  const [list, setList] = useState(false);
  const person = athletes.find((p) => p.id === selected)!;
  if (view === "activity")
    return (
      <>
        <div className="vector-heading">
          <p className="kicker">Source evidence / Activity</p>
          <h1>Trace the input.</h1>
          <p>Three counted activities → 96 effort points.</p>
        </div>
        <ActivityEntries onActivity={onActivity} />
        <div className="vector-source">
          <span className="signal-dot" />
          <span>STRAVA / DEMO FIXTURES</span>
          <button onClick={onSource}>Inspect source ↗</button>
        </div>
        <Benchmark onDetail={onDetail} />
      </>
    );
  if (view === "profile")
    return (
      <>
        <div className="vector-heading">
          <p className="kicker">Your history / Same-day cutoffs</p>
          <h1>See the trajectory.</h1>
        </div>
        <div
          className="history-bars"
          aria-label="Sample effort points at Thursday cutoff across six weeks: 78, 88, 72, 94, 80, 96."
        >
          {[78, 88, 72, 94, 80, 96].map((n, i) => (
            <button
              key={i}
              onClick={() =>
                onDetail(
                  `Week 0${i + 3} · Thursday cutoff`,
                  `${n} sample effort points at the same point in the weekly period. This is a presentation fixture, not an imported activity record.`,
                )
              }
            >
              <span className="history-value">{n}</span>
              <span className="history-bar" style={{ height: `${n * 2}px` }} />
              <span className="history-week">W0{i + 3}</span>
            </button>
          ))}
        </div>
        <p className="product-note">
          Weekly effort points, not a measure of fitness or ability.
        </p>
        <button className="product-cta" onClick={onSource}>
          Activity source / Demo ↗
        </button>
      </>
    );
  return (
    <>
      <div className="vector-heading">
        <p className="kicker">Weekly running / 12 athletes</p>
        <h1>
          {view === "compare"
            ? "Explore your field."
            : "This is your position."}
        </h1>
        <div className="vector-readout">
          <span>
            <strong>96</strong> EFFORT PTS
          </span>
          <span>
            <strong>04</strong> / 12 IN FIELD
          </span>
          <span>
            <strong>+16</strong> VS PAST THU
          </span>
        </div>
      </div>
      <div className="vector-workspace">
        <section className="vector-canvas">
          <div className="vector-tools">
            <span>FIELD / 08</span>
            <div>
              <button
                aria-pressed={nearby}
                onClick={() => setNearby((v) => !v)}
              >
                {nearby ? "All athletes" : "Nearby only"}
              </button>
              <button aria-pressed={list} onClick={() => setList((v) => !v)}>
                {list ? "Show plot" : "Show list"}
              </button>
            </div>
          </div>
          {list ? (
            <FieldList onPerson={onPerson} />
          ) : (
            <CohortPlot
              selected={selected}
              nearby={nearby}
              onSelect={(p) => setSelected(p.id)}
            />
          )}
          <p className="plot-reading">
            X = weekly effort points. Y = counted activities. Height is not
            rank.
          </p>
        </section>
        <aside className="selected-athlete" aria-live="polite">
          <p className="kicker">Selected signal</p>
          <div className="vector-monogram">{person.initials}</div>
          <h2>{person.name}</h2>
          <dl>
            <div>
              <dt>Effort points</dt>
              <dd>{person.points}</dd>
            </div>
            <div>
              <dt>Activities</dt>
              <dd>{person.activities}</dd>
            </div>
            <div>
              <dt>Place</dt>
              <dd>{athletes.indexOf(person) + 1} / 12</dd>
            </div>
          </dl>
          <p>
            {person.you
              ? "Your week sits among people with a similar total."
              : `${Math.abs(person.points - 96)} points ${person.points > 96 ? "ahead of" : "behind"} your week.`}
          </p>
          <button className="product-cta" onClick={() => onPerson(person)}>
            Inspect evidence ↗
          </button>
        </aside>
      </div>
    </>
  );
}

export function AfterExperience({
  view,
  onActivity,
  onPerson,
  onDetail,
  onSource,
}: ExperienceProps) {
  const [moment, setMoment] = useState(0);
  const [against, setAgainst] = useState<"self" | "maya">("self");
  if (view === "activity")
    return (
      <>
        <div className="after-heading">
          <p className="kicker">Moments that made the week</p>
          <h1>
            You were
            <br />
            <em>out there.</em>
          </h1>
        </div>
        <div className="after-moments">
          {activities.map((a, i) => (
            <button
              key={a.id}
              className={`after-moment moment-${i}`}
              onClick={() => onActivity(a.id)}
            >
              <small>{a.day} / Counted</small>
              <h2>{a.title}</h2>
              <p>{a.note}</p>
              <div>
                {a.km} km <span>+{a.points} pts ↗</span>
              </div>
            </button>
          ))}
        </div>
        <button className="product-link" onClick={onSource}>
          Your activity arrives from Strava · Demo ↗
        </button>
      </>
    );
  if (view === "compare")
    return (
      <>
        <div className="after-heading">
          <p className="kicker">A little perspective</p>
          <h1>
            Your effort.
            <br />
            <em>In context.</em>
          </h1>
        </div>
        <div className="after-compare-switch">
          <button
            aria-pressed={against === "self"}
            onClick={() => setAgainst("self")}
          >
            Past you
          </button>
          <button
            aria-pressed={against === "maya"}
            onClick={() => setAgainst("maya")}
          >
            Nearby rival
          </button>
        </div>
        <div className="after-versus">
          <div>
            <span>Your week</span>
            <strong>96</strong>
            <small>effort points</small>
          </div>
          <span className="versus-mark">/</span>
          <div>
            <span>{against === "self" ? "Past Thursday" : "Maya Chen"}</span>
            <strong>{against === "self" ? 80 : 101}</strong>
            <small>effort points</small>
          </div>
        </div>
        <p className="after-comparison-line">
          {against === "self"
            ? "A little more than your last week."
            : "A close contest with Maya."}
        </p>
        <button
          className="product-cta"
          onClick={() =>
            onPerson(against === "self" ? athletes[3]! : athletes[2]!)
          }
        >
          See the evidence behind it ↗
        </button>
        <details className="after-field">
          <summary>Your whole field · 4th of 12</summary>
          <FieldList onPerson={onPerson} />
        </details>
      </>
    );
  if (view === "profile")
    return (
      <>
        <div className="after-heading">
          <p className="kicker">Jerry's collected weeks</p>
          <h1>
            The feeling
            <br />
            <em>stays with you.</em>
          </h1>
        </div>
        <div className="after-history">
          {[8, 7].map((n, i) => (
            <button
              key={n}
              className={`after-history-card history-${i}`}
              onClick={() =>
                onDetail(
                  `Week 0${n}`,
                  i === 0
                    ? "Your sample week is still unfolding: 96 effort points, three activities, 4th of 12."
                    : "A past-week highlight opens its final standings and counted receipts. This is a fictional archive fixture.",
                )
              }
            >
              <small>
                Week 0{n} / {i === 0 ? "In progress" : "Archive preview"}
              </small>
              <h2>
                {i === 0 ? (
                  <>
                    Got out.
                    <br />
                    Felt good.
                  </>
                ) : (
                  <>
                    Another week.
                    <br />
                    Another beginning.
                  </>
                )}
              </h2>
              <span>Open the week ↗</span>
            </button>
          ))}
        </div>
        <button className="product-link" onClick={onSource}>
          Your source and preferences ↗
        </button>
      </>
    );
  const titles = [
    <>
      You did something
      <br />
      <em>for yourself.</em>
    </>,
    <>
      A little more.
      <br />
      <em>All yours.</em>
    </>,
    <>
      You're in
      <br />
      <em>good company.</em>
    </>,
  ];
  return (
    <>
      <section
        className={`after-scene scene-${moment}`}
        aria-label="Your finite weekly highlight reel"
      >
        <div className="after-story-index">
          <span>YOUR WEEK / OCT 12–19</span>
          <span>0{moment + 1} / 03</span>
        </div>
        <div className="after-scene-copy" aria-live="polite">
          <p className="kicker">
            {["The move", "The difference", "The field"][moment]}
          </p>
          <h1>{titles[moment]}</h1>
          <div className="after-story-stat">
            <strong>{["6.2", "+16", "4th"][moment]}</strong>
            <span>
              {
                [
                  "kilometers, counted",
                  "effort pts vs past Thursday",
                  "of 12 in your running field",
                ][moment]
              }
            </span>
          </div>
          <button
            className="after-receipt-link"
            onClick={() =>
              moment === 0 ? onActivity("morning") : onPerson(athletes[3]!)
            }
          >
            Open this moment's receipt ↗
          </button>
        </div>
        <div className="story-controls">
          <button
            aria-label="Previous highlight"
            onClick={() => setMoment((v) => (v + 2) % 3)}
          >
            ←
          </button>
          <div>
            {["Your move", "Your week", "Your field"].map((label, i) => (
              <button
                key={label}
                aria-pressed={moment === i}
                onClick={() => setMoment(i)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            aria-label="Next highlight"
            onClick={() => setMoment((v) => (v + 1) % 3)}
          >
            →
          </button>
        </div>
      </section>
      <div className="after-summary-line">
        <span>96 effort pts</span>
        <span>3 activities</span>
        <span>4th / 12</span>
        <button onClick={onSource}>Strava demo ↗</button>
      </div>
    </>
  );
}

export function Benchmark({
  onDetail,
}: {
  onDetail: ExperienceProps["onDetail"];
}) {
  return (
    <button
      className="benchmark-link"
      onClick={() =>
        onDetail(
          "5 km training benchmark · Estimated",
          "27:25, scaled from the 6.2 km / 34 min sample activity. It is an estimated training benchmark, not a race result or personal best. It does not change weekly effort or effort score. Published race rankings remain a separate destination.",
        )
      }
    >
      <span>
        5 km training benchmark <small>Estimated · Separate from effort</small>
      </span>
      <strong>27:25 ↗</strong>
    </button>
  );
}

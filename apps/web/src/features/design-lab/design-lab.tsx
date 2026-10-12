"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  activities,
  athletes,
  conceptIds,
  directions,
  isConcept,
  isView,
  type Athlete,
  type ConceptId,
  type ViewId,
} from "./data";
import {
  AfterExperience,
  BounceExperience,
  FieldList,
  FolioExperience,
  SplitExperience,
  VectorExperience,
  type ExperienceProps,
} from "./experiences";
import "./design-lab.css";

interface Detail {
  title: string;
  body: ReactNode;
}
const individualViews: ViewId[] = ["home", "compare", "activity", "profile"];
const experienceComponents = {
  split: SplitExperience,
  bounce: BounceExperience,
  folio: FolioExperience,
  vector: VectorExperience,
  after: AfterExperience,
};

function SourcePreview({ close }: { close: () => void }) {
  const [step, setStep] = useState(0);
  return (
    <div className="source-preview">
      <p className="kicker">Demo walkthrough · {step + 1} / 3</p>
      <h3>
        {
          [
            "One source. Your usual routine.",
            "Your activity, arriving.",
            "Your sample week is ready.",
          ][step]
        }
      </h3>
      <p>
        {
          [
            "Review activity access before authorizing a provider. Imported activity and what other athletes can see are separate choices.",
            "Three running activities appear with their source, timestamps, and counted status. No manual workout logging is needed.",
            "96 sample effort points from three activities. This walkthrough has not authorized Strava or transferred any data.",
          ][step]
        }
      </p>
      {step === 1 && (
        <div className="source-import-list">
          {activities.map((a) => (
            <div key={a.id}>
              <span>{a.title}</span>
              <strong>Counted · +{a.points} pts</strong>
            </div>
          ))}
        </div>
      )}
      <button
        className="product-cta"
        onClick={() => (step < 2 ? setStep((v) => v + 1) : close())}
      >
        {
          [
            "Preview an import →",
            "View the sample result →",
            "Back to my week →",
          ][step]
        }
      </button>
      <p className="product-note">
        Strava demo. No OAuth or sync request is made.
      </p>
    </div>
  );
}

function Groups({
  concept,
  joined,
  onJoin,
  onOpen,
}: {
  concept: ConceptId;
  joined: boolean;
  onJoin: () => void;
  onOpen: () => void;
}) {
  return (
    <section className="optional-groups">
      <p className="kicker">Optional company, when you want it</p>
      <h1>
        {concept === "folio" ? (
          <>
            A circle of
            <br />
            <em>your own.</em>
          </>
        ) : concept === "after" ? (
          <>
            Some things feel
            <br />
            <em>better together.</em>
          </>
        ) : (
          <>
            Your week.
            <br />
            Some good company.
          </>
        )}
      </h1>
      <p className="groups-intro">
        Your individual field stays yours. A private group gives you another
        place to compare with people you know.
      </p>
      <div className="group-shelf">
        <article className="group-object">
          <div className="crew-monogram">SM</div>
          <div>
            <p className="kicker">Private / Running / Weekly</p>
            <h2>Sunday Miles</h2>
            <p>
              12 sample members. Effort points.
              <br />
              Mon–Mon, UTC.
            </p>
            <button className="product-cta" onClick={joined ? onOpen : onJoin}>
              {joined
                ? "Open your sample crew ↗"
                : "Inspect and join preview ↗"}
            </button>
          </div>
        </article>
        <article className="group-object quiet-group">
          <div className="crew-monogram">AW</div>
          <div>
            <p className="kicker">A second group idea</p>
            <h2>After Work</h2>
            <p>A smaller circle for your regular routine.</p>
            <button className="product-link" onClick={onJoin}>
              See a membership preview ↗
            </button>
          </div>
        </article>
      </div>
      <p className="product-note">
        Group membership is local to this prototype; no invitations are sent.
      </p>
    </section>
  );
}

function Evaluation({ concept }: { concept: ConceptId }) {
  return (
    <section className="lab-evaluation" aria-label="Design evaluation">
      <div className="evaluation-intro">
        <p>DESIGN HYPOTHESES / NOT USER-TEST RESULTS</p>
        <h2>
          Five different ways to answer
          <br />
          “How am I doing?”
        </h2>
        <span>
          Individual performance and comparison lead. Groups remain an optional
          layer. These alternatives change the primary object, interaction,
          navigation, data presentation, and brand grammar.
        </span>
      </div>
      <div className="evaluation-grid">
        {conceptIds.map((id) => (
          <article
            key={id}
            className={`evaluation-card evaluation-${id} ${id === concept ? "evaluating-current" : ""}`}
          >
            <div className="evaluation-card-top">
              <span>{directions[id].name}</span>
              <small>{directions[id].descriptor}</small>
            </div>
            <h3>{directions[id].question}</h3>
            <dl>
              <div>
                <dt>Interaction to try</dt>
                <dd>{directions[id].mechanism}</dd>
              </div>
              <div>
                <dt>What it should win at</dt>
                <dd>{directions[id].strength}</dd>
              </div>
              <div>
                <dt>Where it could fail</dt>
                <dd>{directions[id].risk}</dd>
              </div>
              <div>
                <dt>What to test</dt>
                <dd>{directions[id].test}</dd>
              </div>
            </dl>
            <Link href={`/design?concept=${id}`}>
              Open {directions[id].name} ↗
            </Link>
          </article>
        ))}
      </div>
      <div className="evaluation-close">
        <strong>
          Leading bets: Split for comparison clarity; Bounce for brand
          recognition.
        </strong>
        <p>
          These are reasoned design judgments. Test the same tasks in each
          before selecting a direction. Folio tests a calmer audience; Vector
          tests data literacy; After tests whether emotional storytelling can
          stay practical.
        </p>
      </div>
    </section>
  );
}

export function DesignLab() {
  const [concept, setConcept] = useState<ConceptId>("split");
  const [view, setView] = useState<ViewId>("home");
  const [evaluation, setEvaluation] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [joined, setJoined] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const direction = directions[concept];

  useEffect(() => {
    function readLocation() {
      const params = new URLSearchParams(window.location.search);
      const c = params.get("concept"),
        v = params.get("view");
      setConcept(isConcept(c) ? c : "split");
      setView(isView(v) ? v : "home");
    }
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (detail && !element.open) element.showModal();
    if (!detail && element.open) element.close();
  }, [detail]);
  function navigate(c: ConceptId, v: ViewId) {
    setConcept(c);
    setView(v);
    setDetail(null);
    setEvaluation(false);
    window.history.replaceState(null, "", `/design?concept=${c}&view=${v}`);
  }
  function openActivity(id: string) {
    const a = activities.find((item) => item.id === id);
    if (!a) return;
    setDetail({
      title: a.title,
      body: (
        <>
          <p className="kicker">Counted / Strava demo / {a.date}, 2026</p>
          <div className="receipt-values">
            <strong>
              {a.km}
              <small>km</small>
            </strong>
            <strong>
              {a.minutes}
              <small>minutes</small>
            </strong>
            <strong>
              +{a.points}
              <small>effort pts</small>
            </strong>
          </div>
          <p>{a.note}</p>
          <div className="receipt-evidence">
            <h3>Why it counted</h3>
            <p>
              Running activity in the sample Oct 12–19 weekly period. It
              contributes {a.points} fixture points; the Thursday total is 96.
            </p>
            <p>
              Source: Strava demo. These are presentation fixtures, not imported
              workouts or a proposed scoring formula.
            </p>
          </div>
          <button
            className="product-cta"
            onClick={() => navigate(concept, "activity")}
          >
            Open all activity ↗
          </button>
        </>
      ),
    });
  }
  function openPerson(p: Athlete) {
    setDetail({
      title: p.you ? "Your week, in context" : p.name,
      body: (
        <>
          <p className="kicker">Weekly running field / Thursday cutoff</p>
          <div className="receipt-values">
            <strong>
              {p.points}
              <small>effort pts</small>
            </strong>
            <strong>
              {athletes.indexOf(p) + 1}
              <small>place of 12</small>
            </strong>
            <strong>
              {p.activities}
              <small>activities</small>
            </strong>
          </div>
          <p>
            {p.you
              ? "96 points versus 80 at the same cutoff last week. That is a comparison of activity totals, not fitness or ability."
              : `${Math.abs(p.points - 96)} points ${p.points > 96 ? "ahead of" : "behind"} your current total. Both use the same sample weekly rule.`}
          </p>
          <p className="product-note">
            Weekly bounds: Monday 00:00 to next Monday 00:00 UTC. Current
            standings are provisional. Activity detail visibility follows the
            group's rules.
          </p>
          {p.you ? (
            <button
              className="product-cta"
              onClick={() => navigate(concept, "activity")}
            >
              Inspect your counted activity ↗
            </button>
          ) : (
            <button className="product-cta" onClick={() => setDetail(null)}>
              Back to the comparison ↗
            </button>
          )}
        </>
      ),
    });
  }
  const onSource = () =>
    setDetail({
      title: `${direction.name} / Your activity source`,
      body: <SourcePreview close={() => setDetail(null)} />,
    });
  const onJoin = () =>
    setDetail({
      title: "Sunday Miles / Membership preview",
      body: (
        <>
          <p className="kicker">Private · Running · Weekly effort points</p>
          <p>
            One additional group for familiar people. Your main individual field
            and personal history stay in place.
          </p>
          <p>
            Period: Mon–Mon, UTC. Group members see standings and permitted
            activity details. Provider permissions are reviewed separately.
          </p>
          <button
            className="product-cta"
            onClick={() => {
              setJoined(true);
              setDetail(null);
            }}
          >
            Join the sample crew ↗
          </button>
          <p className="product-note">
            Local preview only. No real membership or invite is created.
          </p>
        </>
      ),
    });
  const onOpenGroup = () =>
    setDetail({
      title: "Sunday Miles / Sample crew",
      body: (
        <>
          <p className="kicker">Your optional group board · Sample data</p>
          <FieldList onPerson={openPerson} compact />
          <button
            className="product-link"
            onClick={() => {
              setJoined(false);
              setDetail(null);
            }}
          >
            Leave sample crew
          </button>
        </>
      ),
    });
  const props: ExperienceProps = {
    view,
    onActivity: openActivity,
    onPerson: openPerson,
    onSource,
    onNavigate: (v) => navigate(concept, v),
    onDetail: (title, copy) => setDetail({ title, body: <p>{copy}</p> }),
  };
  const Experience = experienceComponents[concept];
  return (
    <div className="design-lab">
      <a className="lab-skip" href="#experience-main">
        Skip to app experience
      </a>
      <header className="lab-toolbar">
        <div className="lab-title">
          <Link href="/" aria-label="Back to Fitness Battle">
            FB<span>↗</span>
          </Link>
          <div>
            <strong>Design lab</strong>
            <small>Five individual-first directions</small>
          </div>
        </div>
        <div className="concept-selector" aria-label="Design direction">
          {conceptIds.map((id, i) => (
            <button
              key={id}
              className={`concept-choice choice-${id}`}
              aria-pressed={concept === id}
              onClick={() => navigate(id, view)}
            >
              <span>0{i + 1}</span>
              {directions[id].name}
            </button>
          ))}
        </div>
        <button
          className="evaluation-toggle"
          aria-expanded={evaluation}
          onClick={() => setEvaluation((v) => !v)}
        >
          {evaluation ? "Back to prototype" : "Evaluate directions"}{" "}
          <span>↗</span>
        </button>
      </header>
      <div className="lab-context">
        <span>{direction.descriptor}</span>
        <span>70% individual / 30% optional groups · Design intent</span>
        <span>Sample snapshot · Thu, Oct 15, 2026</span>
      </div>
      {evaluation ? (
        <Evaluation concept={concept} />
      ) : (
        <section
          className={`experience ${concept}`}
          aria-label={`${direction.name} app prototype`}
        >
          <header className="product-header">
            <button
              className="brand-mark"
              onClick={() => navigate(concept, "home")}
              aria-label={`${direction.name} home`}
            >
              {concept === "split" ? (
                <>
                  SPLIT<span>//</span>
                </>
              ) : concept === "bounce" ? (
                <>
                  bounce<span>●</span>
                </>
              ) : concept === "folio" ? (
                <>
                  Folio<span>f.</span>
                </>
              ) : concept === "vector" ? (
                <>
                  VECTOR<span>+</span>
                </>
              ) : (
                <>
                  after<span>―</span>
                </>
              )}
            </button>
            <div className="product-header-actions">
              <button
                className={`group-entry ${view === "groups" ? "active-group" : ""}`}
                onClick={() => navigate(concept, "groups")}
              >
                {direction.nav.groups} ↗
              </button>
              <button className="source-status" onClick={onSource}>
                <span />
                Demo source
              </button>
            </div>
          </header>
          <nav
            className="product-nav"
            aria-label={`${direction.name} navigation`}
          >
            {individualViews.map((v, i) => (
              <button
                key={v}
                aria-current={view === v ? "page" : undefined}
                onClick={() => navigate(concept, v)}
              >
                <span className="nav-number">0{i + 1}</span>
                {direction.nav[v]}
              </button>
            ))}
          </nav>
          <main
            id="experience-main"
            className="product-main"
            key={`${concept}-${view}`}
          >
            {view === "groups" ? (
              <Groups
                concept={concept}
                joined={joined}
                onJoin={onJoin}
                onOpen={onOpenGroup}
              />
            ) : (
              <Experience {...props} />
            )}
          </main>
          <dialog
            ref={dialog}
            className="product-dialog"
            onCancel={() => setDetail(null)}
            onClose={() => setDetail(null)}
            aria-labelledby="detail-title"
          >
            {detail && (
              <>
                <div className="dialog-heading">
                  <h2 id="detail-title">{detail.title}</h2>
                  <button
                    className="dialog-close"
                    onClick={() => {
                      dialog.current?.close();
                      setDetail(null);
                    }}
                    aria-label="Close details"
                  >
                    ×
                  </button>
                </div>
                <div className="dialog-body">{detail.body}</div>
              </>
            )}
          </dialog>
        </section>
      )}
      <footer className="lab-footer">
        <details>
          <summary>Why {direction.name} is a different experience</summary>
          <p>{direction.difference}</p>
          <p>
            <strong>Try:</strong> {direction.mechanism}
          </p>
          <p>
            <strong>Watch for:</strong> {direction.risk}
          </p>
        </details>
        <span>Presentation prototype · Local sample actions</span>
        <Link href="/design/spatial">Explore five spatial leaderboards ↗</Link>
        <Link href="/rankings">Existing published race rankings ↗</Link>
      </footer>
    </div>
  );
}

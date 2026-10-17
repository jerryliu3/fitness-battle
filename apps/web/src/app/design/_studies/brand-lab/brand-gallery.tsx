"use client";

import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BRAND_CONCEPTS,
  EMBER_SKINS,
  APP_VIEWS,
  WEEK_FIXTURES,
  TERRITORY_ART,
  dailyDistances,
  getConcept,
  getSkin,
  parseSelection,
  wardrobeReducer,
  weekSummary,
  type AppView,
  type BrandConcept,
  type BrandView,
  type SkinId,
  type WeekId,
} from "./catalog";
import { SkinEmber } from "./skin-ember";
import "./product-study.css";
import "./campaign-study.css";
import "./brand-gallery.css";

const ord = (n: number) =>
  n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
const NAV_GLYPHS: Record<AppView, string> = {
  Home: "⌂",
  Compete: "⚑",
  Crew: "◎",
  Athlete: "○",
};
type Panel = { kind: "week" } | { kind: "athlete"; name: string } | null;

export function BrandGallery({
  initialSelection,
}: {
  initialSelection: ReturnType<typeof parseSelection>;
}) {
  const [selection, setSelection] = useState(initialSelection);
  const [appView, setAppView] = useState<AppView>("Compete");
  const [week, setWeek] = useState<WeekId>("current");
  const [comparison, setComparison] = useState<"nearest" | "self">("nearest");
  const [standardEmber, setStandardEmber] = useState(false);
  const [showEmber, setShowEmber] = useState(true);
  const [wardrobe, dispatch] = useReducer(wardrobeReducer, {
    preview: "classic",
    equipped: "classic",
  });
  const [notice, setNotice] = useState("");
  const concept = getConcept(selection.concept);
  function select(conceptId = concept.id, view: BrandView = selection.view) {
    const next = parseSelection(conceptId, view);
    setSelection(next);
    window.history.replaceState(
      null,
      "",
      `/design/brand?${new URLSearchParams(next)}`,
    );
  }
  useEffect(() => {
    const restore = () => {
      const q = new URLSearchParams(window.location.search);
      setSelection(
        parseSelection(
          q.get("concept") ?? undefined,
          q.get("view") ?? undefined,
        ),
      );
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  function equip() {
    if (!getSkin(wardrobe.preview).owned) return;
    dispatch({ type: "equip" });
    setStandardEmber(true);
    setNotice(
      `${getSkin(wardrobe.preview).name} equipped in this design preview.`,
    );
  }
  return (
    <main className="brand-gallery">
      <header className="brand-studio-top">
        <Link href="/design" className="brand-studio-wordmark">
          overtaek
        </Link>
        <span>BRAND & EMBER STUDIO</span>
        <Link href="/design/brand/motion">Compare Ember loading styles ↗</Link>
      </header>
      <section className="brand-studio-intro">
        <div>
          <p className="brand-kicker">
            A CONSISTENT WORLD. A STAR THAT’S YOURS.
          </p>
          <h1>
            Make room
            <br />
            for every Ember.
          </h1>
        </div>
        <p>
          Ten expressive territories, the original little star, and three calmer
          foundations. Compare the interface, then try a personal finish without
          changing the app around it.
        </p>
      </section>
      <ConceptPicker active={concept.id} onSelect={(id) => select(id)} />
      <section className="brand-review-toolbar" aria-label="Review controls">
        <div className="brand-review-tabs">
          {(["product", "campaign", "locker"] as const).map((view) => (
            <button
              key={view}
              aria-pressed={selection.view === view}
              onClick={() => select(concept.id, view)}
            >
              {view === "product"
                ? "App & components"
                : view === "campaign"
                  ? "Brand board"
                  : "Ember locker"}
            </button>
          ))}
        </div>
        <span className="brand-preview-badge">
          Interactive study · fictional data
        </span>
      </section>
      {concept.recommendation && (
        <p className="brand-recommendation">{concept.recommendation}</p>
      )}
      {selection.view === "product" && (
        <div className="brand-character-controls">
          <label>
            <input
              type="checkbox"
              checked={showEmber}
              onChange={(e) => setShowEmber(e.target.checked)}
            />{" "}
            Ember inside the app
          </label>
          {concept.family === "territory" && (
            <label>
              <input
                type="checkbox"
                checked={standardEmber}
                onChange={(e) => setStandardEmber(e.target.checked)}
              />{" "}
              Use standard Ember / equipped skin
            </label>
          )}
          <button onClick={() => select(concept.id, "locker")}>
            Personalize Ember ↗
          </button>
        </div>
      )}
      {selection.view === "product" && (
        <div className="brand-preview">
          <section
            className={`study ${concept.className}`}
            aria-label={`${concept.name} interface study`}
          >
            <header className="study-heading">
              <h2>{concept.name}</h2>
              <span>{concept.premise}</span>
            </header>
            <div className="study-grid">
              <div>
                <ConceptPhone
                  concept={concept}
                  appView={appView}
                  setAppView={setAppView}
                  week={week}
                  setWeek={setWeek}
                  comparison={comparison}
                  setComparison={setComparison}
                  skin={wardrobe.equipped}
                  standardEmber={standardEmber}
                  showEmber={showEmber}
                />
                <p className="preview-label">
                  Fictional running distance · no live account changes
                </p>
              </div>
              <aside className="companion">
                <section>
                  <h3>Ember / {concept.emberName}</h3>
                  <div className="ember-stage">
                    <Mascot
                      concept={concept}
                      skin={wardrobe.equipped}
                      standard={standardEmber}
                      className="ember-portrait"
                      label={`${concept.name}: ${concept.emberName}`}
                    />
                  </div>
                  <div className="ember-traits">
                    {concept.traits.map((trait) => (
                      <span key={trait}>{trait}</span>
                    ))}
                  </div>
                  <p className="placement">{concept.role}</p>
                </section>
                <ControlShelf
                  week={week}
                  setWeek={setWeek}
                  comparison={comparison}
                  setComparison={setComparison}
                  onCrew={() => setAppView("Crew")}
                  onWeek={() => setAppView("Compete")}
                />
                <section className="component-shelf">
                  <h3>Identity</h3>
                  <Palette colors={concept.colors} />
                  <p className="sample-note">{concept.fonts}</p>
                  <button
                    className="secondary"
                    onClick={() => select(concept.id, "campaign")}
                  >
                    View the brand board
                  </button>
                </section>
              </aside>
            </div>
          </section>
        </div>
      )}
      {selection.view === "campaign" && (
        <CampaignBoard concept={concept} skin={wardrobe.equipped} />
      )}
      {selection.view === "locker" && (
        <EmberLocker
          concept={concept}
          preview={wardrobe.preview}
          equipped={wardrobe.equipped}
          onPreview={(skin) => dispatch({ type: "preview", skin })}
          onEquip={equip}
          onCancel={() => dispatch({ type: "cancel" })}
          onReturn={() => select(concept.id, "product")}
        />
      )}
      <p className="brand-notice" role="status">
        {notice}
      </p>
      <section className="brand-research">
        <div>
          <p className="brand-kicker">THE SYSTEM BEHIND THE SKINS</p>
          <h2>
            Keep the world familiar.
            <br />
            Let the star express you.
          </h2>
          <p>
            The app keeps its type, action colors, chart semantics and your lane
            label. A finish changes Ember’s appearance; the same star, face
            geometry and movement make the family recognizable.
          </p>
        </div>
        <div className="brand-references">
          <a
            href="https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care"
            target="_blank"
            rel="noreferrer"
          >
            <b>Finch ↗</b>
            <span>
              One companion, personal outfits, a continuing emotional
              relationship.
            </span>
          </a>
          <a
            href="https://support.zwift.com/en_us/customizing-your-avatar-SJhtYrj3F"
            target="_blank"
            rel="noreferrer"
          >
            <b>Zwift ↗</b>
            <span>
              A dedicated Garage; the chosen look appears during the activity.
            </span>
          </a>
          <a
            href="https://blog.duolingo.com/shape-language-duolingos-art-style/"
            target="_blank"
            rel="noreferrer"
          >
            <b>Duolingo ↗</b>
            <span>
              Simple recognizable shapes and a consistent visual language.
            </span>
          </a>
        </div>
      </section>
      <footer className="brand-studio-footer">
        <span>
          Study only. Unlock requirements are proposals; finishes are cosmetic.
        </span>
        <Link href="/design">All design studies ↗</Link>
      </footer>
    </main>
  );
}

function ConceptPicker({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="brand-concept-picker" aria-label="Brand concept">
      {(["neutral", "baseline", "territory"] as const).map((family) => (
        <fieldset key={family}>
          <legend>
            {family === "neutral"
              ? "New · neutral foundations"
              : family === "baseline"
                ? "Current character"
                : "The original ten territories"}
          </legend>
          <div>
            {BRAND_CONCEPTS.filter((c) => c.family === family).map((c) => (
              <button
                key={c.id}
                aria-pressed={active === c.id}
                onClick={() => onSelect(c.id)}
              >
                <i style={{ background: c.colors[1] }} aria-hidden="true" />
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </nav>
  );
}
function Mascot({
  concept,
  skin,
  standard = false,
  className = "",
  label,
}: {
  concept: BrandConcept;
  skin: SkinId;
  standard?: boolean;
  className?: string;
  label?: string;
}) {
  const art = TERRITORY_ART[concept.id];
  return art && !standard ? (
    <img
      src={`/design/brand/ember-${art}.webp`}
      className={className}
      width={220}
      height={220}
      alt={label ?? ""}
    />
  ) : (
    <SkinEmber
      skin={concept.family === "baseline" ? "classic" : skin}
      className={className}
      label={label}
    />
  );
}
function Palette({ colors }: { colors: readonly string[] }) {
  return (
    <div className="brand-palette">
      {colors.map((color) => (
        <div key={color}>
          <i style={{ background: color }} aria-hidden="true" />
          <span>{color.toUpperCase()}</span>
        </div>
      ))}
    </div>
  );
}

interface PhoneProps {
  concept: BrandConcept;
  appView: AppView;
  setAppView: (view: AppView) => void;
  week: WeekId;
  setWeek: (week: WeekId) => void;
  comparison: "nearest" | "self";
  setComparison: (value: "nearest" | "self") => void;
  skin: SkinId;
  standardEmber: boolean;
  showEmber: boolean;
}
function ConceptPhone({
  concept,
  appView,
  setAppView,
  week,
  setWeek,
  comparison,
  setComparison,
  skin,
  standardEmber,
  showEmber,
}: PhoneProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const phoneRef = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  const f = WEEK_FIXTURES[week],
    summary = weekSummary(week);
  const open = (next: Panel) => {
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setPanel(next);
  };
  const nearest = f.rows[summary.rank - 2];
  return (
    <div
      className="phone"
      ref={phoneRef}
      aria-label={`${concept.name} concept phone`}
    >
      <div className="statusbar">
        <span>9:41</span>
        <span>Concept preview</span>
      </div>
      <header className="appbar">
        <span className="wordmark">OVERTAEK</span>
        <button
          className="icon-button"
          aria-label="Open week options"
          onClick={() => open({ kind: "week" })}
        >
          ☷
        </button>
      </header>
      <div className="phone-main">
        {appView === "Compete" ? (
          <>
            <div className="context">
              <span>RUNNING / OPEN DIVISION</span>
              <button
                className="period-trigger"
                onClick={() => open({ kind: "week" })}
              >
                {f.period}⌄
              </button>
            </div>
            <h3 className="page-heading">{concept.heading}</h3>
            <section
              className="hero"
              aria-label="Your weekly distance and position"
            >
              <div className="hero-copy">
                <span className="eyebrow">{concept.eyebrow}</span>
                <strong className="hero-value">
                  {summary.total.toFixed(1)} <small>km</small>
                </strong>
                <span className="hero-foot">
                  <b>{ord(summary.rank)} place</b> · {summary.gap.toFixed(1)} km
                  to {summary.rival}
                </span>
              </div>
              {showEmber && (
                <Mascot
                  concept={concept}
                  skin={skin}
                  standard={standardEmber}
                  className="hero-ember"
                />
              )}
            </section>
            {concept.editorial && (
              <div className="editorial-block">
                {concept.id === "proof-of-work" && week === "previous"
                  ? "LATEST COUNTED SESSION / SUNDAY / LONG RUN / 9.0 KM"
                  : concept.editorial}
              </div>
            )}
            {concept.id === "the-pass" && (
              <section className="race-block">
                <div className="section-head">
                  <h4>The chase</h4>
                  <span>Nearby field · ±3 km</span>
                </div>
                <div className="race-lanes">
                  {[nearest, f.rows[summary.rank - 1], f.rows[summary.rank]]
                    .filter(Boolean)
                    .map((person) => (
                      <div
                        className={`lane ${person.name === "You" ? "you" : ""}`}
                        key={person.name}
                      >
                        <span
                          className="lane-dot"
                          style={{
                            top: 35 - (person.distance - summary.total) * 10,
                          }}
                        >
                          {person.name === "You" ? "Y" : person.name[0]}
                        </span>
                        {person.name}
                      </div>
                    ))}
                </div>
                <div className="gap-line">
                  <span>
                    {summary.rival} is {summary.gap.toFixed(1)} km ahead
                  </span>
                  <button
                    className="link-button"
                    onClick={() =>
                      open({ kind: "athlete", name: summary.rival })
                    }
                  >
                    View athlete
                  </button>
                </div>
              </section>
            )}
            <section className="rank-block">
              <div className="section-head">
                <h4>{concept.rankTitle}</h4>
                <span>Distance · km</span>
              </div>
              <Standings
                week={week}
                onSelect={(name) => open({ kind: "athlete", name })}
              />
            </section>
            <section className="chart-block">
              <div className="section-head">
                <h4>
                  {concept.chart === "bars"
                    ? "Daily distance"
                    : week === "current"
                      ? "Distance this week"
                      : "Distance last week"}
                </h4>
                <button
                  className="link-button"
                  onClick={() =>
                    setComparison(comparison === "nearest" ? "self" : "nearest")
                  }
                >
                  Compare
                </button>
              </div>
              <DistanceChart
                concept={concept}
                week={week}
                comparison={comparison}
              />
            </section>
            <div className="actions">
              <button
                className="primary"
                onClick={() => open({ kind: "athlete", name: "You" })}
              >
                View your week
              </button>
              <button className="secondary" onClick={() => setAppView("Crew")}>
                Your crew
              </button>
            </div>
          </>
        ) : (
          <OtherView
            view={appView}
            week={week}
            setAppView={setAppView}
            onSelect={(name) => open({ kind: "athlete", name })}
            onOptions={() => open({ kind: "week" })}
          />
        )}
      </div>
      <nav className="bottom-nav" aria-label="App navigation">
        {APP_VIEWS.map((view) => (
          <button
            key={view}
            aria-pressed={appView === view}
            onClick={() => setAppView(view)}
          >
            <span className="nav-glyph" aria-hidden="true">
              {NAV_GLYPHS[view]}
            </span>
            {view}
          </button>
        ))}
      </nav>
      <Dialog.Root
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <Dialog.Portal container={phoneRef.current}>
          <Dialog.Overlay className="overlay">
            <Dialog.Content
              className="dialog"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                trigger.current?.focus();
              }}
            >
              <div className="dialog-header">
                <Dialog.Title>
                  {panel?.kind === "week"
                    ? "Week options"
                    : panel?.name === "You"
                      ? "Your week"
                      : panel?.name}
                </Dialog.Title>
                <Dialog.Close className="icon-button" aria-label="Close dialog">
                  ×
                </Dialog.Close>
              </div>
              <Dialog.Description className="dialog-description">
                {panel?.kind === "week"
                  ? "Choose a sample week and chart comparison."
                  : "Fictional running distance for the selected week."}
              </Dialog.Description>
              {panel?.kind === "week" ? (
                <WeekMenu
                  week={week}
                  setWeek={setWeek}
                  comparison={comparison}
                  setComparison={setComparison}
                />
              ) : (
                panel?.kind === "athlete" && (
                  <>
                    <span className="eyebrow">
                      {ord(f.rows.findIndex((r) => r.name === panel.name) + 1)}{" "}
                      PLACE · RUNNING
                    </span>
                    <div className="dialog-value">
                      {f.rows
                        .find((r) => r.name === panel.name)
                        ?.distance.toFixed(1)}{" "}
                      <small>km</small>
                    </div>
                    <p>{f.period}</p>
                    <Dialog.Close className="secondary">
                      Back to the field
                    </Dialog.Close>
                  </>
                )
              )}
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Standings({
  week,
  onSelect,
}: {
  week: WeekId;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="rank-list">
      <div className="rank-head" aria-hidden="true">
        <span>#</span>
        <span>Athlete</span>
        <span style={{ textAlign: "right" }}>km</span>
      </div>
      {WEEK_FIXTURES[week].rows.map((person, i) => (
        <button
          key={person.name}
          className={`rank-row ${person.name === "You" ? "is-you" : ""}`}
          onClick={() => onSelect(person.name)}
          aria-label={`${ord(i + 1)} place: ${person.name}, ${person.distance.toFixed(1)} kilometres. View athlete.`}
        >
          <span>{i + 1}</span>
          <span className="athlete-name">
            <span className="avatar" aria-hidden="true">
              {person.name[0]}
            </span>
            {person.name}
          </span>
          <span className="distance">{person.distance.toFixed(1)}</span>
        </button>
      ))}
    </div>
  );
}

function OtherView({
  view,
  week,
  setAppView,
  onSelect,
  onOptions,
}: {
  view: Exclude<AppView, "Compete">;
  week: WeekId;
  setAppView: (view: AppView) => void;
  onSelect: (name: string) => void;
  onOptions: () => void;
}) {
  const s = weekSummary(week);
  return (
    <section className="other-view">
      {view === "Home" ? (
        <>
          <h3>
            A good week
            <br />
            is taking shape.
          </h3>
          <div className="summary-box">
            <span className="eyebrow">YOUR RUNNING WEEK</span>
            <strong className="big-number">{s.total.toFixed(1)} km</strong>
            <p>
              {s.rival} is {s.gap.toFixed(1)} km ahead.
            </p>
            <button className="primary" onClick={() => setAppView("Compete")}>
              See the field
            </button>
          </div>
          <div className="section-head">
            <h4>Recent sessions</h4>
            <span>Running</span>
          </div>
          {(week === "current"
            ? [
                ["Saturday · Easy run", "5.2 km"],
                ["Friday · Afternoon run", "4.8 km"],
                ["Thursday · Steady run", "5.8 km"],
              ]
            : [
                ["Sunday · Long run", "9.0 km"],
                ["Saturday · Easy run", "4.7 km"],
                ["Friday · Afternoon run", "3.4 km"],
              ]
          ).map(([name, value]) => (
            <div className="session-row" key={name}>
              <span>{name}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </>
      ) : view === "Crew" ? (
        <>
          <h3>East Side</h3>
          <div className="summary-box">
            <span className="eyebrow">YOUR CREW / 4 ATHLETES</span>
            <div className="crew-faces">
              {["M", "A", "Y", "J"].map((letter) => (
                <span className="avatar" key={letter}>
                  {letter}
                </span>
              ))}
            </div>
            <strong className="big-number">{s.crewTotal.toFixed(1)} km</strong>
            <p>
              Shared running distance {week === "current" ? "this" : "last"}{" "}
              week.
            </p>
          </div>
          <div className="section-head">
            <h4>Shared field</h4>
            <span>Running</span>
          </div>
          <Standings week={week} onSelect={onSelect} />
          <button className="primary" onClick={() => setAppView("Compete")}>
            Back to competition
          </button>
        </>
      ) : (
        <>
          <h3>Jamie / You</h3>
          <div className="summary-box">
            <span className="eyebrow">ATHLETE / OPEN DIVISION</span>
            <strong className="big-number">
              1,248 <small>Effort score</small>
            </strong>
            <p>Season rating · example data</p>
          </div>
          <div className="section-head">
            <h4>Personal benchmarks</h4>
            <span>Running</span>
          </div>
          <div className="session-row">
            <span>5K</span>
            <strong>24:18</strong>
          </div>
          <div className="session-row">
            <span>10K</span>
            <strong>51:42</strong>
          </div>
          <button className="secondary" onClick={onOptions}>
            Week & comparison settings
          </button>
        </>
      )}
    </section>
  );
}

function WeekMenu({
  week,
  setWeek,
  comparison,
  setComparison,
}: {
  week: WeekId;
  setWeek: (week: WeekId) => void;
  comparison: "nearest" | "self";
  setComparison: (value: "nearest" | "self") => void;
}) {
  const id = useId();
  return (
    <>
      <div className="menu-study">
        {(["current", "previous"] as const).map((value) => (
          <button
            key={value}
            aria-pressed={week === value}
            onClick={() => setWeek(value)}
          >
            <span>{value === "current" ? "This week" : "Last week"}</span>
            <span className="selected-indicator">
              {week === value
                ? "Selected"
                : value === "current"
                  ? "12–19 Oct"
                  : "5–12 Oct"}
            </span>
          </button>
        ))}
      </div>
      <label className="mini-field" htmlFor={id}>
        Chart comparison
        <select
          id={id}
          value={comparison}
          onChange={(e) =>
            setComparison(e.target.value === "self" ? "self" : "nearest")
          }
        >
          <option value="nearest">Nearest rival</option>
          <option value="self">Past you · same days</option>
        </select>
      </label>
    </>
  );
}
function ControlShelf({
  week,
  setWeek,
  comparison,
  setComparison,
  onCrew,
  onWeek,
}: {
  week: WeekId;
  setWeek: (week: WeekId) => void;
  comparison: "nearest" | "self";
  setComparison: (value: "nearest" | "self") => void;
  onCrew: () => void;
  onWeek: () => void;
}) {
  return (
    <>
      <section className="component-shelf">
        <h3>Buttons & controls</h3>
        <div className="control-row">
          <button className="primary" onClick={onWeek}>
            View week
          </button>
          <button className="secondary" onClick={onCrew}>
            Your crew
          </button>
        </div>
        <div className="control-row">
          <button className="primary" disabled>
            Unavailable
          </button>
          <button
            className="secondary"
            onClick={() =>
              setComparison(comparison === "nearest" ? "self" : "nearest")
            }
          >
            Compare
          </button>
        </div>
        <div className="control-row">
          <button
            className="filter-chip"
            aria-pressed={comparison === "nearest"}
            onClick={() => setComparison("nearest")}
          >
            Nearest rival
          </button>
          <button
            className="filter-chip"
            aria-pressed={comparison === "self"}
            onClick={() => setComparison("self")}
          >
            Past you
          </button>
        </div>
      </section>
      <section className="component-shelf">
        <h3>Week menu</h3>
        <WeekMenu
          week={week}
          setWeek={setWeek}
          comparison={comparison}
          setComparison={setComparison}
        />
      </section>
    </>
  );
}

function DistanceChart({
  concept,
  week,
  comparison,
}: {
  concept: BrandConcept;
  week: WeekId;
  comparison: "nearest" | "self";
}) {
  const svgRef = useRef<SVGSVGElement>(null),
    [width, setWidth] = useState(300),
    id = useId();
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(180, entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const f = WEEK_FIXTURES[week],
    isBar = concept.chart === "bars",
    reference = comparison === "self" ? f.past : f.rival;
  const a = isBar ? dailyDistances(f.you) : f.you,
    b = isBar ? dailyDistances(reference) : reference;
  const max =
      Math.ceil(Math.max(...a, ...b) / (isBar ? 2 : 12)) * (isBar ? 2 : 12),
    left = 27,
    right = 12,
    top = 20,
    bottom = 125;
  const x = (i: number) => left + ((width - left - right) * i) / (a.length - 1),
    y = (v: number) => bottom - ((bottom - top) * v) / max;
  const path = (values: readonly number[]) =>
    values
      .map((v, i) =>
        i === 0
          ? `M ${x(i)} ${y(v)}`
          : concept.chart === "step"
            ? `H ${x(i)} V ${y(v)}`
            : `L ${x(i)} ${y(v)}`,
      )
      .join(" ");
  const ticks = Array.from(
    { length: max / (isBar ? 2 : 12) + 1 },
    (_, i) => i * (isBar ? 2 : 12),
  );
  const labels = [
    ...new Set(width < 270 ? [0, 2, a.length - 1] : [0, 2, 4, a.length - 1]),
  ];
  const rival = weekSummary(week).rival;
  return (
    <>
      <div className="chart-legend">
        <span>
          <i className="legend-sample" />
          You
        </span>
        <span>
          <i
            className={`legend-sample secondary ${isBar ? "bar-reference" : ""}`}
          />
          {comparison === "self" ? "Past you" : rival}
        </span>
      </div>
      <svg
        ref={svgRef}
        className="chart"
        viewBox={`0 0 ${width} 148`}
        role="img"
        aria-labelledby={id}
      >
        <title id={id}>
          {isBar ? "Daily" : "Cumulative"} running distance, {f.days[0]} through{" "}
          {f.days.at(-1)}. You: {f.you.at(-1)} km total;{" "}
          {comparison === "self" ? "past you" : rival}: {reference.at(-1)} km.
        </title>
        <text x={0} y={11}>
          km
        </text>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={left}
              x2={width - right}
              y1={y(tick)}
              y2={y(tick)}
              className="gridline"
            />
            <text x={left - 6} y={y(tick) + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {labels.map((i) => (
          <text
            key={i}
            x={
              isBar
                ? left + ((width - left - right) * (i + 0.5)) / a.length
                : x(i)
            }
            y={143}
            textAnchor={
              isBar
                ? "middle"
                : i === 0
                  ? "start"
                  : i === a.length - 1
                    ? "end"
                    : "middle"
            }
          >
            {f.days[i]}
          </text>
        ))}
        {isBar ? (
          a.map((value, i) => {
            const slot = (width - left - right) / a.length,
              half = slot * 0.29,
              cx = left + slot * (i + 0.5);
            return (
              <g key={i}>
                <rect
                  x={cx - half - 1}
                  y={y(b[i])}
                  width={half}
                  height={bottom - y(b[i])}
                  rx={concept.className === "proof" ? 0 : 4}
                  className="bar-other"
                />
                <rect
                  x={cx + 1}
                  y={y(value)}
                  width={half}
                  height={bottom - y(value)}
                  rx={concept.className === "proof" ? 0 : 4}
                  className="bar-you"
                >
                  <title>
                    {f.days[i]}: {value.toFixed(1)} km
                  </title>
                </rect>
              </g>
            );
          })
        ) : (
          <>
            {concept.chart === "area" && (
              <path
                d={`${path(a)} L ${x(a.length - 1)} ${bottom} L ${x(0)} ${bottom} Z`}
                className="area-you"
              />
            )}
            <path d={path(b)} className="line-other" />
            <path d={path(a)} className="line-you" />
          </>
        )}
      </svg>
    </>
  );
}

function CampaignBoard({
  concept,
  skin,
}: {
  concept: BrandConcept;
  skin: SkinId;
}) {
  const style = {
    "--ink": concept.colors[0],
    "--signal": concept.colors[1],
    "--paper": concept.colors[2],
    "--support": concept.colors[3],
  } as CSSProperties;
  return (
    <div className="brand-campaign">
      <section className={`territory ${concept.className}`} style={style}>
        <header className="folio">
          <h2>{concept.name}</h2>
          <span>{concept.premise}</span>
        </header>
        <div className="poster">
          <div className="wordmark">OVERTAEK</div>
          <div className="headline">
            {concept.headline.split("\n").map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </div>
          {concept.family !== "territory" ? (
            <SkinEmber
              skin={concept.family === "baseline" ? "classic" : skin}
              className="poster-ember"
            />
          ) : (
            <CampaignGraphic concept={concept} />
          )}
          <div className="poster-foot">
            Weekly fitness competition.
            <br />
            Find your next overtake.
          </div>
        </div>
        <div className="identity">
          <div className="icon" aria-label="App icon study">
            {concept.family !== "territory" ? (
              <SkinEmber skin="classic" />
            ) : (
              "O"
            )}
          </div>
          <div>
            <Palette colors={concept.colors} />
            <p className="type">{concept.fonts}</p>
          </div>
        </div>
        <div className="applications">
          {[
            [
              "Social",
              concept.family === "territory"
                ? "One place closer."
                : "Your effort. Your character.",
            ],
            ["App Store headline", "Your week. Your move."],
            ["Website campaign", "Find your next overtake."],
          ].map(([label, title], i) => (
            <div className="application" key={label}>
              <p className="application-label">{label}</p>
              <div
                className={`sample ${i === 1 ? "store" : i === 2 ? "web" : ""}`}
              >
                <small>OVERTAEK</small>
                <b>{title}</b>
                <small>
                  {i === 1
                    ? "Pair with actual release captures"
                    : "Weekly fitness competition"}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function CampaignGraphic({ concept }: { concept: BrandConcept }) {
  const elements: Record<string, ReactNode> = {
    pass: (
      <div className="rails">
        <i />
        <i />
      </div>
    ),
    after: <div className="glow" />,
    rival: <div className="seal">THE WEEKLY COMPETITION CLUB</div>,
    pressure: <div className="orb" />,
    margin: <div className="measure" />,
    proof: (
      <div className="ticket">
        OVERTAEK
        <br />
        WEEKLY RECORD
        <br />
        <b>SHOW UP.</b>RUN / RIDE / WALK / LIFT
      </div>
    ),
    weekly: <span className="ticker">RUN · RIDE · WALK · LIFT</span>,
    ground: <div className="contour" />,
    play: (
      <div className="steps">
        <i />
        <i />
        <i />
      </div>
    ),
    chain: <div className="rings" />,
  };
  return <div aria-hidden="true">{elements[concept.className]}</div>;
}

function EmberLocker({
  concept,
  preview,
  equipped,
  onPreview,
  onEquip,
  onCancel,
  onReturn,
}: {
  concept: BrandConcept;
  preview: SkinId;
  equipped: SkinId;
  onPreview: (skin: SkinId) => void;
  onEquip: () => void;
  onCancel: () => void;
  onReturn: () => void;
}) {
  const [running, setRunning] = useState(false),
    skin = getSkin(preview);
  const neutral =
    concept.family === "territory" ? getConcept("everyday-club") : concept;
  return (
    <div className="brand-preview">
      <section className={`study locker-study ${neutral.className}`}>
        <header className="study-heading">
          <h2>Your Ember locker</h2>
          <span>One recognizable star · cosmetic finishes</span>
        </header>
        <div className="locker-layout">
          <section className="locker-stage-panel">
            <div className={`ember-run-stage ${running ? "is-running" : ""}`}>
              <span className="locker-stage-label">
                {running ? "RUN PREVIEW" : "CHARACTER PREVIEW"}
              </span>
              <div className="locker-run-marks" aria-hidden="true" />
              <SkinEmber
                skin={preview}
                action={running ? "run" : "idle"}
                playing={running}
                className="locker-character"
                label={`${skin.name} Ember`}
              />
              <span className="locker-own-lane">YOU · {skin.name}</span>
            </div>
            <div className="locker-preview-controls">
              <button
                className="secondary"
                aria-pressed={running}
                onClick={() => setRunning(!running)}
              >
                {running ? "Pause run" : "Preview run"}
              </button>
              <span>
                Equipped: <b>{getSkin(equipped).name}</b>
              </span>
            </div>
            <h3>{skin.name}</h3>
            <p>{skin.description}</p>
            <p className="locker-availability">
              {skin.owned ? "In your example collection" : skin.requirement}
            </p>
            <div className="actions">
              <button
                className="primary"
                disabled={!skin.owned || preview === equipped}
                onClick={onEquip}
              >
                {preview === equipped
                  ? "Equipped"
                  : skin.owned
                    ? "Use for my run"
                    : "Locked · preview only"}
              </button>
              <button className="secondary" onClick={onCancel}>
                Reset preview
              </button>
            </div>
            <button className="link-button" onClick={onReturn}>
              See equipped Ember in the app ↗
            </button>
          </section>
          <section
            className="locker-collection"
            aria-label="Ember skin collection"
          >
            <div className="section-head">
              <h3>The collection</h3>
              <span>4 owned · 2 to discover</span>
            </div>
            <div className="locker-skin-grid">
              {EMBER_SKINS.map((item) => (
                <button
                  key={item.id}
                  className={`locker-skin ${item.id === preview ? "is-selected" : ""}`}
                  aria-pressed={item.id === preview}
                  onClick={() => onPreview(item.id)}
                  aria-label={`Preview ${item.name}, ${item.id === equipped ? "equipped" : item.owned ? "owned" : "locked"}`}
                >
                  <SkinEmber skin={item.id} />
                  <b>{item.name}</b>
                  <span>
                    {item.id === equipped
                      ? "Equipped"
                      : item.owned
                        ? "Owned"
                        : "Locked · preview"}
                  </span>
                </button>
              ))}
            </div>
            <div className="locker-principles">
              <b>The app stays itself.</b>
              <p>
                Buttons, charts, standings and your YOU marker keep their
                meaning as Ember changes. The finishes use the same simple
                geometry and movement, including the quieter Arcade alternative.
              </p>
              <span>
                Concept unlocks · cosmetic only · no competition advantage
              </span>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

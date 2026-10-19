"use client";

import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ember } from "@/components/mascot/ember";
import type { Haptic, StudyId } from "./catalog";

type Props = { cue: (kind: Haptic, event: string) => void; reduced: boolean; speed: number };
const people = [
  { id: "maya", name: "Maya", value: 13.5 }, { id: "eli", name: "Eli", value: 16.4 },
  { id: "you", name: "You", value: 15 }, { id: "sam", name: "Sam", value: 17.2 },
  { id: "jo", name: "Jo", value: 14 },
];
const rise = { opacity: 0, y: 10 };
const still = { opacity: 1, x: 0, y: 0 };
function Button({ children, onClick, secondary = false, disabled = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return <button type="button" className={`sl-button${secondary ? " secondary" : ""}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <motion.div layout className={`sl-card ${className}`}>{children}</motion.div>;
}
function Chips({ values, value, onChange, label }: { values: readonly string[]; value: string; onChange: (v: string) => void; label: string }) {
  return <div className="sl-chips" role="group" aria-label={label}>{values.map(v => <button type="button" key={v} aria-pressed={v === value} onClick={() => v !== value && onChange(v)}>{v === value && <motion.span layoutId={`chip-${label}`} className="sl-chip-indicator" />}<span>{v}</span></button>)}</div>;
}
function Field({ center = 15, span = 6, selected, onSelect, values = people.map(p => p.value), row = false, immediate = false }: { center?: number; span?: number; selected?: string; onSelect?: (id: string) => void; values?: number[]; row?: boolean; immediate?: boolean }) {
  const order = row ? [...people].sort((a, b) => values[people.indexOf(b)] - values[people.indexOf(a)]) : people;
  return <motion.div layout className={`sl-field${row ? " as-rows" : ""}`} aria-label={row ? "Athlete standings" : "Athlete lanes"}>
    {!row && <div className="sl-grid" aria-hidden="true" />}
    {order.map((p, i) => {
      const index = people.indexOf(p);
      const fraction = .5 - (values[index] - center) / span;
      const top = Math.min(.88, Math.max(.12, fraction)) * 100;
      const edge = fraction < .12 ? "↑" : fraction > .88 ? "↓" : "";
      return <motion.div layout key={p.id} className={`sl-racer${p.id === "you" ? " own" : ""}${selected === p.id ? " selected" : ""}`} style={row ? {} : { left: `${(index + .5) * 20}%` }} animate={row ? { top: 0 } : { top: `${top}%` }} transition={immediate ? { duration: 0 } : undefined}>
        <motion.button layoutId={`athlete-${p.id}`} className="sl-disc" type="button" aria-label={`Inspect ${p.name}`} aria-pressed={selected === p.id} onClick={() => onSelect?.(p.id)}>{p.name === "You" ? "Y" : p.name[0]}</motion.button>
        <motion.span layout="position" className="sl-racer-name">{row ? `${i + 1}. ` : ""}{p.name}</motion.span>
        <motion.span layout="position" className="sl-racer-value">{edge}{values[index].toFixed(1)} km</motion.span>
      </motion.div>;
    })}
  </motion.div>;
}
function Number({ value, digits = 0, reduced, speed, from }: { value: number; digits?: number; reduced: boolean; speed: number; from?: number }) {
  const n = useMotionValue(from ?? value);
  const [shown, setShown] = useState(from ?? value);
  useMotionValueEvent(n, "change", setShown);
  useEffect(() => { const c = animate(n, value, { duration: reduced ? 0 : .4 * speed }); return () => c.stop(); }, [n, value, reduced, speed]);
  return <span className="sl-number">{shown.toFixed(digits)}</span>;
}

function Arena({ cue }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [span, setSpan] = useState(6);
  const [selected, setSelected] = useState("you");
  return <div className="sl-arena-demo">
    <p className="sl-eyebrow">Competition · Running</p><h3>Your week in motion</h3>
    <div className="sl-arena-placeholder">
      <motion.section layout className={`sl-arena-window${expanded ? " expanded" : ""}`} aria-label={expanded ? "Expanded arena" : "Compact arena"}>
        <motion.div layout="position" className="sl-row"><strong>15.0 km</strong><Button secondary onClick={() => { setExpanded(!expanded); cue(expanded ? "soft" : "light", expanded ? "Collapse arena" : "Expand arena"); }}>{expanded ? "Collapse" : "Expand arena"}</Button></motion.div>
        <Field span={span} selected={selected} onSelect={setSelected} />
        <motion.div layout="position" className="sl-row"><label>Zoom <input aria-label="Arena zoom" type="range" min="4" max="14" value={span} onChange={e => setSpan(+e.target.value)} /></label><span>±{span / 2} km</span></motion.div>
      </motion.section>
    </div>
    <p className="sl-muted">Same field, selection and zoom in both sizes.</p>
  </div>;
}
function Session({ cue }: Props) {
  const [open, setOpen] = useState(false);
  return <div className="sl-stack"><Card><span className="sl-eyebrow">This week</span><h3>2.4 hours · 4 sessions</h3></Card>
    <motion.section layout className={`sl-session sl-card${open ? " open" : ""}`}>
      <motion.div layout="position" className="sl-row"><motion.div layout className="sl-ember"><Ember expression="happy" /></motion.div><div><p className="sl-eyebrow">Today</p><h3>Easy 30 minutes</h3></div></motion.div>
      <AnimatePresence initial={false}>{open && <motion.div key="detail" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="sl-clip"><p>Keep it comfortable. Walk or jog at a pace where you can hold a conversation.</p><div className="sl-prescription"><b>5 min</b> warm up<b>20 min</b> easy effort<b>5 min</b> cool down</div></motion.div>}</AnimatePresence>
      <Button secondary onClick={() => { setOpen(!open); cue(open ? "soft" : "light", open ? "Collapse session" : "Open today's session"); }}>{open ? "Back to journey" : "See today's session"}</Button>
    </motion.section><motion.div layout className="sl-trail-stop"><i />Yesterday · 5.2 km</motion.div><motion.div layout className="sl-trail-stop"><i />Tuesday · 25 min</motion.div>
  </div>;
}
function Sheets({ cue }: Props) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return <div ref={setHost} className="sl-sheet-host"><Card><p className="sl-eyebrow">Your crew</p><h3>A little further, together.</h3><p>Make room for your people.</p></Card>
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><button type="button" className="sl-button" onClick={() => cue("light", "Open invite sheet")}>Invite a friend</button></Dialog.Trigger>
      <Dialog.Portal forceMount container={host}><AnimatePresence>{open && <>
        <Dialog.Overlay forceMount asChild><motion.div key="scrim" className="sl-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /></Dialog.Overlay>
        <Dialog.Content forceMount asChild><motion.section key="sheet" layout className="sl-sheet sl-stack" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}>
          <Dialog.Title>Better with your people.</Dialog.Title><Dialog.Description>Invite a friend to your shared week.</Dialog.Description>
          <Button secondary onClick={() => { setDetail(!detail); cue("selection", "Change invite detail"); }}>{detail ? "Hide invite details" : "Show invite details"}</Button>
          <AnimatePresence initial={false}>{detail && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="sl-clip"><p className="sl-code">FIELD · 7J2K</p><p>Demo invite only. No link is sent.</p></motion.div>}</AnimatePresence>
          <Dialog.Close asChild><button type="button" className="sl-button">Close sheet</button></Dialog.Close>
        </motion.section></Dialog.Content>
      </>}</AnimatePresence></Dialog.Portal>
    </Dialog.Root>
  </div>;
}
function Settings({ cue, reduced }: Props) {
  const [detail, setDetail] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const sourceRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  function go(next: boolean) {
    setDetail(next);
    if (next) { if (detailRef.current) detailRef.current.scrollTop = 0; cue("selection", "Enter Data Sync"); }
    requestAnimationFrame(() => (next ? backRef : sourceRef).current?.focus({ preventScroll: true }));
  }
  return <div className="sl-depth">
    <motion.div className="sl-depth-panel sl-scroll" inert={detail} aria-hidden={detail} animate={{ x: reduced ? 0 : detail ? "-15%" : 0, opacity: detail ? 0 : 1 }}>
      <h3>Athlete settings</h3><p className="sl-muted">Scroll this list, then open Data Sync.</p>
      {["Progress", "Preferences", "Notifications", "Training history", "Awards"].map(name => <div className="sl-settings-row" key={name}>{name}<span>›</span></div>)}
      <button ref={sourceRef} type="button" className="sl-settings-row" onClick={() => go(true)}>Data Sync <span>›</span></button><p>Your parent scroll position stays right here.</p>
    </motion.div>
    <motion.div ref={detailRef} className="sl-depth-panel sl-scroll" inert={!detail} aria-hidden={!detail} animate={{ x: reduced ? 0 : detail ? 0 : "100%", opacity: detail ? 1 : 0 }}>
      <button ref={backRef} type="button" className="sl-text-button" onClick={() => go(false)}>← Athlete</button><h3>Data Sync</h3><p>New detail starts at its heading.</p>{["Strava", "Garmin", "Apple Health", "Health Connect"].map(name => <div className="sl-settings-row" key={name}>{name}<span>Not connected</span></div>)}
    </motion.div>
  </div>;
}
function Tabs({ cue, reduced }: Props) {
  const tabs = ["Home", "Compete", "Crew", "Athlete"];
  const [index, setIndex] = useState(0);
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  return <div className="sl-tabs-demo"><div className="sl-retained-panels">{tabs.map((t, i) => <motion.section key={t} className="sl-tab-panel" inert={i !== index} aria-hidden={i !== index} animate={{ opacity: i === index ? 1 : 0, x: reduced ? 0 : (i - index) * 22 }}>
    <p className="sl-eyebrow">{t}</p><h3>{["A little further today.", "Your field is moving.", "The latest, together.", "Your season so far."][i]}</h3><Card><p>Retained local state: {counts[i]}</p><Button secondary onClick={() => setCounts(c => c.map((v, j) => i === j ? v + 1 : v))}>Add a local note</Button></Card>
  </motion.section>)}</div><div className="sl-bottom-tabs" role="group" aria-label="Prototype primary navigation">{tabs.map((t, i) => <button type="button" key={t} aria-pressed={i === index} onClick={() => { if (i !== index) { setIndex(i); cue("selection", `Switch to ${t}`); } }}>{i === index && <motion.span layoutId="tab-pill" />}<span>{t}</span></button>)}</div></div>;
}
function Scope({ cue }: Props) {
  const [sport, setSport] = useState("Running");
  const [tracks, setTracks] = useState<Record<string, string>>({ Running: "Open", Cycling: "GPS" });
  const track = tracks[sport];
  return <div className="sl-stack"><Chips label="Sport" values={["Running", "Cycling"]} value={sport} onChange={s => { setSport(s); cue("selection", `Choose ${s}`); }} /><Chips label="Score track" values={["Open", "GPS"]} value={track} onChange={t => { setTracks(p => ({ ...p, [sport]: t })); cue("selection", `Choose ${t}`); }} />
    <Card><motion.h3 layout="position">{sport} · {track} distance</motion.h3><Field values={people.map((p, i) => p.value - (track === "GPS" ? (i % 2 ? .4 : 1.2) : 0) + (sport === "Cycling" ? .8 : 0))} /></Card><p className="sl-muted">Each sport remembers its own score track.</p></div>;
}
function Viewport({ cue, reduced, speed }: Props) {
  const center = useMotionValue(15);
  const span = useMotionValue(6);
  const [display, setDisplay] = useState({ center: 15, span: 6 });
  const controls = useRef<ReturnType<typeof animate>[]>([]);
  const drag = useRef<{ y: number; center: number; height: number } | null>(null);
  useMotionValueEvent(center, "change", v => setDisplay(p => ({ ...p, center: v })));
  useMotionValueEvent(span, "change", v => setDisplay(p => ({ ...p, span: v })));
  const stop = () => controls.current.forEach(c => c.stop());
  useEffect(() => () => controls.current.forEach(c => c.stop()), []);
  function move(c: number, s: number, event: string) {
    stop(); controls.current = [animate(center, c, { duration: reduced ? 0 : .35 * speed }), animate(span, s, { duration: reduced ? 0 : .35 * speed })]; cue("light", event);
  }
  return <div className="sl-stack"><div className="sl-direct-field" onPointerDown={e => { stop(); drag.current = { y: e.clientY, center: center.get(), height: e.currentTarget.clientHeight }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (drag.current) center.set(Math.max(3, Math.min(24, drag.current.center + (e.clientY - drag.current.y) / drag.current.height * span.get()))); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
    <Field center={display.center} span={display.span} immediate /></div>
    <label className="sl-range">Zoom ±{(display.span / 2).toFixed(1)} km<input aria-label="Viewport zoom" type="range" min="4" max="18" step="2" value={display.span} onChange={e => { stop(); span.set(+e.target.value); }} onPointerUp={() => cue("selection", "Zoom detent committed")} onKeyUp={e => { if (e.key.startsWith("Arrow")) cue("selection", "Zoom detent committed"); }} /></label>
    <div className="sl-actions"><Button onClick={() => move(15, 6, "Center me")}>Center me</Button><Button secondary onClick={() => move(15.5, 12, "Fit field")}>Fit field</Button></div><p className="sl-muted">Center: {display.center.toFixed(1)} km · Drag vertically</p></div>;
}
function Standings({ cue }: Props) {
  const [rows, setRows] = useState(false);
  const [updated, setUpdated] = useState(false);
  return <div className="sl-stack"><Chips label="Field view" values={["Lanes", "Standings"]} value={rows ? "Standings" : "Lanes"} onChange={v => { setRows(v === "Standings"); cue("selection", `Show ${v}`); }} /><Field row={rows} values={people.map(p => p.value + (updated && p.id === "you" ? 2 : 0))} /><Button secondary onClick={() => { setUpdated(!updated); cue("none", "Passive standings update"); }}>Simulate standings update</Button></div>;
}
function Selection({ cue }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const p = people.find(x => x.id === selected);
  return <div className="sl-stack"><Field selected={selected ?? undefined} onSelect={id => { cue(selected ? "selection" : "light", `Inspect ${id}`); setSelected(id); }} /><div className="sl-dock" aria-label="Athlete detail dock"><AnimatePresence mode="wait" initial={false}>{p ? <motion.div key={p.id} initial={rise} animate={still} exit={{ opacity: 0, y: -6 }} className="sl-row"><div><h3>{p.name}</h3><p>{p.value.toFixed(1)} km · same field</p></div><Button secondary onClick={() => setSelected(null)}>Close details</Button></motion.div> : <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Tap a racer. The field stays still.</motion.p>}</AnimatePresence></div></div>;
}
function Journey({ cue }: Props) {
  const [days, setDays] = useState(["Yesterday", "Tuesday", "Monday"]);
  const [open, setOpen] = useState<string | null>(null);
  return <div className="sl-stack"><Button secondary disabled={days[0] === "Today"} onClick={() => { setDays(d => ["Today", ...d]); cue("none", "New day from background sync"); }}>Simulate new counted session</Button><motion.div layout className="sl-journey"><AnimatePresence initial={false}>{days.map((day, i) => <motion.section layout key={day} className="sl-day" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
    <div className="sl-day-line" aria-hidden="true" /><button type="button" className="sl-day-stop" aria-expanded={open === day} onClick={() => { setOpen(open === day ? null : day); cue("light", `Open ${day}`); }}><span>{i + 1}</span><b>{day}</b><small>5.2 km · counted</small></button>
    <AnimatePresence>{open === day && <motion.div className="sl-clip" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p className="sl-day-detail">Morning run · 31 min<br />An easy effort around the park.</p></motion.div>}</AnimatePresence>
  </motion.section>)}</AnimatePresence></motion.div></div>;
}
function Registration({ cue }: Props) {
  const [phase, setPhase] = useState<"idle" | "choose" | "joined">("idle");
  const [sport, setSport] = useState("Cycling");
  return <div className="sl-stack"><Card><h3>Running</h3><p>15.0 km · Your current field</p></Card><AnimatePresence initial={false} mode="popLayout">
    {phase === "idle" && <motion.div layout key="trigger" exit={{ opacity: 0 }}><Button onClick={() => { setPhase("choose"); cue("light", "Open registration"); }}>Register for an event</Button></motion.div>}
    {phase === "choose" && <motion.section layout className="sl-card sl-stack" key="chooser" initial={rise} animate={still} exit={{ opacity: 0 }}><h3>Choose your next field</h3><Chips label="Registration sport" values={["Cycling", "Walking", "Strength"]} value={sport} onChange={v => { setSport(v); cue("selection", `Choose ${v}`); }} /><motion.strong layoutId="registered-sport" className="sl-sport-label">{sport}</motion.strong><Button onClick={() => { setPhase("joined"); cue("success", "Simulated join confirmed"); }}>Confirm demo join</Button><Button secondary onClick={() => setPhase("idle")}>Cancel</Button></motion.section>}
    {phase === "joined" && <motion.section layout key="joined" className="sl-card sl-joined" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.h3 layoutId="registered-sport" className="sl-sport-label">{sport}</motion.h3><p>You're in · Your new field</p><div className="sl-mini-people">Y · M · E · S</div><Button secondary onClick={() => setPhase("idle")}>Reset demo registration</Button></motion.section>}
  </AnimatePresence><p className="sl-muted">Fictional enrollment. No request or account write.</p></div>;
}
function Charts(props: Props) {
  const [synced, setSynced] = useState(false);
  const [scope, setScope] = useState("This week");
  const values = (synced ? [1, 1.7, 2, 3.1, 3.4, 4.5, 5] : [1, 1.3, 1.7, 2, 2.4, 2.4, 2.4]).map(v => scope === "Last week" ? v * .7 : v);
  const pts = values.map((v, i) => `${20 + i * 40},${155 - v * 25}`).join(" ");
  return <div className="sl-stack"><Chips label="Chart period" values={["This week", "Last week"]} value={scope} onChange={v => { setScope(v); props.cue("selection", `Compare ${v}`); }} /><Card><p className="sl-eyebrow">Counted hours</p><h3 className="sl-big"><Number value={values[6]} digits={1} {...props} /> hr</h3><svg viewBox="0 0 280 190" className="sl-chart" role="img" aria-label={`${scope}: ${values[6].toFixed(1)} counted hours`}><path d="M20 20V155H265" fill="none" stroke="var(--sl-line)" /><motion.polyline points={pts} animate={{ points: pts }} fill="none" stroke="var(--sl-gold)" strokeWidth="4" strokeLinejoin="round" />{values.map((v, i) => <motion.circle key={i} cx={20 + i * 40} animate={{ cy: 155 - v * 25 }} r="4" fill="var(--sl-ink)" />)}<text x="20" y="180">Mon</text><text x="240" y="180">Sun</text></svg><div className="sl-bars" aria-label="Counted hours by day">{values.map((v, i) => <motion.i key={i} animate={{ height: `${v * 10 + 4}px` }} />)}</div></Card><Button onClick={() => { setSynced(!synced); props.cue("success", "Requested sync confirmed"); }}>Apply confirmed demo sync</Button></div>;
}
function Crew({ cue }: Props) {
  const [crew, setCrew] = useState("Morning Miles");
  const [view, setView] = useState("Activity");
  const [cheered, setCheered] = useState(false);
  return <div className="sl-stack"><Chips label="Crew" values={["Morning Miles", "Weekend Club"]} value={crew} onChange={v => { setCrew(v); cue("selection", `Choose ${v}`); }} /><Card className="sl-crew-hero"><AnimatePresence mode="wait" initial={false}><motion.div key={crew} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><p className="sl-eyebrow">Our shared week</p><h3>{crew}</h3><p>{crew === "Morning Miles" ? "32.4 / 50 km" : "18.0 / 40 km"}</p></motion.div></AnimatePresence><div className="sl-progress"><motion.i animate={{ width: crew === "Morning Miles" ? "65%" : "45%" }} /></div></Card><Chips label="Crew view" values={["Activity", "Leaderboard"]} value={view} onChange={v => { setView(v); cue("selection", `Show ${v}`); }} /><Card><AnimatePresence mode="wait" initial={false}><motion.div key={`${crew}-${view}`} initial={rise} animate={still} exit={{ opacity: 0, y: -6 }}>{view === "Activity" ? <><h3>Maya went a little further.</h3><p>Easy run · 5.2 km</p><Button secondary onClick={() => { setCheered(!cheered); if (!cheered) cue("light", "Demo cheer confirmed"); }}><motion.span animate={{ scale: cheered ? [1, 1.3, 1] : 1 }}>{cheered ? "♥ Cheered" : "♡ Cheer session"}</motion.span></Button></> : <>{["Maya", "You", "Eli"].map((name, i) => <motion.div layout className="sl-settings-row" key={name}>{i + 1}. {name}<b>{12 - i * 3} km</b></motion.div>)}</>}</motion.div></AnimatePresence></Card></div>;
}
function Medal({ index = 0, large = false }: { index?: number; large?: boolean }) {
  return <div className={`sl-medal${large ? " large" : ""}`} data-finish={index}><span className="sl-ribbon" /><div className="sl-medal-face"><span>{["1", "5", "↗"][index]}</span></div></div>;
}
function Awards({ cue, reduced, speed }: Props) {
  const [shelf, setShelf] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [returned, setReturned] = useState<number | null>(null);
  const mounts = useRef<Array<HTMLButtonElement | null>>([]);
  const names = ["Won the week", "Five strong weeks", "A little further"];
  function close() { if (reduced) { cue("medium", "Medal seated in its mount"); mounts.current[selected ?? 0]?.focus({ preventScroll: true }); } else setReturned(selected); setSelected(null); }
  return <div className="sl-stack"><Button secondary onClick={() => { setShelf(!shelf); setSelected(null); cue("selection", shelf ? "Fold medal shelf" : "Unfold medal shelf"); }}>{shelf ? "Close awards shelf" : "Past competitions & medals"}</Button>
    <AnimatePresence initial={false}>{shelf && <motion.section layout key="shelf" className="sl-award-shelf sl-card" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p className="sl-eyebrow">Your earned collection</p><div className="sl-medal-rack">{names.map((name, i) => <div key={name} className="sl-medal-mount">
      <button ref={el => { mounts.current[i] = el; }} type="button" aria-label={`Inspect medal: ${name}`} onClick={() => { setReturned(null); setSelected(i); cue("light", `Pick up ${name}`); }}><motion.div layoutId={`medal-${i}`} animate={{ opacity: selected === i ? 0 : 1 }} onLayoutAnimationComplete={() => { if (returned === i) { setReturned(null); mounts.current[i]?.focus({ preventScroll: true }); cue("medium", "Medal seated in its mount"); } }}><Medal index={i} /></motion.div><span>{name}</span></button>
    </div>)}</div></motion.section>}</AnimatePresence>
    <AnimatePresence>{selected !== null && <motion.section layout className="sl-medal-detail sl-card" key="medal-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div layoutId={`medal-${selected}`} className="sl-medal-hero"><motion.div initial={{ rotateY: reduced ? 0 : -28, rotateZ: reduced ? 0 : -8 }} animate={{ rotateY: 0, rotateZ: 0 }}><Medal index={selected} large /><motion.i className="sl-medal-shine" initial={{ x: "-150%", opacity: 0 }} animate={{ x: reduced ? "-150%" : "150%", opacity: reduced ? 0 : [0, .7, 0] }} transition={{ duration: reduced ? 0 : .65 * speed }} /></motion.div></motion.div>
      <h3>{names[selected]}</h3><p>Running · October 12–18<br />An earned moment, kept close.</p><Button secondary onClick={close}>Return medal</Button>
    </motion.section>}</AnimatePresence><motion.p layout className="sl-muted">Previously earned demo medals. Inspection never grants a new reward.</motion.p></div>;
}
function Feedback({ cue, speed }: Props) {
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [draft, setDraft] = useState("The session detail jumped when I opened it.");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function send(fail: boolean) {
    setStatus("pending");
    timer.current = setTimeout(() => { setStatus(fail ? "error" : "success"); cue(fail ? "error" : "success", fail ? "Simulated request failed" : "Simulated report confirmed"); }, 650 * speed);
  }
  return <Card className="sl-stack"><h3>Report an issue</h3><AnimatePresence initial={false} mode="wait">{status === "success" ? <motion.div key="sent" initial={rise} animate={still} exit={{ opacity: 0 }}><h3>✓ Report received.</h3><p>Thanks for helping us improve.</p><Button secondary onClick={() => setStatus("idle")}>Write another demo report</Button></motion.div> : <motion.div layout key="form" exit={{ opacity: 0 }} className="sl-stack"><label>What happened?<textarea value={draft} onChange={e => setDraft(e.target.value)} disabled={status === "pending"} /></label><div className="sl-actions"><Button disabled={status === "pending" || !draft.trim()} onClick={() => send(false)}>{status === "pending" ? "Sending…" : status === "error" ? "Retry successfully" : "Send demo report"}</Button><Button secondary disabled={status === "pending" || !draft.trim()} onClick={() => send(true)}>Simulate failure</Button></div><AnimatePresence>{status === "error" && <motion.p role="alert" className="sl-error" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>Couldn't send. Your draft is safe; try again.</motion.p>}</AnimatePresence></motion.div>}</AnimatePresence></Card>;
}
function Profile({ cue }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Alex Morgan");
  const [draft, setDraft] = useState(name);
  return <div className="sl-stack"><Card className="sl-profile"><motion.div layout="position" className="sl-portrait">AM</motion.div><motion.div layout className="sl-profile-copy"><p className="sl-eyebrow">Toronto</p><AnimatePresence initial={false} mode="wait">{editing ? <motion.label key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Display name<input value={draft} onChange={e => setDraft(e.target.value)} maxLength={40} /></motion.label> : <motion.h3 key="name" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{name}</motion.h3>}</AnimatePresence><AnimatePresence>{editing && <motion.div key="extra" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="sl-clip"><p>Your portrait stays anchored as the card makes room.</p><p className="sl-muted">This edit is local to the prototype.</p></motion.div>}</AnimatePresence><div className="sl-actions">{editing ? <><Button disabled={!draft.trim()} onClick={() => { setName(draft.trim()); setEditing(false); cue("success", "Local demo profile saved"); }}>Save demo profile</Button><Button secondary onClick={() => setEditing(false)}>Cancel</Button></> : <Button secondary onClick={() => { setDraft(name); setEditing(true); cue("light", "Edit profile"); }}>Edit profile</Button>}</div></motion.div></Card><Card><p className="sl-eyebrow">Your season so far</p><h3>124 km · 18 sessions</h3></Card></div>;
}
function Recap(props: Props) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [filed, setFiled] = useState(false);
  const [positive, setPositive] = useState(true);
  return <div className="sl-stack"><Chips label="Result type" values={["Positive", "Frozen"]} value={positive ? "Positive" : "Frozen"} onChange={v => { setPositive(v === "Positive"); setSeen(false); }} />
    <AnimatePresence initial={false} mode="popLayout">{!open ? <motion.section layoutId="recap" layout key="closed" className="sl-card"><p className="sl-eyebrow">{filed ? "Season history" : "One new settled week"}</p><h3>{filed ? "October 12–18 · Filed" : "Your week has a story."}</h3><Button secondary onClick={() => { setOpen(true); if (props.reduced && !seen) { setSeen(true); props.cue(positive ? "success" : "light", positive ? "New positive result revealed" : "Open frozen recap"); } else props.cue("light", "Open recap"); }}>{seen ? "Replay recap" : "See what changed"}</Button></motion.section> : <motion.section layoutId="recap" layout key="open" className="sl-card sl-recap" onLayoutAnimationComplete={() => { if (open && !seen) { setSeen(true); if (positive) props.cue("success", "New positive result revealed"); } }}>
      <p className="sl-eyebrow">Week complete</p><h3>{positive ? "You took the field." : "Week held. Score protected."}</h3><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: props.reduced ? 0 : .25 * props.speed, delay: props.reduced ? 0 : .1 * props.speed }}><p>Place</p><b className="sl-big">{positive ? "1 / 8" : "—"}</b></motion.div><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: props.reduced ? 0 : .25 * props.speed, delay: props.reduced ? 0 : .2 * props.speed }}><p>Effort score</p><b className="sl-big"><Number value={positive ? 1042 : 1000} from={1000} {...props} /></b><p>{positive ? "+42 this week" : "No change · frozen"}</p></motion.div><Button onClick={() => { setOpen(false); setFiled(true); }}>File in season history</Button>
    </motion.section>}</AnimatePresence><p className="sl-muted">Explicit arrival. No surprise route change.</p></div>;
}
function Setup({ cue, reduced }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState("Alex");
  const [filter, setFilter] = useState("5K");
  function go(n: number) { setDirection(n > step ? 1 : -1); setStep(n); if (n > step) cue(n === 3 ? "success" : "selection", n === 3 ? "Demo setup complete" : "Commit setup step"); }
  return <div className="sl-stack"><div className="sl-progress"><motion.i animate={{ width: `${(step + 1) * 25}%` }} /></div><p className="sl-eyebrow">{step < 3 ? `Setup · Step ${step + 1} of 3` : "Your benchmarks"}</p><Card><AnimatePresence mode="wait" custom={direction} initial={false}><motion.div key={step} custom={direction} variants={{ enter: (d: number) => ({ x: reduced ? 0 : d * 26, opacity: 0 }), active: { x: 0, opacity: 1 }, leave: (d: number) => ({ x: reduced ? 0 : -d * 26, opacity: 0 }) }} initial="enter" animate="active" exit="leave" className="sl-stack">
    {step === 0 ? <><h3>Your training profile</h3><label>Display name<input value={name} onChange={e => setName(e.target.value)} /></label></> : step === 1 ? <><h3>Link a tracker</h3><p>Connect later. External OAuth uses its platform transition.</p><p className="sl-muted">No connection is started here.</p></> : step === 2 ? <><h3>Ready, {name || "athlete"}?</h3><p>Start with your existing history or add it later.</p></> : <><h3>Your running times</h3><Chips label="Benchmark" values={["5K", "10K", "Half"]} value={filter} onChange={v => { setFilter(v); cue("selection", `Choose ${v} benchmark`); }} /><AnimatePresence mode="wait" initial={false}><motion.div key={filter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><p className="sl-big">{filter === "5K" ? "24:32" : filter === "10K" ? "51:08" : "1:58:40"}</p><p>Demo personal benchmark</p></motion.div></AnimatePresence></>}
  </motion.div></AnimatePresence></Card><div className="sl-actions">{step > 0 && <Button secondary onClick={() => go(step - 1)}>Back</Button>}{step < 3 && <Button onClick={() => go(step + 1)}>{step === 2 ? "Finish setup" : "Continue"}</Button>}</div></div>;
}

const demos = { arena: Arena, session: Session, sheets: Sheets, settings: Settings, tabs: Tabs, scope: Scope, viewport: Viewport, standings: Standings, selection: Selection, journey: Journey, registration: Registration, charts: Charts, crew: Crew, awards: Awards, feedback: Feedback, profile: Profile, recap: Recap, setup: Setup } satisfies Record<StudyId, (props: Props) => ReactNode>;
export function Demo({ id, ...props }: Props & { id: StudyId }) { const Component = demos[id]; return <Component {...props} />; }

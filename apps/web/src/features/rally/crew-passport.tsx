"use client";
import { useRef, useState } from "react";
import { APP_ICON_PATHS, APP_TIMEZONE, crewContractMetrics, crewContractTarget, crewContractValue, crewPassportCardModel, crewSeasonBounds, crewStampIcon, crewStampLabel, dayKey, weeklyPeriodBounds, type CrewContractMetric, type CrewPassport, type CrewPassportMutation, type CrewOverviewInput } from "@fitness-battle/shared";
import { useCrewPassport } from "./use-crew-passport";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { Sheet } from "@/ui/sheet";

export function useCrewContractModal(crewId: string, input: CrewOverviewInput) {
  const { sport, units, now } = input;
  const passport = useCrewPassport(crewId, input);
  const { data, error: loadError, reload, save: write, available, unavailable } = passport;
  const contract = data?.contract ?? null;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [panel, setPanel] = useState<"contract" | "passport" | "season" | null>(null);
  const [editing, setEditing] = useState(false);
  const [expectedId, setExpectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<CrewContractMetric>(sport === "strength" ? "sessions" : "distance_m");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  function editContract() {
    setExpectedId(contract?.id ?? null);
    setTitle(contract?.title ?? "");
    setMetric(contract?.metric ?? (sport === "strength" ? "sessions" : "distance_m"));
    setTarget(contract ? String(contract.target / (contract.metric === "distance_m" ? 1000 : contract.metric === "moving_sec" ? 3600 : 1)) : "");
    setEditing(true);
  }
  function openSummary() { setPanel("contract"); setEditing(false); setError(""); }
  function openEditor() { setPanel("contract"); setError(""); editContract(); }
  function openPassport() { setPanel("passport"); setEditing(false); setError(""); }
  function openSeason() {
    setTitle(""); setStart(dayKey(weeklyPeriodBounds(new Date(now)).startsAt, APP_TIMEZONE)); setEnd(""); setPanel("season"); setError("");
  }
  async function save(body: CrewPassportMutation) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try { await write(body); setEditing(false); setPanel(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save your crew."); }
    finally { flight.current = false; setBusy(false); }
  }
  function submit() {
    try {
      if (panel === "season") void save({ action: "season", crewId, title, ...crewSeasonBounds(start, end) });
      else void save({ action: "contract", crewId, title, metric, target: crewContractTarget(metric, target), expectedId });
    } catch (e) { setError((e as Error).message); }
  }
  const sheet = <Sheet open={panel !== null} minimal title={panel === "contract" ? "Weekly contract" : panel === "season" ? "New season" : "Crew passport"} body="" onClose={() => { if (!busy) setPanel(null); }}>
    {!available ? <AppParagraph typographyRole="body">{unavailable}</AppParagraph> : !data ? <><AppParagraph typographyRole="body">{error || loadError || "Loading your crew…"}</AppParagraph><button className="fb-btn-line" onClick={() => void reload().catch(e => setError(e.message))}>Refresh</button></> : panel === "season" || editing ? <div className="crew-editor">
      <label className="fb-field">Name<input maxLength={80} value={title} onChange={e => setTitle(e.target.value)} disabled={busy} /></label>
      {panel === "season" ? <><label className="fb-field">Start date · Eastern<input type="date" value={start} onChange={e => setStart(e.target.value)} disabled={busy} /></label><label className="fb-field">End date · Eastern<input type="date" value={end} onChange={e => setEnd(e.target.value)} disabled={busy} /></label><AppParagraph typographyRole="caption">Contracts fully inside these dates earn stamps. Earned stamps stay in your passport.</AppParagraph></> : <><label className="fb-field">Measure<select value={metric} onChange={e => setMetric(e.target.value as CrewContractMetric)} disabled={busy}>{crewContractMetrics(sport).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><label className="fb-field">Target<input type="number" min="0" step="any" value={target} onChange={e => setTarget(e.target.value)} disabled={busy} /></label><AppParagraph typographyRole="caption">This week’s active members are included. Changing the contract replaces its objective; stamps settle at week close.</AppParagraph></>}
      <button className="fb-btn" disabled={busy || !title.trim()} onClick={submit}>{busy ? "Saving…" : panel === "season" ? "Create season" : "Save contract"}</button>
    </div> : panel === "contract" ? <div className="crew-editor">
      {contract ? <><AppHeading level={3} role="display">{contract.title}</AppHeading><AppText role="value">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}</AppText><AppParagraph typographyRole="caption">{contract.contributors} / {contract.roster_size} teammates contributed.</AppParagraph></> : <AppParagraph typographyRole="body">Choose one shared objective for this week.</AppParagraph>}
      <button className="fb-btn" onClick={editContract}>{contract ? "Change contract" : "Set contract"}</button>
    </div> : <div className="crew-editor">
      {data.seasons.map(s => <section key={s.id}><AppHeading level={3} role="heading">{s.title}</AppHeading><AppParagraph typographyRole="caption">{new Date(s.starts_at).toLocaleDateString("en-US", { timeZone: s.time_zone })} – {new Date(s.ends_at).toLocaleDateString("en-US", { timeZone: s.time_zone })}</AppParagraph><div className="crew-detail-stamps">{data.stamps.filter(stamp => stamp.season_id === s.id).map(stamp => <div className="is-earned" key={stamp.id}><span aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS[crewStampIcon(stamp.code)]} /></svg></span><div><AppText role="row">{crewStampLabel(stamp.code)}</AppText><AppParagraph typographyRole="caption">{new Date(stamp.earned_at).toLocaleDateString("en-US", { timeZone: s.time_zone })}</AppParagraph></div></div>)}</div></section>)}
      {!data.seasons.length && <AppParagraph typographyRole="body">Start a season to keep your crew’s earned stamps.</AppParagraph>}
      <button className="fb-btn" onClick={openSeason}>New season</button>
    </div>}
    {panel && data && error && <AppParagraph typographyRole="body" role="alert">{error}</AppParagraph>}
  </Sheet>;
  return { passport, contract, openSummary, openEditor, openPassport, sheet };
}

export function CrewPassportCard({ passport, crewName, now, onOpen }: {
  passport: CrewPassport | null | undefined;
  crewName?: string;
  now: string;
  onOpen: () => void;
}) {
  const model = crewPassportCardModel(passport, crewName, now);
  return <section className="crew-passport-wrap">
    <div className="crew-lineup-header">
      <AppHeading level={2} role="heading">Crew passport</AppHeading>
      <button type="button" className="fb-btn-ghost" onClick={onOpen}>All records →</button>
    </div>
    <div className="crew-passport-card">
      <div className="crew-passport-head">
        <AppText role="field" secondary>{model.eyebrow}</AppText>
        <span className="crew-passport-season-pill"><AppText role="nav" secondary>{model.seasonBadge}</AppText></span>
      </div>
      <div className="crew-passport-title">
        <AppHeading level={3} role="display">{model.headline}</AppHeading>
        <AppParagraph typographyRole="support">{model.subtitle}</AppParagraph>
      </div>
      <div className="crew-passport-stamps">
        {model.slots.map(slot => <button type="button" key={slot.id} className={`crew-passport-slot is-${slot.kind}`} onClick={onOpen}>
          <span className="crew-passport-medallion" aria-hidden="true">
            {slot.kind === "earned" ? <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS[slot.icon]} /></svg>
              : slot.kind === "next" ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS.plus} /></svg>
                : <AppText role="heading" secondary>?</AppText>}
          </span>
          <AppText role="nav" secondary={slot.kind !== "earned"}>{slot.label}</AppText>
        </button>)}
      </div>
      <div className="crew-passport-footer">
        <AppText role="caption" secondary>{model.footerNote}</AppText>
        <button type="button" className="crew-passport-cta" onClick={onOpen}>Open passport →</button>
      </div>
    </div>
  </section>;
}

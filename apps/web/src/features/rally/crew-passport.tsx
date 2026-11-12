"use client";
import { useRef, useState, type ReactNode } from "react";
import { crewContractMetrics, crewContractTarget, crewContractValue, crewSeasonBounds, crewStampLabel, crewSeasonProgress, dayKey, APP_TIMEZONE, weeklyPeriodBounds, type CrewContractMetric, type CrewPassportMutation, type CrewOverviewInput } from "@fitness-battle/shared";
import { useCrewPassport } from "./use-crew-passport";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { Sheet } from "@/ui/sheet";

export function CrewPassportPanel({ crewId, input, children }: { crewId: string; input: CrewOverviewInput; children?: ReactNode }) {
  const { sport, units, now } = input;
  const { data, error: loadError, reload, save: write, available, unavailable } = useCrewPassport(crewId, input);
  const contract = data?.contract;
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
  const season = data?.seasons.find(s => Date.parse(s.starts_at) <= Date.parse(now) && Date.parse(s.ends_at) > Date.parse(now));
  const stamps = data?.stamps.filter(s => s.season_id === season?.id) ?? [];
  const progress = contract ? Math.min(100, contract.value / contract.target * 100) : 0;
  function editContract() {
    setExpectedId(contract?.id ?? null);
    setTitle(contract?.title ?? "");
    setMetric(contract?.metric ?? (sport === "strength" ? "sessions" : "distance_m"));
    setTarget(contract ? String(contract.target / (contract.metric === "distance_m" ? 1000 : contract.metric === "moving_sec" ? 3600 : 1)) : "");
    setEditing(true);
  }
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
  return <>
    <button type="button" className="crew-contract" onClick={() => { setPanel("contract"); setEditing(false); setError(""); }}>
      <AppText role="caption">Weekly contract</AppText>
      <AppText role="heading">{contract?.title ?? (available ? "Choose this week’s contract" : "Contracts unavailable")}</AppText>
      {contract && <><AppText role="caption">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}{progress >= 100 ? " · Reached" : ""}</AppText><div className="crew-contract-track"><span style={{ width: `${progress}%` }} /></div></>}
    </button>
    <div className="crew-bento">{children}<button type="button" className="crew-action-card crew-passport" onClick={() => { setPanel("passport"); setError(""); }}>
      <span>Crew Passport</span><strong>{season?.title ?? "Your next chapter"}</strong>
      <div className="crew-stamps" aria-hidden="true">{stamps.slice(0, 4).map(s => <span key={s.id}>✦</span>)}</div>
      <div className="crew-contract-track" role="progressbar" aria-label="Season elapsed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={season ? Math.round(crewSeasonProgress(season, now)) : 0}><span style={{ width: `${season ? crewSeasonProgress(season, now) : 0}%`, background: "var(--action-primary)" }} /></div>
      <small>{season ? `${stamps.length} stamps · ${new Date(season.ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: season.time_zone })}` : "Seasons & earned stamps"}</small>
    </button></div>
    {!panel && (error || loadError) && <div role="status"><AppText role="caption">{error || loadError}</AppText><button className="fb-btn-ghost" onClick={() => void reload().then(() => setError("")).catch(e => setError(e.message))}>Retry</button></div>}
    <Sheet open={panel !== null} minimal title={panel === "contract" ? "Weekly contract" : panel === "season" ? "New season" : "Your crew passport"} body="" onClose={() => { if (!busy) setPanel(null); }}>
      {!available ? <AppParagraph typographyRole="body">{unavailable}</AppParagraph> : !data ? <><AppParagraph typographyRole="body">{error || loadError || "Loading your crew…"}</AppParagraph><button className="fb-btn-line" onClick={() => void reload().catch(e => setError(e.message))}>Refresh</button></> : panel === "season" || editing ? <div className="crew-editor">
        <label className="fb-field">Name<input maxLength={80} value={title} onChange={e => setTitle(e.target.value)} disabled={busy} /></label>
        {panel === "season" ? <><label className="fb-field">Start date · Eastern<input type="date" value={start} onChange={e => setStart(e.target.value)} disabled={busy} /></label><label className="fb-field">End date · Eastern<input type="date" value={end} onChange={e => setEnd(e.target.value)} disabled={busy} /></label><AppParagraph typographyRole="caption">Contracts fully inside these dates earn stamps. Earned stamps stay in your passport.</AppParagraph></> : <><label className="fb-field">Measure<select value={metric} onChange={e => setMetric(e.target.value as CrewContractMetric)} disabled={busy}>{crewContractMetrics(sport).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><label className="fb-field">Target<input type="number" min="0" step="any" value={target} onChange={e => setTarget(e.target.value)} disabled={busy} /></label><AppParagraph typographyRole="caption">This week’s active members are included. Changing the contract replaces its objective; stamps settle at week close.</AppParagraph></>}
        <button className="fb-btn" disabled={busy || !title.trim()} onClick={submit}>{busy ? "Saving…" : panel === "season" ? "Create season" : "Save contract"}</button>
      </div> : panel === "contract" ? <div className="crew-editor">
        {contract ? <><AppHeading level={3} role="display">{contract.title}</AppHeading><AppText role="value">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}</AppText><AppParagraph typographyRole="caption">{contract.contributors} / {contract.roster_size} teammates contributed.</AppParagraph></> : <AppParagraph typographyRole="body">Choose one shared objective for this week.</AppParagraph>}
        <button className="fb-btn" onClick={editContract}>{contract ? "Change contract" : "Set contract"}</button>
      </div> : <div className="crew-editor">
        {data.seasons.map(s => <section key={s.id}><AppHeading level={3} role="heading">{s.title}</AppHeading><AppParagraph typographyRole="caption">{new Date(s.starts_at).toLocaleDateString("en-US", { timeZone: s.time_zone })} – {new Date(s.ends_at).toLocaleDateString("en-US", { timeZone: s.time_zone })}</AppParagraph><div className="crew-detail-stamps">{data.stamps.filter(stamp => stamp.season_id === s.id).map(stamp => <div className="is-earned" key={stamp.id}><span aria-hidden="true">✦</span><div><AppText role="row">{crewStampLabel(stamp.code)}</AppText><AppParagraph typographyRole="caption">{new Date(stamp.earned_at).toLocaleDateString("en-US", { timeZone: s.time_zone })}</AppParagraph></div></div>)}</div></section>)}
        {!data.seasons.length && <AppParagraph typographyRole="body">Start a season to keep your crew’s earned stamps.</AppParagraph>}
        <button className="fb-btn" onClick={openSeason}>New season</button>
      </div>}
      {panel && data && error && <AppParagraph typographyRole="body" role="alert">{error}</AppParagraph>}
    </Sheet>
  </>;
}

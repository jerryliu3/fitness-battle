"use client";
import { useRef, useState } from "react";
import { crewContractMetrics, crewContractTarget, crewContractValue, crewTargetSpec, type CrewContractMetric, type CrewPassportMutation, type CrewOverviewInput } from "@fitness-battle/shared";
import { useCrewPassport } from "./use-crew-passport";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { NumberStepper } from "@/ui/number-stepper";
import { Sheet } from "@/ui/sheet";

export function useCrewContractModal(crewId: string, input: CrewOverviewInput) {
  const { sport, units } = input;
  const passport = useCrewPassport(crewId, input);
  const { data, error: loadError, reload, save: write, available, unavailable } = passport;
  const contract = data?.contract ?? null;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [expectedId, setExpectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<CrewContractMetric>(sport === "strength" ? "sessions" : "distance_m");
  const [target, setTarget] = useState<number>(40);
  function editContract() {
    const nextMetric = contract?.metric ?? (sport === "strength" ? "sessions" : "distance_m");
    setExpectedId(contract?.id ?? null);
    setTitle(contract?.title ?? "");
    setMetric(nextMetric);
    setTarget(contract ? Math.max(1, Math.round(contract.target / (contract.metric === "distance_m" ? 1000 : contract.metric === "moving_sec" ? 3600 : 1))) : crewTargetSpec(nextMetric).defaultValue);
    setEditing(true);
  }
  function openSummary() { setOpen(true); setEditing(false); setError(""); }
  function openEditor() { setOpen(true); setError(""); editContract(); }
  async function save(body: CrewPassportMutation) {
    if (flight.current) return;
    flight.current = true; setBusy(true); setError("");
    try { await write(body); setEditing(false); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save your crew."); }
    finally { flight.current = false; setBusy(false); }
  }
  function submit() {
    try {
      void save({ action: "contract", crewId, title, metric, target: crewContractTarget(metric, String(target)), expectedId });
    } catch (e) { setError((e as Error).message); }
  }
  const targetSpec = crewTargetSpec(metric);
  const sheet = <Sheet open={open} minimal title="Weekly contract" body="" onClose={() => { if (!busy) setOpen(false); }}>
    {!available ? <AppParagraph typographyRole="body">{unavailable}</AppParagraph> : !data ? <><AppParagraph typographyRole="body">{error || loadError || "Loading your crew…"}</AppParagraph><button className="fb-btn-line" onClick={() => void reload().catch(e => setError(e.message))}>Refresh</button></> : editing ? <div className="crew-editor">
      <label className="fb-field">Name<input maxLength={80} value={title} onChange={e => setTitle(e.target.value)} disabled={busy} /></label>
      <label className="fb-field">Measure<select value={metric} onChange={e => { const next = e.target.value as CrewContractMetric; setMetric(next); setTarget(crewTargetSpec(next).defaultValue); }} disabled={busy}>{crewContractMetrics(sport).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><div className="fb-field"><span>Target</span><NumberStepper label="Contract target" value={target} min={targetSpec.min} max={targetSpec.max} step={targetSpec.step} unit={targetSpec.unit} presets={targetSpec.presets} disabled={busy} onChange={setTarget} /></div><AppParagraph typographyRole="caption">This week’s active members are included. Changing the contract replaces its objective; stamps settle at week close.</AppParagraph>
      <button className="fb-btn" disabled={busy || !title.trim()} onClick={submit}>{busy ? "Saving…" : "Save contract"}</button>
    </div> : <div className="crew-editor">
      {contract ? <><AppHeading level={3} role="display">{contract.title}</AppHeading><AppText role="value">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}</AppText><AppParagraph typographyRole="caption">{contract.contributors} / {contract.roster_size} teammates contributed.</AppParagraph></> : <AppParagraph typographyRole="body">Choose one shared objective for this week.</AppParagraph>}
      <button className="fb-btn" onClick={editContract}>{contract ? "Change contract" : "Set contract"}</button>
    </div>}
    {open && data && error && <AppParagraph typographyRole="body" role="alert">{error}</AppParagraph>}
  </Sheet>;
  return { passport, contract, openSummary, openEditor, sheet };
}

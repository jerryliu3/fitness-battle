"use client";
import { useRef, useState } from "react";
import { crewContractMetrics, crewContractTarget, crewContractValue, type CrewContractMetric, type CrewPassportMutation, type CrewOverviewInput } from "@fitness-battle/shared";
import { useCrewPassport } from "./use-crew-passport";
import { AppHeading, AppParagraph, AppText } from "@/ui/section";
import { Sheet } from "@/ui/sheet";

export function CrewContractPanel({ crewId, input }: { crewId: string; input: CrewOverviewInput }) {
  const { sport, units } = input;
  const { data, error: loadError, reload, save: write, available, unavailable } = useCrewPassport(crewId, input);
  const contract = data?.contract;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const [panel, setPanel] = useState<"contract" | null>(null);
  const [editing, setEditing] = useState(false);
  const [expectedId, setExpectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState<CrewContractMetric>(sport === "strength" ? "sessions" : "distance_m");
  const [target, setTarget] = useState("");
  const progress = contract ? Math.min(100, contract.value / contract.target * 100) : 0;
  function editContract() {
    setExpectedId(contract?.id ?? null);
    setTitle(contract?.title ?? "");
    setMetric(contract?.metric ?? (sport === "strength" ? "sessions" : "distance_m"));
    setTarget(contract ? String(contract.target / (contract.metric === "distance_m" ? 1000 : contract.metric === "moving_sec" ? 3600 : 1)) : "");
    setEditing(true);
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
      void save({ action: "contract", crewId, title, metric, target: crewContractTarget(metric, target), expectedId });
    } catch (e) { setError((e as Error).message); }
  }
  return <>
    <button type="button" className="crew-contract" onClick={() => { setPanel("contract"); setEditing(false); setError(""); }}>
      <AppText role="caption">Weekly contract</AppText><AppText role="heading">{contract?.title ?? (available ? "Choose this week’s contract" : "Contracts unavailable")}</AppText>
      {contract && <><AppText role="caption">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}{progress >= 100 ? " · Reached" : ""}</AppText><div className="crew-contract-track"><span style={{ width: `${progress}%` }} /></div></>}
    </button>
    <Sheet open={panel !== null} minimal title="Weekly contract" body="" onClose={() => { if (!busy) setPanel(null); }}>
      {!available ? <AppParagraph typographyRole="body">{unavailable}</AppParagraph> : !data ? <><AppParagraph typographyRole="body">{error || loadError || "Loading your crew…"}</AppParagraph><button className="fb-btn-line" onClick={() => void reload().catch(e => setError(e.message))}>Refresh</button></> : editing ? <div className="crew-editor">
        <label className="fb-field">Name<input maxLength={80} value={title} onChange={e => setTitle(e.target.value)} disabled={busy} /></label>
        <label className="fb-field">Measure<select value={metric} onChange={e => setMetric(e.target.value as CrewContractMetric)} disabled={busy}>{crewContractMetrics(sport).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
        <label className="fb-field">Target<input type="number" min="0" step="any" value={target} onChange={e => setTarget(e.target.value)} disabled={busy} /></label>
        <AppParagraph typographyRole="caption">This week’s active members are included. Changing the contract replaces its objective; stamps settle at week close.</AppParagraph>
        <button className="fb-btn" disabled={busy || !title.trim()} onClick={submit}>{busy ? "Saving…" : "Save contract"}</button>
      </div> : <div className="crew-editor">
        {contract ? <><AppHeading level={3} role="display">{contract.title}</AppHeading><AppText role="value">{crewContractValue(contract.metric, contract.value, units)} / {crewContractValue(contract.metric, contract.target, units)}</AppText><AppParagraph typographyRole="caption">{contract.contributors} / {contract.roster_size} teammates contributed.</AppParagraph></> : <AppParagraph typographyRole="body">Choose one shared objective for this week.</AppParagraph>}
        <button className="fb-btn" onClick={editContract}>{contract ? "Change contract" : "Set contract"}</button>
      </div>}
      {error && <AppParagraph typographyRole="body" role="alert">{error}</AppParagraph>}
    </Sheet>
  </>;
}

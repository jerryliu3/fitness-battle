"use client";
import { AppParagraph, Section } from "@/ui/section";

import { useEffect, useRef, useState } from "react";
import { SPORTS, type SportId } from "@fitness-battle/shared";
import type { ScenarioAction } from "@/lib/admin-scenario";

interface Preview {
  name: string; updatedAt: string; generatedCount: number;
  enrollments: { sport: string; waveStart: string; weekEnd: string; autoEnrollNext: boolean }[];
  results: { sport: string; place: number; acknowledgedAt: string | null }[];
  fields: { id: string; name: string; sport: string; member_ids: string[] }[];
}
const ACTIONS: { id: ScenarioAction; label: string; help: string }[] = [
  { id: "add-activity", label: "Add activity", help: "Adds a counted session to this athlete. Simulated GPS exercises Verified too; it does not connect a tracker." },
  { id: "register", label: "Register sport", help: "Uses ordinary registration defaults. Open Compete as this athlete afterward to seat their field. Settle any overdue rounds first." },
  { id: "stop-renewal", label: "Stop after this wave", help: "Keeps the current wave and turns off automatic registration for the next wave." },
  { id: "resume-renewal", label: "Resume next-wave registration", help: "Re-enables automatic renewal of the selected sport." },
  { id: "remove-registration", label: "Remove registration now", help: "Immediately removes this sport enrollment and active field seats without settling results. Use this to reset a test registration." },
  { id: "join-field", label: "Join opponent’s field", help: "Moves the selected sport into the opponent’s active field. Register both athletes first. Private fields require existing Crew membership; full fields are rejected." },
  { id: "overtake", label: "Arrange an overtake", help: "Adds enough activity for one athlete to pass the other on the selected track. Both must share an active field and the mover must be behind; add a leader activity first if tied. It changes data; the normal Compete refresh produces the return animation." },
  { id: "reset-activities", label: "Remove lab activities", help: "Deletes only activities created by this lab for this athlete and sport. Existing sessions and settled results are retained." },
  { id: "replay-results", label: "Replay latest sport results", help: "Marks the latest settled sport results unseen again. Return to Compete on the test device to exercise its normal results takeover." },
];
const readable = (value: string) => value.replaceAll("_", " ");
export function AdminScenarioControls({ target, owner, onTargetChange }: { target: string; owner: string; onTargetChange: (value: string) => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sport, setSport] = useState<SportId>("running");
  const [action, setAction] = useState<ScenarioAction>("add-activity");
  const [opponent, setOpponent] = useState("");
  const [miles, setMiles] = useState("3.1"), [minutes, setMinutes] = useState("30");
  const [startedAt, setStartedAt] = useState("");
  const [verified, setVerified] = useState(false), [direction, setDirection] = useState("pass");
  const [reason, setReason] = useState(""), [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const scope = `${owner}:${target}`;
  const scopeRef = useRef(scope), sequence = useRef(0);
  if (scopeRef.current !== scope) { scopeRef.current = scope; sequence.current++; }
  useEffect(() => { setPreview(null); setConfirmation(""); setNote(""); setBusy(false); setOpponent(""); }, [scope]);
  async function load() {
    if (!target) { onTargetChange(owner); return; }
    const request = ++sequence.current;
    setBusy(true); setPreview(null); setNote("");
    try {
      const response = await fetch(`/api/admin/scenarios?target=${encodeURIComponent(target)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (sequence.current === request) setPreview(body);
    } catch (error) { if (sequence.current === request) setNote(readable(error instanceof Error ? error.message : "Could not load athlete.")); }
    finally { if (sequence.current === request) setBusy(false); }
  }
  async function run() {
    if (!preview || busy) return;
    const request = ++sequence.current;
    setBusy(true); setNote("");
    try {
      const date = startedAt ? new Date(startedAt) : null;
      if (date && !Number.isFinite(date.getTime())) throw new Error("Choose a valid activity time.");
      const response = await fetch("/api/admin/scenarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        target, updatedAt: preview.updatedAt, actionId: crypto.randomUUID(), action, sport, opponent, direction,
        distanceM: sport === "strength" ? 0 : Number(miles) * 1609.344, movingSec: Number(minutes) * 60,
        startedAt: date?.toISOString() ?? "", verified: sport === "strength" ? false : verified, reason, confirmation,
      }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (sequence.current === request) setNote(`Saved. Affected athlete: ${body.affectedAthlete}. Return to their app and refresh Compete. Audit ID: ${body.actionId}. Reload the preview before another action.`);
    } catch (error) { if (sequence.current === request) setNote(readable(error instanceof Error ? error.message : "Scenario failed. Reload preview.")); }
    finally { if (sequence.current === request) { setBusy(false); setPreview(null); setConfirmation(""); } }
  }
  const activity = action === "add-activity", overtake = action === "overtake";
  return <Section className="fb-card" style={{ padding: 20, marginTop: 24 }} aria-label="Compete scenario lab" title="Compete scenario lab">

    <AppParagraph typographyRole="body">These controls change the selected database account, including real production athletes. Use a dedicated test account for repeatable scenarios. Web and Expo read the same changes.</AppParagraph>
    <label>Athlete UUID<input className="fb-input" disabled={busy} value={target} placeholder={owner} onChange={(event) => onTargetChange(event.target.value.trim())}/></label>
    {!target && <button className="fb-btn-line" onClick={() => onTargetChange(owner)}>Use my account</button>}
    <button className="fb-btn-line" disabled={busy || !target} onClick={() => void load()}>Load scenario preview</button>
    {preview && <>
      <AppParagraph typographyRole="body"><strong>{preview.name}</strong> · {preview.generatedCount} lab activities · {preview.results.length} recent sport results</AppParagraph>
      <ul>{preview.enrollments.map((row) => <li key={row.sport}>{row.sport}: {new Date(row.waveStart).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })} – {new Date(row.weekEnd).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })} · {row.autoEnrollNext ? "renews" : "stops after wave"}</li>)}</ul>
      <label>Sport<select disabled={busy} value={sport} onChange={(event) => setSport(event.target.value as SportId)}>{SPORTS.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label>Scenario<select disabled={busy} value={action} onChange={(event) => { setAction(event.target.value as ScenarioAction); setConfirmation(""); }}>{ACTIONS.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label>
      <AppParagraph typographyRole="body">{ACTIONS.find((row) => row.id === action)?.help}</AppParagraph>
      {(activity || overtake) && sport !== "strength" && <label>Score track<select disabled={busy} value={verified ? "verified" : "open"} onChange={(event) => setVerified(event.target.value === "verified")}><option value="open">Manual · Open only</option><option value="verified">Simulated GPS · Open + Verified</option></select></label>}
      {activity && <>
        {sport !== "strength" && <label>Miles<input className="fb-input" type="number" min="0" step="0.1" disabled={busy} value={miles} onChange={(event) => setMiles(event.target.value)}/></label>}
        <label>Duration (minutes)<input className="fb-input" type="number" min="1" disabled={busy} value={minutes} onChange={(event) => setMinutes(event.target.value)}/></label>
        <label>Activity time (your browser’s timezone; blank = now)<input className="fb-input" type="datetime-local" disabled={busy} value={startedAt} onChange={(event) => setStartedAt(event.target.value)}/></label>
        <AppParagraph typographyRole="body">Use earlier dates to test day grouping. The activity must fall within the competition window to affect its standings.</AppParagraph>
      </>}
      {(overtake || action === "join-field") && <>
        <label>Opponent UUID<input className="fb-input" list="scenario-field-members" disabled={busy} value={opponent} onChange={(event) => setOpponent(event.target.value.trim())}/></label>
        <datalist id="scenario-field-members">{[...new Set(preview.fields.filter((field) => field.sport === sport).flatMap((field) => field.member_ids))].filter((id) => id !== target).map((id) => <option key={id} value={id}/>)}</datalist>
      </>}
      {overtake && <label>Direction<select disabled={busy} value={direction} onChange={(event) => setDirection(event.target.value)}><option value="pass">Selected athlete passes opponent</option><option value="be-passed">Opponent passes selected athlete</option></select></label>}
      <label>Reason<input className="fb-input" maxLength={1000} disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)}/></label>
      <label>Type SCENARIO {target}<input className="fb-input" disabled={busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)}/></label>
      <button className="fb-btn" disabled={busy || reason.trim().length < 8 || confirmation !== `SCENARIO ${target}`} onClick={() => void run()}>Apply scenario to account</button>
    </>}
    {note && <AppParagraph typographyRole="body" role="status">{note}</AppParagraph>}
    <details><summary>How to test the actual Compete experience</summary>
      <ol>
        <li>Sign into the athlete on a separate browser profile, tab, or Expo device. Keep the admin account here.</li>
        <li>Register both athletes and open Compete as each one. Join the opponent’s field here if needed.</li>
        <li>Open Compete on the observed device once to record the current field, then leave the app or tab.</li>
        <li>Arrange an overtake or add an activity here, then return to the observed device. Normal refresh handles the movement and new-activity experience. A fresh device has no previous field to compare.</li>
        <li>Use field-wide wave controls below to close a round or start the next wave. Replay latest sport results marks the recap unseen again.</li>
        <li>Remove lab activities for each affected athlete and sport to reset test volume. Registration and settled results are separate; this does not rewind ratings or clear the test device’s seen-history.</li>
      </ol>
    </details>
  </Section>;
}

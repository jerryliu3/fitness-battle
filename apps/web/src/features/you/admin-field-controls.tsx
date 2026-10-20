"use client";
import { useEffect, useRef, useState } from "react";
interface Field { id: string; name: string; sport: string; member_ids: string[]; wave_start: string; week_end: string; updated_at: string }
/** Production-only admin UI. No product state mutation or simulated clock. */
export function AdminFieldControls({ target, owner }: { target: string; owner: string }) {
  const [fields, setFields] = useState<Field[]>([]);
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const scope = `${owner}:${target}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  useEffect(() => { setFields([]); setSelected(""); setConfirmation(""); setNote(""); setBusy(false); }, [scope]);
  const field = fields.find((row) => row.id === selected);
  async function load() {
    const key = scope; setBusy(true); setNote(""); setFields([]); setSelected("");
    try {
      const response = await fetch(`/api/admin/fields?target=${encodeURIComponent(target)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (scopeRef.current !== key) return;
      setFields(body.fields); setSelected(body.fields[0]?.id ?? "");
      if (!body.fields.length) setNote("This athlete has no active field.");
    } catch (error) { if (scopeRef.current === key) setNote(error instanceof Error ? error.message : "Could not load fields."); }
    finally { if (scopeRef.current === key) setBusy(false); }
  }
  async function run(action: "close-field" | "restart-field") {
    if (!field || busy) return;
    const key = scope; setBusy(true); setNote("");
    try {
      const response = await fetch("/api/admin/fields", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, fieldId: field.id, updatedAt: field.updated_at, action, actionId: crypto.randomUUID(), reason, confirmation }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (scopeRef.current !== key) return;
      setNote(`Saved for ${body.affectedAthletes} athletes. Next wave: ${new Date(body.nextStartsAt).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })} → ${new Date(body.nextEndsAt).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })}. Audit ID: ${body.actionId}`);
    } catch (error) { if (scopeRef.current === key) setNote(error instanceof Error ? error.message : "Wave change failed."); }
    finally { if (scopeRef.current === key) { setFields([]); setSelected(""); setConfirmation(""); setBusy(false); } }
  }
  const enabled = field && confirmation === `WAVE ${field.id}` && reason.trim().length >= 8 && !busy;
  return <section>
    <h2>Field-wide wave controls</h2>
    <p>Uses the athlete ID above. These actions close the selected field for all seated athletes and save real results. Athletes scheduled to stop are not enrolled again.</p>
    <button className="fb-btn-line" disabled={busy || !target} onClick={() => void load()}>Load athlete’s active fields</button>
    {fields.length > 0 && <>
      <label>Field<select disabled={busy} value={selected} onChange={(event) => { setSelected(event.target.value); setConfirmation(""); }}>{fields.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.sport} · {row.member_ids.length} athletes</option>)}</select></label>
      {field && <p>Field ID: {field.id}. Current wave ends {new Date(field.week_end).toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" })}.</p>}
      <label>Reason<input className="fb-input" value={reason} maxLength={1000} disabled={busy} onChange={(event) => setReason(event.target.value)}/></label>
      <label>Type WAVE {selected}<input className="fb-input" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)}/></label>
      <div className="focus-actions">
        <button className="fb-btn-line" disabled={!enabled} onClick={() => void run("close-field")}>End field now · next wave Monday</button>
        <button className="fb-btn" disabled={!enabled} onClick={() => void run("restart-field")}>End field + start next wave now</button>
      </div>
      <p>Starting now creates a fresh activity window ending next Monday at midnight Eastern. Ending only schedules the next normal Monday–Monday wave.</p>
    </>}
    {note && <p role="status">{note}</p>}
  </section>;
}

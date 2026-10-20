"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { activityFromSample, parseManualActivity, SPORTS, sportById, type ActivitySample, type ReadinessSample, type SportId } from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { Sheet } from "@/ui/sheet";

export function ActivityActions() {
  const { user } = useAuth();
  const owner = useRef(user?.id);
  owner.current = user?.id;
  const { state, dispatch, loadStatus, saveError } = useCompete();
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState<SportId>("running");
  const [miles, setMiles] = useState("");
  const [minutes, setMinutes] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  if (!state) return null;
  const ready = Boolean(user) && loadStatus !== "loading" && loadStatus !== "failed";

  async function sync() {
    if (!ready || busy) return;
    const accountId = user!.id;
    const providers = state!.links.filter((link) => link.linked && ["strava", "garmin", "whoop", "oura"].includes(link.provider));
    if (!providers.length) { setNote("Connect a tracker in Athlete to sync activities."); return; }
    setBusy(true);
    setNote("");
    const messages: string[] = [];
    try {
      for (const link of providers) {
        if (owner.current !== accountId) return;
        const response = await fetch("/api/fitness/sync", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: link.provider, userId: user!.id }),
        });
        const body = await response.json() as { activities?: ActivitySample[]; readiness?: ReadinessSample[]; usedMock?: boolean; persisted?: boolean; error?: string };
        if (owner.current !== accountId) return;
        if (!response.ok) { messages.push(`${link.provider}: sync failed. Try again in Athlete.`); continue; }
        const activities = (body.activities ?? []).flatMap((sample) => {
          const activity = activityFromSample(sample, body.usedMock ? "demo" : "recorded");
          return activity ? [activity] : [];
        });
        dispatch({ type: "apply-sync", provider: link.provider, activities, readiness: (body.readiness ?? []).flatMap((sample) => sample.provider === link.provider ? [{ id: sample.id, provider: link.provider, day: sample.day, score: sample.score }] : []), linkStatus: body.usedMock ? "stub" : "connected" });
        messages.push(body.usedMock ? `${link.provider}: sample data only; not a live connection.` : `${link.provider}: sync complete.`);
      }
      if (owner.current === accountId) setNote(messages.join(" "));
    } catch { if (owner.current === accountId) setNote("Sync could not finish. Retry from Athlete → Connections."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="focus-actions" aria-label="Activity actions">
      <button type="button" className="fb-btn-line" disabled={!ready || busy} onClick={() => void sync()}>{busy ? "Syncing…" : "Sync activities"}</button>
      <button type="button" className="fb-btn" disabled={!ready || busy} onClick={() => { setFormError(""); setOpen(true); }}>Add activity</button>
      {!user && <Link href="/login?next=/today">Sign in to add or sync</Link>}
    </div>
    {note && <p role="status" className="fb-note">{note} <Link href="/you?panel=connections">Tracker settings</Link></p>}
    {saveError && <p role="alert" className="fb-note">Your activity has not saved to your account yet. {saveError}</p>}
    <Sheet open={open} onClose={() => setOpen(false)} title="Add today’s activity" body="Manual activities count in Open standings only.">
      <form style={{ display: "grid", gap: 16 }} onSubmit={(event) => {
        event.preventDefault();
        if (!ready) return;
        const parsed = parseManualActivity(sport, miles, minutes);
        if (parsed.error !== null) { setFormError(parsed.error); return; }
        const { movingSec, distanceM } = parsed;
        dispatch({ type: "log-manual", sport, movingSec, distanceM, activityId: `manual-${crypto.randomUUID()}` });
        setOpen(false); setMiles(""); setMinutes(""); setNote("Activity added for today · Open standings only.");
      }}>
        <label>Sport<select className="fb-input" value={sport} onChange={(event) => setSport(event.target.value as SportId)}>{SPORTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {sportById(sport).gps && <label>Mileage<input className="fb-input" required type="number" min="0" max="1242" step="0.01" value={miles} onChange={(event) => setMiles(event.target.value)}/></label>}
        <label>Duration (minutes)<input className="fb-input" required type="number" min="0.1" max="1440" step="0.1" value={minutes} onChange={(event) => setMinutes(event.target.value)}/></label>
        {formError && <p role="alert" className="fb-note">{formError}</p>}
        <button disabled={!ready} type="submit" className="fb-btn">Add activity</button>
      </form>
    </Sheet>
  </>;
}

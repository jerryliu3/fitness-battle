"use client";
import { AppParagraph, SectionHeader, AppHeading } from "@/ui/section";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { competeNow, freshState, reduceCompete, rollClock, webProductPath, type CompeteState } from "@fitness-battle/shared";
import { useCompete } from "@/components/compete-context";
import { useAuth } from "@/components/auth-context";
import { WeekReveal } from "@/features/split/components/week-reveal";
import { isAdminEmail } from "@/lib/auth/admin-access";
import { buildLoginHref } from "@/lib/auth/login-redirect";
import { AdminScenarioControls } from "@/features/you/admin-scenario-controls";
import { AdminRouteControls } from "@/features/you/admin-route-controls";
import { AdminFieldControls } from "@/features/you/admin-field-controls";

export default function AdminLab() {
  const router = useRouter();
  const { state, refresh } = useCompete();
  const { user, loading } = useAuth();
  const [sandbox, setSandbox] = useState<CompeteState | null>(null);
  const [previewResults, setPreviewResults] = useState(false);
  const [target, setTarget] = useState("");
  const [preview, setPreview] = useState<{ name: string; updatedAt: string; enrollments: unknown; results: unknown } | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [action, setAction] = useState("settle-due");
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const owner = useRef(user?.id); owner.current = user?.id;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace(buildLoginHref("/app/admin"));
      } else if (!isAdminEmail(user.email)) {
        router.replace(webProductPath("/today?denied=admin"));
      }
    }
  }, [loading, user, router]);

  useEffect(() => { setBusy(false); setSandbox(null); setPreview(null); setTarget(""); setConfirmation(""); setNote(""); }, [user?.id]);
  const local = sandbox ?? state ?? freshState();
  function change(action: Parameters<typeof reduceCompete>[1]) { setSandbox(reduceCompete(local, action)); }
  async function load() {
    const accountId = user?.id;
    const targetId = target || accountId || "";
    setBusy(true); setNote(""); setPreview(null);
    try {
      const response = await fetch(`/api/admin/compete?target=${encodeURIComponent(targetId)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (owner.current !== accountId) return;
      setTarget(targetId); setPreview(body);
    } catch (error) { if (owner.current === accountId) setNote(error instanceof Error ? error.message : "Could not load account."); }
    finally { if (owner.current === accountId) setBusy(false); }
  }

  if (loading || !user || !isAdminEmail(user.email)) {
    return null;
  }

  return <main className="fb-card" style={{ padding: 24, maxWidth: 800, margin: "auto" }}>
    <AppHeading level={1} role="display">Round lab</AppHeading>
    <AppParagraph typographyRole="body" className="fb-copy">Local simulation is isolated from your account. Production settlement below writes real results.</AppParagraph>
    <section><SectionHeader title="Local sandbox"/>
      <AppParagraph typographyRole="body">{competeNow(local).toLocaleString()} · {local.activities.length} sessions · {local.periodResults.length} results</AppParagraph>
      <div className="focus-actions">
        <button className="fb-btn-line" onClick={() => setSandbox(structuredClone(state ?? freshState()))}>Copy current account</button>
        <button className="fb-btn-line" onClick={() => change({ type: "opt-in", sport: "running" })}>Join running</button>
        <button className="fb-btn-line" onClick={() => change({ type: "log-manual", sport: "running", distanceM: 5000, movingSec: 1800, activityId: `lab-${crypto.randomUUID()}` })}>Add 5 km session</button>
        <button className="fb-btn-line" onClick={() => { const demoNow = new Date(competeNow(local).getTime() + 86400000).toISOString(); setSandbox(rollClock({ ...local, demoNow }, new Date(demoNow))); }}>Advance one day</button>
        <button className="fb-btn" onClick={() => { change({ type: "debug-close-week" }); setPreviewResults(true); }}>Close round & show results</button>
        <button className="fb-btn-line" onClick={() => { setSandbox({ ...local, periodResults: local.periodResults.map((result) => ({ ...result, acknowledgedAt: null })) }); setPreviewResults(true); }}>Preview results again</button>
        <button className="fb-btn-line" onClick={() => { setSandbox(null); setPreviewResults(false); }}>Reset sandbox</button>
      </div>
      {previewResults && <WeekReveal state={local} ready preview onDismiss={(revealIds) => { setSandbox(reduceCompete(local, { type: "acknowledge-reveal", revealIds })); setPreviewResults(false); }}/>}
      <details><summary>Sandbox rounds</summary><pre style={{ overflow: "auto" }}>{JSON.stringify({ enrollments: local.enrollments, results: local.periodResults }, null, 2)}</pre></details>
    </section>
    {user.mode === "supabase" && <section>
      <SectionHeader title="Production settlement"/>
      <AppParagraph typographyRole="body">Load an athlete first. Closing an open round early records real results and advances their enrollment to the next round. Other athletes are not modified.</AppParagraph>
      <label>Athlete account ID<input className="fb-input" disabled={busy} value={target} placeholder={user.id} onChange={(event) => { setTarget(event.target.value); setPreview(null); }}/></label>
      <button className="fb-btn-line" disabled={busy} onClick={() => void load()}>Load account preview</button>
      {preview && <>
        <AppHeading level={3} role="heading">{preview.name}</AppHeading><pre style={{ overflow: "auto" }}>{JSON.stringify(preview.enrollments, null, 2)}</pre>
        <label>Action<select disabled={busy} value={action} onChange={(event) => setAction(event.target.value)}><option value="settle-due">Settle only rounds already due</option><option value="close-round">Close current round early</option></select></label>
        <label>Reason<input className="fb-input" disabled={busy} minLength={8} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)}/></label>
        <label>Type SETTLE {target}<input className="fb-input" disabled={busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)}/></label>
        <button className="fb-btn" disabled={busy || confirmation !== `SETTLE ${target}` || reason.trim().length < 8} onClick={async () => {
          const accountId = user.id;
          setBusy(true); setNote("");
          try {
            const response = await fetch("/api/admin/compete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, action, reason, confirmation, updatedAt: preview.updatedAt, actionId: crypto.randomUUID() }) });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error);
            if (owner.current !== accountId) return;
            setNote(`Saved real settlement. Audit ID: ${body.actionId}`);
            setPreview(null); setConfirmation("");
            if (target === user.id) await refresh();
          } catch (error) { if (owner.current === accountId) { setNote(error instanceof Error ? error.message : "Settlement failed. Reload before retrying."); setPreview(null); } }
          finally { if (owner.current === accountId) setBusy(false); }
        }}>Run production settlement</button>
      </>}
    </section>}
    {user.mode === "supabase" && <AdminScenarioControls target={target} owner={user.id} onTargetChange={(value) => { setTarget(value); setPreview(null); }}/>}
    {user.mode === "supabase" && <AdminFieldControls target={target} owner={user.id}/>}
    {user.mode === "supabase" && <AdminRouteControls key={user.id}/>}
    {note && <AppParagraph typographyRole="body" role="status">{note}</AppParagraph>}
  </main>;
}

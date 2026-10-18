"use client";

import { useState, type FormEvent } from "react";
import { Sheet } from "@/ui/sheet";

export function ReportIssue() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn't send your report. Please try again.");
      setSent(true);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send your report. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="fb-btn-line" style={{ flex: 1, justifyContent: "center" }} onClick={() => {
      setSent(false);
      setError("");
      setOpen(true);
    }}>Report an issue</button>
    <Sheet open={open} title="Report an issue" body="Tell us what happened and what you expected. Please leave out passwords and other sensitive details." onClose={() => setOpen(false)}>
      {sent ? <p className="fb-note" role="status">Report sent. Thanks for helping us improve Overtaek.</p> : <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label htmlFor="issue-description">What went wrong?</label>
        <textarea id="issue-description" style={{ width: "100%", boxSizing: "border-box", padding: 12, border: "1px solid var(--line)", borderRadius: 12, font: "inherit", resize: "vertical" }} rows={6} minLength={10} maxLength={5000} required value={message} onChange={(event) => setMessage(event.target.value)} disabled={busy} />
        {error ? <p className="fb-error" role="alert">{error}</p> : null}
        <button type="submit" className="fb-btn" disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
      </form>}
    </Sheet>
  </>;
}

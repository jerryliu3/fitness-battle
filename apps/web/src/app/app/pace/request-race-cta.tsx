"use client";

import { useState, type FormEvent } from "react";
import { Sheet } from "@/ui/sheet";
import { AppParagraph } from "@/ui/section";
import { playCue } from "@/lib/haptics";

export function RequestRaceCta({
  surface,
}: {
  surface: "observatory" | "replay";
}) {
  const [open, setOpen] = useState(false);
  const [race, setRace] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rankings/race-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ race, name, email, website, surface }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "We couldn't send your request. Please try again.");
      }
      setSent(true);
      setRace("");
      void playCue("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send your request. Please try again.");
      void playCue("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="ovt-request-race-wrap">
      <button
        type="button"
        className="ovt-btn primary ovt-request-race-btn"
        title="Don't see your race here? Let us know which race to add."
        onClick={() => {
          setSent(false);
          setError("");
          setOpen(true);
        }}
      >
        + Request a race
      </button>
      <span className="ovt-request-race-hint">Don&apos;t see your race?</span>

      <Sheet
        open={open}
        title="Request a race"
        body="Don't see your race here? Share the race name, year, and any results or course link."
        onClose={() => setOpen(false)}
      >
        {sent ? (
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <AppParagraph typographyRole="body" className="fb-note" role="status">
              Request sent. Thanks — we&apos;ll review it for upcoming race coverage.
            </AppParagraph>
            <button type="button" className="fb-btn" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label htmlFor={`request-race-text-${surface}`}>Which race should we add?</label>
              <textarea
                id={`request-race-text-${surface}`}
                placeholder="e.g. Vancouver Marathon 2026 (optional results or course URL)"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  font: "inherit",
                  resize: "vertical",
                }}
                rows={4}
                minLength={2}
                maxLength={2000}
                required
                value={race}
                onChange={(e) => setRace(e.target.value)}
                disabled={busy}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor={`request-race-name-${surface}`}>Name (optional)</label>
                <input
                  id={`request-race-name-${surface}`}
                  type="text"
                  maxLength={120}
                  placeholder="Your name"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    font: "inherit",
                  }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label htmlFor={`request-race-email-${surface}`}>Email (optional)</label>
                <input
                  id={`request-race-email-${surface}`}
                  type="email"
                  maxLength={254}
                  placeholder="you@example.com"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    font: "inherit",
                  }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
            />

            {error ? (
              <AppParagraph typographyRole="body" className="fb-error" role="alert">
                {error}
              </AppParagraph>
            ) : null}

            <button type="submit" className="fb-btn" disabled={busy || race.trim().length < 2}>
              {busy ? "Sending…" : "Send request"}
            </button>
          </form>
        )}
      </Sheet>
    </span>
  );
}

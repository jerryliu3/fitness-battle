"use client";
import { AppParagraph } from "@/ui/section";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatVolume,
  repeatStatus,
  type PeriodResult,
  type UnitSystem,
  type WeeklySocial,
} from "@fitness-battle/shared";
import { useAuth } from "@/components/auth-context";
export function WeeklySocialActions({
  result,
  units,
}: {
  result: PeriodResult;
  units: UnitSystem;
}) {
  const { user, offlineMode } = useAuth(),
    [data, setData] = useState<WeeklySocial | null>(null),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    flight = useRef(false);
  const query = new URLSearchParams({
    sport: result.sport,
    start: result.periodStart,
    end: result.periodEnd,
    track: result.track,
  }).toString();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const r = await fetch(`/api/compete/social?${query}`, { signal });
      if (!r.ok) throw Error();
      setData(await r.json());
    },
    [query],
  );
  useEffect(() => {
    if (!user || offlineMode) return;
    const c = new AbortController();
    void load(c.signal).catch(() => {
      if (!c.signal.aborted) setError("Could not load the settled field.");
    });
    return () => c.abort();
  }, [load, user?.id, offlineMode]);
  const peer = data?.peers.find((p) => p.id === selected) ?? data?.peers[0];
  async function toggle(kind: "congrats" | "repeat") {
    if (!peer || !data?.fieldId || flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/compete/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId: data.fieldId,
          recipientId: peer.id,
          track: result.track,
          kind,
          enabled: !peer[kind],
        }),
      });
      if (!r.ok) throw Error();
      await load().catch(() =>
        setError("Saved. Refresh to see the latest choices."),
      );
    } catch {
      setError("Could not save your choice. Try again.");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  if (!user || offlineMode) return null;
  if (error && !data)
    return (
      <AppParagraph typographyRole="body" role="alert">
        {error}{" "}
        <button
          className="fb-btn-ghost"
          onClick={() =>
            void load()
              .then(() => setError(""))
              .catch(() => setError("Could not load the settled field."))
          }
        >
          Retry
        </button>
      </AppParagraph>
    );
  if (!peer) return null;
  return (
    <section className="week-social">
      {data?.receivedCongrats ? (
        <AppParagraph typographyRole="body" className="fb-copy">
          {data.receivedCongrats} congrats from your field
        </AppParagraph>
      ) : null}
      <label className="fb-field">
        Athlete
        {data!.peers.length > 1 ? (
          <select value={peer.id} onChange={(e) => setSelected(e.target.value)}>
            {data!.peers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <span>{peer.name}</span>
        )}
      </label>
      <AppParagraph typographyRole="body">
        <b>{peer.name}</b> · #{peer.place} ·{" "}
        {formatVolume(result.sport, peer.distanceM, peer.movingSec, units)}
      </AppParagraph>
      <div className="focus-row">
        <button
          className="fb-btn-line"
          aria-pressed={peer.congrats}
          disabled={busy}
          onClick={() => void toggle("congrats")}
        >
          {peer.congrats ? "Congrats ✓" : "Congrats"}
        </button>
        <button
          className="fb-btn-line"
          aria-pressed={peer.repeat}
          disabled={busy || (!peer.repeat && !peer.canRepeat)}
          onClick={() => void toggle("repeat")}
        >
          {peer.repeat ? "Race again ✓" : "Race again"}
        </button>
      </div>
      <AppParagraph typographyRole="body" className="fb-copy" aria-live="polite">
        {repeatStatus(peer.status)}
      </AppParagraph>
      {error ? <AppParagraph typographyRole="body" role="alert">{error}</AppParagraph> : null}
    </section>
  );
}

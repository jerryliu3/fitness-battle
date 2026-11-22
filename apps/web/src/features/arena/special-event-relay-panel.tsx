"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatSpecialEventVolume,
  relayDayLabel,
  relayDaysBetween,
  relayDraftToLegs,
  relayTodayHeadline,
  type SpecialEventEdition,
  type SpecialEventRelayLineup,
  type UnitSystem,
} from "@fitness-battle/shared";
import { AppText } from "@/ui/section";

export function SpecialEventRelayPanel({
  edition,
  crewId,
  units,
}: {
  edition: SpecialEventEdition;
  crewId: string;
  units: UnitSystem;
}) {
  const [lineup, setLineup] = useState<SpecialEventRelayLineup | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(
        `/api/special-events/${encodeURIComponent(edition.id)}/relay?crewId=${encodeURIComponent(crewId)}`,
        { cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) },
      );
      const data = await res.json().catch(() => ({}));
      if (signal?.aborted) return;
      if (!res.ok) { setNote(typeof data.error === "string" ? data.error : "Could not load relay lineup."); return; }
      const next = data.lineup as SpecialEventRelayLineup;
      setLineup(next);
      const map: Record<string, string> = {};
      for (const leg of next.legs) map[`${leg.legDay}:${leg.slotIndex}`] = leg.userId;
      setDraft(map);
      setNote("");
    } catch {
      if (!signal?.aborted) setNote("Could not load relay lineup.");
    }
  }, [edition.id, crewId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (!lineup) {
    return (
      <section className="fb-card" style={{ padding: 14 }}>
        <AppText role="caption" secondary>{note || "Loading baton schedule…"}</AppText>
      </section>
    );
  }

  const canEdit = lineup.assignmentMode === "manual" && (!lineup.finalized || lineup.lockPolicy === "pre_day");
  const todayHeadline = relayTodayHeadline(lineup);

  async function saveLineup() {
    if (!lineup || busy) return;
    setBusy(true);
    setNote("");
    try {
      const legs = relayDraftToLegs(draft, lineup.finalized ? lineup.todayDay : undefined);
      const res = await fetch(`/api/special-events/${encodeURIComponent(edition.id)}/relay`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId, legs }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not save lineup.");
      await load();
      setNote("Baton lineup saved.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not save lineup.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="fb-card" style={{ padding: 14, display: "grid", gap: 10 }} aria-label="Relay baton schedule">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <AppText role="label">Daily baton schedule</AppText>
        <AppText role="caption" secondary>
          {lineup.assignmentMode === "random" ? "Random draw" : lineup.finalized ? (canEdit ? "Locks midnight ET" : "Locked") : "Locks Mon 6 AM ET"}
        </AppText>
      </div>

      {!lineup.finalized && lineup.assignmentMode === "random" ? (
        <AppText role="caption" secondary>
          Baton days will be drawn randomly across your opted-in crewmates when the event starts Monday 6:00 AM ET.
        </AppText>
      ) : lineup.finalized && !canEdit ? (
        <>
          {todayHeadline ? <AppText role="caption">{todayHeadline}</AppText> : null}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(7, Math.max(1, lineup.legs.length))}, minmax(0, 1fr))`, gap: 6 }}>
            {lineup.legs.slice(0, 7).map((leg) => (
              <div
                key={`strip:${leg.legDay}:${leg.slotIndex}`}
                style={{
                  padding: "6px 4px",
                  borderRadius: 10,
                  border: leg.isToday ? "2px solid var(--lime-deep, #7ab800)" : "1px solid var(--line)",
                  background: leg.isToday ? "rgba(183, 242, 85, 0.22)" : "var(--paper)",
                  display: "grid",
                  justifyItems: "center",
                  gap: 2,
                }}
              >
                <AppText role="caption" secondary>{relayDayLabel(leg.legDay).split(" ")[0]}</AppText>
                <AppText role="label">{leg.displayName.split(" ")[0]}</AppText>
                <AppText role="caption" secondary>{leg.score > 0 ? formatSpecialEventVolume(edition.sport, leg.score, units) : "—"}</AppText>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {lineup.legs.map((leg) => (
              <div
                key={`${leg.legDay}:${leg.slotIndex}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "6px 8px",
                  borderRadius: 10,
                  background: leg.isToday ? "var(--wash)" : undefined,
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <AppText role="caption" secondary>{relayDayLabel(leg.legDay)}</AppText>
                <AppText role="label" style={{ flex: 1 }}>{leg.displayName}{leg.isYou ? " · You" : ""}</AppText>
                <AppText role="caption">{formatSpecialEventVolume(edition.sport, leg.score, units)}</AppText>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {todayHeadline ? <AppText role="caption">{todayHeadline}</AppText> : null}
          <AppText role="caption" secondary>
            {lineup.finalized
              ? "Past and today’s legs are locked; future days can be updated before midnight ET."
              : "Assign who carries the baton each day (empty slots auto-fill at lock)."}
            {lineup.maxLegsPerMember ? ` Max ${lineup.maxLegsPerMember} days per runner.` : ""}
          </AppText>
          <div style={{ display: "grid", gap: 6 }}>
            {relayDaysBetween(lineup.startDay, lineup.endDay).map((day) =>
              Array.from({ length: lineup.legsPerDay }, (_, idx) => {
                const slot = idx + 1;
                const key = `${day}:${slot}`;
                const leg = lineup.legs.find((l) => l.legDay === day && l.slotIndex === slot);
                const dayLocked = Boolean(lineup.finalized && (leg?.locked || day <= lineup.todayDay));
                if (dayLocked && leg) {
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 8px", borderRadius: 10, background: leg.isToday ? "var(--wash)" : undefined, borderBottom: "1px solid var(--line)" }}>
                      <AppText role="caption" secondary>{relayDayLabel(day)}{lineup.legsPerDay > 1 ? ` #${slot}` : ""}</AppText>
                      <AppText role="label" style={{ flex: 1 }}>{leg.displayName}{leg.isYou ? " · You" : ""}</AppText>
                      <AppText role="caption">{formatSpecialEventVolume(edition.sport, leg.score, units)}</AppText>
                    </div>
                  );
                }
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <AppText role="caption" secondary style={{ minWidth: 68 }}>
                      {relayDayLabel(day)}{lineup.legsPerDay > 1 ? ` #${slot}` : ""}
                    </AppText>
                    <select
                      className="fb-input"
                      style={{ flex: 1 }}
                      disabled={busy || !canEdit}
                      value={draft[key] ?? ""}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    >
                      <option value="">Auto-assign at start</option>
                      {lineup.roster.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.displayName}{m.optedIn ? "" : " (not joined yet)"}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }),
            )}
          </div>
          <button type="button" className="fb-btn-line" disabled={busy} onClick={() => void saveLineup()}>
            {busy ? "Saving…" : "Save baton lineup"}
          </button>
        </>
      )}

      {note ? <AppText role="caption">{note}</AppText> : null}
    </section>
  );
}

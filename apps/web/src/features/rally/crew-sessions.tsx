"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  APP_TIMEZONE,
  crewSessionDraftId,
  crewSessionError,
  validateCrewSessionDraft,
  demoCrewSessionMutation,
  type CrewSessionMutation,
  type CrewSession,
} from "@fitness-battle/shared";
import { Sheet } from "@/ui/sheet";
export function CrewSessions({
  crewId,
  userId,
  demo = false,
  sport = "running",
}: {
  crewId: string;
  userId: string;
  demo?: boolean;
  sport?: string;
}) {
  const [sessions, setSessions] = useState<CrewSession[]>([]),
    [open, setOpen] = useState(false),
    [title, setTitle] = useState(""),
    [day, setDay] = useState(""),
    [time, setTime] = useState("08:00"),
    [duration, setDuration] = useState(30),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const flight = useRef(false),
    id = useRef(crewSessionDraftId());
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      if (demo) {
        const stored = localStorage.getItem(
          `fb-demo-start-line:${userId}:${crewId}`,
        );
        setSessions(stored ? JSON.parse(stored) : []);
        return;
      }
      const r = await fetch(
        `/api/crews/sessions?crewId=${encodeURIComponent(crewId)}`,
        { signal },
      );
      if (!r.ok) throw Error("Could not load sessions.");
      const body = await r.json();
      setSessions(body.sessions);
    },
    [crewId, demo, userId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal).catch(() => {
      if (!controller.signal.aborted) setError("Could not load sessions.");
    });
    return () => controller.abort();
  }, [reload]);
  async function write(body: CrewSessionMutation) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      if (demo) {
        const next = demoCrewSessionMutation(sessions, body, userId, sport);
        localStorage.setItem(
          `fb-demo-start-line:${userId}:${crewId}`,
          JSON.stringify(next),
        );
        setSessions(next);
        setOpen(false);
        setTitle("");
        id.current = crewSessionDraftId();
        return;
      }
      const r = await fetch("/api/crews/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        result = await r.json();
      if (!r.ok) throw Error(crewSessionError(result.error ?? ""));
      setOpen(false);
      id.current = crewSessionDraftId();
      setTitle("");
      await reload().catch(() =>
        setError("Saved. Refresh to load the updated start list."),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save session.");
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="focus-card start-line">
      <div className="focus-row">
        <h2>Start Line</h2>
        <button
          type="button"
          className="fb-btn-ghost"
          disabled={busy}
          onClick={() => {
            setError("");
            setOpen(true);
          }}
        >
          ＋ Schedule
        </button>
      </div>
      {demo ? <p className="fb-note">Demo · saved on this device</p> : null}
      {sessions.map((s) => {
        const joined = s.participants.some((p) => p.user_id === userId),
          closed = !!s.cancelled_at || Date.parse(s.starts_at) <= Date.now();
        return (
          <article key={s.id} className="start-ticket">
            <p className="fb-kicker">
              {new Date(s.starts_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                timeZone: s.time_zone,
              })}
            </p>
            <strong className="start-ticket-time">
              {new Date(s.starts_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: s.time_zone,
              })}
            </strong>
            <p className="fb-copy">
              {s.time_zone} · {s.duration_min} min
            </p>
            <h3>{s.title}</h3>
            <div className="start-ticket-bottom">
              <div
                className="start-lights"
                aria-label={`${s.participants.length} on the start list`}
              >
                {s.participants.slice(0, 6).map((p) => (
                  <span
                    key={p.user_id}
                    title={p.display_name}
                    className={p.user_id === userId ? "is-you" : ""}
                  >
                    {p.display_name.slice(0, 2).toUpperCase()}
                  </span>
                ))}
                {s.participants.length > 6 ? (
                  <span>+{s.participants.length - 6}</span>
                ) : null}
              </div>
              <p className="fb-copy">
                {s.cancelled_at
                  ? "Cancelled"
                  : closed
                    ? "Session started"
                    : `${s.participants.length} on the start list`}
              </p>
              {!closed ? (
                <div className="focus-row">
                  <button
                    className={joined ? "fb-btn-line" : "fb-btn"}
                    disabled={busy}
                    onClick={() =>
                      void write({ action: "rsvp", id: s.id, join: !joined })
                    }
                  >
                    {joined ? "Leave session" : "Count me in ↗"}
                  </button>
                  {s.created_by === userId ? (
                    <button
                      className="fb-btn-ghost"
                      disabled={busy}
                      onClick={() => void write({ action: "cancel", id: s.id })}
                    >
                      Cancel session
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
      {!sessions.length && !error ? (
        <p className="fb-copy">Same time. Your own place.</p>
      ) : null}
      {!open && error ? (
        <p role="alert">
          {error}{" "}
          <button
            className="fb-btn-ghost"
            onClick={() =>
              void reload()
                .then(() => setError(""))
                .catch(() => setError("Could not load sessions."))
            }
          >
            Refresh
          </button>
        </p>
      ) : null}
      <Sheet
        open={open}
        title="A shared start"
        body="Same time. Your own place. RSVP does not log a workout."
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <label className="fb-field">
          Session name
          <input
            maxLength={80}
            placeholder="Name this session"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="fb-field">
          Date
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <label className="fb-field">
          Time · {APP_TIMEZONE}
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <fieldset className="start-duration">
          <legend>Duration</legend>
          <div className="crew-relay-members">
            {[15, 30, 45, 60, 90, 120, 180, 240].map((n) => (
              <button
                key={n}
                type="button"
                className="fb-btn-line"
                aria-pressed={duration === n}
                onClick={() => setDuration(n)}
              >
                {n} min
              </button>
            ))}
          </div>
        </fieldset>
        {error ? <p role="alert">{error}</p> : null}
        <button
          className="fb-btn"
          disabled={busy}
          onClick={() => {
            try {
              const startsAt = validateCrewSessionDraft(
                title,
                day,
                time,
                duration,
              );
              void write({
                action: "create",
                id: id.current,
                crewId,
                title,
                startsAt,
                durationMin: duration,
                timeZone: APP_TIMEZONE,
              });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {busy ? "Saving…" : "Set the start line"}
        </button>
      </Sheet>
    </section>
  );
}

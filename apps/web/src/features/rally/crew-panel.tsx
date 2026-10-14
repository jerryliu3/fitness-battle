"use client";

import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { useEffect, useState } from "react";

interface CrewRow {
  crew_id: string;
  crews: {
    id: string;
    name: string;
    invite_code: string;
    sport: string;
    format: string;
    target_sessions: number;
    journey_km: number;
  } | null;
}

interface MemberRow {
  crew_id: string;
  user_id: string;
  display_name: string;
  rest_week: string | null;
}

interface EntryRow {
  crew_id: string;
  user_id: string;
  activity_id: string;
  distance_m: number;
  disposition: string;
  sport: string;
}

interface NoticeRow {
  id: string;
  body: string;
  kind: string;
}

export function CrewPanel() {
  const { user, demoMode } = useAuth();
  const { state } = useCompete();
  const [crews, setCrews] = useState<CrewRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [name, setName] = useState("Sunday easy");
  const [code, setCode] = useState("");
  const [format, setFormat] = useState("volume");
  const [note, setNote] = useState<string | null>(null);

  async function reload() {
    const response = await fetch("/api/crews");
    if (!response.ok) {
      setNote("Crews need a signed-in account.");
      return;
    }
    const body = (await response.json()) as {
      crews: CrewRow[];
      members: MemberRow[];
      entries: EntryRow[];
      notices: NoticeRow[];
    };
    setCrews(body.crews);
    setMembers(body.members);
    setEntries(body.entries);
    setNotices(body.notices);
  }

  useEffect(() => {
    if (!user || demoMode) return;
    void reload();
  }, [demoMode, user]);

  if (!user || demoMode) {
    return (
      <section className="fb-card">
        <h2>Private crew</h2>
        <p className="fb-copy">
          A crew is a shared week with people you invite. Demo mode keeps the
          practice field on this device and does not deliver invitations.
        </p>
      </section>
    );
  }

  async function createCrew() {
    setNote(null);
    const response = await fetch("/api/crews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sport: state?.primary ?? "running",
        format,
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setNote(body.error ?? "Could not create the crew.");
      return;
    }
    await reload();
  }

  async function join() {
    setNote(null);
    const response = await fetch("/api/crews/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setNote(body.error ?? "That invite was not accepted.");
      return;
    }
    setCode("");
    await reload();
  }

  async function share(crewId: string) {
    if (!state) return;
    const response = await fetch("/api/crews/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crewId,
        activities: state.activities.filter(
          (activity) =>
            activity.sport === state.primary &&
            activity.disposition !== "excluded" &&
            activity.disposition !== "pending" &&
            activity.provenance !== "demo",
        ),
      }),
    });
    const body = (await response.json()) as { saved?: number; error?: string; persisted?: boolean };
    if (!response.ok || body.persisted === false) {
      setNote(body.error ?? "Those sessions were not saved to the crew.");
      return;
    }
    setNote(`Shared ${body.saved ?? 0} counted sessions.`);
    await reload();
  }

  return (
    <section className="fb-card">
      <h2>Private crew</h2>
      <p className="fb-copy">
        Share a code. Both of you see the same counted sessions. The practice
        field below is still generated.
      </p>
      {notices.map((notice) => (
        <p key={notice.id} className="fb-note">
          {notice.body}
        </p>
      ))}
      <label className="fb-field">
        Crew name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="fb-field">
        Format
        <select value={format} onChange={(event) => setFormat(event.target.value)}>
          <option value="volume">Same-sport volume</option>
          <option value="personal_target">Each person, three sessions</option>
          <option value="cooperative">Shared distance</option>
        </select>
      </label>
      <button type="button" className="fb-btn" onClick={() => void createCrew()}>
        Create crew
      </button>
      <label className="fb-field">
        Invite code
        <input value={code} onChange={(event) => setCode(event.target.value)} />
      </label>
      <button type="button" className="fb-btn-line" onClick={() => void join()}>
        Join with code
      </button>
      {crews.map((row) => {
        const crew = row.crews;
        if (!crew) return null;
        const roster = members.filter((member) => member.crew_id === crew.id);
        const counted = entries.filter(
          (entry) => entry.crew_id === crew.id && entry.disposition === "counted",
        );
        const km = counted.reduce((sum, entry) => sum + Number(entry.distance_m), 0) / 1000;
        const rule =
          crew.format === "personal_target"
            ? `Each person aims for ${crew.target_sessions} counted sessions.`
            : crew.format === "cooperative"
              ? `Together, ${km.toFixed(1)} of ${crew.journey_km} km.`
              : `${km.toFixed(1)} km on the volume board.`;
        return (
          <div key={crew.id} className="fb-stack">
            <h3>
              {crew.name} · {crew.format.replaceAll("_", " ")}
            </h3>
            <p className="fb-copy">
              Code {crew.invite_code}. {roster.length} people. {rule} A season is
              four closed weeks with this same code.
            </p>
            <ul>
              {roster.map((member) => {
                const mine = entries.filter(
                  (entry) =>
                    entry.crew_id === crew.id &&
                    entry.user_id === member.user_id &&
                    entry.disposition === "counted",
                );
                const latest = mine[0];
                const sessions = mine.length;
                const targetMet =
                  crew.format === "personal_target" && sessions >= crew.target_sessions;
                return (
                  <li key={member.user_id}>
                    {member.display_name}
                    {member.rest_week ? " · rest week, rating can stay put if you also freeze" : ""}
                    {" · "}
                    {sessions} sessions
                    {targetMet ? " · target met" : ""}
                    {latest && member.user_id !== user?.id ? (
                      <button
                        type="button"
                        className="fb-btn-ghost"
                        onClick={() =>
                          void fetch("/api/crews/cheer", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              crewId: crew.id,
                              activityId: latest.activity_id,
                              ownerId: member.user_id,
                            }),
                          }).then(() => reload())
                        }
                      >
                        Cheer
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <button type="button" className="fb-btn-ghost" onClick={() => void share(crew.id)}>
              Share this week’s counted sessions
            </button>
            <button
              type="button"
              className="fb-btn-ghost"
              onClick={() =>
                void fetch("/api/crews/rest", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ crewId: crew.id, rest: true }),
                }).then(() => reload())
              }
            >
              Rest this week
            </button>
          </div>
        );
      })}
      {note ? <p className="fb-note">{note}</p> : null}
    </section>
  );
}

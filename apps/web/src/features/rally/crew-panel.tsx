"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { Sheet } from "@/ui/sheet";
import { playCue } from "@/lib/haptics";
import {
  APP_TIMEZONE,
  countsOnTrack,
  distanceUnitLabel,
  formatDistanceM,
  formatMemberCount,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
interface Crew {
  id: string;
  name: string;
  invite_code: string;
  sport: string;
  format: string;
  target_sessions: number;
  journey_km: number;
}
interface Member {
  crew_id: string;
  user_id: string;
  display_name: string;
  rest_week: string | null;
}
interface Entry {
  crew_id: string;
  user_id: string;
  activity_id: string;
  session_count?: number;
  distance_m: number;
  moving_sec: number;
  started_at: string;
  sport: string;
  disposition: string;
}
interface CrewData {
  crews: { crew_id: string; crews: Crew | null }[];
  members: Member[];
  entries: Entry[];
  progress?: Entry[];
  notices: { id: string; body: string }[];
}

function humanCrewError(code?: string): string {
  if (!code) return "Could not reach your crew.";
  const raw = code.toLowerCase();
  if (raw.includes("invite_not_found"))
    return "We couldn't find a crew with that invite code.";
  if (raw.includes("already_a_member"))
    return "You are already a member of this crew.";
  if (raw.includes("not_a_member"))
    return "You are not a member of this crew.";
  if (raw.includes("crew_not_found")) return "We couldn't find that crew.";
  if (raw.includes("name_required")) return "Please enter a crew name.";
  if (raw.includes("authentication_required"))
    return "Sign in to manage crews.";
  return code;
}

function isCrewErrorNote(note: string): boolean {
  return (
    note.startsWith("Please ") ||
    note.startsWith("We couldn't") ||
    note.startsWith("Could not") ||
    note.startsWith("You are already") ||
    note.startsWith("You are not") ||
    note.startsWith("Sign in")
  );
}

export function CrewPanel() {
  const { user, demoMode } = useAuth();
  const { state } = useCompete();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CrewData | null>(null);
  const [selected, setSelected] = useState("");
  const [panel, setPanel] = useState<
    "invite" | "manage" | "add" | "members" | null
  >(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [format, setFormat] = useState("volume");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  async function reload() {
    try {
      const res = await fetch("/api/crews");
      if (!res.ok) throw Error("Could not load your crews. Try again.");
      const nextData: CrewData = await res.json();
      setData(nextData);
      const nextCrews = (nextData?.crews ?? []).flatMap((r) =>
        r.crews ? [r.crews] : [],
      );
      if (selected && !nextCrews.some((c) => c.id === selected)) {
        setSelected(nextCrews[0]?.id ?? "");
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not load crews.");
    }
  }
  useEffect(() => {
    if (user && !demoMode) void reload();
    else setData(null);
  }, [user?.id, demoMode]);

  useEffect(() => {
    const invite = searchParams.get("invite")?.trim();
    if (!invite || !user || demoMode) return;
    setCode(invite.toUpperCase());
    setPanel("add");
    const next = new URLSearchParams(searchParams.toString());
    next.delete("invite");
    const qs = next.toString();
    router.replace(qs ? `/field?${qs}` : "/field", { scroll: false });
  }, [searchParams, user, demoMode, router]);

  async function write(path: string, body: object): Promise<boolean> {
    setBusy(true);
    setNote("");
    if (demoMode) {
      setBusy(false);
      setPanel(null);
      if (path === "/leave") {
        setSelected("");
        setNote("You left the crew.");
      } else if (path === "/join") {
        setCode("");
        setNote("Joined crew.");
      } else if (path === "/rest") {
        setNote("Marked rest week for this crew.");
      } else {
        setName("");
        setNote("Saved. Your crew is up to date.");
      }
      return true;
    }
    try {
      const res = await fetch(`/api/crews${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok || result.persisted === false)
        throw Error(humanCrewError(result.error));
      await reload();
      setPanel(null);
      setName("");
      setCode("");
      if (path === "/leave") {
        setNote("You left the crew.");
      } else {
        if (result.crew?.id) setSelected(result.crew.id);
        setNote("Saved. Your crew is up to date.");
      }
      return true;
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not reach your crew.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const rawCrews = (data?.crews ?? []).flatMap((r) => (r.crews ? [r.crews] : []));
  const crewBoard = state?.crewBoard;
  const hasDemoCrew = Boolean(
    crewBoard &&
      crewBoard.crewId &&
      crewBoard.crewId !== "solo" &&
      !crewBoard.crewId.startsWith("field:"),
  );

  const athleteName = state?.name || "You";
  const athleteSport = state?.primary
    ? state.primary.charAt(0).toUpperCase() + state.primary.slice(1)
    : "Running";

  const demoCrew: Crew | null =
    hasDemoCrew && crewBoard
      ? {
          id: crewBoard.crewId,
          name: crewBoard.crewName,
          invite_code: "WEEKLY",
          sport: crewBoard.sport,
          format: "volume",
          target_sessions: 4,
          journey_km: 60,
        }
      : null;

  const demoMembers: Member[] =
    hasDemoCrew && crewBoard
      ? crewBoard.members.map((m) => ({
          crew_id: crewBoard.crewId,
          user_id: m.id,
          display_name: m.name,
          rest_week: null,
        }))
      : [];

  const demoEntries: Entry[] =
    hasDemoCrew && crewBoard
      ? crewBoard.members.map((m) => ({
          crew_id: crewBoard.crewId,
          user_id: m.id,
          activity_id: `act-${m.id}`,
          distance_m: m.distanceM ?? 0,
          moving_sec: m.movingSec ?? 0,
          started_at: crewBoard.waveStart,
          sport: crewBoard.sport,
          disposition: "counted",
        }))
      : [];

  const isSolo =
    rawCrews.length === 0 && !hasDemoCrew ? true : false;

  const soloCrew: Crew = {
    id: "solo-preview",
    name: state?.name ? `${state.name}’s Circle` : "Your Circle",
    invite_code: "SOLO",
    sport: athleteSport,
    format: "cooperative",
    target_sessions: 4,
    journey_km: 40,
  };

  const soloMember: Member = {
    crew_id: "solo-preview",
    user_id: user?.id ?? "solo-guest",
    display_name: athleteName,
    rest_week: null,
  };

  const soloEntries: Entry[] = (state?.activities ?? [])
    .filter((a) => countsOnTrack(a, "open"))
    .map((a) => ({
      crew_id: "solo-preview",
      user_id: user?.id ?? "solo-guest",
      activity_id: a.id,
      distance_m: a.distanceM ?? 0,
      moving_sec: a.movingSec ?? 0,
      started_at: a.startedAt,
      sport: a.sport,
      disposition: "counted",
    }));

  const crews =
    rawCrews.length > 0
      ? rawCrews
      : demoCrew
        ? [demoCrew]
        : [soloCrew];
  const crew = crews.find((c) => c.id === selected) ?? crews[0];
  const members =
    rawCrews.length > 0
      ? (data?.members ?? []).filter((m) => m.crew_id === crew?.id)
      : demoCrew && crew?.id === demoCrew.id
        ? demoMembers
        : [soloMember];
  const entries =
    rawCrews.length > 0
      ? (data?.progress ?? data?.entries ?? []).filter(
          (e) => e.crew_id === crew?.id && e.disposition === "counted",
        )
      : demoCrew && crew?.id === demoCrew.id
        ? demoEntries
        : soloEntries;
  const unitLabel = distanceUnitLabel(state?.units);
  const totalM = entries.reduce((t, e) => t + Number(e.distance_m), 0);
  const targetM = (crew?.journey_km ?? 40) * 1000;
  const memberNames = members.map((m) => m.display_name);
  const memberCountLabel =
    members.length === 1 ? "1 member" : `${members.length} members`;
  const memberCaption =
    members.length === 1
      ? "1 member · Solo circle"
      : memberNames.length <= 3
        ? memberNames.join(", ") || "No members yet"
        : `${memberNames.slice(0, 3).join(", ")} + ${memberNames.length - 3} more`;
  return (
    <>
      {user && !demoMode && !data && (
        <section className="focus-card">
          <p className="fb-copy">{note || "Loading your circle…"}</p>
          <button className="fb-btn-line" onClick={() => void reload()}>
            Refresh crews
          </button>
        </section>
      )}

      {(!user || demoMode || data) && (
        <>
          <div className="focus-registration-tabs focus-crew-tabs">
            {crews.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={crew.id === c.id}
                onClick={() => setSelected(c.id)}
              >
                {c.name}
              </button>
            ))}
            <button
              type="button"
              className="focus-crew-add-tab"
              onClick={() => {
                setName("");
                setCode("");
                setPanel("add");
              }}
            >
              ＋ Add Crew
            </button>
          </div>
          <section
            className="focus-crew-hero"
            role="button"
            tabIndex={0}
            onClick={() => setPanel("members")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setPanel("members");
              }
            }}
          >
            <p className="fb-kicker">
              {isSolo
                ? "Solo circle · 1 member"
                : `Your people · ${memberCountLabel}`}
            </p>
            <h2>{crew.name}</h2>
            <p>Different paces. Same direction.</p>
            <div className="focus-row">
              <div className="focus-avatar-stack">
                {members.slice(0, 5).map((m) => (
                  <span key={m.user_id}>
                    {m.display_name.slice(0, 2).toUpperCase()}
                  </span>
                ))}
              </div>
              <div className="focus-crew-hero-buttons">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPanel("invite");
                    if (!crew || crew.id === "solo-preview") return;
                    const link = `${window.location.origin}/field?invite=${encodeURIComponent(crew.invite_code)}`;
                    void navigator.clipboard
                      .writeText(link)
                      .then(
                        () => {
                          void playCue("success");
                          setNote("Invite link copied.");
                        },
                        () => {
                          setNote(`Invite link: ${link}`);
                        },
                      );
                  }}
                >
                  Invite
                </button>
                <button
                  type="button"
                  className="focus-crew-gear-btn"
                  title="Crew settings"
                  aria-label="Crew settings"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPanel("manage");
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
          <div className="focus-crew-layout">
            <div className="focus-crew-main">
              <section className="focus-card">
                <p className="fb-kicker">Our shared week · {crew.sport}</p>
                {crew.format === "personal_target" ? (
                  <h2>{entries.reduce((total, entry) => total + Number(entry.session_count ?? 1), 0)} counted sessions</h2>
                ) : (
                  <h2 className="focus-goal">
                    {formatDistanceM(totalM, state?.units)}{" "}
                    <small>
                      {crew.format === "cooperative"
                        ? `/ ${formatDistanceM(targetM, state?.units)} ${unitLabel}`
                        : `${unitLabel} together`}
                    </small>
                  </h2>
                )}
                {crew.format === "cooperative" && (
                  <progress
                    value={totalM}
                    max={Math.max(1, targetM)}
                    aria-label="Crew distance goal"
                  />
                )}
                <p className="fb-copy">
                  {crew.format === "personal_target"
                    ? `Each member aims for ${crew.target_sessions} sessions.`
                    : "Every pace belongs here."}
                </p>
              </section>
              {user ? (
                <>
                  <h2>Crew standings</h2>
                  <section className="focus-card">
                    {members
                      .slice()
                      .sort(
                        (a, b) =>
                          entries
                            .filter((e) => e.user_id === b.user_id)
                            .reduce((t, e) => t + Number(e.distance_m), 0) -
                          entries
                            .filter((e) => e.user_id === a.user_id)
                            .reduce((t, e) => t + Number(e.distance_m), 0),
                      )
                      .map((m, i) => (
                        <div className="fb-row" key={m.user_id}>
                          <span>{i + 1}</span>
                          <b className="fb-grow">{m.display_name}</b>
                          <span>
                            {formatDistanceM(
                              entries
                                .filter((e) => e.user_id === m.user_id)
                                .reduce((t, e) => t + Number(e.distance_m), 0),
                              state?.units,
                            )}{" "}
                            {unitLabel}
                          </span>
                        </div>
                      ))}
                  </section>
                </>
              ) : null}
            </div>
          </div>
        </>
      )}
      {!panel && note && (
        <p
          className={isCrewErrorNote(note) ? "fb-error" : "focus-feedback"}
          role={isCrewErrorNote(note) ? "alert" : "status"}
        >
          {note}
        </p>
      )}
      {data?.notices?.map((n) => (
        <p className="fb-note" key={n.id}>
          {n.body}
        </p>
      ))}
      {!user && (
        <div className="focus-crew-preview" style={{ marginBottom: 28 }}>
          <section className="focus-card">
            <p className="fb-kicker">What crews unlock</p>
            <ul className="focus-crew-preview-list">
              <li>
                <b>Shared week</b>
                <span>See who showed up and how the circle is pacing.</span>
              </li>
              <li>
                <b>Invite codes</b>
                <span>Bring friends in without a public board.</span>
              </li>
              <li>
                <b>Crew field</b>
                <span>Optional: register together on one individual leaderboard.</span>
              </li>
            </ul>
          </section>
          <section className="focus-card focus-empty">
            <h2>Make room for your people.</h2>
            <p className="fb-copy" style={{ marginBottom: 20 }}>
              Private crews share a week of counted effort — invite codes,
              member standings, and a shared field when you register together.
            </p>
            <div className="fb-row" style={{ width: "100%", gap: 10 }}>
              <Link
                className="fb-btn"
                href="/signup?next=/field"
                style={{ flex: 1, textAlign: "center" }}
              >
                Create account
              </Link>
              <Link
                className="fb-btn-line"
                href="/login?next=/field"
                style={{ flex: 1, textAlign: "center" }}
              >
                Sign in
              </Link>
            </div>
          </section>
        </div>
      )}
      <Sheet
        open={!!panel}
        preventAutoFocus={panel === "add"}
        title={
          panel === "add"
            ? "Add Crew"
            : panel === "invite"
              ? "Invite to crew"
              : panel === "members"
                ? crew?.name ?? "Crew members"
                : "Your crew, your rhythm."
        }
        body={
          !user
            ? "A live account is needed to create or join a private crew."
            : "Private crew activity stays with your members."
        }
        onClose={() => {
          setPanel(null);
          setNote("");
        }}
      >
        {note ? (
          <p
            className={isCrewErrorNote(note) ? "fb-error" : "fb-note"}
            role={isCrewErrorNote(note) ? "alert" : "status"}
            style={{ marginBottom: "12px" }}
          >
            {note}
          </p>
        ) : null}
        {!user ? (
          <div style={{ marginTop: 8 }}>
            <p className="fb-copy" style={{ marginBottom: 16 }}>
              A live account is required to invite friends, join circles, or manage crew membership.
            </p>
            <div className="fb-row" style={{ width: "100%", gap: 10 }}>
              <Link
                className="fb-btn"
                href="/signup?next=/field"
                style={{ flex: 1, textAlign: "center" }}
              >
                Create account
              </Link>
              <Link
                className="fb-btn-line"
                href="/login?next=/field"
                style={{ flex: 1, textAlign: "center" }}
              >
                Sign in
              </Link>
            </div>
          </div>
        ) : panel === "add" ? (
          <>
            <label className="fb-field">
              Invite code
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (note) setNote("");
                }}
                autoCapitalize="characters"
                placeholder="e.g. RALLY7"
              />
            </label>
            <div className="focus-or-divider">
              <span>or start a new crew</span>
            </div>
            <label className="fb-field">
              Crew name
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (note) setNote("");
                }}
                maxLength={60}
                placeholder="e.g. Dawn Patrol"
              />
            </label>
            <label className="fb-field">
              Format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="volume">Same-sport volume</option>
                <option value="personal_target">
                  Personal session targets
                </option>
                <option value="cooperative">Shared distance</option>
              </select>
            </label>
            <button
              className="fb-btn"
              disabled={busy || (!code.trim() && !name.trim())}
              onClick={() => {
                if (code.trim()) {
                  void write("/join", { code: code.trim().toUpperCase() });
                } else if (name.trim()) {
                  void write("", {
                    name: name.trim(),
                    sport: state?.primary ?? "running",
                    format,
                  });
                } else {
                  setNote("Enter an invite code to join or a crew name to create.");
                }
              }}
            >
              {code.trim()
                ? "Join crew"
                : name.trim()
                  ? "Create crew"
                  : "Join or create crew"}
            </button>
          </>
        ) : panel === "members" ? (
          <ul className="focus-member-list">
            {members.map((m) => (
              <li key={m.user_id}>
                <b>{m.display_name}</b>
                <small>{m.rest_week ? "Rest week" : "Active"}</small>
              </li>
            ))}
          </ul>
        ) : panel === "invite" ? (
          crew?.id === "solo-preview" ? (
            <div>
              <p className="fb-copy" style={{ marginBottom: 16 }}>
                Create a crew first to generate an invite code and bring your friends together.
              </p>
              <button
                className="fb-btn"
                onClick={() => setPanel("add")}
              >
                Create crew ＋
              </button>
            </div>
          ) : (
            <>
              <p className="fb-copy">Share this link with friends.</p>
              <label className="fb-field">
                Invite link
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/field?invite=${encodeURIComponent(crew?.invite_code ?? "")}`}
                />
              </label>
              <label className="fb-field">
                Invite code
                <input readOnly value={crew?.invite_code ?? ""} />
              </label>
              <button
                className="fb-btn"
                onClick={() => {
                  const link = `${window.location.origin}/field?invite=${encodeURIComponent(crew?.invite_code ?? "")}`;
                  void navigator.clipboard
                    .writeText(link)
                    .then(
                      () => setNote("Invite link copied."),
                      () => setNote(`Invite link: ${link}`),
                    );
                }}
              >
                Copy invite link
              </button>
            </>
          )
        ) : crew?.id === "solo-preview" ? (
          <div>
            <p className="fb-copy" style={{ marginBottom: 16 }}>
              {crew?.name} · {crew?.sport} · 1 member
            </p>
            <p className="fb-note" style={{ marginBottom: 16 }}>
              You are currently in a solo circle. Create a shared crew to set weekly group goals with friends.
            </p>
            <button
              className="fb-btn"
              onClick={() => setPanel("add")}
            >
              Create shared crew ＋
            </button>
          </div>
        ) : (
          <>
            <p className="fb-copy">
              {crew?.name} · {crew?.sport} · {crew?.format.replaceAll("_", " ")}
            </p>
            {members.map((m) => (
              <div className="fb-row" key={m.user_id}>
                <b className="fb-grow">{m.display_name}</b>
                <small>{m.rest_week ? "Rest week" : "Active"}</small>
              </div>
            ))}
            <button
              className="fb-btn-line"
              disabled={busy}
              onClick={() =>
                void write("/rest", { crewId: crew?.id, rest: true })
              }
            >
              Mark my rest week
            </button>
            <p className="fb-note">
              A crew rest marker does not freeze effort score. Week freezes live in
              Athlete → Preferences.
            </p>
            {crew?.id && crew.id !== "solo-preview" && (
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: "1px solid #e0e5dc",
                }}
              >
                <button
                  type="button"
                  className="fb-btn-line"
                  style={{
                    color: "#b94a48",
                    borderColor: "#e0b4b4",
                    width: "100%",
                  }}
                  disabled={busy}
                  onClick={() => setLeaveConfirmOpen(true)}
                >
                  Leave crew
                </button>
              </div>
            )}
          </>
        )}
      </Sheet>
      <Sheet
        open={leaveConfirmOpen}
        title={`Leave ${crew?.name ?? "crew"}?`}
        body="You can rejoin anytime with an invite code."
        onClose={() => {
          if (!busy) setLeaveConfirmOpen(false);
        }}
      >
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <button
            type="button"
            className="fb-btn"
            style={{
              background: "var(--red, #b83a38)",
              borderColor: "var(--red, #b83a38)",
              color: "#fff",
            }}
            disabled={busy || !crew?.id}
            onClick={() => {
              if (!crew?.id) return;
              void write("/leave", { crewId: crew.id }).then((ok) => {
                if (ok) setLeaveConfirmOpen(false);
              });
            }}
          >
            {busy ? "Leaving…" : "Leave crew"}
          </button>
          <button
            type="button"
            className="fb-btn-line"
            disabled={busy}
            onClick={() => setLeaveConfirmOpen(false)}
          >
            Stay in crew
          </button>
        </div>
      </Sheet>
    </>
  );
}

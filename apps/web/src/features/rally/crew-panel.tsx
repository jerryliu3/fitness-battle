"use client";
import { RankBadge } from "../progress/rank-badge";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { CrewSessions } from "./crew-sessions";
import { CrewRelay } from "./crew-relay";
import { Sheet } from "@/ui/sheet";
import { playCue } from "@/lib/haptics";
import { competitionTrack, APP_TIMEZONE, competeNow, weeklyPeriodBounds, dayKey, type SportId, countsOnTrack, distanceUnitLabel, formatDistanceM, formatNoticeUnits } from "@fitness-battle/shared";
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
  effort_score?: number | null;
  avatar_url?: string | null;
  crew_id: string;
  user_id: string;
  display_name: string;
  rest_week: string | null;
  status?: string;
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
  previousProgress?: {crew_id:string;user_id:string;distance_m:number;moving_sec:number;session_count:number}[];
  previousProgressAvailable?: Record<string,boolean>;
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
  const { user, offlineMode } = useAuth();
  const { state, dispatch } = useCompete();
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
  const [demoRest, setDemoRest] = useState<Record<string, string | null>>({});
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  useEffect(() => { setDemoRest({}); setPanel(null); setNote(""); }, [user?.id]);
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
    if (user && !offlineMode) void reload();
    else setData(null);
  }, [user?.id, offlineMode]);

  useEffect(() => {
    const invite = searchParams.get("invite")?.trim();
    if (!invite || !user || offlineMode) return;
    setCode(invite.toUpperCase());
    setPanel("add");
    const next = new URLSearchParams(searchParams.toString());
    next.delete("invite");
    const qs = next.toString();
    router.replace(qs ? `/field?${qs}` : "/field", { scroll: false });
  }, [searchParams, user, offlineMode, router]);

  async function write(path: string, body: object): Promise<boolean> {
    setBusy(true);
    setNote("");
    if (offlineMode) {
      setBusy(false);
      if (path !== "/rest") setPanel(null);
      if (path === "/leave") {
        dispatch({ type: "clear-crew-board" });
        setSelected("");
        setNote("You left the crew.");
      } else if (path === "/join") {
        setCode("");
        setNote("Joined crew.");
      } else if (path === "/rest") {
        setDemoRest(old => ({...old, [restKey]: resting ? null : weekKey}));
        setNote(resting ? "Rest week cleared." : "Rest week set. You can clear it here.");
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
      if (path !== "/rest") setPanel(null);
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
  const athleteSport = state?.primary ?? "running";

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
          user_id: offlineMode && m.name === athleteName && user ? user.id : m.id,
          display_name: m.name,
          effort_score: competitionTrack(crewBoard.sport) === "verified" ? m.verifiedElo : m.elo,
          avatar_url: m.id === user?.id ? state?.avatarUrl : m.avatarUrl,
          rest_week: null,
        }))
      : [];

  const demoEntries: Entry[] =
    hasDemoCrew && crewBoard
      ? crewBoard.members.map((m) => ({
          crew_id: crewBoard.crewId,
          user_id: offlineMode && m.name === athleteName && user ? user.id : m.id,
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
    .filter((a) => { const now = state ? competeNow(state) : new Date(); const week = weeklyPeriodBounds(now); return countsOnTrack(a, "open") && a.sport === state?.primary && new Date(a.startedAt) >= week.startsAt && new Date(a.startedAt) < week.endsAt && new Date(a.startedAt) <= now; })
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
      ? (data?.members ?? []).filter((m) => m.crew_id === crew?.id && (!m.status || m.status === "active"))
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
  const weekKey = dayKey(weeklyPeriodBounds(state ? competeNow(state) : new Date()).startsAt, APP_TIMEZONE);
  const restKey = `${user?.id}:${crew.id}`;
  const resting = offlineMode ? demoRest[restKey] === weekKey : members.find(m => m.user_id === user?.id)?.rest_week === weekKey;
  const unitLabel = distanceUnitLabel(state?.units);
  const sessionsMetric = crew?.format === "personal_target" || crew?.sport === "strength";
  const memberTotal = (id: string) => entries.filter(e => e.user_id === id).reduce((sum, e) => sum + Number(sessionsMetric ? e.session_count ?? 1 : e.distance_m), 0);
  const totalM = entries.reduce((t, e) => t + Number(e.distance_m), 0);
  const previousDistanceM = data?.previousProgressAvailable?.[crew.id]
    ? (data.previousProgress??[]).filter(row=>row.crew_id===crew.id && members.some(m=>m.user_id===row.user_id)).reduce((sum,row)=>sum+Number(row.distance_m),0)
    : null;
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
      {user && !offlineMode && !data && (
        <section className="focus-card">
          <p className="fb-copy">{note || "Loading your circle…"}</p>
          <button className="fb-btn-line" onClick={() => void reload()}>
            Refresh crews
          </button>
        </section>
      )}

      {(!user || offlineMode || data) && (
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
          >
            <img className="club-landscape" src="/club/alpine-trail.jpg" alt=""/>
            <p className="fb-kicker">
              {isSolo
                ? "Solo circle · 1 member"
                : `Your people · ${memberCountLabel}`}
            </p>
            <h2><button type="button" className="club-crew-name" onClick={()=>setPanel("members")} aria-label={`View ${crew.name} members`}>{crew.name}</button></h2>
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
                {sessionsMetric ? (
                  <h2>{entries.reduce((total, entry) => total + Number(entry.session_count ?? 1), 0)} sessions</h2>
                ) : (
                  <h2 className="focus-goal">
                    {formatDistanceM(totalM, state?.units)}{" "}
                    <small>
                      {`${unitLabel} together`}
                    </small>
                  </h2>
                )}
                <CrewRelay userId={user?.id} key={crew.id} members={members} entries={entries} sport={crew.sport as SportId} format={crew.format} previousDistanceM={previousDistanceM} targetDistanceM={crew.journey_km*1000} targetSessions={crew.target_sessions} units={state?.units} />
                <p className="fb-copy">
                  {sessionsMetric
                    ? `Each member aims for ${crew.target_sessions} sessions.`
                    : "Every pace belongs here."}
                </p>
              </section>
              {user && !isSolo ? <CrewSessions key={`${user.id}:${crew.id}`} crewId={crew.id} userId={user.id} demo={offlineMode} sport={crew.sport} /> : null}
              {user ? (
                <>
                  <h2>Crew standings</h2>
                  <section className="focus-card">
                    {members
                      .slice()
                      .sort((a, b) => memberTotal(b.user_id) - memberTotal(a.user_id))
                      .map((m, i) => (
                        <div className="fb-row" key={m.user_id}>
                          <span>{i + 1}</span>
                          <b className="fb-grow">{m.display_name}</b><RankBadge score={m.effort_score} />
                          <span>
                            {sessionsMetric ? `${memberTotal(m.user_id)} sessions` : `${formatDistanceM(memberTotal(m.user_id), state?.units)} ${unitLabel}`}
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
          {formatNoticeUnits(n.body, state?.units)}
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
              Private crews share a week of effort — invite codes,
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
        fullScreen={panel === "members"}
        title={
          panel === "add"
            ? "Add Crew"
            : panel === "invite"
              ? "Invite to crew"
              : panel === "members"
                ? "Members"
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
                {m.avatar_url ? <img src={m.avatar_url} alt="" className="club-member-photo" /> : <span className="club-member-photo club-member-initials">{m.display_name.slice(0, 2).toUpperCase()}</span>}
                <div><b>{m.display_name}</b><p className="fb-note">{sessionsMetric ? `${memberTotal(m.user_id)} sessions` : `${formatDistanceM(memberTotal(m.user_id), state?.units)} ${unitLabel}`} this week</p></div>
                <small>{(m.user_id === user?.id ? resting : m.rest_week === weekKey) ? "Rest week" : "Active"}</small>
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
                {note === "Invite link copied." ? "Copied ✓" : "Copy invite link"}
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
            <button
              className="fb-btn-line"
              disabled={busy}
              onClick={() =>
                void write("/rest", { crewId: crew?.id, rest: !resting })
              }
            >
              {resting ? "Clear rest week" : "Mark my rest week"}
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

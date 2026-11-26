"use client";
import { colors as appearanceColors } from "@/theme/app-colors";

import { useBootLoading } from "@/shell/boot-readiness";
import { RankAvatar } from "@/ui/rank-symbol";
import { AppParagraph, AppText, AppHeading, typographyStyle } from "@/ui/section";

import { RankBadge } from "../progress/rank-badge";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useCompete } from "@/components/compete-context";
import { CrewOverview } from "./crew-overview";
import { Sheet } from "@/ui/sheet";
import {
  CREW_SPORT_OPTIONS,
  SPORTS,
  rankSymbolForScore,
  APP_ICON_PATHS,
  competitionTrack,
  APP_TIMEZONE,
  accountTimeZone,
  competeNow,
  weeklyPeriodBounds,
  dayKey,
  crewInviteHttpsUrl,
  crewInviteNativePath,
  crewInviteWebDestination,
  type CrewFormatOption,
  type CrewSportOption,
  type SportId,
  countsForTraining,
  countsOnTrack,
  crewMemberWeekValue,
  crewLineup,
  crewSettingsTargetConfig,
  crewWeeklyMeasureOptions,
  formatCrewRelayVolume,
  humanizeCrewApiError,
  resolveCrewWeekMetric,
  resolveEditableCrewSettings,
} from "@fitness-battle/shared";
import { useCrewPassport } from "./use-crew-passport";
import { CrewInviteLanding } from "./crew-invite-landing";
import { useCrewInviteFlow } from "./use-crew-invite-flow";
import { NumberStepper } from "@/ui/number-stepper";
import Link from "next/link";
import { buildLoginHref, buildSignupHref } from "@/lib/auth/login-redirect";
import { GuestEntrySheet } from "@/components/guest-entry-sheet";
import { OpenInAppBanner } from "@/components/open-in-app-banner";
import { useGuestEntryPrompt } from "@/lib/guest-entry";
interface Crew {
  id: string;
  name: string;
  invite_code: string;
  sport: string;
  format: string;
  target_sessions: number;
  journey_km: number;
  target_hours?: number;
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
  seasonWeeks?: Record<string, number>;
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
  const [guestAuthOpen, setGuestAuthOpen] = useState(false);
  const inviteFlow = useCrewInviteFlow({
    offlineMode,
    userId: user?.id,
    joinCrew: async (code) => write("/join", { code }),
    onGuestAccept: () => setGuestAuthOpen(true),
  });
  const {
    inviteParam,
    inviteCode,
    invitePreview,
    invitePreviewLoading,
    invitePreviewError,
    inviteJoinBusy,
    clearInviteFlow,
    acceptInvite,
  } = inviteFlow;
  const fieldDestination = inviteParam ? crewInviteWebDestination(inviteParam) : "/app/field";
  const guestNextPath = fieldDestination;
  const guest = useGuestEntryPrompt({
    enabled: !inviteCode,
    nextPath: guestNextPath,
  });
  const [data, setData] = useState<CrewData | null>(null);
  const [selected, setSelected] = useState("");
  const [panel, setPanel] = useState<
    "invite" | "manage" | "add" | "members" | null
  >(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editSport, setEditSport] = useState<CrewSportOption>("all");
  const [editFormat, setEditFormat] = useState<CrewFormatOption>("duration");
  const [editTarget, setEditTarget] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [demoRest, setDemoRest] = useState<Record<string, string | null>>({});
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  useEffect(() => { setDemoRest({}); setPanel(null); setNote(""); }, [user?.id]);
  useBootLoading(Boolean(user && !offlineMode && !data && !note));
  async function reload() {
    try {
      const res = await fetch("/api/crews", { signal: AbortSignal.timeout(15000) });
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

  async function write(path: string, body: object, method = "POST"): Promise<boolean> {
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
      } else if (path === "" && method === "PATCH") {
        const nextSport = (body as { sport?: SportId }).sport ?? (state?.primary ?? "running");
        if (state?.crewBoard) {
          dispatch({
            type: "opt-in",
            sport: nextSport,
            crewBoard: { ...state.crewBoard, sport: nextSport },
          });
        }
        setNote("Saved. Your crew settings are up to date.");
      } else {
        setName("");
        setNote("Saved. Your crew is up to date.");
      }
      return true;
    }
    try {
      const res = await fetch(`/api/crews${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok || result.persisted === false)
        throw Error(humanizeCrewApiError(result.error ?? "Could not reach your crew."));
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

  const athleteName = state?.name || "Athlete";
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
    sport: "all",
    format: "duration",
    target_sessions: 4,
    journey_km: 40,
    target_hours: 10,
  };

  const soloMember: Member = {
    crew_id: "solo-preview",
    user_id: user?.id ?? "solo-guest",
    display_name: athleteName,
    rest_week: null,
  };

  const soloEntries: Entry[] = (state?.activities ?? [])
    .filter((a) => { const now = state ? competeNow(state) : new Date(); const week = weeklyPeriodBounds(now); return countsForTraining(a) && new Date(a.startedAt) >= week.startsAt && new Date(a.startedAt) < week.endsAt && new Date(a.startedAt) <= now; })
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
  const rawMembers =
    rawCrews.length > 0
      ? (data?.members ?? []).filter((m) => m.crew_id === crew?.id && (!m.status || m.status === "active"))
      : demoCrew && crew?.id === demoCrew.id
        ? demoMembers
        : [soloMember];
  const members = rawMembers.map(m => m.user_id === user?.id ? { ...m, avatar_url: state?.avatarUrl ?? null } : m);
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
  const previousDistanceM = data?.previousProgressAvailable?.[crew.id]
    ? (data.previousProgress??[]).filter(row=>row.crew_id===crew.id && members.some(m=>m.user_id===row.user_id)).reduce((sum,row)=>sum+Number(row.distance_m),0)
    : null;
  const passportInput = useMemo(
    () => ({
      members: members.map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
      })),
      entries,
      sport: crew.sport,
      format: crew.format,
      targetSessions: crew.target_sessions,
      targetHours: crew.target_hours ?? 10,
      targetDistanceM: crew.journey_km * 1000,
      previousDistanceM,
      now: (state ? competeNow(state) : new Date()).toISOString(),
      units: state?.units,
    }),
    [
      members,
      entries,
      crew.sport,
      crew.format,
      crew.target_sessions,
      crew.target_hours,
      crew.journey_km,
      previousDistanceM,
      state,
    ],
  );
  const { data: crewPassport } = useCrewPassport(crew.id, passportInput);
  const weekContract = crewPassport?.contract
    ? { metric: crewPassport.contract.metric, target: crewPassport.contract.target }
    : null;
  const weekMetric = resolveCrewWeekMetric({
    format: crew.format,
    sport: crew.sport,
    contract: weekContract,
  });
  const memberTotal = (id: string) => crewMemberWeekValue(entries, id, weekMetric);
  const memberContribution = (id: string) =>
    formatCrewRelayVolume(
      weekMetric === "sessions",
      crew.sport as SportId,
      memberTotal(id),
      state?.units,
      weekMetric,
    );
  const shareOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://overtaek.xyz";

  function requireCrewAccount(action: () => void) {
    if (user) {
      action();
      return;
    }
    setGuestAuthOpen(true);
  }

  return (
    <>
      {inviteParam ? (
        <OpenInAppBanner nativePath={crewInviteNativePath(inviteParam)} label="Open invite" />
      ) : null}
      {user && !offlineMode && !data && (
        <section className="focus-card">
          <AppParagraph typographyRole="body" className="fb-copy">{note || "Loading your circle…"}</AppParagraph>
          <button className="fb-btn-line" onClick={() => void reload()}>
            Refresh crews
          </button>
        </section>
      )}

      <CrewInviteLanding
        inviteCode={inviteCode}
        loading={invitePreviewLoading}
        loadError={invitePreviewError}
        preview={invitePreview}
        joinBusy={inviteJoinBusy}
        joinError={isCrewErrorNote(note) ? note : null}
        onAccept={() => {
          setNote("");
          void acceptInvite();
        }}
        onDecline={clearInviteFlow}
        onDismissError={clearInviteFlow}
      />
      {(!user || offlineMode || data) && !inviteCode && (
        <>
          <header className="crew-header">
            <div className="crew-header-main">
              <AppHeading level={1} role="heading" className="crew-header-name"><select aria-label="Switch crew" value={crew.id} onChange={e => {
                if (e.target.value === "new") requireCrewAccount(() => setPanel("add"));
                else setSelected(e.target.value);
              }}>{crews.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="new">New crew +</option></select><svg aria-hidden="true" className="crew-header-chevron" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS.chevron} /></svg></AppHeading>
            </div>
            <div className="crew-header-actions"><button type="button" className="crew-invite" onClick={() => requireCrewAccount(() => setPanel(isSolo ? "add" : "invite"))}>Invite</button><button type="button" aria-label="Crew settings" onClick={() => requireCrewAccount(() => {
              const resolved = resolveEditableCrewSettings(crew);
              setEditSport(resolved.sport);
              setEditFormat(resolved.format);
              setEditTarget(resolved.target);
              setPanel("manage");
            })}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={APP_ICON_PATHS.settings} /></svg></button></div>
          </header>
          {!isSolo ? <CrewOverview crewId={crew.id} crewName={crew.name} key={`${user?.id}:${crew.id}`} members={members} entries={entries} sport={crew.sport} format={crew.format} targetSessions={crew.target_sessions} targetHours={crew.target_hours ?? 10} targetDistanceM={crew.journey_km * 1000} previousDistanceM={previousDistanceM} units={state?.units} now={(state ? competeNow(state) : new Date()).toISOString()} displayTimeZone={state ? accountTimeZone(state) : undefined} onSelectMember={id => setViewingMember(members.find(m => m.user_id === id) ?? null)} onViewMembers={() => requireCrewAccount(() => setPanel("members"))} /> : user ? <section className="focus-card"><AppHeading level={2} role="display">Make room for your people.</AppHeading><button type="button" className="fb-btn" onClick={() => requireCrewAccount(() => setPanel("add"))}>Create or join a crew</button></section> : null}
        </>
      )}
      {!panel && note && (
        <AppParagraph typographyRole="body"
          className={isCrewErrorNote(note) ? "fb-error" : "focus-feedback"}
          role={isCrewErrorNote(note) ? "alert" : "status"}
        >
          {note}
        </AppParagraph>
      )}
      {!user && !inviteCode && (
        <div className="focus-crew-preview" style={{ marginBottom: 28 }}>
          <section className="focus-card">
            <AppParagraph typographyRole="label" className="fb-kicker">What crews unlock</AppParagraph>
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
            <AppHeading level={2} role="heading">Make room for your people.</AppHeading>
            <AppParagraph typographyRole="body" className="fb-copy" style={{ marginBottom: 20 }}>
              Private crews share a week of effort — invite codes,
              member standings, and a shared field when you register together.
            </AppParagraph>
            <div className="fb-row" style={{ width: "100%", gap: 10 }}>
              <Link
                className="fb-btn"
                href={buildSignupHref(guestNextPath)}
                style={{ flex: 1, textAlign: "center" }}
              >
                Create account
              </Link>
              <Link
                className="fb-btn-line"
                href={buildLoginHref(guestNextPath)}
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
            ? "New crew"
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
          <AppParagraph typographyRole="caption"
            className={isCrewErrorNote(note) ? "fb-error" : "fb-note"}
            role={isCrewErrorNote(note) ? "alert" : "status"}
            style={{ marginBottom: "12px" }}
          >
            {note}
          </AppParagraph>
        ) : null}
        {!user ? (
          <div style={{ marginTop: 8 }}>
            <AppParagraph typographyRole="body" className="fb-copy" style={{ marginBottom: 16 }}>
              A live account is required to invite friends, join circles, or manage crew membership.
            </AppParagraph>
            <div className="fb-row" style={{ width: "100%", gap: 10 }}>
              <Link
                className="fb-btn"
                href={buildSignupHref(guestNextPath)}
                style={{ flex: 1, textAlign: "center" }}
              >
                Create account
              </Link>
              <Link
                className="fb-btn-line"
                href={buildLoginHref(guestNextPath)}
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
            <AppParagraph typographyRole="caption" className="fb-note">
              Tracks all counted sports by weekly hours by default; adjust anytime in crew settings.
            </AppParagraph>
            <button
              className="fb-btn"
              disabled={busy || (!code.trim() && !name.trim())}
              onClick={() => {
                if (code.trim()) {
                  void write("/join", { code: code.trim().toUpperCase() });
                } else if (name.trim()) {
                  void write("", {
                    name: name.trim(),
                    sport: "all",
                    format: "duration",
                    targetHours: 10,
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
            {crewLineup(members, entries, crew.sport, weekMetric).map((m) => (
              <li key={m.user_id}>
                <RankAvatar rank={rankSymbolForScore(m.effort_score)} src={m.avatar_url} name={m.display_name} size={64} />
                <div><b>{m.display_name}</b><AppParagraph typographyRole="caption" className="fb-note">{memberContribution(m.user_id)} this week</AppParagraph></div>
                <AppText as="small" role="caption" secondary>{(m.user_id === user?.id ? resting : m.rest_week === weekKey) ? "Rest week" : "Active"}</AppText>
              </li>
            ))}
          </ul>
        ) : panel === "invite" ? (
          crew?.id === "solo-preview" ? (
            <div>
              <AppParagraph typographyRole="body" className="fb-copy" style={{ marginBottom: 16 }}>
                Create a crew first to generate an invite code and bring your friends together.
              </AppParagraph>
              <button
                className="fb-btn"
                onClick={() => requireCrewAccount(() => setPanel("add"))}
              >
                Create crew ＋
              </button>
            </div>
          ) : (
            <>
              <AppParagraph typographyRole="body" className="fb-copy">Share this link with friends.</AppParagraph>
              <label className="fb-field">
                Invite link
                <input
                  readOnly
                  value={crewInviteHttpsUrl(shareOrigin, crew?.invite_code ?? "")}
                />
              </label>
              <label className="fb-field">
                Invite code
                <input readOnly value={crew?.invite_code ?? ""} />
              </label>
              <button
                className="fb-btn"
                onClick={() => {
                  const link = crewInviteHttpsUrl(shareOrigin, crew?.invite_code ?? "");
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
            <AppParagraph typographyRole="body" className="fb-copy" style={{ marginBottom: 16 }}>
              {crew?.name} · {crew?.sport} · 1 member
            </AppParagraph>
            <AppParagraph typographyRole="caption" className="fb-note" style={{ marginBottom: 16 }}>
              You are currently in a solo circle. Create a shared crew to set weekly group goals with friends.
            </AppParagraph>
            <button
              className="fb-btn"
              onClick={() => requireCrewAccount(() => setPanel("add"))}
            >
              Create shared crew ＋
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <label className="fb-field">
              Crew sport
              <select
                value={editSport}
                onChange={(e) => {
                  const next = e.target.value as CrewSportOption;
                  setEditSport(next);
                  if ((next === "all" || next === "strength") && editFormat === "cooperative") {
                    setEditFormat("duration");
                    setEditTarget(crew.target_hours ?? 10);
                  }
                }}
              >
                {CREW_SPORT_OPTIONS.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
            </label>
            <label className="fb-field">
              Default weekly measure
              <select
                value={editFormat}
                onChange={(e) => {
                  const next = e.target.value as CrewFormatOption;
                  setEditFormat(next);
                  setEditTarget(
                    next === "duration"
                      ? (crew.target_hours ?? 10)
                      : next === "personal_target"
                        ? crew.target_sessions
                        : crew.journey_km,
                  );
                }}
              >
                {crewWeeklyMeasureOptions(editSport).map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </label>
            {(() => {
              const { spec, label } = crewSettingsTargetConfig(editSport, editFormat);
              return (
                <div className="fb-field">
                  <span>{label}</span>
                  <NumberStepper
                    label={label}
                    value={editTarget}
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    unit={spec.unit}
                    presets={spec.presets}
                    disabled={busy}
                    onChange={setEditTarget}
                  />
                </div>
              );
            })()}
            <AppParagraph typographyRole="caption" className="fb-note">
              Weekly contracts in Crew Passport can set a custom goal for any individual week.
            </AppParagraph>
            <button
              className="fb-btn"
              disabled={busy}
              onClick={() => {
                const { effectiveFormat } = crewSettingsTargetConfig(editSport, editFormat);
                void write(
                  "",
                  {
                    crewId: crew.id,
                    sport: editSport,
                    format: effectiveFormat,
                    targetHours: effectiveFormat === "duration" ? editTarget : (crew.target_hours ?? 10),
                    targetSessions: effectiveFormat === "personal_target" ? Math.round(editTarget) : crew.target_sessions,
                    journeyKm: effectiveFormat === "cooperative" ? editTarget : crew.journey_km,
                  },
                  "PATCH",
                );
              }}
            >
              {busy ? "Saving…" : "Save settings"}
            </button>
            <button
              className="fb-btn-line"
              disabled={busy}
              onClick={() =>
                void write("/rest", { crewId: crew?.id, rest: !resting })
              }
            >
              {resting ? "Clear rest week" : "Mark my rest week"}
            </button>
            <AppParagraph typographyRole="caption" className="fb-note">
              A crew rest marker does not freeze effort score. Week freezes live in
              Athlete preferences.
            </AppParagraph>
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
          </div>
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
              color: appearanceColors.textOnError,
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
      {viewingMember && crew && (
        <Sheet
          open={Boolean(viewingMember)}
          title={viewingMember.display_name}
          body="Member profile"
          onClose={() => setViewingMember(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <RankAvatar rank={rankSymbolForScore(viewingMember.effort_score)} src={viewingMember.avatar_url} name={viewingMember.display_name} size={96} />
              <div>
                <strong style={{ ...typographyStyle("heading"), display: "block" }}>{viewingMember.display_name}</strong>
                <RankBadge score={viewingMember.effort_score} />
                <span style={{ ...typographyStyle("caption"), color: "var(--muted)", display: "block", marginTop: 4 }}>
                  {(viewingMember.user_id === user?.id ? resting : viewingMember.rest_week === weekKey)
                    ? "Rest week"
                    : "Active this week"}
                </span>
              </div>
            </div>
            <div className="fb-card" style={{ padding: "16px", borderRadius: "16px", border: "1px solid var(--line)" }}>
              <span style={{ ...typographyStyle("caption"), color: "var(--muted)" }}>
                This week's contribution
              </span>
              <div style={{ ...typographyStyle("metric"), margin: "6px 0" }}>
                {memberContribution(viewingMember.user_id)}
              </div>
              <span style={{ ...typographyStyle("body"), color: "var(--muted)" }}>
                {crew.name} · {Math.round(memberTotal(viewingMember.user_id) / Math.max(1, members.reduce((sum, m) => sum + memberTotal(m.user_id), 0)) * 100)}% of crew total
              </span>
            </div>
            <button
              type="button"
              className="fb-btn-line"
              style={{ ...typographyStyle("label"), padding: "8px 16px" }}
              onClick={() => setViewingMember(null)}
            >
              Close
            </button>
          </div>
        </Sheet>
      )}
      <GuestEntrySheet
        open={guest.open || guestAuthOpen}
        reason={
          inviteParam
            ? `Join this crew with invite code ${inviteParam.toUpperCase()}.`
            : "Sign in to create or join a private crew."
        }
        nextPath={guestNextPath}
        onClose={() => {
          guest.dismiss();
          setGuestAuthOpen(false);
        }}
      />
    </>
  );
}

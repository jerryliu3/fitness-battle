import { useFocusStyles } from "../ui/focus";
import { useThemeColors } from "../theme";
import { AthleteProfileSheet } from "./athlete-profile-sheet";
import { RankAvatar } from "../ui/rank-symbol";
import { UserAvatar } from "../ui/user-avatar";
import { AppText, SectionStack } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
import { alpineTrail } from "../ui/club-art";

import { CrewSessions } from "./crew-sessions";
import { CrewOverview } from "./crew-overview";
import {
  type SportId,
  type CrewBoardPin,
  competitionTrack,
  competeNow,
  countsOnTrack,
  distanceUnitLabel,
  formatDistanceM,
  formatNoticeUnits,
  rankSymbolForScore,
  weeklyPeriodBounds,
  dayKey,
  APP_TIMEZONE,
  crewMemberWeekValue,
  getDemoCompeteState,
} from "@fitness-battle/shared";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useAthleteBlocks } from "../lib/athlete-blocks";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { requestApi } from "../lib/api";
import { useCachedApi } from "../lib/use-cached-api";
import { playCue } from "../lib/haptics";
import { FocusButton, FocusSheet } from "../ui/focus";
export interface PrivateCrew {
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
export interface CrewData {
  crews: { crew_id: string; crews: PrivateCrew | null }[];
  members: Member[];
  entries: Entry[];
  progress?: Entry[];
  previousProgress?: {crew_id:string;user_id:string;distance_m:number;moving_sec:number;session_count:number}[];
  previousProgressAvailable?: Record<string,boolean>;
  notices: { id: string; body: string }[];
  seasonWeeks?: Record<string, number>;
}
export function useCrewApi() {
  const { user, accessToken, offlineMode } = useAuth();
  const live = !!user && !offlineMode && !!accessToken;
  const { data, error, busy, reload } = useCachedApi<CrewData>("/api/crews");
  const request = useCallback(
    async (path: string, body?: object) => {
      if (!live) throw Error("Private crews need a live signed-in account.");
      return requestApi<{ crew?: PrivateCrew; pin?: CrewBoardPin; saved?: number }>(
        mobileEnv.apiUrl, accessToken, `/api/crews${path}`, { body },
      );
    },
    [live, accessToken],
  );
  return { data: data ?? null, error, busy, reload, request, live };
}

function crewError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : "Could not reach your crew.";
  if (raw.includes("invite_not_found"))
    return "We couldn't find a crew with that invite code.";
  if (raw.includes("already_a_member"))
    return "You are already a member of this crew.";
  if (raw.includes("not_a_member"))
    return "You are no longer a member of this crew. Refresh your crews.";
  return raw;
}
function inviteLink(code: string): string {
  const base = "https://overtaek.xyz";
  return `${base}/field?invite=${encodeURIComponent(code)}`;
}

export function CrewHub({ membersOnly = false, crewId = "" }: { membersOnly?: boolean; crewId?: string } = {}) {
const c=useThemeColors();
const f=useFocusStyles();

  const { state, refresh, dispatch } = useCompeteStore();
  const { user } = useAuth();
  const { blocks } = useAthleteBlocks();
  const hiddenIds = blocks.map(item => item.id);
  const router = useRouter();
  const params = useGlobalSearchParams<{ invite?: string | string[] }>();
  const api = useCrewApi();
  const [selected, setSelected] = useState(crewId);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const createAfterSwitch = useRef(false);
  const [panel, setPanel] = useState<
    "add" | "invite" | "manage" | "leave" | "members" | null
  >(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);
  const pendingMember = useRef<Member | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [format, setFormat] = useState("volume");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  useEffect(() => {
    setSelected(crewId);
    setViewingMember(null);
    pendingMember.current = null;
    setPanel(null);
    setNote("");
    setName("");
    setCode("");
  }, [user?.id]);
  useEffect(() => {
    const raw = params.invite;
    const invite = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (!invite || !api.live) return;
    setNote("");
    setCode(invite.toUpperCase());
    setPanel("add");
    router.setParams({ invite: undefined });
  }, [params.invite, api.live, router]);
  useFocusEffect(
    useCallback(() => {
      void api.reload();
      const timer = setInterval(() => {
        void api.reload();
      }, 60000);
      return () => clearInterval(timer);
    }, [api.reload]),
  );
  const demoSeed = !api.live && user ? getDemoCompeteState(user.id) ?? (user.email ? getDemoCompeteState(user.email.split("@")[0]) : null) : null;
  const pin =
    state?.crewBoard &&
    state.crewBoard.crewId !== "solo" &&
    !state.crewBoard.crewId.startsWith("field:")
      ? state.crewBoard
      : demoSeed?.crewBoard ?? null;
  const rawCrews = (api.data?.crews ?? []).flatMap((r) =>
    r.crews ? [r.crews] : [],
  );
  if (pin && !rawCrews.some((c) => c.id === pin.crewId))
    rawCrews.push({
      id: pin.crewId,
      name: pin.crewName,
      invite_code: "WEEKLY",
      sport: pin.sport,
      format: "volume",
      target_sessions: 4,
      journey_km: 60,
    });
  const solo = rawCrews.length === 0;
  const selfId = user?.id ?? "guest";
  const now = state ? competeNow(state) : new Date();
  const week = weeklyPeriodBounds(now);
  const preview: PrivateCrew = {
    id: "solo-preview",
    name:
      state?.name && state.name !== "Guest"
        ? `${state.name}’s Circle`
        : "Your Circle",
    invite_code: "",
    sport: state?.primary ?? "running",
    format: "cooperative",
    target_sessions: 4,
    journey_km: 40,
  };
  const crews = solo ? [preview] : rawCrews;
  const crew = crews.find((c) => c.id === selected) ?? crews[0]!;
  const rawMembers: Member[] = solo
    ? [
        {
          crew_id: crew.id,
          user_id: selfId,
          display_name: state?.name ?? "Athlete",
          rest_week: null,
        },
      ]
    : (pin
        ? pin.members.map(
            (member): Member => ({
              crew_id: pin.crewId,
              user_id: !api.live && member.name === state?.name && user ? user.id : member.id,
              display_name: member.name,
              effort_score: competitionTrack(pin.sport) === "verified" ? member.verifiedElo : member.elo,
              avatar_url: member.id === selfId ? state?.avatarUrl : member.avatarUrl,
              rest_week: null,
            }),
          )
        : (api.data?.members ?? [])
      ).filter(
        (m) => m.crew_id === crew.id && (!m.status || m.status === "active"),
      );
  const members = rawMembers.map(m => m.user_id === selfId ? { ...m, avatar_url: state?.avatarUrl ?? null } : m);
  const entries: Entry[] = solo
    ? (state?.activities ?? [])
        .filter(
          (a) =>
            countsOnTrack(a, "open") &&
            a.sport === crew.sport &&
            new Date(a.startedAt) >= week.startsAt &&
            new Date(a.startedAt) < week.endsAt &&
            new Date(a.startedAt) <= now,
        )
        .map((a) => ({
          crew_id: crew.id,
          user_id: selfId,
          activity_id: a.id,
          distance_m: a.distanceM,
          moving_sec: a.movingSec,
          started_at: a.startedAt,
          sport: a.sport,
          disposition: "counted",
        }))
    : (pin
        ? pin.members.map((member) => ({
            crew_id: pin.crewId,
            user_id: !api.live && member.name === state?.name && user ? user.id : member.id,
            activity_id: `preview-${member.id}`,
            distance_m: member.distanceM ?? 0,
            moving_sec: member.movingSec ?? 0,
            started_at: pin.waveStart,
            sport: pin.sport,
            disposition: "counted",
          }))
        : (api.data?.progress ?? api.data?.entries ?? [])
      ).filter((e) => e.crew_id === crew.id && e.disposition === "counted");
  const weekKey = dayKey(week.startsAt, APP_TIMEZONE);
  const previousDistanceM = api.data?.previousProgressAvailable?.[crew.id]
    ? (api.data.previousProgress??[]).filter(row=>row.crew_id===crew.id && members.some(m=>m.user_id===row.user_id)).reduce((sum,row)=>sum+Number(row.distance_m),0)
    : null;
  const sessionsMetric = crew.format === "personal_target" || crew.sport === "strength";
  const distance = (meters: number) =>
    `${formatDistanceM(meters, state?.units)} ${distanceUnitLabel(state?.units)}`;
  const memberTotal = (id: string) =>
    crewMemberWeekValue(entries, id, sessionsMetric);
  function open(next: typeof panel) {
    if (next === "members") { router.push({ pathname: "/crew-members", params: { crewId: crew.id } }); return; }
    setNote("");
    setName("");
    setCode("");
    setPanel(next);
  }
  async function write(path: string, body: object) {
    if (flight.current) return;
    if (solo && path !== "" && path !== "/join") {
      open("add");
      return;
    }
    flight.current = true;
    setBusy(true);
    setNote("");
    const id = user?.id;
    try {
      if (!api.live) {
        if (path === "") {
          const newName = (body as { name?: string }).name || "My Crew";
          const newSport = (body as { sport?: string }).sport || state?.primary || "running";
          const newId = `demo-crew-${Date.now()}`;
          const newPin = {
            crewId: newId,
            crewName: newName,
            sport: newSport as SportId,
            waveStart: week.startsAt.toISOString(),
            weekEnd: week.endsAt.toISOString(),
            capacity: 8,
            memberIds: [selfId],
            syntheticIds: [],
            members: [
              {
                id: selfId,
                name: state?.name ?? "Athlete",
                elo: 1000,
                distanceM: 0,
                movingSec: 0,
                verifiedDistanceM: 0,
                verifiedMovingSec: 0,
              },
            ],
          };
          dispatch({ type: "opt-in", sport: newSport as SportId, crewBoard: newPin });
          setSelected(newId);
          setPanel(null);
          setNote("Saved. Your crew is up to date.");
          return;
        }
        if (path === "/join") {
          const inviteCode = (body as { code?: string }).code || "WEEKLY";
          const joinId = `demo-crew-${inviteCode.toLowerCase()}`;
          const joinPin = {
            crewId: joinId,
            crewName: `Crew ${inviteCode}`,
            sport: (state?.primary ?? "running") as SportId,
            waveStart: week.startsAt.toISOString(),
            weekEnd: week.endsAt.toISOString(),
            capacity: 8,
            memberIds: [selfId],
            syntheticIds: [],
            members: [
              {
                id: selfId,
                name: state?.name ?? "Athlete",
                elo: 1000,
                distanceM: 0,
                movingSec: 0,
                verifiedDistanceM: 0,
                verifiedMovingSec: 0,
              },
            ],
          };
          dispatch({ type: "opt-in", sport: (state?.primary ?? "running") as SportId, crewBoard: joinPin });
          setSelected(joinId);
          setPanel(null);
          setNote("Saved. Your crew is up to date.");
          return;
        }
        if (path === "/leave") {
          dispatch({ type: "clear-crew-board" });
          setSelected("");
          setPanel(null);
          setNote("You left the crew.");
          return;
        }
      }
      const result = await api.request(path, body);
      if (owner.current !== id) return;
      void playCue("success");
      const reloaded = await api.reload();
      if (owner.current !== id) return;
      if (result.crew?.id) setSelected(result.crew.id);
      if (path === "/leave") {
        setSelected(crewId);
        await refresh();
      }
      if (path === "/entries") {
        const saved = Number(result.saved ?? 0);
        setNote(
          !reloaded
            ? "Shared, but your crews could not refresh. Please refresh crews."
            : saved > 0
              ? `Shared ${saved} session${saved === 1 ? "" : "s"} with your crew.`
              : "Your sessions are already shared for this week.",
        );
      } else {
        setPanel(null);
        setName("");
        setCode("");
        setNote(
          !reloaded
            ? "Saved, but your crews could not refresh. Please refresh crews."
            : path === "/leave"
              ? "You left the crew."
              : "Saved. Your crew is up to date.",
        );
      }
    } catch (e) {
      if (owner.current === id) { void playCue("error"); setNote(crewError(e)); }
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  const membersView = (
<View style={{ gap: 16 }}>
            <AppText role="body" secondary >{crew.name}</AppText>
            <SectionStack>
            {members.map(m => hiddenIds.includes(m.user_id) ? <View key={m.user_id} style={{ minHeight: 72 }} /> : <Pressable key={m.user_id} style={[f.section, f.row]} accessibilityRole="button" accessibilityLabel={`View ${m.display_name}'s profile`} onPress={() => {
              if (membersOnly) setViewingMember(m);
              else { pendingMember.current = m; setPanel(null); }
            }}>
              <RankAvatar rank={rankSymbolForScore(m.effort_score)} src={m.avatar_url} name={m.display_name} size={64} />
              <View style={f.grow}><AppText role="row">{m.display_name}</AppText><AppText role="support" secondary >Active</AppText>
                <AppText role="support" secondary >{sessionsMetric ? `${memberTotal(m.user_id)} sessions` : distance(memberTotal(m.user_id))} this week</AppText>
              </View>
            </Pressable>)}
            </SectionStack>
          </View>
  );
  if (api.live && !api.data)
    return (
      <View style={f.section}>
        <AppText role="body" secondary >{api.error || "Loading your circle…"}</AppText>
        <FocusButton
          label="Refresh crews"
          onPress={() => void api.reload()}
          disabled={api.busy}
        />
      </View>
    );
  const memberSheet = <AthleteProfileSheet
    athlete={viewingMember ? {
      id: viewingMember.user_id, name: viewingMember.display_name, avatarUrl: viewingMember.avatar_url,
      you: viewingMember.user_id === user?.id, score: viewingMember.effort_score,
      contextLabel: "This week's crew contribution",
      contextValue: viewingMember.status === "former" ? undefined : sessionsMetric ? `${memberTotal(viewingMember.user_id)} sessions` : distance(memberTotal(viewingMember.user_id)),
      contextDetail: `${crew.name} · ${Math.round(memberTotal(viewingMember.user_id) / Math.max(1, members.reduce((sum, m) => sum + memberTotal(m.user_id), 0)) * 100)}% of crew total`,
    } : null}
    onClose={() => setViewingMember(null)}
  />;
  if (membersOnly) return <>{membersView}{memberSheet}</>;
  return (
    <>
      {api.error ? (
        <FocusButton
          label="Refresh crews"
          secondary
          onPress={() => void api.reload()}
        />
      ) : null}
      {solo ? (
        <SectionStack divided={false}>
        <ImageBackground source={alpineTrail} style={{height:200,justifyContent:"flex-end",padding:22,borderRadius:20,overflow:"hidden",backgroundColor:c.fieldDeep}}><View style={[StyleSheet.absoluteFill,{backgroundColor:"#081f3670"}]}/><AppText accessibilityRole="header" role="display" style={{ color: c.textOnFeature }}>Stronger together.</AppText><AppText role="body" secondary style={{ color: c.textOnFeature }}>A place for every pace.</AppText></ImageBackground>
        <View style={f.section}>
          <Text style={f.kicker}>Your people</Text>
          <AppText accessibilityRole="header" role="display" >Make room for your people.</AppText>
          <AppText role="body" secondary >
            Private crews share a week of effort, member standings and
            an optional shared field.
          </AppText>
          <FocusButton
            label={user ? "Create or join a crew" : "View account"}
            onPress={() =>
              user ? open("add") : router.navigate("/athlete")
            }
          />
          {!user ? (
            <AppText role="caption" secondary >
              Sign in to create or join a private crew.
            </AppText>
          ) : null}
        </View>
        </SectionStack>
      ) : (
        <SectionStack divided={false}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Switch crew" onPress={() => setSwitcherOpen(true)} style={{ minHeight: 44, justifyContent: "center" }}><AppText accessibilityRole="header" role="display">{crew.name} ⌄</AppText></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="View crew members" onPress={() => open("members")} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}><View style={{ flexDirection: "row" }}>{members.slice(0, 3).map(m => <View key={m.user_id} style={{ marginRight: -5 }}>{!hiddenIds.includes(m.user_id) && <UserAvatar src={m.avatar_url} name={m.display_name} size={24} />}</View>)}</View><AppText role="caption" secondary>{members.length} {members.length === 1 ? "member" : "members"}</AppText></Pressable>
            </View>
            {user && <View style={{ flexDirection: "row", gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Invite to crew" onPress={() => open("invite")} style={[f.chip, { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" }]}><AppText role="heading">＋</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Crew settings" onPress={() => open("manage")} style={[f.chip, { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" }]}><AppIcon name="preferences" size={20} /></Pressable></View>}
          </View>
          <CrewOverview crewId={crew.id} key={`${user?.id}:${crew.id}`} members={members} entries={entries} sport={crew.sport} format={crew.format} targetSessions={crew.target_sessions} targetDistanceM={crew.journey_km * 1000} previousDistanceM={previousDistanceM} units={state?.units} now={(state ? competeNow(state) : new Date()).toISOString()} hiddenIds={hiddenIds} onSelectMember={id => setViewingMember(members.find(m => m.user_id === id) ?? null)}>
            {user && <CrewSessions compact key={`${user.id}:${crew.id}`} crewId={crew.id} hiddenIds={hiddenIds} onSelectMember={(id, name) => setViewingMember(members.find(m => m.user_id === id) ?? { user_id: id, display_name: name, crew_id: crew.id, rest_week: null, status: "former" })} portraits={Object.fromEntries(members.map(m => [m.user_id, m.avatar_url]))} sport={crew.sport} />}
          </CrewOverview>
        </SectionStack>
      )}
      <FocusSheet open={switcherOpen} minimal title="Your crews" onClosed={() => { if (createAfterSwitch.current) { createAfterSwitch.current = false; open("add"); } }} onClose={() => setSwitcherOpen(false)}>{crews.map(item => <FocusButton key={item.id} label={item.name} secondary={item.id !== crew.id} onPress={() => { setSelected(item.id); setSwitcherOpen(false); }} />)}<FocusButton label="New crew +" secondary onPress={() => { createAfterSwitch.current = true; setSwitcherOpen(false); }} /></FocusSheet>
      {memberSheet}
      {!panel && (note || api.error) ? (
        <AppText role="body" secondary  accessibilityLiveRegion="polite">
          {note || api.error}
        </AppText>
      ) : null}
      {!hiddenIds.length && api.data?.notices?.map((n) => (
        <AppText role="caption" secondary  key={n.id}>
          {formatNoticeUnits(n.body, state?.units)}
        </AppText>
      ))}
      {!user ? (
        <>
          <View style={f.section}>
            <Text style={f.kicker}>What crews unlock</Text>
            <AppText role="label" >Shared week</AppText>
            <AppText role="body" secondary >
              See who showed up and how the circle is pacing.
            </AppText>
            <AppText role="label" >Invite codes</AppText>
            <AppText role="body" secondary >Bring friends in without a public board.</AppText>
            <AppText role="label" >Crew field</AppText>
            <AppText role="body" secondary >
              Register together on one individual leaderboard.
            </AppText>
          </View>
        </>
      ) : null}
      <FocusSheet
        open={!!panel}
        minimal
        onClosed={() => { if (pendingMember.current) { setViewingMember(pendingMember.current); pendingMember.current = null; } }}
        fullScreen={panel === "members"}
        title={
          panel === "add"
            ? "New crew"
            : panel === "invite"
              ? "Invite to crew"
              : panel === "members"
                ? "Members"
                : panel === "leave"
                  ? `Leave ${crew.name}?`
                  : "Your crew, your rhythm."
        }
        onClose={() => {
          if (!busy) {
            setPanel(null);
            setName("");
            setCode("");
            setNote("");
          }
        }}
      >
        {!user && panel !== "members" ? (
          <>
            <AppText role="body" secondary >
              Sign in to create or join a private crew.
            </AppText>
            <FocusButton
              label="Go to Athlete"
              onPress={() => {
                setPanel(null);
                router.navigate("/athlete");
              }}
            />
          </>
        ) : panel === "add" ? (
          <>
            <AppText role="caption" secondary >Invite code</AppText>
            <TextInput
              accessibilityLabel="Invite code"
              style={f.input}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoFocus={false}
              editable={!busy}
            />
            <Text style={f.kicker}>or start a new crew</Text>
            <TextInput
              accessibilityLabel="Crew name"
              style={f.input}
              value={name}
              onChangeText={setName}
              maxLength={60}
              autoFocus={false}
              editable={!busy}
            />
            {[
              { id: "volume", name: "Same-sport volume" },
              { id: "personal_target", name: "Personal session targets" },
              { id: "cooperative", name: "Shared distance" },
            ].map((o) => (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: format === o.id }}
                disabled={busy}
                style={[f.chip, format === o.id && f.chipActive]}
                onPress={() => setFormat(o.id)}
              >
                <AppText role="label" >{o.name}</AppText>
              </Pressable>
            ))}
            <FocusButton
              label={
                busy
                  ? "Saving…"
                  : code.trim()
                    ? "Join crew"
                    : name.trim()
                      ? "Create crew"
                      : "Join or create crew"
              }
              disabled={busy || (!code.trim() && !name.trim())}
              onPress={() =>
                code.trim()
                  ? void write("/join", { code: code.trim().toUpperCase() })
                  : void write("", {
                      name: name.trim(),
                      sport: state?.primary ?? "running",
                      format,
                    })
              }
            />
          </>
        ) : solo ? (
          <>
            <AppText role="body" secondary >
              Create a crew first to invite your friends and share settings.
            </AppText>
            <FocusButton label="Create crew ＋" onPress={() => open("add")} />
          </>
        ) : panel === "members" ? (
          membersView
        ) : panel === "invite" ? (
          <>
            <AppText role="body" secondary >
              Share this link so friends join your crew.
            </AppText>
            <AppText role="caption" secondary selectable >
              {inviteLink(crew.invite_code)}
            </AppText>
            <FocusButton
              label="Share invite link"
              onPress={() =>
                void Share.share({
                  message: `Join my crew on overtaek: ${inviteLink(crew.invite_code)}`,
                }).then(result => { if (result.action === Share.sharedAction) setNote("Invite shared."); }).catch(() => setNote("Could not share the invite. Try again."))
              }
            />
            <Text selectable style={f.massive}>
              {crew.invite_code}
            </Text>
            <AppText role="caption" secondary >Or share the code only</AppText>
          </>
        ) : panel === "leave" ? (
          <>
            <AppText role="body" secondary >
              You can rejoin anytime with an invite code.
            </AppText>
            <FocusButton
              label={busy ? "Leaving…" : "Confirm leave crew"}
              disabled={busy}
              onPress={() => void write("/leave", { crewId: crew.id })}
            />
          </>
        ) : (
          <>
            <AppText role="body" secondary >
              {crew.sport} · {crew.format.replaceAll("_", " ")}
            </AppText>
            <FocusButton
              label="Leave crew"
              secondary
              disabled={busy}
              onPress={() => open("leave")}
            />
          </>
        )}
        {note ? (
          <AppText role="body" secondary  accessibilityLiveRegion="polite">
            {note}
          </AppText>
        ) : null}
      </FocusSheet>
    </>
  );
}

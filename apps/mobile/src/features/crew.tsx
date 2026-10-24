import { RankBadge } from "../ui/rank-badge";
import { alpineTrail } from "../ui/club-art";
import { SHELL_COLORS as c } from "../theme";
import { CrewSessions } from "./crew-sessions";
import { CrewRelay } from "./crew-relay";
import {
  type SportId,
  competitionTrack,
  competeNow,
  countsOnTrack,
  distanceUnitLabel,
  formatDistanceM,
  formatNoticeUnits,
  weeklyPeriodBounds,
  dayKey,
  APP_TIMEZONE,
} from "@fitness-battle/shared";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, ImageBackground, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";
import { playCue } from "../lib/haptics";
import { FocusButton, FocusSheet, f } from "../ui/focus";
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
  const [data, setData] = useState<CrewData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const request = useCallback(
    async (path: string, body?: object) => {
      if (!user || offlineMode || !accessToken)
        throw Error("Private crews need a live signed-in account.");
      const response = await fetchWithTimeout(
        `${mobileEnv.apiUrl}/api/crews${path}`,
        {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      const result = await response.json();
      if (!response.ok || result.persisted === false)
        throw Error(result.error ?? "Could not reach your crew.");
      return result;
    },
    [user?.id, accessToken, offlineMode],
  );
  const reload = useCallback(async () => {
    const owner = user?.id;
    if (!owner || offlineMode || !accessToken) return;
    setBusy(true);
    setError("");
    try {
      const result = await request("");
      if (identity.current === owner) {
        setData(result);
        return true;
      }
      return false;
    } catch (e) {
      if (identity.current === owner)
        setError(e instanceof Error ? e.message : "Could not load crews.");
      return false;
    } finally {
      if (identity.current === owner) setBusy(false);
    }
  }, [user?.id, accessToken, offlineMode, request]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    setData(null);
    setError("");
  }, [user?.id]);
  return {
    data,
    error,
    busy,
    reload,
    request,
    live: !!user && !offlineMode && !!accessToken,
  };
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
  const base = mobileEnv.apiUrl.replace(/\/$/, "");
  return `${base}/field?invite=${encodeURIComponent(code)}`;
}

export function CrewHub({ membersOnly = false, crewId = "" }: { membersOnly?: boolean; crewId?: string } = {}) {
  const { state, refresh } = useCompeteStore();
  const { user } = useAuth();
  const router = useRouter();
  const params = useGlobalSearchParams<{ invite?: string | string[] }>();
  const api = useCrewApi();
  const [selected, setSelected] = useState(crewId);
  const [panel, setPanel] = useState<
    "add" | "invite" | "manage" | "leave" | "members" | null
  >(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [format, setFormat] = useState("volume");
  const [note, setNote] = useState("");
  const [demoRest, setDemoRest] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  useEffect(() => {
    setSelected(crewId);
    setDemoRest({});
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
  const pin =
    !api.live &&
    state?.crewBoard &&
    state.crewBoard.crewId !== "solo" &&
    !state.crewBoard.crewId.startsWith("field:")
      ? state.crewBoard
      : null;
  const rawCrews = (api.data?.crews ?? []).flatMap((r) =>
    r.crews ? [r.crews] : [],
  );
  if (pin)
    rawCrews.push({
      id: pin.crewId,
      name: pin.crewName,
      invite_code: "",
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
  const members: Member[] = solo
    ? [
        {
          crew_id: crew.id,
          user_id: selfId,
          display_name: state?.name ?? "You",
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
  const restKey = `${user?.id}:${crew.id}`;
  const resting = api.live ? members.find(m => m.user_id === user?.id)?.rest_week === weekKey : demoRest[restKey] === weekKey;
  const previousDistanceM = api.data?.previousProgressAvailable?.[crew.id]
    ? (api.data.previousProgress??[]).filter(row=>row.crew_id===crew.id && members.some(m=>m.user_id===row.user_id)).reduce((sum,row)=>sum+Number(row.distance_m),0)
    : null;
  const sessionsMetric = crew.format === "personal_target" || crew.sport === "strength";
  const totalM = entries.reduce((n, e) => n + Number(e.distance_m), 0);
  const distance = (meters: number) =>
    `${formatDistanceM(meters, state?.units)} ${distanceUnitLabel(state?.units)}`;
  const memberTotal = (id: string) =>
    entries
      .filter((e) => e.user_id === id)
      .reduce((n, e) => n + Number(sessionsMetric ? e.session_count ?? 1 : e.distance_m), 0);
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
      if (!api.live && path === "/rest") {
        setDemoRest(old => ({...old, [restKey]: resting ? null : weekKey}));
        setNote(resting ? "Rest week cleared." : "Rest week set. You can clear it here.");
        return;
      }
      const result = await api.request(path, body);
      if (owner.current !== id) return;
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
        if (path !== "/rest") setPanel(null);
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
      if (owner.current === id) setNote(crewError(e));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  const membersView = (
<View style={{ gap: 16 }}>
            <Text style={f.copy}>{crew.name}</Text>
            {members.map(m => <View key={m.user_id} style={[f.card, f.row]}>
              {m.avatar_url ? <Image source={{ uri: m.avatar_url }} style={{ width: 56, height: 56, borderRadius: 28 }} /> : <View style={[f.avatar, { width: 56, height: 56, borderRadius: 28 }]}><Text style={f.h2}>{m.display_name.slice(0, 2).toUpperCase()}</Text></View>}
              <View style={f.grow}><Text style={f.h2}>{m.display_name}</Text><Text style={f.small}>{(m.user_id === user?.id ? resting : m.rest_week === weekKey) ? "Rest week" : "Active"}</Text>
                <Text style={f.small}>{sessionsMetric ? `${memberTotal(m.user_id)} sessions` : distance(memberTotal(m.user_id))} this week</Text>
              </View>
            </View>)}
          </View>
  );
  if (api.live && !api.data)
    return (
      <View style={f.card}>
        <Text style={f.copy}>{api.error || "Loading your circle…"}</Text>
        <FocusButton
          label="Refresh crews"
          onPress={() => void api.reload()}
          disabled={api.busy}
        />
      </View>
    );
  if (membersOnly) return membersView;
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
        <View style={{gap:18}}>
        <ImageBackground source={alpineTrail} style={{height:200,justifyContent:"flex-end",padding:22,borderRadius:20,overflow:"hidden",backgroundColor:c.fieldDeep}}><View style={[StyleSheet.absoluteFill,{backgroundColor:"#081f3670"}]}/><Text style={[f.title,{color:c.card,fontSize:28}]}>Stronger together.</Text><Text style={[f.copy,{color:c.card}]}>A place for every pace.</Text></ImageBackground>
        <View style={f.card}>
          <Text style={f.kicker}>Your people</Text>
          <Text style={f.title}>Make room for your people.</Text>
          <Text style={f.copy}>
            Private crews share a week of effort, member standings and
            an optional shared field.
          </Text>
          <FocusButton
            label={api.live ? "Create or join a crew" : "View account"}
            onPress={() =>
              api.live ? open("add") : router.navigate("/athlete")
            }
          />
          {!api.live ? (
            <Text style={f.small}>
              A live account is needed to create or join a private crew.
            </Text>
          ) : null}
        </View>
        </View>
      ) : (
        <>
          <View style={f.chipRow}>
            {crews.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: crew.id === c.id }}
                onPress={() => setSelected(c.id)}
                style={[f.chip, crew.id === c.id && f.chipActive]}
              >
                <Text style={f.rowTitle}>{c.name}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => open("add")}
              style={[f.chip, { borderStyle: "dashed" }]}
            >
              <Text style={f.rowTitle}>＋ Add Crew</Text>
            </Pressable>
          </View>
          <ImageBackground source={alpineTrail} style={[f.card,{backgroundColor:c.fieldDeep,gap:18,minHeight:260,overflow:"hidden",justifyContent:"space-between"}]} imageStyle={{borderRadius:20}}><View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:"#081f3680"}]}/>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View crew members"
              onPress={() => open("members")}
              style={{ gap: 12, minHeight: 44, flex: 1 }}
            >
              <Text style={[f.kicker, { color: c.tennis }]}>
                {solo ? "Solo circle" : "Your people"} · {members.length} member
                {members.length === 1 ? "" : "s"}
              </Text>
              <Text style={[f.title, { color: c.paper }]}>{crew.name}</Text>
            </Pressable>
            <View style={[f.row, { flexWrap: "wrap" }]}>
              <View style={f.chipRow}>
                {members.slice(0, 5).map((m) => (
                  <View key={m.user_id} style={f.avatar}>
                    <Text style={f.rowTitle}>
                      {m.display_name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
              {user ? (
                <FocusButton
                  label="Invite"
                  onPress={() => {
                    open("invite");
                    if (!solo && crew.invite_code) {
                      const link = inviteLink(crew.invite_code);
                      void Share.share({
                        message: `Join my crew on overtaek: ${link}`,
                      }).then(result => {
                        if (result.action === Share.sharedAction) { setNote("Invite shared."); void playCue("success"); }
                      }).catch(() => setNote("Could not share the invite. Try again."));
                    }
                  }}
                />
              ) : null}
              {user ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Crew settings"
                  onPress={() => open("manage")}
                  style={[f.chip, { minWidth: 48 }]}
                >
                  <Text style={f.h2}>⚙</Text>
                </Pressable>
              ) : null}
            </View>
          </ImageBackground>
          <View style={f.card}>
            <Text style={f.kicker}>Our shared week · {crew.sport}</Text>
            <Text style={f.massive}>
              {sessionsMetric
                ? entries.reduce(
                    (total, entry) => total + Number(entry.session_count ?? 1),
                    0,
                  )
                : formatDistanceM(totalM, state?.units)}
            </Text>
            <Text style={f.copy}>
              {sessionsMetric
                ? `sessions · ${crew.target_sessions} per member`
                : `${distanceUnitLabel(state?.units)} together`}
            </Text>
            <CrewRelay userId={user?.id} key={crew.id} members={members} entries={entries} sport={crew.sport as SportId} format={crew.format} previousDistanceM={previousDistanceM} targetDistanceM={crew.journey_km*1000} targetSessions={crew.target_sessions} units={state?.units} />
          </View>
          {user ? (
            <>
              {user && !solo ? <CrewSessions key={`${user?.id}:${crew.id}`} crewId={crew.id} sport={crew.sport} /> : null}
              <Text style={f.h2}>Crew standings</Text>
              <View style={f.card}>
                {[...members]
                  .sort(
                    (a, b) => memberTotal(b.user_id) - memberTotal(a.user_id),
                  )
                  .map((m, i) => (
                    <View key={m.user_id} style={f.row}>
                      <Text style={f.small}>{i + 1}</Text>
                      <Text style={[f.rowTitle, f.grow]}>{m.display_name}</Text>
                      <RankBadge score={m.effort_score} />
                      <Text style={f.rowTitle}>
                        {sessionsMetric ? `${memberTotal(m.user_id)} sessions` : distance(memberTotal(m.user_id))}
                      </Text>
                    </View>
                  ))}
              </View>
            </>
          ) : null}
        </>
      )}
      {!panel && (note || api.error) ? (
        <Text style={f.copy} accessibilityLiveRegion="polite">
          {note || api.error}
        </Text>
      ) : null}
      {api.data?.notices?.map((n) => (
        <Text style={f.small} key={n.id}>
          {formatNoticeUnits(n.body, state?.units)}
        </Text>
      ))}
      {!user ? (
        <>
          <View style={f.card}>
            <Text style={f.kicker}>What crews unlock</Text>
            <Text style={f.rowTitle}>Shared week</Text>
            <Text style={f.copy}>
              See who showed up and how the circle is pacing.
            </Text>
            <Text style={f.rowTitle}>Invite codes</Text>
            <Text style={f.copy}>Bring friends in without a public board.</Text>
            <Text style={f.rowTitle}>Crew field</Text>
            <Text style={f.copy}>
              Register together on one individual leaderboard.
            </Text>
          </View>
        </>
      ) : null}
      <FocusSheet
        open={!!panel}
        fullScreen={panel === "members"}
        title={
          panel === "add"
            ? "Add Crew"
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
        {!api.live && panel !== "members" ? (
          <>
            <Text style={f.copy}>
              A live account is needed to create or join a private crew.
            </Text>
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
            <Text style={f.small}>Invite code</Text>
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
                <Text style={f.rowTitle}>{o.name}</Text>
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
            <Text style={f.copy}>
              Create a crew first to invite your friends and share settings.
            </Text>
            <FocusButton label="Create crew ＋" onPress={() => open("add")} />
          </>
        ) : panel === "members" ? (
          membersView
        ) : panel === "invite" ? (
          <>
            <Text style={f.copy}>
              Share this link so friends join your crew.
            </Text>
            <Text selectable style={f.small}>
              {inviteLink(crew.invite_code)}
            </Text>
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
            <Text style={f.small}>Or share the code only</Text>
          </>
        ) : panel === "leave" ? (
          <>
            <Text style={f.copy}>
              You can rejoin anytime with an invite code.
            </Text>
            <FocusButton
              label={busy ? "Leaving…" : "Confirm leave crew"}
              disabled={busy}
              onPress={() => void write("/leave", { crewId: crew.id })}
            />
          </>
        ) : (
          <>
            <Text style={f.copy}>
              {crew.sport} · {crew.format.replaceAll("_", " ")}
            </Text>
            <FocusButton
              label={resting ? "Clear rest week" : "Mark my rest week"}
              secondary
              disabled={busy}
              onPress={() =>
                void write("/rest", { crewId: crew.id, rest: !resting })
              }
            />
            <Text style={f.small}>
              A crew rest marker does not freeze effort score. Week freezes live
              in Athlete → Preferences.
            </Text>
            <FocusButton
              label="Leave crew"
              secondary
              disabled={busy}
              onPress={() => open("leave")}
            />
          </>
        )}
        {note ? (
          <Text style={f.copy} accessibilityLiveRegion="polite">
            {note}
          </Text>
        ) : null}
      </FocusSheet>
    </>
  );
}

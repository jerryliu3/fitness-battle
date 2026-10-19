import {
  APP_TIMEZONE,
  competeNow,
  countsOnTrack,
  distanceUnitLabel,
  formatDistanceM,
  weeklyPeriodBounds,
} from "@fitness-battle/shared";
import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Share, Text, TextInput, View } from "react-native";
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
  notices: { id: string; body: string }[];
  seasonWeeks?: Record<string, number>;
}
export function useCrewApi() {
  const { user, accessToken, demoMode } = useAuth();
  const [data, setData] = useState<CrewData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const request = useCallback(
    async (path: string, body?: object) => {
      if (!user || demoMode || !accessToken)
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
    [user?.id, accessToken, demoMode],
  );
  const reload = useCallback(async () => {
    const owner = user?.id;
    if (!owner || demoMode || !accessToken) return;
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
  }, [user?.id, accessToken, demoMode, request]);
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
    live: !!user && !demoMode && !!accessToken,
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

export function CrewHub() {
  const { state, refresh } = useCompeteStore();
  const { user } = useAuth();
  const router = useRouter();
  const params = useGlobalSearchParams<{ invite?: string | string[] }>();
  const api = useCrewApi();
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("Activity");
  const [panel, setPanel] = useState<
    "add" | "invite" | "manage" | "leave" | null
  >(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [format, setFormat] = useState("volume");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  useEffect(() => {
    setSelected("");
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
  const rawCrews = (api.data?.crews ?? []).flatMap((r) =>
    r.crews ? [r.crews] : [],
  );
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
    : (api.data?.members ?? []).filter(
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
    : (api.data?.entries ?? []).filter(
        (e) => e.crew_id === crew.id && e.disposition === "counted",
      );
  const totalM = entries.reduce((n, e) => n + Number(e.distance_m), 0);
  const distance = (meters: number) =>
    `${formatDistanceM(meters, state?.units)} ${distanceUnitLabel(state?.units)}`;
  const memberTotal = (id: string) =>
    entries
      .filter((e) => e.user_id === id)
      .reduce((n, e) => n + Number(e.distance_m), 0);
  function open(next: typeof panel) {
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
      const result = await api.request(path, body);
      if (owner.current !== id) return;
      const reloaded = await api.reload();
      if (owner.current !== id) return;
      if (result.crew?.id) setSelected(result.crew.id);
      if (path === "/leave") {
        setSelected("");
        await refresh();
      }
      if (path === "/entries") {
        const saved = Number(result.saved ?? 0);
        setNote(
          !reloaded
            ? "Shared, but your crews could not refresh. Please refresh crews."
            : saved > 0
              ? `Shared ${saved} counted session${saved === 1 ? "" : "s"} with your crew.`
              : "Your counted sessions are already shared for this week.",
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
      if (owner.current === id) setNote(crewError(e));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
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
  return (
    <>
      {api.error ? (
        <FocusButton
          label="Refresh crews"
          secondary
          onPress={() => void api.reload()}
        />
      ) : null}
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
      <View style={[f.card, { backgroundColor: "#282f2c", gap: 18 }]}>
        <Text style={[f.kicker, { color: "#f1c75b" }]}>
          {solo ? "Solo circle" : "Your people"} · {members.length} member
          {members.length === 1 ? "" : "s"}
        </Text>
        <Text style={[f.title, { color: "#fafaf7" }]}>{crew.name}</Text>
        <Text style={[f.copy, { color: "#e0e5dc" }]}>
          Different paces. Same direction.
        </Text>
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
          <FocusButton
            label="Invite a friend ＋"
            onPress={() => {
              if (solo) {
                open("invite");
                return;
              }
              void Share.share({
                message: `Join my crew on overtaek: ${inviteLink(crew.invite_code)}`,
              });
              void playCue("success");
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crew settings"
            onPress={() => open("manage")}
            style={[f.chip, { minWidth: 48 }]}
          >
            <Text style={f.h2}>⚙</Text>
          </Pressable>
        </View>
      </View>
      <View style={f.card}>
        <Text style={f.kicker}>Our shared week · {crew.sport}</Text>
        <Text style={f.massive}>
          {crew.format === "personal_target"
            ? entries.length
            : formatDistanceM(totalM, state?.units)}
        </Text>
        <Text style={f.copy}>
          {crew.format === "personal_target"
            ? `sessions · ${crew.target_sessions} per member`
            : crew.format === "cooperative"
              ? `of ${distance(crew.journey_km * 1000)}`
              : `${distanceUnitLabel(state?.units)} together`}
        </Text>
        {crew.format === "cooperative" ? (
          <>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.min(
                  100,
                  (totalM / Math.max(1, crew.journey_km * 1000)) * 100,
                ),
              }}
              style={{
                height: 9,
                backgroundColor: "#eef0e9",
                borderRadius: 5,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 9,
                  width: `${Math.min(100, (totalM / Math.max(1, crew.journey_km * 1000)) * 100)}%`,
                  backgroundColor: "#819486",
                }}
              />
            </View>
          </>
        ) : null}
        <Text style={f.copy}>Every pace belongs here.</Text>
        {!solo && api.data?.seasonWeeks ? (
          <Text style={f.small}>
            {api.data.seasonWeeks[crew.id] ?? 0} weeks together
          </Text>
        ) : null}
        <Text style={f.small}>
          {solo
            ? api.live
              ? "Publishes this week's counted workouts to your crew's shared feed."
              : "Demo circle: counted workouts from this device already show in the feed below."}
            : "Syncs new counted workouts to your crew for this week."}
        </Text>
        <FocusButton
          label="Share my counted sessions"
          disabled={busy}
          onPress={() => {
            if (solo) {
              if (!api.live) {
                const n = entries.length;
                setNote(
                  n > 0
                    ? `Demo preview: your ${n} counted session${n === 1 ? "" : "s"} already appear below. Use a live account to sync with a real crew.`
                    : "No counted sessions yet this week. Log a workout first.",
                );
                return;
              }
              open("add");
              return;
            }
            void write("/entries", { crewId: crew.id });
          }}
        />
      </View>
      <Text style={f.h2}>The latest, together.</Text>
      <View style={f.chipRow}>
        {["Activity", "Leaderboard"].map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: t === tab }}
            style={[f.chip, tab === t && f.chipActive]}
            onPress={() => setTab(t)}
          >
            <Text style={f.rowTitle}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <View style={f.card}>
        {tab === "Activity" ? (
          entries.length ? (
            [...entries]
              .sort((a, b) => b.started_at.localeCompare(a.started_at))
              .map((e) => (
                <View
                  key={`${e.user_id}:${e.activity_id}`}
                  style={{
                    gap: 10,
                    borderBottomWidth: 1,
                    borderColor: "#e0e5dc",
                    paddingBottom: 14,
                  }}
                >
                  <Text style={f.rowTitle}>
                    {members.find((m) => m.user_id === e.user_id)
                      ?.display_name ?? "Athlete"}
                  </Text>
                  <Text style={f.small}>
                    {new Date(e.started_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: APP_TIMEZONE,
                    })}
                  </Text>
                  <Text style={f.copy}>
                    {e.sport} · {distance(Number(e.distance_m))} ·{" "}
                    {Math.round(e.moving_sec / 60)} min
                  </Text>
                  {e.user_id !== selfId ? (
                    <FocusButton
                      label="♡ Cheer this session"
                      secondary
                      disabled={busy}
                      onPress={() =>
                        void write("/cheer", {
                          crewId: crew.id,
                          activityId: e.activity_id,
                          ownerId: e.user_id,
                        })
                      }
                    />
                  ) : null}
                </View>
              ))
          ) : (
            <Text style={f.copy}>
              No shared sessions this week yet. Share yours to start the feed.
            </Text>
          )
        ) : (
          [...members]
            .sort((a, b) => memberTotal(b.user_id) - memberTotal(a.user_id))
            .map((m, i) => (
              <View key={m.user_id} style={f.row}>
                <Text style={f.small}>{i + 1}</Text>
                <Text style={[f.rowTitle, f.grow]}>{m.display_name}</Text>
                <Text style={f.rowTitle}>
                  {distance(memberTotal(m.user_id))}
                </Text>
              </View>
            ))
        )}
      </View>
      <View style={f.card}>
        <Text style={f.kicker}>A little accountability</Text>
        <Text style={f.h2}>We go further together.</Text>
        {members.map((m) => (
          <View key={m.user_id} style={f.row}>
            <Text style={[f.rowTitle, f.grow]}>{m.display_name}</Text>
            <Text style={f.small}>{m.rest_week ? "Rest week" : "Active"}</Text>
          </View>
        ))}
      </View>
      {!panel && (note || api.error) ? (
        <Text style={f.copy} accessibilityLiveRegion="polite">
          {note || api.error}
        </Text>
      ) : null}
      {api.data?.notices?.map((n) => (
        <Text style={f.small} key={n.id}>
          {n.body}
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
          <View style={f.card}>
            <Text style={f.title}>Make room for your people.</Text>
            <Text style={f.copy}>
              Private crews share a week of counted effort.
            </Text>
            <FocusButton
              label="Sign in or create account"
              onPress={() => router.navigate("/you")}
            />
          </View>
        </>
      ) : null}
      <FocusSheet
        open={!!panel}
        title={
          panel === "add"
            ? "Add Crew"
            : panel === "invite"
              ? "Better with your people."
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
        {!user ? (
          <>
            <Text style={f.copy}>
              Sign in to create or join a private crew.
            </Text>
            <FocusButton
              label="Go to Athlete"
              onPress={() => {
                setPanel(null);
                router.navigate("/you");
              }}
            />
          </>
        ) : !api.live ? (
          <>
            <Text style={f.copy}>
              Demo mode is local only. Crew create, join, and sync need a live
              account.
            </Text>
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
        ) : panel === "invite" ? (
          <>
            <Text style={f.copy}>Share this link so friends join your crew.</Text>
            <Text selectable style={f.small}>{inviteLink(crew.invite_code)}</Text>
            <FocusButton
              label="Share invite link"
              onPress={() =>
                void Share.share({
                  message: `Join my crew on overtaek: ${inviteLink(crew.invite_code)}`,
                })
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
              label="Mark my rest week"
              secondary
              disabled={busy}
              onPress={() =>
                void write("/rest", { crewId: crew.id, rest: true })
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

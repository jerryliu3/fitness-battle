import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { APP_TIMEZONE } from "@fitness-battle/shared";
import { mobileEnv } from "../lib/env";
import { FocusButton, FocusSheet, f } from "../ui/focus";
import { useRouter } from "expo-router";
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
      const response = await fetch(`${mobileEnv.apiUrl}/api/crews${path}`, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
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
      if (identity.current === owner) setData(result);
    } catch (e) {
      if (identity.current === owner)
        setError(e instanceof Error ? e.message : "Could not load crews.");
    } finally {
      if (identity.current === owner) setBusy(false);
    }
  }, [user?.id, accessToken, demoMode, request]);
  useEffect(() => {
    setData(null);
    void reload();
  }, [reload]);
  return {
    data,
    error,
    busy,
    reload,
    request,
    live: !!user && !demoMode && !!accessToken,
  };
}
export function CrewHub() {
  const { state } = useCompeteStore();
  const { user } = useAuth();
  const router = useRouter();
  const api = useCrewApi();
  const [selected, setSelected] = useState("");
  const [tab, setTab] = useState("Activity");
  const [panel, setPanel] = useState<"create" | "join" | "invite" | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [format, setFormat] = useState("volume");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const crews = (api.data?.crews ?? []).flatMap((r) =>
    r.crews ? [r.crews] : [],
  );
  const crew = crews.find((c) => c.id === selected) ?? crews[0];
  const members = (api.data?.members ?? []).filter(
    (m) => m.crew_id === crew?.id,
  );
  const entries = (api.data?.entries ?? []).filter(
    (e) => e.crew_id === crew?.id && e.disposition === "counted",
  );
  const km = entries.reduce((n, e) => n + Number(e.distance_m), 0) / 1000;
  async function write(path: string, body: object) {
    setBusy(true);
    setNote("");
    try {
      await api.request(path, body);
      await api.reload();
      setPanel(null);
      setNote("Saved. Your crew is up to date.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not save this change.");
    } finally {
      setBusy(false);
    }
  }
  const memberNames = members.map((m) => m.display_name);
  const memberCaption =
    memberNames.length <= 3
      ? memberNames.join(", ") || "No members yet"
      : `${memberNames.slice(0, 3).join(", ")} + ${memberNames.length - 3} more`;
  return (
    <>
      {!api.live ? (
        <View style={{ gap: 14 }}>
          <View style={f.card}>
            <Text style={f.title}>Make room for your people.</Text>
            <Text style={[f.copy, { marginBottom: 20 }]}>
              Private crews share a week of counted effort — invite codes,
              member standings, and a shared field when you register together.
            </Text>
            {!user && (
              <FocusButton
                label="Sign in to join a crew"
                onPress={() => router.navigate("/you")}
              />
            )}
          </View>
          <View style={f.card}>
            <Text style={f.kicker}>What crews unlock</Text>
            <Text style={f.rowTitle}>Shared week</Text>
            <Text style={f.small}>
              See who showed up and how the circle is pacing.
            </Text>
            <Text style={[f.rowTitle, { marginTop: 12 }]}>Invite codes</Text>
            <Text style={f.small}>Bring friends in without a public board.</Text>
            <Text style={[f.rowTitle, { marginTop: 12 }]}>Crew field</Text>
            <Text style={f.small}>
              Optional: register together on one individual leaderboard.
            </Text>
          </View>
        </View>
      ) : !api.data ? (
        <View style={f.card}>
          <Text style={f.copy}>{api.error || "Loading your circle…"}</Text>
          <FocusButton
            label="Refresh crews"
            disabled={api.busy}
            secondary
            onPress={() => void api.reload()}
          />
        </View>
      ) : !crew ? (
        <View style={f.card}>
          <Text style={f.title}>Your circle starts here.</Text>
          <Text style={f.copy}>
            Create a crew or use an invite code to start sharing your week.
          </Text>
          <FocusButton
            label="Join with code"
            secondary
            onPress={() => setPanel("join")}
          />
          <FocusButton
            label="Create a private crew"
            onPress={() => setPanel("create")}
          />
        </View>
      ) : (
        <>
          {crews.length > 1 ? (
            <View style={f.chipRow}>
              {crews.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: c.id === crew.id }}
                  style={[f.chip, c.id === crew.id && f.chipActive]}
                  onPress={() => setSelected(c.id)}
                >
                  <Text style={f.rowTitle}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View
            style={{
              padding: 28,
              borderRadius: 24,
              backgroundColor: "#282f2c",
              gap: 17,
            }}
          >
            <Text style={[f.kicker, { color: "#f1c75bcc" }]}>
              Your people · {members.length} members
            </Text>
            <Text
              style={[
                f.title,
                { fontSize: 39, lineHeight: 43, color: "#fafaf7" },
              ]}
            >
              {crew.name}
            </Text>
            <Text style={[f.copy, { color: "#d1dbca" }]}>
              Different paces. Same direction.
            </Text>
            <View style={f.row}>
              <View style={{ flexDirection: "row" }}>
                {members.slice(0, 5).map((m, i) => (
                  <View
                    key={m.user_id}
                    style={[
                      f.avatar,
                      {
                        borderWidth: 2,
                        borderColor: "#282f2c",
                        marginLeft: i ? -8 : 0,
                      },
                    ]}
                  >
                    <Text style={f.rowTitle}>
                      {m.display_name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPanel("invite")}
                style={{
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#ffffff70",
                  borderRadius: 30,
                }}
              >
                <Text style={[f.small, { color: "#fafaf7" }]}>
                  Invite a friend ＋
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={f.card}>
            <Text style={f.kicker}>Our shared week · {crew.sport}</Text>
            <Text style={f.massive}>
              {crew.format === "personal_target"
                ? entries.length
                : km.toFixed(1)}{" "}
              <Text style={f.copy}>
                {crew.format === "personal_target"
                  ? "sessions"
                  : crew.format === "cooperative"
                    ? `/ ${crew.journey_km} km`
                    : "km together"}
              </Text>
            </Text>
            {crew.format === "cooperative" && (
              <View
                style={{
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: "#eef0e9",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 9,
                    width: `${Math.min(100, (km / Math.max(1, crew.journey_km)) * 100)}%`,
                    backgroundColor: "#282f2c",
                  }}
                />
              </View>
            )}
            <Text style={f.copy}>
              {crew.format === "personal_target"
                ? `Each member aims for ${crew.target_sessions} counted sessions.`
                : "Every pace belongs here."}
            </Text>
            <FocusButton
              label="Share my counted sessions"
              disabled={busy}
              onPress={() => void write("/entries", { crewId: crew.id })}
            />
          </View>
          <Text style={f.h2}>The latest, together.</Text>
          <View style={f.chipRow}>
            {["Activity", "Leaderboard"].map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: t === tab }}
                style={[f.chip, { flex: 1 }, t === tab && f.chipActive]}
                onPress={() => setTab(t)}
              >
                <Text style={f.rowTitle}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <View style={f.card}>
            {tab === "Activity" ? (
              entries.length ? (
                entries
                  .slice()
                  .sort((a, b) => b.started_at.localeCompare(a.started_at))
                  .map((e) => (
                    <View
                      key={`${e.user_id}:${e.activity_id}`}
                      style={{
                        gap: 10,
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderColor: "#e0e5dc",
                      }}
                    >
                      <View style={f.row}>
                        <View style={f.avatar}>
                          <Text style={f.rowTitle}>
                            {members
                              .find((m) => m.user_id === e.user_id)
                              ?.display_name.slice(0, 2)
                              .toUpperCase() ?? "AT"}
                          </Text>
                        </View>
                        <View style={f.grow}>
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
                        </View>
                      </View>
                      <Text style={f.copy}>
                        {e.sport} · {(Number(e.distance_m) / 1000).toFixed(1)}{" "}
                        km · {Math.round(e.moving_sec / 60)} min
                      </Text>
                      {e.user_id !== user?.id && (
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
                      )}
                    </View>
                  ))
              ) : (
                <Text style={f.copy}>
                  No shared sessions yet. Share yours to start the feed.
                </Text>
              )
            ) : (
              members
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
                  <View key={m.user_id} style={f.row}>
                    <Text style={f.small}>{i + 1}</Text>
                    <Text style={[f.rowTitle, f.grow]}>{m.display_name}</Text>
                    <Text style={f.rowTitle}>
                      {(
                        entries
                          .filter((e) => e.user_id === m.user_id)
                          .reduce((t, e) => t + Number(e.distance_m), 0) / 1000
                      ).toFixed(1)}{" "}
                      km
                    </Text>
                  </View>
                ))
            )}
          </View>
          <View style={f.card} accessibilityLabel="Crew members">
            <Text style={f.kicker}>A little accountability</Text>
            <Text style={f.h2}>We go further together.</Text>
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              {members.slice(0, 8).map((m, i) => (
                <View
                  key={m.user_id}
                  style={[
                    f.avatar,
                    {
                      borderWidth: 2,
                      borderColor: "#fff",
                      marginLeft: i ? -8 : 0,
                    },
                  ]}
                >
                  <Text style={f.rowTitle}>
                    {m.display_name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={f.copy}>{memberCaption}</Text>
            {members.map((m) => (
              <View key={m.user_id} style={f.row}>
                <Text style={[f.rowTitle, f.grow]}>{m.display_name}</Text>
                <Text style={f.small}>
                  {m.rest_week ? "Rest week" : "Active"}
                </Text>
              </View>
            ))}
            <FocusButton
              label="Invite someone ＋"
              secondary
              onPress={() => setPanel("invite")}
            />
            <FocusButton
              label="Mark my rest week"
              secondary
              disabled={busy}
              onPress={() =>
                void write("/rest", { crewId: crew.id, rest: true })
              }
            />
            <FocusButton
              label="Join another crew"
              secondary
              onPress={() => setPanel("join")}
            />
            <FocusButton
              label="Create another crew"
              secondary
              onPress={() => setPanel("create")}
            />
            <Text style={f.small}>
              {crew.sport} · {crew.format.replaceAll("_", " ")}. A crew rest
              marker does not freeze effort score.
            </Text>
          </View>
        </>
      )}
      {(note || api.error) && (
        <Text style={[f.copy, f.feedback]} accessibilityLiveRegion="polite">
          {note || api.error}
        </Text>
      )}
      {api.data?.notices?.map((n) => (
        <Text style={f.small} key={n.id}>
          {n.body}
        </Text>
      ))}
      <FocusSheet
        open={!!panel}
        title={
          panel === "create"
            ? "Start your circle."
            : panel === "join"
              ? "Find your people."
              : "Better with your people."
        }
        body={
          api.live
            ? "Private crew activity stays with your members."
            : "A live account is needed to create or join a crew."
        }
        onClose={() => setPanel(null)}
      >
        {api.live ? (
          panel === "create" ? (
            <>
              <Text style={f.small}>Crew name</Text>
              <TextInput
                accessibilityLabel="Crew name"
                style={f.input}
                value={name}
                onChangeText={setName}
                maxLength={60}
              />
              <Text style={f.small}>Format</Text>
              {[
                { id: "volume", name: "Same-sport volume" },
                { id: "personal_target", name: "Personal session targets" },
                { id: "cooperative", name: "Shared distance" },
              ].map((o) => (
                <Pressable
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: format === o.id }}
                  style={[f.chip, format === o.id && f.chipActive]}
                  onPress={() => setFormat(o.id)}
                >
                  <Text style={f.rowTitle}>{o.name}</Text>
                </Pressable>
              ))}
              <FocusButton
                label="Create crew"
                disabled={busy || !name.trim()}
                onPress={() =>
                  void write("", {
                    name,
                    sport: state?.primary ?? "running",
                    format,
                  })
                }
              />
            </>
          ) : panel === "join" ? (
            <>
              <Text style={f.small}>Invite code</Text>
              <TextInput
                accessibilityLabel="Invite code"
                style={f.input}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
              <FocusButton
                label="Join crew"
                disabled={busy || !code.trim()}
                onPress={() => void write("/join", { code })}
              />
            </>
          ) : (
            <>
              <Text style={f.copy}>Select and copy your crew’s code.</Text>
              <Text selectable style={f.massive}>
                {crew?.invite_code}
              </Text>
            </>
          )
        ) : null}
        {note && (
          <Text style={f.copy} accessibilityLiveRegion="polite">
            {note}
          </Text>
        )}
      </FocusSheet>
    </>
  );
}

import { UserAvatar } from "../ui/user-avatar";
import { textStyle, Section, AppText  } from "../ui/section";
import { DateTimeField } from "../ui/form-picker";
import { SHELL_COLORS as clubColors } from "@fitness-battle/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  APP_TIMEZONE,
  crewSessionDraftId,
  crewSessionError,
  validateCrewSessionDraft,
  demoCrewSessionMutation,
  type CrewSessionMutation,
  type CrewSession,
} from "@fitness-battle/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../lib/auth";
import { mobileEnv } from "../lib/env";
import { requestApi } from "../lib/api";
import { FocusButton, FocusSheet, f } from "../ui/focus";
export function CrewSessions({
  crewId,
  portraits = {},
  sport = "running",
}: {
  crewId: string;
  portraits?: Record<string, string | null | undefined>;
  sport?: string;
}) {
  const { user, accessToken, offlineMode } = useAuth();
  const [sessions, setSessions] = useState<CrewSession[]>([]),
    [open, setOpen] = useState(false),
    [cancelTarget, setCancelTarget] = useState<CrewSession | null>(null),
    [title, setTitle] = useState(""),
    [day, setDay] = useState(""),
    [time, setTime] = useState("08:00"),
    [duration, setDuration] = useState("30"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const flight = useRef(false),
    id = useRef(crewSessionDraftId()),
    mounted = useRef(true);
  const reload = useCallback(async () => {
    if (offlineMode) {
      const stored = await AsyncStorage.getItem(
        `fb-demo-start-line:${user?.id}:${crewId}`,
      );
      if (mounted.current) setSessions(stored ? JSON.parse(stored) : []);
      return;
    }
    const body = await requestApi<{ sessions: CrewSession[] }>(
      mobileEnv.apiUrl,
      accessToken,
      `/api/crews/sessions?crewId=${encodeURIComponent(crewId)}`,
    );
    if (mounted.current) setSessions(body.sessions);
  }, [crewId, accessToken, offlineMode, user?.id]);
  useEffect(() => {
    mounted.current = true;
    void reload().catch(() => {
      if (mounted.current) setError("Could not load sessions.");
    });
    return () => {
      mounted.current = false;
    };
  }, [reload]);
  async function write(body: CrewSessionMutation) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    try {
      if (offlineMode && user) {
        const next = demoCrewSessionMutation(sessions, body, user.id, sport);
        await AsyncStorage.setItem(
          `fb-demo-start-line:${user.id}:${crewId}`,
          JSON.stringify(next),
        );
        if (mounted.current) {
          setSessions(next);
          setOpen(false);
          if (body.action === "cancel") setCancelTarget(null);
          setTitle("");
          id.current = crewSessionDraftId();
        }
        return;
      }
      await requestApi(mobileEnv.apiUrl, accessToken, "/api/crews/sessions", {
        body,
      });
      if (!mounted.current) return;
      setOpen(false);
      if (body.action === "cancel") setCancelTarget(null);
      setTitle("");
      id.current = crewSessionDraftId();
      await reload().catch(() =>
        setError("Saved. Refresh to load the updated start list."),
      );
    } catch (e) {
      if (mounted.current)
        setError(crewSessionError(e instanceof Error ? e.message : ""));
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Section  title="Start Line" action={<FocusButton
          label="Schedule +"
          secondary
          disabled={busy}
          onPress={() => {
            setError("");
            setOpen(true);
          }}
        />}>

      {sessions.map((s) => {
        const joined = s.participants.some((p) => p.user_id === user?.id),
          closed = !!s.cancelled_at || Date.parse(s.starts_at) <= Date.now();
        return (
          <View
            key={s.id}
            style={{
              backgroundColor: "#f7f4e9",
              borderRadius: 18,
              borderBottomWidth: 3,
              borderColor: "#e0d5b2",
              padding: 20,
              gap: 10,
              marginVertical: 8,
            }}
          >
            <Text style={f.kicker}>
              {new Date(s.starts_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                timeZone: s.time_zone,
              })}
            </Text>
            <Text style={f.massive}>
              {new Date(s.starts_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: s.time_zone,
              })}
            </Text>
            <AppText role="caption" secondary >
              {s.time_zone} · {s.duration_min} min
            </AppText>
            <AppText role="heading" >{s.title}</AppText>
            <View
              style={[
                f.chipRow,
                {
                  borderTopWidth: 1,
                  borderStyle: "dashed",
                  borderColor: "#c8cdbf",
                  paddingTop: 14,
                },
              ]}
            >
              {s.participants.slice(0, 6).map((p) => (
                <UserAvatar key={p.user_id} src={portraits[p.user_id]} name={p.display_name} size={38} decorative={false} highlight={p.user_id === user?.id} />
              ))}
              {s.participants.length > 6 ? (
                <AppText role="label">+{s.participants.length - 6}</AppText>
              ) : null}
            </View>
            <AppText role="caption" secondary >
              {s.cancelled_at
                ? "Cancelled"
                : closed
                  ? "Session started"
                  : `${s.participants.length} on the start list`}
            </AppText>
            {!closed ? (
              <>
                <FocusButton
                  label={joined ? "Leave session" : "Count me in ↗"}
                  secondary={joined}
                  disabled={busy}
                  onPress={() =>
                    void write({ action: "rsvp", id: s.id, join: !joined })
                  }
                />
                {s.created_by === user?.id ? (
                  <FocusButton
                    label="Cancel session"
                    secondary
                    disabled={busy}
                    onPress={() => { setError(""); setCancelTarget(s); }}
                  />
                ) : null}
              </>
            ) : null}
          </View>
        );
      })}
      {!sessions.length && !error ? (
        <AppText role="caption" secondary >Same time. Your own place.</AppText>
      ) : null}
      {!open && error ? (
        <>
          <AppText role="body" secondary accessibilityRole="alert" >
            {error}
          </AppText>
          <FocusButton
            secondary
            label="Refresh sessions"
            onPress={() =>
              void reload()
                .then(() => setError(""))
                .catch(() => setError("Could not load sessions."))
            }
          />
        </>
      ) : null}
      <FocusSheet open={Boolean(cancelTarget)} title="Cancel this session?"
        body={cancelTarget ? `${cancelTarget.title} will be marked cancelled for your crew.` : ""}
        onClose={() => { if (!busy) setCancelTarget(null); }}>
        {error ? <AppText role="body" secondary accessibilityRole="alert">{error}</AppText> : null}
        <FocusButton label={busy ? "Cancelling…" : "Cancel session"} disabled={busy || !cancelTarget} onPress={() => { if (cancelTarget) void write({ action: "cancel", id: cancelTarget.id }); }} />
        <FocusButton label="Keep session" secondary disabled={busy} onPress={() => setCancelTarget(null)} />
      </FocusSheet>
      <FocusSheet
        open={open}
        title="A shared start"
        body="Same time. Your own place. RSVP does not log a workout."
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <AppText role="caption" secondary >Session name</AppText>
        <TextInput
          accessibilityLabel="Session title"
          style={f.input}
          maxLength={80}
          placeholder="Name this session"
          value={title}
          onChangeText={setTitle}
        />
        <AppText role="caption" secondary >Date · {APP_TIMEZONE}</AppText>
        <DateTimeField label="Session date · Eastern" mode="date" value={day} onChange={setDay} />
        <AppText role="caption" secondary >Time · {APP_TIMEZONE}</AppText>
        <DateTimeField label="Session time · Eastern" mode="time" value={time} onChange={setTime} />
        <AppText role="caption" secondary >Duration</AppText>
        <View style={f.chipRow}>
          {[15, 30, 45, 60, 90, 120, 180, 240].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: duration === String(n) }}
              style={[f.chip, duration === String(n) && f.chipActive]}
              onPress={() => setDuration(String(n))}
            >
              <AppText role="label">{n} min</AppText>
            </Pressable>
          ))}
        </View>
        {error ? (
          <AppText role="body" secondary accessibilityRole="alert" >
            {error}
          </AppText>
        ) : null}
        <FocusButton
          label={busy ? "Saving…" : "Set the start line"}
          disabled={busy}
          onPress={() => {
            try {
              const startsAt = validateCrewSessionDraft(
                title,
                day,
                time,
                Number(duration),
              );
              void write({
                action: "create",
                id: id.current,
                crewId,
                title,
                startsAt,
                durationMin: Number(duration),
                timeZone: APP_TIMEZONE,
              });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </FocusSheet>
    </Section>
  );
}

import { SHELL_COLORS as clubColors } from "@fitness-battle/shared";
import {
  activityFromSample,
  parseManualActivity,
  SPORTS,
  sportById,
  type ActivitySample,
  type ReadinessSample,
  type SportId,
} from "@fitness-battle/shared";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { requestApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { providersForDevice } from "../lib/platform-providers";
import { mobileEnv } from "../lib/env";
import {
  createAppleHealthDeps,
  createHealthConnectDeps,
  syncAppleHealth,
  syncHealthConnect,
} from "../lib/device-health";
import { FocusButton, FocusSheet, f } from "../ui/focus";

export function HomeActivityActions({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { state, canWrite, dispatch, refresh, saveError,
    beginSyncReviewBatch,
    endSyncReviewBatch,
  } = useCompeteStore();
  const { user, accessToken, offlineMode } = useAuth();
  const owner = useRef(user?.id);
  owner.current = user?.id;
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [sport, setSport] = useState<SportId>("running");
  const [miles, setMiles] = useState(""),
    [minutes, setMinutes] = useState("");
  const flight = useRef(false);
  if (!state) return null;
  async function sync() {
    if (!user || !canWrite || flight.current) return;
    const id = user.id;
    const supported = new Set(
      providersForDevice().map((provider) => provider.id),
    );
    const links = state!.links.filter(
      (link) => link.linked && supported.has(link.provider),
    );
    if (!links.length) {
      setNote("Connect a tracker in Athlete to sync activities.");
      return;
    }
    flight.current = true;
    setBusy(true);
    beginSyncReviewBatch?.(id);
    setNote("");
    const messages: string[] = [];
    try {
      for (const link of links) {
        if (owner.current !== id) return;
        if (
          link.provider === "apple_health" ||
          link.provider === "google_health"
        ) {
          const auth = {
            localOnly: offlineMode || user.mode === "demo",
            getAccessToken: async () => ({
              token: accessToken ?? undefined,
              userId: id,
            }),
          };
          const result =
            link.provider === "apple_health"
              ? await syncAppleHealth(createAppleHealthDeps(auth))
              : await syncHealthConnect(createHealthConnectDeps(auth));
          if (owner.current !== id) return;
          if (result.ok && result.activities?.length) {
            dispatch({
              type: "apply-sync",
              accountId: id,
              provider: link.provider,
              activities: result.activities.flatMap((sample) => {
                const a = activityFromSample(sample, "recorded");
                return a ? [a] : [];
              }),
              linkStatus: "connected",
            });
          } else if (result.ok) await refresh();
          if (owner.current !== id) return;
          messages.push(result.message);
        } else if (offlineMode || user.mode === "demo") {
          if (owner.current !== id) return;
          dispatch({
            type: "sync",
            provider: link.provider,
            allowSample: true,
          });
          messages.push("Demo sample sync only. Samples do not count.");
        } else {
          const body = await requestApi<{
            activities?: ActivitySample[];
            readiness?: ReadinessSample[];
            usedMock?: boolean;
          }>(mobileEnv.apiUrl, accessToken, "/api/fitness/sync", {
            allowUnpersisted: true,
            body: { provider: link.provider },
          });
          if (owner.current !== id) return;
          dispatch({
            type: "apply-sync",
            provider: link.provider,
            readiness: (body.readiness ?? []).flatMap((sample) =>
              sample.provider === link.provider
                ? [
                    {
                      id: sample.id,
                      provider: link.provider,
                      day: sample.day,
                      score: sample.score,
                    },
                  ]
                : [],
            ),
            activities: (body.activities ?? []).flatMap((sample) => {
              const activity = activityFromSample(
                sample,
                body.usedMock ? "demo" : "recorded",
              );
              return activity ? [activity] : [];
            }),
            linkStatus: body.usedMock ? "stub" : "connected",
          });
          messages.push(
            body.usedMock
              ? "Sample data only; not a live connection."
              : `${link.provider}: sync complete.`,
          );
        }
      }
      if (owner.current === id) setNote(messages.join(" "));
    } catch {
      if (owner.current === id)
        setNote("Sync could not finish. Retry from Athlete.");
    } finally {
      endSyncReviewBatch?.(id);
      flight.current = false;
      setBusy(false);
    }
  }
  const actionRow = compact ? (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sync activities"
        disabled={!user || !canWrite || busy}
        onPress={() => void sync()}
        style={{
          flex: 1,
          minHeight: 44,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: clubColors.line,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 8,
        }}
      >
        <Text style={[f.small, { fontFamily: "DMSans_700Bold" }]}>
          {busy ? "Syncing…" : "↻ Sync"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add manual activity"
        disabled={!user || !canWrite || busy}
        onPress={() => {
          setFormError("");
          setOpen(true);
        }}
        style={{
          flex: 1,
          minHeight: 44,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: clubColors.line,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 8,
        }}
      >
        <Text style={[f.small, { fontFamily: "DMSans_700Bold" }]}>
          ＋ Manual
        </Text>
      </Pressable>
    </View>
  ) : (
    <>
      <FocusButton
        label={busy ? "Syncing…" : "Sync activities"}
        secondary
        disabled={!user || !canWrite || busy}
        onPress={() => void sync()}
      />
      <FocusButton
        label="Add activity"
        disabled={!user || !canWrite || busy}
        onPress={() => {
          setFormError("");
          setOpen(true);
        }}
      />
    </>
  );

  return (
    <View style={{ gap: 10 }}>
      {actionRow}
      {!user && !compact && (
        <Link href="/athlete">Sign in to add or sync activities</Link>
      )}
      {note ? (
        <Text style={f.small} accessibilityLiveRegion="polite">
          {note}
        </Text>
      ) : null}
      <FocusSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add today’s activity"
        body="Manual activities count in Open standings only."
      >
        {SPORTS.map((item) => (
          <FocusButton
            key={item.id}
            secondary
            label={`${sport === item.id ? "✓ " : ""}${item.name}`}
            onPress={() => setSport(item.id)}
          />
        ))}
        {sportById(sport).gps && (
          <TextInput
            accessibilityLabel="Mileage"
            placeholder="Mileage"
            keyboardType="decimal-pad"
            style={f.input}
            value={miles}
            onChangeText={setMiles}
          />
        )}
        <TextInput
          accessibilityLabel="Duration in minutes"
          placeholder="Duration (minutes)"
          keyboardType="decimal-pad"
          style={f.input}
          value={minutes}
          onChangeText={setMinutes}
        />
        {formError ? (
          <Text style={f.copy} accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}
        <FocusButton
          disabled={!user || !canWrite}
          label="Save activity"
          onPress={() => {
            if (!user || !canWrite) return;
            const parsed = parseManualActivity(sport, miles, minutes);
            if (parsed.error !== null) {
              setFormError(parsed.error);
              return;
            }
            const { movingSec, distanceM } = parsed;
            dispatch({
              type: "log-manual",
              sport,
              movingSec,
              distanceM,
              activityId: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            });
            setOpen(false);
            setMiles("");
            setMinutes("");
            setNote("Activity added for today · Open standings only.");
          }}
        />
      </FocusSheet>
    </View>
  );
}

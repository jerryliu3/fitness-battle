import { Toast } from "../ui/toast";
import { playCue } from "../lib/haptics";
import { AppText } from "../ui/section";
import { IconButton } from "../ui/icon-button";
import { NumberPicker, DateTimeField } from "../ui/form-picker";
import { ChoicePicker } from "../ui/choice-picker";

import {
  activityFromSample,
  parseManualActivity,
  manualActivityInstant,
  competeNow,
  SPORTS,
  sportById,
  type ActivitySample,
  type ReadinessSample,
  type SportId,
} from "@fitness-battle/shared";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
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
  const [sport, setSport] = useState<SportId | "">("");
  const [time, setTime] = useState("");
  const [miles, setMiles] = useState(""),
    [minutes, setMinutes] = useState("");
  useEffect(() => setNote(""), [user?.id]);
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
            localOnly: offlineMode,
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
        } else if (!offlineMode) {
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
                "recorded",
              );
              return activity ? [activity] : [];
            }),
            linkStatus: "connected",
          });
          messages.push(`${link.provider}: sync complete.`);
        }
      }
      if (owner.current === id) setNote(messages.join(" "));
    } catch {
      if (owner.current === id) { void playCue("error"); setNote("Sync could not finish. Retry from Athlete."); }
    } finally {
      endSyncReviewBatch?.(id);
      flight.current = false;
      setBusy(false);
    }
  }
  const actionRow = compact ? (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <IconButton primary icon="sync" label={busy ? "Syncing activities" : "Sync activities"} disabled={!user || !canWrite || busy} onPress={() => void sync()} />
      <IconButton icon="plus" label="Add activity" disabled={!user || !canWrite || busy} onPress={() => { setSport(""); setFormError(""); setOpen(true); }} />
    </View>
  ) : (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ flex: 1 }}><FocusButton
        label={busy ? "Syncing…" : "Sync activities"}
        disabled={!user || !canWrite || busy}
        onPress={() => void sync()}
      /></View>
      <View style={{ flex: 1 }}><FocusButton
        secondary
        label="Add activity"
        disabled={!user || !canWrite || busy}
        onPress={() => {
          setFormError("");
          setOpen(true);
        }}
      /></View>
    </View>
  );

  return (
    <View style={{ gap: 10 }}>
      {actionRow}
      {!user && !compact && (
        <Link href="/athlete">Sign in to add or sync activities</Link>
      )}
      <Toast message={note} onDismiss={() => setNote("")} />
      <FocusSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add manual activity"
        minimal
      >
        <ChoicePicker systemMenu label="Sport" placeholder="Choose a sport" value={sport} options={SPORTS.map(item => ({ value: item.id, label: item.name }))} onChange={value => { setSport(value); setMiles(""); }} />
        {sport && <>
          <AppText role="label" >Duration</AppText>
          <NumberPicker label="Duration" unit="min" value={minutes} onChange={setMinutes} />
          {sportById(sport).gps && <><AppText role="label" >Distance ({state.units === "metric" ? "km" : "mi"})</AppText>
            <NumberPicker label="Distance" unit={state.units === "metric" ? "km" : "mi"} max={1000} step={0.1} value={miles} onChange={setMiles} /></>}
          <AppText role="label" >Time of day (optional · Eastern)</AppText>
          <DateTimeField label="Time of day · Eastern" mode="time" value={time} onChange={setTime} clearLabel="Use current time" />
        </>}
        {formError ? (
          <AppText role="body" secondary  accessibilityRole="alert">
            {formError}
          </AppText>
        ) : null}
        <FocusButton
          disabled={!user || !canWrite || !sport}
          label="Save activity"
          onPress={() => {
            if (!user || !canWrite || !sport) return;
            const parsed = parseManualActivity(sport, miles, minutes, state.units);
            if (parsed.error !== null) {
              void playCue("error");
              setFormError(parsed.error);
              return;
            }
            const when = manualActivityInstant(time, competeNow(state));
            if (when.error !== null) { setFormError(when.error); return; }
            const { movingSec, distanceM } = parsed;
            dispatch({
              type: "log-manual",
              sport,
              movingSec,
              distanceM,
              startedAt: when.startedAt,
              activityId: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            });
            setOpen(false);
            setMiles("");
            setMinutes("");
            setTime("");
            setSport("");
            setNote("Activity added for today.");
          }}
        />
      </FocusSheet>
    </View>
  );
}

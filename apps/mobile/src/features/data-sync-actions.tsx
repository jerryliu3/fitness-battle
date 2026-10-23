import {
  activityFromSample,
  type ActivitySample,
  type ProviderId,
  type ReadinessMark,
  type ReadinessSample,
} from "@fitness-battle/shared";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { requestApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { FocusButton, f } from "../ui/focus";
export function DataSyncActions({ provider }: { provider?: ProviderId }) {
  const { user, accessToken, offlineMode } = useAuth();
  const { state, dispatch, previewSyncReview } = useCompeteStore();
  const [busy, setBusy] = useState(false),
    [note, setNote] = useState("");
  const flight = useRef(false);
  const owner = useRef({ id: user?.id });
  if (owner.current.id !== user?.id) owner.current = { id: user?.id };
  const live = !!user && !offlineMode && user.mode !== "demo";
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => setNote(""), [user?.id]);
  async function run(work: (isCurrent: () => boolean) => Promise<void>) {
    if (flight.current) return;
    const account = owner.current;
    const isCurrent = () => mounted.current && owner.current === account;
    flight.current = true;
    setBusy(true);
    setNote("");
    try {
      await work(isCurrent);
    } catch (e) {
      if (isCurrent()) setNote(e instanceof Error ? e.message : "Sync failed");
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function apply(
    provider: ProviderId,
    body: {
      activities?: ActivitySample[];
      readiness?: ReadinessSample[];
      usedMock?: boolean;
      persisted?: boolean;
    },
    id?: string,
    imported = false,
  ) {
    if (!mounted.current || id !== owner.current.id) return;
    const activities = (body.activities ?? [])
      .map((sample) =>
        activityFromSample(
          sample,
          body.usedMock ? "demo" : imported ? "imported" : "recorded",
        ),
      )
      .filter((a) => a != null);
    const readiness: ReadinessMark[] = (body.readiness ?? []).flatMap(
      (sample) =>
        sample.provider === "mock"
          ? []
          : [
              {
                id: sample.id,
                provider: sample.provider as ProviderId,
                day: sample.day,
                score: sample.score,
              },
            ],
    );
    dispatch({
      type: "apply-sync",
      accountId: id,
      provider,
      activities,
      readiness,
      linkStatus: body.usedMock ? "stub" : "connected",
    });
    setNote("");
  }
  if (!state) return null;
  return (
    <View style={{ gap: 12 }}>
      {(provider ? state.links : [])
        .filter((l) => l.linked && l.provider === provider)
        .map((l) => (
          <View
            key={l.provider}
            style={[f.row, { flexWrap: "wrap", justifyContent: "flex-start" }]}
          >
            <Pressable
              accessibilityRole="button"
              style={{ minHeight: 44, justifyContent: "center" }}
              accessibilityLabel={`Disconnect ${l.provider}`}
              disabled={busy}
              onPress={() =>
                void run(async (isCurrent) => {
                  const id = user?.id;
                  if (live)
                    await requestApi(
                      mobileEnv.apiUrl,
                      accessToken,
                      "/api/fitness/disconnect",
                      { body: { provider: l.provider } },
                    );
                  if (isCurrent()) {
                    dispatch({
                      type: "unlink",
                      provider: l.provider,
                      accountId: id,
                    });
                    setNote("Tracker disconnected.");
                  }
                })
              }
            ><Text style={[f.rowTitle, { color: "#b83a38" }]}>{busy ? "Disconnecting…" : "Disconnect"}</Text></Pressable>
          </View>
        ))}
      {!live && !provider && previewSyncReview ? (
        <FocusButton
          secondary
          label="Preview today’s sync recap"
          onPress={previewSyncReview}
        />
      ) : null}
      {!provider ? (
        <>
          <FocusButton
            label="Import Garmin file (.fit, .gpx, .tcx, .zip)"
            disabled={busy}
            secondary
            onPress={() =>
              void run(async (isCurrent) => {
                if (!live || !accessToken)
                  throw new Error(
                    "A live account is required to import an activity file.",
                  );
                const id = user?.id;
                const picked = await DocumentPicker.getDocumentAsync({
                  type: "*/*",
                  copyToCacheDirectory: true,
                });
                if (!isCurrent() || picked.canceled) return;
                const file = picked.assets[0];
                if (!/\.(fit|gpx|tcx|zip)$/i.test(file.name))
                  throw new Error("Choose a .fit, .gpx, .tcx, or .zip file.");
                if ((file.size ?? 0) > 8 * 1024 * 1024)
                  throw new Error("That file exceeds the maximum 8 MB limit.");
                const form = new FormData();
                if (Platform.OS === "web")
                  form.append(
                    "file",
                    await (await fetch(file.uri)).blob(),
                    file.name,
                  );
                else
                  form.append("file", {
                    uri: file.uri,
                    name: file.name,
                    type: file.mimeType ?? "application/octet-stream",
                  } as unknown as Blob);
                // The picker and reading a web file can outlive this account
                // or screen. Check again before sending a persisted upload.
                if (!isCurrent()) return;
                const response = await fetch(
                  `${mobileEnv.apiUrl}/api/fitness/import`,
                  {
                    method: "POST",
                    headers: { Authorization: `Bearer ${accessToken}` },
                    body: form,
                  },
                );
                const body = await response.json();
                if (!response.ok)
                  throw new Error(
                    body.error === "no_activities"
                      ? "No valid activities found in that file."
                      : "Could not import that file. Please check the file and try again.",
                  );
                if (isCurrent()) apply("garmin", body, id, true);
              })
            }
          />
          {state.activities
            .filter((a) => a.disposition === "pending")
            .map((a) => (
              <View key={a.id} style={f.card}>
                <Text style={f.rowTitle}>
                  {a.sport} · {new Date(a.startedAt).toLocaleDateString()}
                </Text>
                <Text style={f.copy}>Imported activity · pending review</Text>
                <FocusButton
                  label="Count this activity"
                  secondary
                  onPress={() =>
                    dispatch({
                      type: "set-disposition",
                      activityId: a.id,
                      disposition: "counted",
                    })
                  }
                />
                <FocusButton
                  label="Exclude this activity"
                  secondary
                  onPress={() =>
                    dispatch({
                      type: "set-disposition",
                      activityId: a.id,
                      disposition: "excluded",
                    })
                  }
                />
              </View>
            ))}
          <Text style={f.h2}>Sleep & recovery</Text>
          <Text style={f.copy}>Sleep data appears when supplied by a connected tracker.</Text>
          <Text style={f.h2}>Import fitness history</Text>
          <Text style={f.copy}>
            {state.calibrated
              ? "History is locked in. This one-time calibration cannot run again."
              : "Calibrate your starting effort score from the shared sample history. Imported sample sessions remain excluded from competition."}
          </Text>
          <FocusButton
            label={
              state.calibrated
                ? "History calibrated"
                : "Import fitness history (sample calibration)"
            }
            disabled={busy || state.calibrated}
            onPress={() => dispatch({ type: "import-history" })}
          />
        </>
      ) : null}
      {note ? (
        <Text style={f.copy} accessibilityLiveRegion="polite">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

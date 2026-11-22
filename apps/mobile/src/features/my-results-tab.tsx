import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import {
  RACE_DISTANCES,
  RACE_METERS,
  formatEditionDisplay,
  raceClock,
  type SavedRaceResult,
} from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { useRaceFavorites } from "../lib/race-favorites";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { FocusButton } from "../ui/focus";
import { AppText } from "../ui/section";

export function MyResultsTab({
  onExploreDistance,
  onCreateAccount,
}: {
  onExploreDistance: (distanceSlug: string) => void;
  onCreateAccount: () => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const router = useRouter();
  const { user } = useAuth();
  const { state: competeState } = useCompeteStore();
  const saved = useRaceFavorites();

  const [rows, setRows] = useState<SavedRaceResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<number[]>([]);

  const isSignedIn = user?.mode === "supabase";
  const idsKey = saved.ids.join(",");

  useEffect(() => {
    if (!saved.ready) return;
    if (!idsKey) {
      setRows([]);
      setBusy(false);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    fetch(`${mobileEnv.apiUrl}/api/rankings/saved?ids=${idsKey}`, { signal: controller.signal })
      .then(r => (r.ok ? (r.json() as Promise<SavedRaceResult[]>) : []))
      .then(data => {
        if (!controller.signal.aborted && Array.isArray(data)) setRows(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [saved.ready, idsKey]);

  const selected = useMemo(
    () => selection.filter(id => saved.ids.includes(id) && rows.some(r => r.id === id)),
    [selection, saved.ids, rows],
  );

  // Personalized best running efforts across benchmark distances for signed-in users
  const personalBests = useMemo(() => {
    if (!competeState?.activities?.length) return [];
    const out: Array<{ slug: string; label: string; timeMs: number; dateLabel: string }> = [];
    for (const d of RACE_DISTANCES) {
      const meters = RACE_METERS[d.stored];
      if (!meters) continue;
      let best: { timeMs: number; dateLabel: string } | null = null;
      for (const a of competeState.activities) {
        if (a.sport !== "running" || a.distanceM < meters || a.movingSec <= 0) continue;
        const estMs = Math.round(a.movingSec * (meters / a.distanceM) * 1000);
        if (!best || estMs < best.timeMs) {
          best = {
            timeMs: estMs,
            dateLabel: a.startedAt
              ? new Date(a.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
              : "Tracked effort",
          };
        }
      }
      if (best) out.push({ slug: d.slug, label: d.label, timeMs: best.timeMs, dateLabel: best.dateLabel });
    }
    return out;
  }, [competeState?.activities]);

  return (
    <ScrollView contentContainerStyle={s.content}>
      {/* Personalized Overtaek Efforts Section */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <AppText role="heading">Your Overtaek results</AppText>
          {isSignedIn ? (
            <View style={s.badge}>
              <AppText role="nav" style={{ color: c.ink }}>SYNCED</AppText>
            </View>
          ) : null}
        </View>

        {!isSignedIn ? (
          <View style={s.card}>
            <AppText role="label">Personalized results & benchmarks</AppText>
            <AppText role="caption" secondary>
              Sign in to track your personal Overtaek efforts alongside published race fields and saved finishes.
            </AppText>
            <FocusButton label="Create free account →" onPress={onCreateAccount} />
          </View>
        ) : personalBests.length === 0 ? (
          <View style={s.card}>
            <AppText role="body" secondary>
              No qualifying running activities synced yet. Record or sync a 5K, 10K, half, or marathon run to compare against global fields.
            </AppText>
          </View>
        ) : (
          <View style={s.listCard}>
            {personalBests.map((pb, idx) => (
              <View key={pb.slug} style={[s.row, idx < personalBests.length - 1 && s.rowDivider]}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <AppText role="row">{pb.label} PR</AppText>
                  <AppText role="caption" secondary>{pb.dateLabel}</AppText>
                </View>
                <AppText role="label" style={s.tabular}>{raceClock(pb.timeMs)}</AppText>
                <Pressable onPress={() => onExploreDistance(pb.slug)} style={s.goldBtn}>
                  <AppText role="nav" style={{ color: "#142b3b" }}>Explore</AppText>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Saved Published Race Results */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <AppText role="heading">Saved results</AppText>
          {rows.length > 1 ? (
            <FocusButton
              label={selected.length === 2 ? "Compare 2 results" : `Select 2 (${selected.length}/2)`}
              disabled={selected.length !== 2}
              onPress={() =>
                router.push({
                  pathname: "/compare-race-results",
                  params: { first: String(selected[0]), second: String(selected[1]) },
                })
              }
            />
          ) : null}
        </View>

        {busy ? (
          <View style={s.card}>
            <ActivityIndicator accessibilityLabel="Loading saved results" />
          </View>
        ) : rows.length === 0 ? (
          <View style={s.card}>
            <AppText role="body" secondary>
              Tap ☆ on any athlete in the Observatory index or a race report to save results here for comparison and quick pinning.
            </AppText>
          </View>
        ) : (
          <View style={s.listCard}>
            {rows.map((row, idx) => {
              const isChecked = selected.includes(row.id);
              const disabled = !isChecked && selected.length >= 2;
              return (
                <Pressable
                  key={row.id}
                  onPress={() => router.push({ pathname: "/race-result", params: { id: String(row.id) } })}
                  style={[s.row, idx < rows.length - 1 && s.rowDivider]}
                >
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isChecked, disabled }}
                    disabled={disabled}
                    onPress={ev => {
                      ev.stopPropagation();
                      setSelection(prev => (prev.includes(row.id) ? prev.filter(x => x !== row.id) : [...prev, row.id]));
                    }}
                    style={[s.checkBox, isChecked && s.checkBoxOn, disabled && { opacity: 0.4 }]}
                  >
                    {isChecked ? <AppText role="nav" style={{ color: "#142b3b" }}>✓</AppText> : null}
                  </Pressable>

                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <AppText role="label" numberOfLines={1}>{row.athlete_name}</AppText>
                    <AppText role="caption" secondary numberOfLines={1}>
                      {formatEditionDisplay(row.event_name, row.edition_year)}
                    </AppText>
                  </View>

                  <AppText role="label" style={s.tabular}>{raceClock(row.rank_time_ms)}</AppText>

                  <Pressable
                    onPress={ev => {
                      ev.stopPropagation();
                      void saved.toggle(row.id);
                    }}
                    hitSlop={6}
                    style={s.removeBtn}
                    accessibilityLabel={`Remove ${row.athlete_name}`}
                  >
                    <AppText role="nav" secondary>×</AppText>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const sThemes = createThemedStyles(c => ({
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FFF5D1",
    borderWidth: 1,
    borderColor: "#FFB800",
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: c.line,
    gap: 10,
  },
  listCard: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderColor: "#eef2f1",
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#cbd5dc",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  checkBoxOn: {
    backgroundColor: "#FFB800",
    borderColor: "#E5A400",
  },
  goldBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFB800",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#f4f7f8",
    alignItems: "center",
    justifyContent: "center",
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
}));

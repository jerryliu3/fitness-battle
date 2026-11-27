import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  OBSERVATORY_SPORTS,
  RACE_DISTANCES,
  RACE_METERS,
  analyzeRaceSplits,
  formatEditionDisplay,
  inferEditionDate,
  raceClock,
  raceEditionOptions,
  raceEventGroups,
  racePercentileBadge,
  type ObservatorySportId,
  type RaceCoverage,
  type RaceResultReport,
  type RaceResultsPage,
  type RaceTimingSplits,
  type SavedRaceResult,
} from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { mobileEnv } from "../lib/env";
import { useRaceFavorites } from "../lib/race-favorites";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { AppIcon } from "../ui/app-icon";
import { FocusButton, FocusSheet } from "../ui/focus";
import {
  ObservatoryChart,
  type ObservatoryOverlayDataset,
  type ObservatoryPinnedRecord,
} from "../ui/observatory-chart";
import { RaceRouteArtNative, SplitSparklineNative } from "../ui/observatory-race-card";
import { ObservatorySportBar } from "../ui/observatory-sport-bar";
import { RequestRaceCta } from "../ui/request-race-cta";
import { MissingResultCta } from "../ui/missing-result-cta";
import { SearchField } from "../ui/search-field";
import { AppText, textStyle } from "../ui/section";

const PINNED_KEY = "overtaek:pinned-athletes:v2";
const SAVED_EDITIONS_KEY = "overtaek:saved-editions:v1";

const clientResultsCache = new Map<string, RaceResultsPage>();
const rowSplitsMemoryCache = new Map<number, RaceTimingSplits | null>();
const reportMemoryCache = new Map<number, RaceResultReport>();
const MOBILE_PAGE_SIZE = 10;

export function ObservatoryTab({
  initialDistance = "marathon",
  initialEdition = "",
  initialSex = "all",
  initialQuery = "",
  coverage,
  coursePreviews,
  onOpenReplay,
  onRequireAuth,
}: {
  initialDistance?: string;
  initialEdition?: string;
  initialSex?: string;
  initialQuery?: string;
  coverage: RaceCoverage[] | null;
  coursePreviews: Record<string, [number, number][]>;
  onOpenReplay: (opts: { editionId: number; distanceSlug: string; sex: string; ids?: string }) => void;
  onRequireAuth: (action: "save" | "pin", target?: string) => void;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const router = useRouter();
  const { user } = useAuth();
  const { state: competeState } = useCompeteStore();
  const saved = useRaceFavorites();

  const [sport, setSport] = useState<ObservatorySportId>("running");
  const [sportFormat, setSportFormat] = useState<string>(initialDistance || "marathon");
  const [distance, setDistance] = useState<string>(initialDistance || "marathon");
  const [edition, setEdition] = useState<string>(initialEdition);
  const [sex, setSex] = useState<string>(initialSex || "all");
  const [search, setSearch] = useState<string>(initialQuery);
  const [draftSearch, setDraftSearch] = useState<string>(initialQuery);
  const [page, setPage] = useState<number>(1);
  const [jumpText, setJumpText] = useState<string>("1");

  const [data, setData] = useState<RaceResultsPage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 0.72]);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [inspectTimeMs, setInspectTimeMs] = useState<number | null>(null);

  const [overlayIds, setOverlayIds] = useState<number[]>([]);
  const [overlayData, setOverlayData] = useState<Record<string, ObservatoryOverlayDataset>>({});
  const overlayInFlightRef = useRef<Set<string>>(new Set());

  const [pinnedList, setPinnedList] = useState<ObservatoryPinnedRecord[]>([]);
  const [savedEditions, setSavedEditions] = useState<number[]>([]);
  const [savedDetails, setSavedDetails] = useState<SavedRaceResult[]>([]);

  const [rowSplits, setRowSplits] = useState<Record<number, RaceTimingSplits | null>>(() => {
    const init: Record<number, RaceTimingSplits | null> = {};
    rowSplitsMemoryCache.forEach((v, k) => {
      init[k] = v;
    });
    return init;
  });

  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [expandedReports, setExpandedReports] = useState<Record<number, RaceResultReport>>({});
  const [reportBusyId, setReportBusyId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<"races" | "compare" | null>(null);
  const [modalSearch, setModalSearch] = useState("");

  const activeSportObj = OBSERVATORY_SPORTS.find(sp => sp.id === sport) ?? OBSERVATORY_SPORTS[0];
  const isRunningSport = sport === "running";
  const currentDistanceObj = RACE_DISTANCES.find(d => d.slug === distance) ?? RACE_DISTANCES[3];
  const storedDistance = currentDistanceObj.stored;

  const editions = useMemo(() => raceEditionOptions(coverage ?? [], storedDistance), [coverage, storedDistance]);
  const eventGroups = useMemo(
    () => raceEventGroups(coverage ?? [], sex).filter(g => g.distance_slug === storedDistance),
    [coverage, sex, storedDistance],
  );
  const selectedEditionMeta = useMemo(
    () => editions.find(e => String(e.edition_id) === edition) ?? null,
    [editions, edition],
  );

  // Hydrate persisted pins & saved editions
  useEffect(() => {
    AsyncStorage.getItem(PINNED_KEY)
      .then(raw => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setPinnedList(
            parsed.filter(
              (p): p is ObservatoryPinnedRecord =>
                Boolean(p) && typeof (p as ObservatoryPinnedRecord).id === "number",
            ),
          );
        }
      })
      .catch(() => {});

    if (user?.mode === "supabase") {
      AsyncStorage.getItem(SAVED_EDITIONS_KEY)
        .then(raw => {
          if (!raw) return;
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) setSavedEditions(parsed.filter((x): x is number => typeof x === "number"));
        })
        .catch(() => {});
    } else {
      setSavedEditions([]);
    }
  }, [user?.mode]);

  // Load rankings data with in-memory cache (10 rows per mobile page)
  useEffect(() => {
    if (!isRunningSport) return;
    const cacheKey = `${distance}|${edition}|${sex}|all|${search.trim()}|${page}|${MOBILE_PAGE_SIZE}`;
    const cached = clientResultsCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setJumpText(String(cached.page));
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const params = new URLSearchParams({
      distance,
      sex,
      timeframe: "all",
      page: String(page),
      pageSize: String(MOBILE_PAGE_SIZE),
    });
    if (edition) params.set("edition", edition);
    if (search.trim()) params.set("q", search.trim());

    fetch(`${mobileEnv.apiUrl}/api/rankings?${params.toString()}`, { signal: controller.signal })
      .then(r => (r.ok ? (r.json() as Promise<RaceResultsPage>) : null))
      .then(res => {
        if (!controller.signal.aborted && res) {
          clientResultsCache.set(cacheKey, res);
          setData(res);
          setJumpText(String(res.page));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [isRunningSport, distance, edition, sex, search, page]);

  // Pre-warm overlay comparison data from cache or API
  useEffect(() => {
    for (const edId of overlayIds) {
      const ovKey = `${distance}|${edId}|${sex}`;
      if (overlayData[ovKey] || overlayInFlightRef.current.has(ovKey)) continue;
      const meta = editions.find(e => e.edition_id === edId);
      const label = meta ? formatEditionDisplay(meta.event_name, meta.edition_year) : `Edition #${edId}`;
      const cachedPage = clientResultsCache.get(`${distance}|${edId}|${sex}|all||1`);
      if (cachedPage?.analytics) {
        setOverlayData(prev => ({ ...prev, [ovKey]: { editionId: edId, label, analytics: cachedPage.analytics! } }));
        continue;
      }
      overlayInFlightRef.current.add(ovKey);
      const params = new URLSearchParams({ distance, edition: String(edId), sex, timeframe: "all", page: "1" });
      fetch(`${mobileEnv.apiUrl}/api/rankings?${params}`)
        .then(r => (r.ok ? (r.json() as Promise<RaceResultsPage>) : null))
        .then(pg => {
          if (pg) clientResultsCache.set(`${distance}|${edId}|${sex}|all||1`, pg);
          if (pg?.analytics) {
            setOverlayData(prev => ({ ...prev, [ovKey]: { editionId: edId, label, analytics: pg.analytics! } }));
          }
        })
        .catch(() => {})
        .finally(() => {
          overlayInFlightRef.current.delete(ovKey);
        });
    }
  }, [overlayIds, distance, sex, editions, overlayData]);

  // Saved result details for auto-pinning
  const savedIdsKey = saved.ids.join(",");
  useEffect(() => {
    if (!saved.ready || !savedIdsKey) {
      setSavedDetails([]);
      return;
    }
    let cancelled = false;
    fetch(`${mobileEnv.apiUrl}/api/rankings/saved?ids=${savedIdsKey}`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: SavedRaceResult[]) => {
        if (!cancelled && Array.isArray(rows)) setSavedDetails(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [saved.ready, savedIdsKey]);

  const analytics = data?.analytics ?? null;
  const activePins = useMemo(
    () => pinnedList.filter(p => p.distanceSlug === storedDistance),
    [pinnedList, storedDistance],
  );
  const savedForDistance = useMemo(
    () => savedDetails.filter(r => r.distance_slug === storedDistance),
    [savedDetails, storedDistance],
  );
  const allSavedPinned = useMemo(
    () => savedForDistance.length > 0 && savedForDistance.every(r => activePins.some(p => p.id === r.id)),
    [savedForDistance, activePins],
  );

  // Top 5 Overtaek efforts for signed-in user at this distance
  const personalEfforts = useMemo(() => {
    if (user?.mode !== "supabase" || !competeState?.activities) return [];
    const targetMeters = RACE_METERS[storedDistance];
    if (!targetMeters) return [];
    return competeState.activities
      .filter(a => a.sport === "running" && a.distanceM >= targetMeters && a.movingSec > 0)
      .map((a, idx) => ({
        pinId: -(idx + 1000),
        activityId: a.id,
        timeMs: Math.round(a.movingSec * (targetMeters / a.distanceM) * 1000),
        dateLabel: a.startedAt
          ? new Date(a.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
          : "Tracked effort",
      }))
      .sort((a, b) => a.timeMs - b.timeMs)
      .slice(0, 5);
  }, [user?.mode, competeState?.activities, storedDistance]);

  function persistPins(next: ObservatoryPinnedRecord[]) {
    if (next.length > 0) void AsyncStorage.setItem(PINNED_KEY, JSON.stringify(next));
    else void AsyncStorage.removeItem(PINNED_KEY);
  }

  function pinRow(row: {
    id: number;
    athlete_name: string;
    rank_time_ms: number;
    event_name: string;
    edition_year: number;
    distance_slug: string;
  }) {
    setPinnedList(prev => {
      const exists = prev.some(p => p.id === row.id);
      const next = exists
        ? prev.filter(p => p.id !== row.id)
        : [
            ...prev.slice(-3),
            {
              id: row.id,
              name: row.athlete_name,
              timeMs: row.rank_time_ms,
              eventName: row.event_name,
              year: row.edition_year,
              distanceSlug: row.distance_slug,
            },
          ];
      persistPins(next);
      return next;
    });
  }

  function unpinId(id: number) {
    setPinnedList(prev => {
      const next = prev.filter(p => p.id !== id);
      persistPins(next);
      return next;
    });
  }

  function toggleSavedResultsPinned() {
    if (user?.mode !== "supabase") {
      onRequireAuth("save", "your saved results");
      return;
    }
    if (!savedForDistance.length) return;
    setPinnedList(prev => {
      const savedSet = new Set(savedForDistance.map(r => r.id));
      const next = allSavedPinned
        ? prev.filter(p => !savedSet.has(p.id))
        : [
            ...prev,
            ...savedForDistance
              .filter(r => !prev.some(p => p.id === r.id))
              .map(r => ({
                id: r.id,
                name: r.athlete_name,
                timeMs: r.rank_time_ms,
                eventName: r.event_name,
                year: r.edition_year,
                distanceSlug: r.distance_slug,
              })),
          ];
      persistPins(next);
      return next;
    });
  }

  function toggleSavedEdition(edId: number, label: string) {
    if (user?.mode !== "supabase") {
      onRequireAuth("save", label);
      return;
    }
    setSavedEditions(prev => {
      const next = prev.includes(edId) ? prev.filter(x => x !== edId) : [...prev, edId];
      void AsyncStorage.setItem(SAVED_EDITIONS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleOverlayEdition(edId: number) {
    if (edition) {
      setEdition("");
      setPage(1);
    }
    setOverlayIds(prev => (prev.includes(edId) ? prev.filter(x => x !== edId) : [...prev.slice(-2), edId]));
  }

  function selectScopeEdition(edId: number | null) {
    setEdition(edId === null ? "" : String(edId));
    setSelectedBucket(null);
    setInspectTimeMs(null);
    setModalMode(null);
    setPage(1);
  }

  function toggleExpandRow(resultId: number) {
    if (expandedRowId === resultId) {
      setExpandedRowId(null);
      return;
    }
    setExpandedRowId(resultId);
    const cached = reportMemoryCache.get(resultId);
    if (cached) {
      setExpandedReports(prev => ({ ...prev, [resultId]: cached }));
      return;
    }
    setReportBusyId(resultId);
    fetch(`${mobileEnv.apiUrl}/api/rankings/${resultId}`)
      .then(r => (r.ok ? (r.json() as Promise<RaceResultReport>) : null))
      .then(rep => {
        if (rep) {
          reportMemoryCache.set(resultId, rep);
          setExpandedReports(prev => ({ ...prev, [resultId]: rep }));
          if (rep.splits) {
            rowSplitsMemoryCache.set(resultId, rep.splits);
            setRowSplits(prev => ({ ...prev, [resultId]: rep.splits! }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setReportBusyId(null));
  }

  const scopedOverlayMap = useMemo(() => {
    const out: Record<string, ObservatoryOverlayDataset> = {};
    for (const edId of overlayIds) {
      const ds = overlayData[`${distance}|${edId}|${sex}`];
      if (ds) out[String(edId)] = ds;
    }
    return out;
  }, [overlayIds, overlayData, distance, sex]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Main Interactive Chart Card */}
      <View style={s.chartCard}>
        <ObservatorySportBar
          sport={sport}
          onSportChange={nextSport => {
            if (nextSport === sport) return;
            const targetObj = OBSERVATORY_SPORTS.find(sp => sp.id === nextSport) ?? OBSERVATORY_SPORTS[0];
            setSport(nextSport);
            setSportFormat(nextSport === "running" ? distance : targetObj.formats[0].value);
            setSelectedBucket(null);
            setInspectTimeMs(null);
          }}
          format={isRunningSport ? distance : sportFormat}
          onFormatChange={nextVal => {
            if (isRunningSport) {
              if (nextVal === distance) return;
              setDistance(nextVal);
              setSportFormat(nextVal);
              setEdition("");
              setOverlayIds([]);
              setSelectedBucket(null);
              setInspectTimeMs(null);
              setPage(1);
            } else {
              setSportFormat(nextVal);
            }
          }}
          sex={sex}
          onSexChange={nextSex => {
            setSex(nextSex);
            setSelectedBucket(null);
            setInspectTimeMs(null);
            setPage(1);
          }}
          rightSlot={
            <Pressable
              accessibilityRole="button"
              disabled={!isRunningSport || Boolean(edition)}
              onPress={() => {
                setModalSearch("");
                setModalMode("compare");
              }}
              style={[s.goldBtn, (!isRunningSport || Boolean(edition)) && { opacity: 0.45 }]}
            >
              <View style={s.inlineIconRow}>
                <AppIcon name="plus" size={13} color={c.textOnAction} />
                <AppText role="nav" style={{ color: c.textOnAction }}>
                  Compare
                </AppText>
              </View>
            </Pressable>
          }
          extraRow2={
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: allSavedPinned }}
                onPress={toggleSavedResultsPinned}
                style={[s.subtleChip, allSavedPinned && s.subtleChipActive]}
              >
                <View style={s.inlineIconRow}>
                  <AppIcon name="special" size={13} color={allSavedPinned ? c.card : c.muted} />
                  <AppText role="label" style={[s.subtleChipText, allSavedPinned && s.subtleChipTextActive]}>
                    {allSavedPinned ? "Saved pinned" : "Saved results"}
                  </AppText>
                </View>
              </Pressable>

              {isRunningSport && edition ? (
                <Pressable onPress={() => selectScopeEdition(null)} style={s.goldChip}>
                  <AppText role="nav" style={{ color: c.ink }}>
                    ← {selectedEditionMeta ? formatEditionDisplay(selectedEditionMeta.event_name, selectedEditionMeta.edition_year) : "Selected race"} ×
                  </AppText>
                </Pressable>
              ) : null}

              {isRunningSport && selectedBucket !== null && analytics ? (
                <Pressable
                  onPress={() => {
                    setSelectedBucket(null);
                    setInspectTimeMs(null);
                    setPage(1);
                  }}
                  style={s.goldChip}
                >
                  <AppText role="nav" style={{ color: c.ink }}>
                    Band: {raceClock(analytics.minimumMs + selectedBucket * analytics.binWidthMs)}–
                    {raceClock(analytics.minimumMs + (selectedBucket + 1) * analytics.binWidthMs)} ×
                  </AppText>
                </Pressable>
              ) : null}
            </>
          }
        />

        <ObservatoryChart
          cohortTotal={data?.cohortTotal ?? null}
          editionScoped={Boolean(edition)}
          analytics={analytics}
          loading={loading}
          sportLabel={activeSportObj.label}
          isRunningSport={isRunningSport}
          zoomRange={zoomRange}
          onZoomChange={setZoomRange}
          selectedBucket={selectedBucket}
          inspectTimeMs={inspectTimeMs}
          onSelectTimeMs={(ms, bucket) => {
            setInspectTimeMs(ms);
            setSelectedBucket(bucket);
            if (bucket !== null && analytics) {
              const binStartMs = analytics.minimumMs + bucket * analytics.binWidthMs;
              const fasterApprox = analytics.bins
                .filter(b => b.bucket < bucket)
                .reduce((acc, b) => acc + b.count, 0);
              const pageSize = data?.pageSize ?? MOBILE_PAGE_SIZE;
              const targetPage = Math.max(1, Math.floor(fasterApprox / pageSize) + 1);
              setSearch("");
              setDraftSearch("");
              setPage(targetPage);
            } else {
              setPage(1);
            }
          }}
          activePins={activePins}
          onUnpin={unpinId}
          overlayIds={overlayIds}
          overlayData={scopedOverlayMap}
          onRemoveOverlay={toggleOverlayEdition}
        />
      </View>

      {/* Signed-in User's Top 5 Overtaek Results Strip */}
      {isRunningSport && personalEfforts.length > 0 ? (
        <View style={s.personalStrip}>
          <View style={s.goldChip}>
            <AppText role="nav" style={{ color: c.ink }}>
              Your results
            </AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {personalEfforts.map(eff => {
              const isPinned = activePins.some(p => p.id === eff.pinId);
              return (
                <View key={eff.activityId} style={s.effortPill}>
                  <AppText role="label" style={s.tabular}>
                    {raceClock(eff.timeMs)}
                  </AppText>
                  <AppText role="caption" secondary>
                    {eff.dateLabel}
                  </AppText>
                  <Pressable
                    onPress={() =>
                      pinRow({
                        id: eff.pinId,
                        athlete_name: competeState?.name || user?.displayName || "You",
                        rank_time_ms: eff.timeMs,
                        event_name: `Overtaek ${currentDistanceObj.label}`,
                        edition_year: new Date().getFullYear(),
                        distance_slug: storedDistance,
                      })
                    }
                    style={[s.miniPinBtn, isPinned && s.miniPinBtnActive]}
                  >
                    <AppText role="nav" style={{ color: c.ink }}>
                      {isPinned ? "✓ On chart" : "Pin"}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Race Editions Horizontal Carousel */}
      {isRunningSport && coverage ? (
        <View style={{ gap: 10 }}>
          <View style={[s.sectionHead, { flexWrap: "wrap", rowGap: 8 }]}>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <AppText role="heading">Race editions</AppText>
                <RequestRaceCta surface="observatory" />
              </View>
              <AppText role="caption" secondary>Don&apos;t see your race?</AppText>
            </View>
            <Pressable
              onPress={() => {
                setModalSearch("");
                setModalMode("races");
              }}
            >
              <AppText role="field" style={{ color: c.muted }}>
                View all races ↗
              </AppText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel}>
            {eventGroups.map(ed => {
              const isSelected = String(ed.edition_id) === edition;
              const isComparing = overlayIds.includes(ed.edition_id);
              const isSavedEdition = savedEditions.includes(ed.edition_id);
              const coursePts = coursePreviews[`${ed.edition_id}:${ed.distance_slug}`] ?? null;
              const hasGps = Boolean(coursePts && coursePts.length >= 2);
              return (
                <Pressable
                  key={`${ed.edition_id}:${ed.distance_slug}`}
                  onPress={() => selectScopeEdition(isSelected ? null : ed.edition_id)}
                  style={[s.raceCard, isSelected && s.raceCardSelected]}
                >
                  <RaceRouteArtNative eventName={ed.event_name} year={ed.edition_year} coursePoints={coursePts} />
                  <View style={s.raceCardBody}>
                    <AppText role="row" numberOfLines={1}>
                      {formatEditionDisplay(ed.event_name, ed.edition_year)}
                    </AppText>
                    <AppText role="caption" secondary>
                      {inferEditionDate(ed.event_name, ed.edition_year)} · {ed.published_count.toLocaleString()} finishes
                    </AppText>
                    <View style={s.raceCardActions}>
                      <Pressable
                        disabled={!hasGps}
                        onPress={() =>
                          onOpenReplay({
                            editionId: ed.edition_id,
                            distanceSlug: distance,
                            sex,
                          })
                        }
                        style={[s.cardActionPrimary, !hasGps && { opacity: 0.4 }]}
                        accessibilityLabel={`View Replay for ${ed.event_name}`}
                      >
                        <AppText role="nav" style={{ color: c.textOnAction }}>
                          View Replay
                        </AppText>
                      </Pressable>
                      <Pressable
                        onPress={() => selectScopeEdition(isSelected ? null : ed.edition_id)}
                        style={[s.cardActionBtn, isSelected && s.cardActionInk]}
                      >
                        <AppText role="nav" style={{ color: isSelected ? c.card : c.ink }}>
                          {isSelected ? "✓ Exploring" : "Explore"}
                        </AppText>
                      </Pressable>
                      <Pressable
                        onPress={() => toggleOverlayEdition(ed.edition_id)}
                        style={[s.cardIconBtn, isComparing && s.cardActionInk]}
                        accessibilityLabel={isComparing ? `Remove ${ed.event_name} from comparison` : `Compare ${ed.event_name}`}
                      >
                        {isComparing ? (
                          <AppText role="nav" style={{ color: c.card }}>✓</AppText>
                        ) : (
                          <AppIcon name="plus" size={14} color={c.ink} />
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => toggleSavedEdition(ed.edition_id, formatEditionDisplay(ed.event_name, ed.edition_year))}
                        style={[s.cardIconBtn, isSavedEdition && s.cardActionGold]}
                        accessibilityLabel={isSavedEdition ? "Unsave race" : "Save race"}
                      >
                        <AppIcon name="special" size={14} color={isSavedEdition ? c.textOnAction : c.muted} />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Athlete Index Header + Inline Search */}
      <View style={s.indexHeader}>
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <AppText role="heading">
              {edition && selectedEditionMeta
                ? `${formatEditionDisplay(selectedEditionMeta.event_name, selectedEditionMeta.edition_year)}`
                : "Athlete index"}
            </AppText>
            <MissingResultCta
              surface="observatory"
              defaultRace={selectedEditionMeta ? formatEditionDisplay(selectedEditionMeta.event_name, selectedEditionMeta.edition_year) : ""}
            />
          </View>
          <AppText role="caption" secondary>Missing a result?</AppText>
        </View>
        <View style={s.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchField
              accessibilityLabel="Find an athlete or bib"
              placeholder="Find athlete or bib…"
              value={draftSearch}
              onChangeText={setDraftSearch}
              onSubmitEditing={() => {
                setSearch(draftSearch.trim());
                setPage(1);
              }}
            />
          </View>
          <Pressable
            onPress={() => {
              setSearch(draftSearch.trim());
              setPage(1);
            }}
            style={s.goldBtn}
          >
            <AppText role="field" style={{ color: c.textOnAction }}>
              Search
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Pure White Athlete Index Table Card */}
      <View style={s.tableCard}>
        {!isRunningSport ? (
          <View style={{ padding: 20, gap: 6 }}>
            <AppText role="label">No published {activeSportObj.label} results yet</AppText>
            <AppText role="caption" secondary>
              Select Running to explore published marathon, half marathon, 10K, and 5K fields.
            </AppText>
          </View>
        ) : !data && loading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator accessibilityLabel="Loading athlete index" />
          </View>
        ) : !data || data.rows.length === 0 ? (
          <View style={{ padding: 20, gap: 6 }}>
            <AppText role="label">No matching finishers</AppText>
            <AppText role="caption" secondary>
              Try another athlete name, bib, or category.
            </AppText>
          </View>
        ) : (
          <View>
            {data.rows.map((row, idx) => {
              const isPinned = activePins.some(p => p.id === row.id);
              const isSaved = saved.ids.includes(row.id);
              const isExpanded = expandedRowId === row.id;
              const detailReport = expandedReports[row.id] ?? null;
              const detailSplits = detailReport?.splits ?? rowSplits[row.id] ?? null;
              const splitAnalysis = isExpanded && detailSplits ? analyzeRaceSplits(detailSplits, row.distance_slug) : null;
              const inBand =
                selectedBucket !== null &&
                analytics !== null &&
                row.rank_time_ms >= analytics.minimumMs + selectedBucket * analytics.binWidthMs &&
                row.rank_time_ms < analytics.minimumMs + (selectedBucket + 1) * analytics.binWidthMs;

              return (
                <Fragment key={row.id}>
                  <Pressable
                    onPress={() => toggleExpandRow(row.id)}
                    style={[
                      s.tableRow,
                      idx < data.rows.length - 1 && !isExpanded && s.rowDivider,
                      (isPinned || inBand) && s.rowGoldAccent,
                    ]}
                  >
                    <View style={s.rowMain}>
                      <AppText role="caption" secondary style={[s.placeCol, s.tabular]}>
                        #{row.place.toLocaleString()}
                      </AppText>
                      <AppText role="label" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>
                        {row.athlete_name}
                        {reportBusyId === row.id ? " …" : ""}
                      </AppText>
                      <AppText role="label" style={s.tabular}>
                        {raceClock(row.rank_time_ms)}
                      </AppText>
                      <Pressable
                        onPress={ev => {
                          ev.stopPropagation();
                          pinRow(row);
                        }}
                        style={[s.miniPinBtn, isPinned && s.miniPinBtnActive]}
                      >
                        <AppText role="nav" style={{ color: isPinned ? c.textOnAction : c.ink }}>
                          {isPinned ? "Pinned" : "Pin"}
                        </AppText>
                      </Pressable>
                      <Pressable
                        onPress={ev => {
                          ev.stopPropagation();
                          if (user?.mode !== "supabase") {
                            onRequireAuth("save", `${row.athlete_name} (${raceClock(row.rank_time_ms)})`);
                            return;
                          }
                          void saved.toggle(row.id);
                        }}
                        style={[s.miniIconBtn, user?.mode === "supabase" && isSaved && s.miniPinBtnActive]}
                        accessibilityLabel={isSaved ? "Remove saved result" : "Save result"}
                      >
                        <AppIcon
                          name="special"
                          size={13}
                          color={user?.mode === "supabase" && isSaved ? c.textOnAction : c.muted}
                        />
                      </Pressable>
                    </View>
                  </Pressable>

                  {isExpanded ? (
                    <View style={[s.detailDrawer, idx < data.rows.length - 1 && s.rowDivider]}>
                      <AppText role="caption" secondary>
                        {formatEditionDisplay(row.event_name, row.edition_year)}
                        {row.bib ? ` · Bib #${row.bib}` : ""}
                        {" · "}
                        {detailReport
                          ? `Rank #${detailReport.place.toLocaleString()} of ${detailReport.total.toLocaleString()}`
                          : `Rank #${row.place.toLocaleString()}`}
                        {row.percentile != null ? ` · ${racePercentileBadge(row.percentile)}` : ""}
                      </AppText>

                      {detailSplits ? (
                        <SplitSparklineNative splits={detailSplits} distanceSlug={row.distance_slug} />
                      ) : null}

                      {splitAnalysis?.status === "ready" ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                          {splitAnalysis.rows
                            .filter(sr => sr.elapsedMs !== null)
                            .map(sr => (
                              <View key={sr.distanceM} style={s.splitPill}>
                                <AppText role="nav" secondary>
                                  {sr.label}
                                </AppText>
                                <AppText role="nav" style={s.tabular}>
                                  {raceClock(sr.elapsedMs!)}
                                </AppText>
                              </View>
                            ))}
                        </ScrollView>
                      ) : null}

                      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                        {detailSplits ? (
                          <Pressable
                            onPress={() =>
                              onOpenReplay({
                                editionId: detailReport?.result.event_edition_id ?? Number(edition || 6),
                                distanceSlug: distance,
                                sex,
                                ids: String(row.id),
                              })
                            }
                            style={s.goldBtn}
                          >
                            <View style={s.inlineIconRow}>
                              <AppIcon name="play" size={12} color={c.textOnAction} />
                              <AppText role="nav" style={{ color: c.textOnAction }}>
                                Replay performance
                              </AppText>
                            </View>
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() => router.push({ pathname: "/race-result", params: { id: String(row.id) } })}
                          style={s.cardActionBtn}
                        >
                          <AppText role="nav" style={{ color: c.ink }}>
                            Full report →
                          </AppText>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </Fragment>
              );
            })}
          </View>
        )}
      </View>

      {/* Pagination + Page Jump */}
      {isRunningSport && data && data.total > 0 ? (
        <View style={s.paginationRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              disabled={loading || data.page <= 1}
              onPress={() => setPage(p => Math.max(1, p - 1))}
              style={[s.pageBtn, (loading || data.page <= 1) && { opacity: 0.4 }]}
            >
              <AppText role="nav">← Prev</AppText>
            </Pressable>
            <AppText role="caption" secondary style={s.tabular}>
              {data.page.toLocaleString()} / {totalPages.toLocaleString()}
            </AppText>
            <Pressable
              disabled={loading || data.page >= totalPages}
              onPress={() => setPage(p => p + 1)}
              style={[s.pageBtn, (loading || data.page >= totalPages) && { opacity: 0.4 }]}
            >
              <AppText role="nav">Next →</AppText>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <TextInput
              value={jumpText}
              onChangeText={setJumpText}
              keyboardType="number-pad"
              style={s.jumpInput}
              accessibilityLabel="Jump to page"
            />
            <Pressable
              onPress={() => {
                const n = Number(jumpText);
                if (Number.isFinite(n)) setPage(Math.max(1, Math.min(totalPages, Math.floor(n))));
              }}
              style={s.pageBtn}
            >
              <AppText role="nav">Go</AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* View all races / Compare races sheet */}
      <FocusSheet
        open={modalMode !== null}
        title={modalMode === "compare" ? "Compare up to 3 races" : "All race editions"}
        onClose={() => setModalMode(null)}
      >
        <View style={{ gap: 10 }}>
          <SearchField
            accessibilityLabel="Search race editions"
            placeholder="Search race or year…"
            value={modalSearch}
            onChangeText={setModalSearch}
          />
          {eventGroups
            .filter(ed => `${ed.event_name} ${ed.edition_year}`.toLowerCase().includes(modalSearch.trim().toLowerCase()))
            .map(ed => {
              const isSelected = String(ed.edition_id) === edition;
              const isComparing = overlayIds.includes(ed.edition_id);
              const hasGps = Boolean(coursePreviews[`${ed.edition_id}:${ed.distance_slug}`]);
              return (
                <View key={`${ed.edition_id}:${ed.distance_slug}`} style={[s.modalRow, (isSelected || isComparing) && s.modalRowActive]}>
                  <View style={{ flex: 1 }}>
                    <AppText role="label">{formatEditionDisplay(ed.event_name, ed.edition_year)}</AppText>
                    <AppText role="caption" secondary>
                      {inferEditionDate(ed.event_name, ed.edition_year)} · {ed.published_count.toLocaleString()} finishes
                    </AppText>
                  </View>
                  {modalMode === "compare" ? (
                    <Pressable
                      onPress={() => toggleOverlayEdition(ed.edition_id)}
                      style={[s.cardActionBtn, isComparing && s.cardActionGold]}
                    >
                      <AppText role="nav">
                        {isComparing ? "✓ Added" : "＋ Add"}
                      </AppText>
                    </Pressable>
                  ) : (
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <Pressable
                        disabled={!hasGps}
                        onPress={() => {
                          setModalMode(null);
                          onOpenReplay({ editionId: ed.edition_id, distanceSlug: distance, sex });
                        }}
                        style={[s.goldBtn, !hasGps && { opacity: 0.4 }]}
                        accessibilityLabel={`View Replay for ${ed.event_name}`}
                      >
                        <AppText role="nav" style={{ color: c.textOnAction }}>View Replay</AppText>
                      </Pressable>
                      <Pressable
                        onPress={() => selectScopeEdition(isSelected ? null : ed.edition_id)}
                        style={[s.cardActionBtn, isSelected && s.cardActionInk]}
                      >
                        <AppText role="nav" style={{ color: isSelected ? c.card : c.ink }}>
                          {isSelected ? "✓ Exploring" : "Explore"}
                        </AppText>
                      </Pressable>
                      <Pressable
                        onPress={() => toggleOverlayEdition(ed.edition_id)}
                        style={[s.cardIconBtn, isComparing && s.cardActionInk]}
                        accessibilityLabel={isComparing ? `Remove ${ed.event_name} from comparison` : `Compare ${ed.event_name}`}
                      >
                        {isComparing ? (
                          <AppText role="nav" style={{ color: c.card }}>✓</AppText>
                        ) : (
                          <AppIcon name="plus" size={14} color={c.ink} />
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
        </View>
      </FocusSheet>
    </ScrollView>
  );
}

const sThemes = createThemedStyles(c => ({
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 34,
    gap: 14,
  },
  chartCard: {
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden",
  },
  inlineIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  goldBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: c.tennis,
    borderWidth: 1,
    borderColor: c.tennis,
    alignItems: "center",
    justifyContent: "center",
  },
  goldChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: c.soft,
    borderWidth: 1,
    borderColor: c.tennis,
    alignItems: "center",
    justifyContent: "center",
  },
  subtleChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: c.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  subtleChipActive: {
    backgroundColor: c.ink,
  },
  subtleChipText: {
    ...textStyle("caption"),
    color: c.muted,
  },
  subtleChipTextActive: {
    color: c.card,
  },
  personalStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: c.soft,
    borderWidth: 1,
    borderColor: c.tennis,
  },
  effortPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  carousel: {
    gap: 12,
    paddingRight: 4,
  },
  raceCard: {
    width: 264,
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.line,
    overflow: "hidden",
  },
  raceCardSelected: {
    borderColor: c.tennis,
    shadowColor: c.tennis,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  raceCardBody: {
    padding: 12,
    gap: 4,
  },
  raceCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  cardActionPrimary: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    backgroundColor: c.tennis,
    borderWidth: 1,
    borderColor: c.tennis,
    alignItems: "center",
    justifyContent: "center",
  },
  cardActionBtn: {
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  cardActionGold: {
    backgroundColor: c.tennis,
    borderColor: c.tennis,
  },
  cardActionInk: {
    backgroundColor: c.ink,
    borderColor: c.ink,
  },
  cardIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  indexHeader: {
    gap: 8,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tableCard: {
    borderRadius: 18,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    overflow: "hidden",
    minHeight: 360,
  },
  tableRow: {
    backgroundColor: c.card,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 6,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: c.line,
  },
  rowGoldAccent: {
    borderLeftWidth: 3,
    borderLeftColor: c.tennis,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  placeCol: {
    ...textStyle("nav"),
    width: 34,
  },
  miniPinBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  miniPinBtnActive: {
    backgroundColor: c.tennis,
    borderColor: c.tennis,
  },
  miniIconBtn: {
    width: 30,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  detailDrawer: {
    backgroundColor: c.soft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 9,
  },
  splitPill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pageBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    alignItems: "center",
    justifyContent: "center",
  },
  jumpInput: {
    ...textStyle("caption"),
    width: 52,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    textAlign: "center",
    color: c.ink,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  modalRowActive: {
    backgroundColor: c.soft,
    borderColor: c.tennis,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
}));

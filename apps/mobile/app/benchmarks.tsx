import { SearchField } from "../src/ui/search-field";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  BENCHMARKS,
  RACE_CATEGORY_FILTERS,
  RACE_PERCENTILE_FILTERS,
  RACE_TIMEFRAMES,
  buildStandingsDistribution,
  raceClock,
  raceDistanceSlugForBenchmark,
  raceEditionOptions,
  raceQuery,
  racePercentileBadge,
  recordedRaceBenchmarkSeconds,
  type RaceCoverage,
  type RaceResultsPage,
} from "@fitness-battle/shared";
import { useAuth } from "../src/lib/auth";
import { useCompeteStore } from "../src/lib/compete-store";
import { mobileEnv } from "../src/lib/env";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../src/theme";
import { Chip, ChipRow } from "../src/ui/chip";
import { FocusButton, FocusSheet, useFocusStyles } from "../src/ui/focus";
import { ScreenHeader } from "../src/ui/screen-header";
import { AppText } from "../src/ui/section";
import { StandingsDistributionChart } from "../src/ui/standings-distribution-chart";

export function AllTimeStandingsScreen({
  initialDistance = "",
  initialEdition = "",
  initialSex = "all",
  initialPercentile = "all",
  initialTimeframe = "all",
  initialYear = "",
  initialFrom = "",
  initialThrough = "",
  initialQuery = "",
}: {
  initialDistance?: string;
  initialEdition?: string;
  initialSex?: string;
  initialPercentile?: string;
  initialTimeframe?: string;
  initialYear?: string;
  initialFrom?: string;
  initialThrough?: string;
  initialQuery?: string;
} = {}) {
  const c = useThemeColors();
  const f = useFocusStyles();
  const s = useThemedStyles(sThemes);
  const router = useRouter();
  const { state } = useCompeteStore();
  const { user } = useAuth();

  const [distance, setDistance] = useState(initialDistance);

  // Published sub-filters
  const [sex, setSex] = useState(initialSex);
  const [percentile, setPercentile] = useState(initialPercentile);
  const [edition, setEdition] = useState(initialEdition);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [year, setYear] = useState(initialYear);
  const [from, setFrom] = useState(initialFrom);
  const [through, setThrough] = useState(initialThrough);
  const [query, setQuery] = useState(initialQuery);
  const [draftTimeframe, setDraftTimeframe] = useState(initialTimeframe);
  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [draftYear, setDraftYear] = useState(initialYear);
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftThrough, setDraftThrough] = useState(initialThrough);
  const [validation, setValidation] = useState("");
  const [page, setPage] = useState(1);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [coverage, setCoverage] = useState<RaceCoverage[] | null>(null);
  const [racePage, setRacePage] = useState<RaceResultsPage | null>(null);
  const [raceBusy, setRaceBusy] = useState(false);
  const [raceError, setRaceError] = useState(false);
  const [retry, setRetry] = useState(0);

  const benchmarkOptions = BENCHMARKS.running;
  const benchmark = benchmarkOptions.find(option => option.id === distance) ?? benchmarkOptions[0]!;
  const raceSlug = raceDistanceSlugForBenchmark("running", benchmark.id)!;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${mobileEnv.apiUrl}/api/rankings/coverage`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<RaceCoverage[]>) : Promise.reject()))
      .then((rows) => { if (!controller.signal.aborted) setCoverage(rows); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams({
      distance: raceSlug,
      sex,
      edition,
      q: query,
      page: String(page),
      year,
      timeframe,
      from,
      through,
      percentile,
    });
    const parsed = raceQuery(qs);
    if (parsed.dateError || parsed.editionError) {
      setValidation(parsed.editionError ?? parsed.dateError ?? "");
      setRaceBusy(false);
      setRacePage(null);
      return;
    }
    setValidation("");
    const controller = new AbortController();
    setRacePage(null);
    setRaceBusy(true);
    setRaceError(false);
    fetch(`${mobileEnv.apiUrl}/api/rankings?${qs}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<RaceResultsPage>) : Promise.reject()))
      .then((result) => { if (!controller.signal.aborted) setRacePage(result); })
      .catch(() => { if (!controller.signal.aborted) setRaceError(true); })
      .finally(() => { if (!controller.signal.aborted) setRaceBusy(false); });
    return () => controller.abort();
  }, [raceSlug, sex, edition, query, page, year, timeframe, from, through, percentile, retry]);

  const yourSeconds = useMemo(() =>
    state && user?.mode === "supabase" && user.dataOrigin !== "synthetic"
      ? recordedRaceBenchmarkSeconds(state, benchmark.meters)
      : null,
  [state, user, benchmark.meters]);
  const distribution = useMemo(() => buildStandingsDistribution({
    source: "published",
    overtaekRows: [],
    publishedAnalytics: racePage?.analytics,
    yourSeconds,
  }), [racePage?.analytics, yourSeconds]);
  const rows = racePage?.rows ?? [];
  const editions = raceEditionOptions(coverage ?? [], raceSlug === "half-marathon" ? "half_marathon" : raceSlug);
  const activeFilterCount = Number(sex !== "all") + Number(percentile !== "all") +
    Number(edition !== "") + Number(timeframe !== "all") + Number(query !== "");

  const openFiltersSheet = () => {
    setDraftTimeframe(timeframe);
    setDraftQuery(query);
    setDraftYear(year);
    setDraftFrom(from);
    setDraftThrough(through);
    setValidation("");
    setFiltersOpen(true);
  };

  const applySubFilters = () => {
    const parsed = raceQuery(
      new URLSearchParams({ edition, timeframe: draftTimeframe, year: draftYear, from: draftFrom, through: draftThrough }),
    );
    const err = parsed.editionError ?? parsed.dateError ?? "";
    setValidation(err);
    if (err) return;
    setTimeframe(draftTimeframe);
    setQuery(draftQuery.trim());
    setYear(draftYear);
    setFrom(draftFrom);
    setThrough(draftThrough);
    setPage(1);
    setFiltersOpen(false);
  };

  const clearSubFilters = () => {
    setSex("all");
    setPercentile("all");
    setEdition("");
    setTimeframe("all");
    setDraftTimeframe("all");
    setYear("");
    setFrom("");
    setThrough("");
    setQuery("");
    setDraftQuery("");
    setDraftYear("");
    setDraftFrom("");
    setDraftThrough("");
    setValidation("");
    setPage(1);
  };

  return (
    <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
      <ScreenHeader
        title="All-time standings"
        nativeBar={false}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/arena"))}
      />

      <ScrollView contentContainerStyle={s.content}>
        <StandingsDistributionChart
          title={`Running · ${benchmark.label}`}
          source="published"
          distribution={distribution}
          loading={raceBusy}
          unavailable={raceError}
          onRetry={() => setRetry((n) => n + 1)}
        />

        <View style={s.filterBar}>
          <View style={s.chipScroll}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open sub-filters"
              onPress={openFiltersSheet}
              style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            >
              <AppText role="caption" style={{ color: activeFilterCount > 0 ? c.textOnAction : c.ink }}>
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters ▾"}
              </AppText>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
            {benchmarkOptions.map((b) => (
              <Chip
                key={b.id}
                label={b.label}
                selected={b.id === benchmark.id}
                onPress={() => {
                  setDistance(b.id);
                  setEdition("");
                  setPage(1);
                }}
              />
            ))}
          </ScrollView>
        </View>

        <View style={s.boardCard}>
          <View style={s.boardHeader}>
            <AppText role="heading" accessibilityRole="header">Leaderboard</AppText>
            {racePage ? (
              <AppText role="caption" secondary style={s.tabular}>
                {racePage.total.toLocaleString()} {query ? "matches" : "results"}
              </AppText>
            ) : null}
          </View>

          {raceBusy && rows.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator accessibilityLabel="Loading standings" />
            </View>
          ) : rows.length === 0 ? (
            <AppText role="body" secondary style={{ paddingVertical: 12 }}>
              {raceError ? "Leaderboard unavailable." : "No standings match the current filters."}
            </AppText>
          ) : (
            <View>
              {rows.map((row, idx) => (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${row.athlete_name}, ${raceClock(row.rank_time_ms)}`}
                  onPress={() => {
                    router.push({ pathname: "/race-result", params: { id: String(row.id) } });
                  }}
                  style={({ pressed }) => [
                    s.boardRow,
                    idx < rows.length - 1 && s.boardDivider,
                    pressed && { opacity: 0.78 },
                  ]}
                >
                  <AppText role="caption" secondary style={[s.placeCol, s.tabular]}>
                    {row.place}
                  </AppText>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText role="label" numberOfLines={1}>{row.athlete_name}</AppText>
                    <AppText role="caption" secondary numberOfLines={1}>{row.event_name} · {row.edition_year}</AppText>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}>
                    <AppText role="label" style={s.tabular}>{raceClock(row.rank_time_ms)}</AppText>
                    {row.percentile != null && <AppText role="caption" secondary>{racePercentileBadge(row.percentile)}</AppText>}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {racePage && racePage.total > racePage.pageSize ? (
            <View style={s.pagination}>
              <AppText role="caption" secondary>
                Page {racePage.page} of {Math.ceil(racePage.total / racePage.pageSize).toLocaleString()}
              </AppText>
              <View style={f.chipRow}>
                {racePage.page > 1 ? (
                  <FocusButton label="Previous" secondary onPress={() => setPage(racePage.page - 1)} />
                ) : null}
                {racePage.page * racePage.pageSize < racePage.total ? (
                  <FocusButton label="Next" secondary onPress={() => setPage(racePage.page + 1)} />
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <View style={s.utilityLinks}>
          <FocusButton label="Saved results" secondary onPress={() => router.push("/saved-race-results")} />
          <FocusButton label="Browse events" secondary onPress={() => router.push("/race-coverage")} />
          {edition ? (
            <FocusButton
              label="Compare edition years"
              secondary
              onPress={() => router.push({ pathname: "/race-edition-history", params: { edition, distance: raceSlug, sex } })}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Sub-Filters Sheet */}
      <FocusSheet open={filtersOpen} title="Standings filters" onClose={() => setFiltersOpen(false)}>
        <View style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <AppText role="label">Category</AppText>
            <ChipRow>
              {RACE_CATEGORY_FILTERS.map((cat) => (
                <Chip
                  key={cat.value}
                  label={cat.label}
                  selected={sex === cat.value}
                  onPress={() => { setSex(cat.value); setPage(1); }}
                />
              ))}
            </ChipRow>
          </View>

          <View style={{ gap: 8 }}>
            <AppText role="label">Percentile cutoff</AppText>
            <ChipRow>
              {RACE_PERCENTILE_FILTERS.map((p) => (
                <Chip
                  key={p.value}
                  label={p.label.split(" (")[0]!}
                  selected={percentile === p.value}
                  onPress={() => { setPercentile(p.value); setPage(1); }}
                />
              ))}
            </ChipRow>
          </View>

          {editions.length > 0 ? (
            <View style={{ gap: 8 }}>
              <AppText role="label">Event edition</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
                <Chip label="All events" selected={!edition} onPress={() => { setEdition(""); setPage(1); }} />
                {editions.map((e) => (
                  <Chip
                    key={e.edition_id}
                    label={`${e.event_name} · ${e.edition_year}`}
                    selected={edition === String(e.edition_id)}
                    onPress={() => { setEdition(String(e.edition_id)); setPage(1); }}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <AppText role="label">Timeframe</AppText>
            <ChipRow>
              {RACE_TIMEFRAMES.map((t) => (
                <Chip
                  key={t.value}
                  label={t.label}
                  selected={draftTimeframe === t.value}
                  onPress={() => { setDraftTimeframe(t.value); setValidation(""); }}
                />
              ))}
            </ChipRow>
            {draftTimeframe === "year" ? (
              <TextInput
                accessibilityLabel="Edition year"
                value={draftYear}
                onChangeText={setDraftYear}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="Edition year (e.g. 2025)"
                style={f.input}
              />
            ) : null}
            {draftTimeframe === "custom" ? (
              <View style={{ gap: 8 }}>
                <TextInput
                  accessibilityLabel="Start event date in YYYY-MM-DD format"
                  placeholder="From · YYYY-MM-DD"
                  value={draftFrom}
                  onChangeText={setDraftFrom}
                  maxLength={10}
                  style={f.input}
                />
                <TextInput
                  accessibilityLabel="End event date in YYYY-MM-DD format"
                  placeholder="Through · YYYY-MM-DD"
                  value={draftThrough}
                  onChangeText={setDraftThrough}
                  maxLength={10}
                  style={f.input}
                />
              </View>
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            <AppText role="label">Athlete or bib</AppText>
            <SearchField
              accessibilityLabel="Athlete name or bib"
              value={draftQuery}
              maxLength={100}
              onChangeText={setDraftQuery}
              onSubmitEditing={applySubFilters}
              placeholder="Search athlete or bib"
            />
          </View>

          {validation ? <AppText role="caption" style={{ color: c.statusError }}>{validation}</AppText> : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <FocusButton label="Reset" secondary onPress={clearSubFilters} />
            </View>
            <View style={{ flex: 1 }}>
              <FocusButton label="Apply filters" onPress={applySubFilters} />
            </View>
          </View>
        </View>
      </FocusSheet>

    </SafeAreaView>
  );
}

export default function Benchmarks() {
  return <AllTimeStandingsScreen />;
}

const sThemes = createThemedStyles((c) => ({
  content: {
    padding: 16,
    paddingTop: 8,
    gap: 14,
    paddingBottom: 40,
  },
  filterBar: {
    gap: 8,
  },
  chipScroll: {
    gap: 8,
    alignItems: "center",
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
  },
  filterBtnActive: {
    backgroundColor: c.tennis,
    borderColor: c.tennis,
  },
  boardCard: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    gap: 10,
  },
  boardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  boardDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  placeCol: {
    width: 34,
  },
  pagination: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 12,
  },
  utilityLinks: {
    gap: 10,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
}));

import {
  ANALYTICS_DOMAIN_SPECS,
  ANALYTICS_LAYOUT_MODES,
  ANALYTICS_SCENARIO_IDS,
  ANALYTICS_TIME_LENSES,
  MOBILE_LAYOUT_SPECS,
  buildAnalyticsLabModel,
  formatMinutesAsHoursMins,
  type AnalyticsConceptIndex,
  type AnalyticsDomainId,
  type AnalyticsLabModel,
  type AnalyticsLayoutMode,
  type AnalyticsScenarioId,
  type AnalyticsTimeLens,
  type VitalId,
  type VitalMetricModel,
} from "@fitness-battle/shared";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { SHELL_COLORS as c, fonts, mobileSurfaces } from "../theme";
import { ChartScrubber } from "../ui/chart-scrubber";
import { f } from "../ui/focus";
import { ScreenHeader } from "../ui/screen-header";

type ConceptSelection = AnalyticsConceptIndex | "all";

const SCENARIO_LABELS: Record<AnalyticsScenarioId, string> = {
  peak_build: "Peak Build",
  overreaching: "Overreaching",
  sparse_new: "New / Sparse",
};

const LENS_LABELS: Record<AnalyticsTimeLens, string> = {
  point: "1-Point",
  "7d": "7D",
  "30d": "30D",
  "90d": "90D",
  all: "All-Time",
};

function statusColors(status: "optimal" | "normal" | "caution") {
  if (status === "optimal") {
    return { bg: c.statusSuccessSoft, fg: c.statusSuccess, dot: c.statusSuccess };
  }
  if (status === "caution") {
    return { bg: "#fdecec", fg: c.statusError, dot: c.statusError };
  }
  return { bg: c.soft, fg: c.fieldTeal, dot: c.fieldTeal };
}

export default function HealthAnalyticsLab({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState<AnalyticsDomainId>("market");
  const [concept, setConcept] = useState<ConceptSelection>("all");
  const [timeLens, setTimeLens] = useState<AnalyticsTimeLens>("30d");
  const [layoutMode, setLayoutMode] = useState<AnalyticsLayoutMode>("focus_stack");
  const [scenario, setScenario] = useState<AnalyticsScenarioId>("peak_build");
  const [selectedVitalId, setSelectedVitalId] = useState<VitalId>("hrv");
  const [activeSubpage, setActiveSubpage] = useState<AnalyticsDomainId | null>(null);
  const [drillDownMode, setDrillDownMode] = useState<"subpage" | "inline">("subpage");
  const [selectedNightId, setSelectedNightId] = useState<string | null>(null);

  const model = useMemo(
    () => buildAnalyticsLabModel(scenario, timeLens),
    [scenario, timeLens],
  );

  const domainSpec = useMemo(
    () => ANALYTICS_DOMAIN_SPECS.find((d) => d.id === domain) ?? ANALYTICS_DOMAIN_SPECS[0]!,
    [domain],
  );

  const layoutSpec = useMemo(
    () => MOBILE_LAYOUT_SPECS.find((l) => l.id === layoutMode) ?? MOBILE_LAYOUT_SPECS[0]!,
    [layoutMode],
  );

  const visibleConcepts: AnalyticsConceptIndex[] =
    concept === "all" ? [0, 1, 2] : [concept];

  const selectedVital =
    model.vitals.metrics.find((m) => m.id === selectedVitalId) ??
    model.vitals.metrics[0]!;

  const subpageDomainSpec = activeSubpage
    ? ANALYTICS_DOMAIN_SPECS.find((d) => d.id === activeSubpage) ?? domainSpec
    : domainSpec;

  const content = (
    <View style={{ gap: 18 }}>
      {/* Pinned Telemetry Ribbon when in terminal_ribbon layout */}
      {layoutMode === "terminal_ribbon" ? (
        <TelemetryRibbonBar
          model={model}
          onSelectDomain={(d) => setDomain(d)}
        />
      ) : null}

      {/* Top Architecture & Scenario Controls */}
      <View style={[f.card, s.controlDeck]}>
        <View style={s.betweenRow}>
          <Text style={f.kicker}>Mobile Native UI Layout</Text>
          <Text style={s.badgeText}>{layoutSpec.label}</Text>
        </View>
        <View style={s.segmentWrap} accessibilityRole="tablist">
          {ANALYTICS_LAYOUT_MODES.map((id) => {
            const spec = MOBILE_LAYOUT_SPECS.find((item) => item.id === id)!;
            const active = layoutMode === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Layout ${spec.label}`}
                onPress={() => setLayoutMode(id)}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
              >
                <Text style={[s.segmentLabel, active && s.segmentLabelActive]}>
                  {spec.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={f.small}>
          {layoutSpec.subtitle} · {layoutSpec.strengths}.
        </Text>

        <View style={s.divider} />

        {/* Data Category Horizontal Selector */}
        <Text style={f.kicker}>1 · Data Category (6 Domains)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.chipRow}>
            {ANALYTICS_DOMAIN_SPECS.map((d) => {
              const active = d.id === domain;
              return (
                <Pressable
                  key={d.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Category ${d.label}`}
                  onPress={() => setDomain(d.id)}
                  style={[f.chip, active && f.chipActive]}
                >
                  <Text
                    style={[
                      f.small,
                      {
                        fontFamily: active ? fonts.bodyBold : fonts.bodyMedium,
                        color: c.ink,
                      },
                    ]}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* 1-Point vs Historical Time Horizon */}
        <View style={s.betweenRow}>
          <Text style={f.kicker}>2 · 1-Point vs. Trend Horizon</Text>
          <Text style={f.small}>{model.windowLabel}</Text>
        </View>
        <View style={s.segmentWrap}>
          {ANALYTICS_TIME_LENSES.map((lens) => {
            const active = timeLens === lens;
            return (
              <Pressable
                key={lens}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Horizon ${LENS_LABELS[lens]}`}
                onPress={() => setTimeLens(lens)}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
              >
                <Text style={[s.segmentLabel, active && s.segmentLabelActive]}>
                  {LENS_LABELS[lens]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Concept Selector (2-3 Concepts per Data Type + Compare All) */}
        <View style={s.betweenRow}>
          <Text style={f.kicker}>3 · Visual Concept</Text>
          <View style={s.chipRow}>
            {ANALYTICS_SCENARIO_IDS.map((sc) => {
              const active = scenario === sc;
              return (
                <Pressable
                  key={sc}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Scenario ${SCENARIO_LABELS[sc]}`}
                  onPress={() => setScenario(sc)}
                  style={[
                    s.miniPill,
                    active && { backgroundColor: c.ink, borderColor: c.ink },
                  ]}
                >
                  <Text
                    style={[
                      s.miniPillText,
                      active && { color: c.card },
                    ]}
                  >
                    {SCENARIO_LABELS[sc]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={s.segmentWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: concept === "all" }}
            accessibilityLabel="Show all 3 concepts"
            onPress={() => setConcept("all")}
            style={[s.segmentBtn, concept === "all" && s.segmentBtnActive]}
          >
            <Text
              style={[
                s.segmentLabel,
                concept === "all" && s.segmentLabelActive,
              ]}
            >
              All 3
            </Text>
          </Pressable>
          {domainSpec.concepts.map((spec) => {
            const active = concept === spec.index;
            return (
              <Pressable
                key={spec.index}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Concept ${spec.index + 1}: ${spec.shortTitle}`}
                onPress={() => setConcept(spec.index)}
                style={[s.segmentBtn, active && s.segmentBtnActive]}
              >
                <Text style={[s.segmentLabel, active && s.segmentLabelActive]}>
                  {spec.shortTitle}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Bento Matrix Overview when in bento_matrix layout */}
      {layoutMode === "bento_matrix" && (activeSubpage === null || drillDownMode === "inline") ? (
        <BentoOverviewGrid
          model={model}
          activeDomain={domain}
          drillDownMode={drillDownMode}
          onToggleDrillDownMode={setDrillDownMode}
          onSelectDomain={(d) => {
            setDomain(d);
            if (drillDownMode === "subpage") {
              setActiveSubpage(d);
            }
          }}
          selectedVitalId={selectedVitalId}
          onSelectVital={(v) => {
            setSelectedVitalId(v);
            setDomain("vitals");
            if (drillDownMode === "subpage") {
              setActiveSubpage("vitals");
            }
          }}
        />
      ) : null}

      {/* Bento Subpage Drill-Down View (Locked Directions) */}
      {layoutMode === "bento_matrix" && activeSubpage !== null && drillDownMode === "subpage" ? (
        <View style={{ gap: 14 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Bento Overview"
            onPress={() => setActiveSubpage(null)}
            style={s.backSubpageBtn}
          >
            <Text style={s.backSubpageText}>← Back to Bento Dashboard</Text>
          </Pressable>

          <View style={f.section}>
            <Text style={f.kicker}>{subpageDomainSpec.kicker}</Text>
            <Text style={f.h2}>{subpageDomainSpec.headline}</Text>
            <Text style={f.copy}>{subpageDomainSpec.summary}</Text>
          </View>

          {activeSubpage === "market" ? (
            <View style={f.card}>
              <View style={s.betweenRow}>
                <Text style={f.kicker}>Locked Direction · Equity Curve ($ATHL)</Text>
                <View style={s.modeTag}>
                  <Text style={s.modeTagText}>{timeLens === "point" ? "1-Point" : `${LENS_LABELS[timeLens]} Trend`}</Text>
                </View>
              </View>
              <Text style={f.rowTitle}>Net Athlete Equity & Moving Average Ribbon</Text>
              <Text style={f.small}>Effort score treated like an asset class with 4W/12W crossovers & drawdown floor.</Text>
              <View style={{ marginVertical: 10 }}>
                <MarketConceptRenderer conceptIndex={0} model={model} timeLens={timeLens} />
              </View>
            </View>
          ) : null}

          {activeSubpage === "vitals" ? (
            <View style={{ gap: 14 }}>
              <View style={f.card}>
                <View style={s.betweenRow}>
                  <Text style={f.kicker}>Locked Direction · Personal Baseline Corridor</Text>
                  <View style={s.modeTag}>
                    <Text style={s.modeTagText}>{timeLens === "point" ? "1-Point" : `${LENS_LABELS[timeLens]} Trend`}</Text>
                  </View>
                </View>
                <Text style={f.rowTitle}>60-Day Normal Corridor Tunnel (±1σ)</Text>
                <Text style={f.small}>Daily reading nodes + 7-day rolling curve anchored to personal baseline.</Text>
                <View style={{ marginVertical: 10 }}>
                  <VitalsConceptRenderer
                    conceptIndex={0}
                    model={model}
                    timeLens={timeLens}
                    selectedVital={selectedVital}
                    onSelectVital={setSelectedVitalId}
                  />
                </View>
              </View>

              <View style={f.card}>
                <Text style={f.kicker}>All 6 Vitals Overview Matrix</Text>
                <Text style={f.small}>Tap any vital below to update the baseline corridor above.</Text>
                <View style={{ marginVertical: 10 }}>
                  <VitalsConceptRenderer
                    conceptIndex={1}
                    model={model}
                    timeLens={timeLens}
                    selectedVital={selectedVital}
                    onSelectVital={setSelectedVitalId}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {activeSubpage === "sleep" ? (
            <View style={{ gap: 14 }}>
              <View style={f.card}>
                <View style={s.betweenRow}>
                  <Text style={f.kicker}>Locked Direction · Circadian Bedtime Window & Debt</Text>
                  <View style={s.modeTag}>
                    <Text style={s.modeTagText}>Tap any night below</Text>
                  </View>
                </View>
                <Text style={f.rowTitle}>Bedtime-to-Wake Regularity & Cumulative Sleep Debt</Text>
                <Text style={f.small}>Tap or scrub any night below to inspect its exact stage composition.</Text>
                <View style={{ marginVertical: 10 }}>
                  <SleepConceptRenderer
                    conceptIndex={2}
                    model={model}
                    timeLens={timeLens}
                    selectedNightId={selectedNightId}
                    onSelectNight={setSelectedNightId}
                  />
                </View>
              </View>

              <View style={f.card}>
                <View style={s.betweenRow}>
                  <Text style={f.kicker}>Nightly Stage Ribbon (Unpacked for Selected Night)</Text>
                  <Text style={f.small}>{selectedNightId ? `Night: ${selectedNightId}` : "Latest Night"}</Text>
                </View>
                <Text style={f.rowTitle}>Deep SWS · REM · Light · Awake Breakdown</Text>
                <Text style={f.small}>Restorative percentage and sleep efficiency.</Text>
                <View style={{ marginVertical: 10 }}>
                  <SleepConceptRenderer
                    conceptIndex={0}
                    model={model}
                    timeLens={timeLens}
                    selectedNightId={selectedNightId}
                    onSelectNight={setSelectedNightId}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {activeSubpage === "load" ? (
            <View style={{ gap: 14 }}>
              <View style={f.card}>
                <View style={s.betweenRow}>
                  <Text style={f.kicker}>Locked Direction · ACWR Workload Ratio</Text>
                  <View style={s.modeTag}>
                    <Text style={s.modeTagText}>{timeLens === "point" ? "1-Point" : `${LENS_LABELS[timeLens]} Trend`}</Text>
                  </View>
                </View>
                <Text style={f.rowTitle}>Acute:Chronic Workload Ratio & Sweet Spot</Text>
                <Text style={f.small}>7-day fatigue vs 28-day capacity with optimal 0.8–1.3x ramp corridor.</Text>
                <View style={{ marginVertical: 10 }}>
                  <LoadConceptRenderer conceptIndex={1} model={model} timeLens={timeLens} />
                </View>
              </View>

              <View style={f.card}>
                <Text style={f.kicker}>Cumulative Period Burn-Up vs Past-Self Ghost</Text>
                <Text style={f.small}>Day-by-day climb raced against your prior week trajectory.</Text>
                <View style={{ marginVertical: 10 }}>
                  <LoadConceptRenderer conceptIndex={0} model={model} timeLens={timeLens} />
                </View>
              </View>
            </View>
          ) : null}

          {activeSubpage === "performance" ? (
            <View style={{ gap: 14 }}>
              <View style={f.card}>
                <Text style={f.kicker}>1 · Rolling Adaptation Trend</Text>
                <Text style={f.rowTitle}>Pace-at-HR Aerobic Efficiency Factor (EF)</Text>
                <Text style={f.small}>Speed (m/min) per heartbeat (bpm) proving cardiovascular engine growth.</Text>
                <View style={{ marginVertical: 10 }}>
                  <PerformanceConceptRenderer conceptIndex={0} model={model} timeLens={timeLens} />
                </View>
              </View>

              <View style={f.card}>
                <Text style={f.kicker}>2 · Session Intensity Discipline</Text>
                <Text style={f.rowTitle}>5-Zone HR Distribution & 80/20 Polarization</Text>
                <Text style={f.small}>Base training (Z1–Z2) vs Gray Zone (Z3) vs Threshold/VO2 (Z4–Z5).</Text>
                <View style={{ marginVertical: 10 }}>
                  <PerformanceConceptRenderer conceptIndex={1} model={model} timeLens={timeLens} />
                </View>
              </View>

              <View style={f.card}>
                <Text style={f.kicker}>3 · All-Time Benchmarks</Text>
                <Text style={f.rowTitle}>Personal Record Staircase & Critical Pace Curve</Text>
                <Text style={f.small}>Qualifying session PR receipts across standard race distances.</Text>
                <View style={{ marginVertical: 10 }}>
                  <PerformanceConceptRenderer conceptIndex={2} model={model} timeLens={timeLens} />
                </View>
              </View>
            </View>
          ) : null}

          {activeSubpage === "combined" ? (
            <View style={{ gap: 14 }}>
              <View style={f.card}>
                <Text style={f.kicker}>1 · Cause & Effect Lag-1 Response</Text>
                <Text style={f.rowTitle}>Daily Training Strain Bars × Next-Morning Readiness Line</Text>
                <Text style={f.small}>Shows how hard workouts dip overnight recovery and trigger supercompensation rebounds.</Text>
                <View style={{ marginVertical: 10 }}>
                  <CombinedConceptRenderer conceptIndex={0} model={model} timeLens={timeLens} />
                </View>
              </View>

              <View style={f.card}>
                <Text style={f.kicker}>2 · Executive Synthesis</Text>
                <Text style={f.rowTitle}>1-Point Morning Readiness Brief vs Telemetry Lab</Text>
                <Text style={f.small}>Actionable morning prescription card derived from readiness, load, and equity.</Text>
                <View style={{ marginVertical: 10 }}>
                  <CombinedConceptRenderer conceptIndex={2} model={model} timeLens={timeLens} />
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Domain Context Banner (when not in subpage mode) */}
      {(layoutMode !== "bento_matrix" || activeSubpage === null || drillDownMode === "inline") && (
      <>
      <View style={f.section}>
        <Text style={f.kicker}>{domainSpec.kicker}</Text>
        <Text style={f.h2}>{domainSpec.headline}</Text>
        <Text style={f.copy}>{domainSpec.summary}</Text>
        <View style={s.chipRow}>
          {domainSpec.sources.map((src) => (
            <View key={src} style={s.sourceBadge}>
              <Text style={s.sourceBadgeText}>{src}</Text>
            </View>
          ))}
        </View>
        <View style={s.ruleCallout}>
          <Text style={s.ruleCalloutTitle}>Isolated vs. Combined Rule</Text>
          <Text style={f.small}>{domainSpec.CombineRule}</Text>
        </View>
      </View>

      {/* Render Selected Domain Concepts */}
      {visibleConcepts.map((conceptIdx) => {
        const spec = domainSpec.concepts[conceptIdx]!;
        return (
          <View key={`${domain}-concept-${conceptIdx}`} style={f.card}>
            <View style={s.betweenRow}>
              <Text style={f.kicker}>{spec.title}</Text>
              <View style={s.modeTag}>
                <Text style={s.modeTagText}>
                  {timeLens === "point" ? "1-Point View" : `${LENS_LABELS[timeLens]} Trend`}
                </Text>
              </View>
            </View>
            <Text style={f.rowTitle}>{spec.subtitle}</Text>
            <Text style={f.small}>Best for: {spec.bestFor}</Text>

            <View style={{ marginVertical: 10 }}>
              {domain === "market" ? (
                <MarketConceptRenderer
                  conceptIndex={conceptIdx}
                  model={model}
                  timeLens={timeLens}
                />
              ) : null}
              {domain === "vitals" ? (
                <VitalsConceptRenderer
                  conceptIndex={conceptIdx}
                  model={model}
                  timeLens={timeLens}
                  selectedVital={selectedVital}
                  onSelectVital={setSelectedVitalId}
                />
              ) : null}
              {domain === "sleep" ? (
                <SleepConceptRenderer
                  conceptIndex={conceptIdx}
                  model={model}
                  timeLens={timeLens}
                  selectedNightId={selectedNightId}
                  onSelectNight={setSelectedNightId}
                />
              ) : null}
              {domain === "load" ? (
                <LoadConceptRenderer
                  conceptIndex={conceptIdx}
                  model={model}
                  timeLens={timeLens}
                />
              ) : null}
              {domain === "performance" ? (
                <PerformanceConceptRenderer
                  conceptIndex={conceptIdx}
                  model={model}
                  timeLens={timeLens}
                />
              ) : null}
              {domain === "combined" ? (
                <CombinedConceptRenderer
                  conceptIndex={conceptIdx}
                  model={model}
                  timeLens={timeLens}
                />
              ) : null}
            </View>

            <View style={s.metaFooter}>
              <Text style={s.metaFooterLabel}>Encoding: {spec.encoding}</Text>
              <Text style={f.small}>{spec.pointVsTrendBehavior}</Text>
            </View>
          </View>
        );
      })}
      </>
      )}
    </View>
  );

  if (embedded) {
    return content;
  }

  return (
    <SafeAreaView style={f.safe} edges={["top", "bottom"]}>
      <ScreenHeader
        title="Health & Athlete Analytics Lab"
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/you"))}
      />
      <ScrollView contentContainerStyle={[f.content, { paddingTop: 4 }]}>
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ============================================================================
 * LAYOUT 2 & 3 CHROME: TELEMETRY RIBBON & BENTO MATRIX
 * ========================================================================== */

function TelemetryRibbonBar({
  model,
  onSelectDomain,
}: {
  model: AnalyticsLabModel;
  onSelectDomain: (d: AnalyticsDomainId) => void;
}) {
  const m = model.market;
  const hrv = model.vitals.metrics.find((v) => v.id === "hrv")!;
  const rhr = model.vitals.metrics.find((v) => v.id === "rhr")!;
  const pos = m.periodReturnPts >= 0;
  return (
    <View style={s.ribbonBar} accessibilityLabel="Live athlete telemetry ticker">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable onPress={() => onSelectDomain("market")} style={s.tickerItem}>
            <Text style={s.tickerSymbol}>{m.tickerSymbol}</Text>
            <Text style={s.tickerValue}>{m.currentIndex.toLocaleString()}</Text>
            <Text
              style={[
                s.tickerDelta,
                { color: pos ? "#4ade80" : "#f87171" },
              ]}
            >
              {pos ? "▲" : "▼"} {pos ? "+" : ""}
              {m.periodReturnPct}%
            </Text>
          </Pressable>
          <View style={s.tickerSep} />
          <Pressable onPress={() => onSelectDomain("vitals")} style={s.tickerItem}>
            <Text style={s.tickerSymbol}>HRV</Text>
            <Text style={s.tickerValue}>{hrv.formattedCurrent}</Text>
            <Text style={s.tickerSub}>{hrv.statusLabel}</Text>
          </Pressable>
          <View style={s.tickerSep} />
          <Pressable onPress={() => onSelectDomain("vitals")} style={s.tickerItem}>
            <Text style={s.tickerSymbol}>RHR</Text>
            <Text style={s.tickerValue}>{rhr.formattedCurrent}</Text>
            <Text style={s.tickerSub}>60D {rhr.baselineMean}b</Text>
          </Pressable>
          <View style={s.tickerSep} />
          <Pressable onPress={() => onSelectDomain("sleep")} style={s.tickerItem}>
            <Text style={s.tickerSymbol}>SLEEP</Text>
            <Text style={s.tickerValue}>{model.sleep.lastNight.score}</Text>
            <Text style={s.tickerSub}>
              {formatMinutesAsHoursMins(model.sleep.lastNight.durationMin)}
            </Text>
          </Pressable>
          <View style={s.tickerSep} />
          <Pressable onPress={() => onSelectDomain("load")} style={s.tickerItem}>
            <Text style={s.tickerSymbol}>ACWR</Text>
            <Text style={s.tickerValue}>{model.load.acwrCurrent}x</Text>
            <Text style={s.tickerSub}>{model.load.acuteHours7d}h / wk</Text>
          </Pressable>
          <View style={s.tickerSep} />
          <Pressable onPress={() => onSelectDomain("performance")} style={s.tickerItem}>
            <Text style={s.tickerSymbol}>AERO EF</Text>
            <Text style={s.tickerValue}>{model.performance.efCurrent}</Text>
            <Text style={[s.tickerDelta, { color: "#f7c948" }]}>
              +{model.performance.efDeltaPct}%
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function BentoOverviewGrid({
  model,
  activeDomain,
  drillDownMode = "subpage",
  onToggleDrillDownMode,
  onSelectDomain,
  selectedVitalId,
  onSelectVital,
}: {
  model: AnalyticsLabModel;
  activeDomain: AnalyticsDomainId;
  drillDownMode?: "subpage" | "inline";
  onToggleDrillDownMode?: (m: "subpage" | "inline") => void;
  onSelectDomain: (d: AnalyticsDomainId) => void;
  selectedVitalId: VitalId;
  onSelectVital: (v: VitalId) => void;
}) {
  const tiles: {
    id: string;
    domain: AnalyticsDomainId;
    vitalId?: VitalId;
    kicker: string;
    value: string;
    delta: string;
    points: number[];
    accent: string;
  }[] = [
    {
      id: "bento-market",
      domain: "market",
      kicker: "ATHLETE EQUITY ($ATHL)",
      value: model.market.currentIndex.toLocaleString(),
      delta: `+${model.market.allTimeReturnPct}% all-time`,
      points: model.market.equitySeries.map((p) => p.nav),
      accent: c.fieldTeal,
    },
    {
      id: "bento-hrv",
      domain: "vitals",
      vitalId: "hrv",
      kicker: "OVERNIGHT HRV",
      value: model.vitals.metrics[0]!.formattedCurrent,
      delta: model.vitals.metrics[0]!.statusLabel,
      points: model.vitals.metrics[0]!.series.map((p) => p.value),
      accent: c.statusSuccess,
    },
    {
      id: "bento-sleep",
      domain: "sleep",
      kicker: "SLEEP ARCHITECTURE",
      value: `${model.sleep.lastNight.score} pts`,
      delta: `${model.sleep.lastNight.restorativePct}% Deep+REM`,
      points: model.sleep.nights.map((n) => n.score),
      accent: c.ink,
    },
    {
      id: "bento-load",
      domain: "load",
      kicker: "WORKLOAD RATIO (ACWR)",
      value: `${model.load.acwrCurrent}x`,
      delta: model.load.acwrStatusLabel,
      points: model.load.series.map((l) => l.acuteLoad),
      accent: model.load.acwrCurrent > 1.3 ? c.statusError : c.fieldTeal,
    },
    {
      id: "bento-perf",
      domain: "performance",
      kicker: "AEROBIC EFFICIENCY",
      value: `${model.performance.efCurrent}`,
      delta: `+${model.performance.efDeltaPct}% pace/HR`,
      points: model.performance.series.map((p) => p.efficiencyFactor),
      accent: c.statusSuccess,
    },
    {
      id: "bento-combined",
      domain: "combined",
      kicker: "READINESS COMPOSITE",
      value: `${model.vitals.readinessComposite}%`,
      delta: `Ceiling ${model.combined.optimalStrainCeiling} strain`,
      points: model.combined.series.map((p) => p.nextDayReadiness),
      accent: c.tennis,
    },
  ];

  return (
    <View style={{ gap: 10 }}>
      <View style={s.betweenRow}>
        <Text style={f.kicker}>Bento Matrix · Tap any tile to inspect</Text>
        {onToggleDrillDownMode ? (
          <View style={s.segmentWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: drillDownMode === "subpage" }}
              accessibilityLabel="Bento mode nested subpage"
              onPress={() => onToggleDrillDownMode("subpage")}
              style={[s.segmentBtn, drillDownMode === "subpage" && s.segmentBtnActive]}
            >
              <Text style={[s.segmentLabel, drillDownMode === "subpage" && s.segmentLabelActive]}>
                Nested Subpage
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: drillDownMode === "inline" }}
              accessibilityLabel="Bento mode inline inspector"
              onPress={() => onToggleDrillDownMode("inline")}
              style={[s.segmentBtn, drillDownMode === "inline" && s.segmentBtnActive]}
            >
              <Text style={[s.segmentLabel, drillDownMode === "inline" && s.segmentLabelActive]}>
                Inline
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      <View style={s.bentoGrid}>
        {tiles.map((t) => {
          const selected =
            activeDomain === t.domain &&
            (!t.vitalId || selectedVitalId === t.vitalId);
          return (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${t.kicker}, ${t.value}, ${t.delta}`}
              onPress={() => {
                if (t.vitalId) onSelectVital(t.vitalId);
                else onSelectDomain(t.domain);
              }}
              style={[
                s.bentoTile,
                selected && { borderColor: c.ink, borderWidth: 2 },
              ]}
            >
              <Text style={s.bentoKicker}>{t.kicker}</Text>
              <View style={s.betweenRow}>
                <Text style={s.bentoValue}>{t.value}</Text>
                <MiniSparkline values={t.points} stroke={t.accent} />
              </View>
              <Text style={f.small} numberOfLines={1}>
                {t.delta}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.pointBox}>
        <Text style={[f.small, { fontFamily: fonts.bodyBold, color: c.fieldTeal }]}>
          Locked Directions Active
        </Text>
        <Text style={f.small}>
          Tapping a card opens its dedicated nested page:
          {"\n"}• Market: Equity Curve + 4W/12W Ribbon
          {"\n"}• Vitals: Personal Baseline Corridor (±1σ) + 6-Vital Matrix
          {"\n"}• Sleep: Circadian Window & Debt + Interactive Night Stage Ribbon
          {"\n"}• Workload: ACWR 0.8–1.3x sweet-spot dial + Ghost Burn-Up
          {"\n"}• Cardio & Pace: Aerobic Efficiency Trend + Session HR Polarization + PRs
          {"\n"}• Multi-Metric: Strain × Recovery + 1-Point Morning Brief
        </Text>
      </View>
    </View>
  );
}

function MiniSparkline({
  values,
  stroke,
}: {
  values: number[];
  stroke: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.001, max - min);
  const w = 58;
  const h = 24;
  const pts = values
    .map((v, idx) => {
      const x = (idx / (values.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ============================================================================
 * DOMAIN 1: ATHLETE MARKET ("HEALTH AS A STOCK MARKET")
 * ========================================================================== */

function MarketConceptRenderer({
  conceptIndex,
  model,
  timeLens,
}: {
  conceptIndex: AnalyticsConceptIndex;
  model: AnalyticsLabModel;
  timeLens: AnalyticsTimeLens;
}) {
  const m = model.market;
  const series = m.equitySeries;
  const candles = m.candles;

  if (conceptIndex === 0) {
    // Concept A: Net Athlete Equity & Moving Average Ribbon
    if (timeLens === "point") {
      const latest = series.at(-1)!;
      const spread = latest.nav - latest.ema12;
      return (
        <View style={s.pointBox}>
          <View style={s.betweenRow}>
            <View>
              <Text style={f.small}>{m.tickerSymbol} · Net Athlete Index</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={s.heroNumber}>{m.currentIndex.toLocaleString()}</Text>
                <View style={s.returnPillPositive}>
                  <Text style={s.returnPillText}>
                    +{m.allTimeReturnPts} (+{m.allTimeReturnPct}% All-Time)
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={s.kpiGrid}>
            <View style={s.kpiCell}>
              <Text style={f.small}>4W Fast Avg (SMA)</Text>
              <Text style={f.rowTitle}>{latest.sma4} pts</Text>
            </View>
            <View style={s.kpiCell}>
              <Text style={f.small}>12W Baseline (EMA)</Text>
              <Text style={f.rowTitle}>{latest.ema12} pts</Text>
            </View>
            <View style={s.kpiCell}>
              <Text style={f.small}>Momentum Spread</Text>
              <Text style={[f.rowTitle, { color: spread >= 0 ? c.statusSuccess : c.statusError }]}>
                {spread >= 0 ? "+" : ""}
                {spread} pts
              </Text>
            </View>
            <View style={s.kpiCell}>
              <Text style={f.small}>Wk Dividend Yield</Text>
              <Text style={f.rowTitle}>+{m.weeklyDividendPts} pts</Text>
            </View>
          </View>
          <Text style={f.small}>
            {m.goldenCrossActive
              ? "Golden Cross active: 4-week average is trading above your 12-week baseline."
              : "Consolidation phase: 4-week average dipped below 12-week trend."}
          </Text>
        </View>
      );
    }

    const allVals = series.flatMap((p) => [p.nav, p.sma4, p.ema12]);
    const minV = Math.min(...allVals) - 20;
    const maxV = Math.max(...allVals) + 20;
    const span = Math.max(1, maxV - minV);
    const W = 340;
    const H = 175;
    const L = 40;
    const R = 328;
    const T = 14;
    const B = 128;

    const toX = (i: number) =>
      L + (i / Math.max(1, series.length - 1)) * (R - L);
    const toY = (v: number) => B - ((v - minV) / span) * (B - T);

    const navPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.nav).toFixed(1)}`).join(" ");
    const smaPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.sma4).toFixed(1)}`).join(" ");
    const emaPoints = series.map((p, i) => `${toX(i).toFixed(1)},${toY(p.ema12).toFixed(1)}`).join(" ");
    const areaPoints = `${L},${B} ${navPoints} ${toX(series.length - 1).toFixed(1)},${B}`;

    return (
      <View style={{ gap: 10 }}>
        <View style={s.betweenRow}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Text style={s.heroNumber}>{m.currentIndex.toLocaleString()}</Text>
            <Text
              style={[
                f.rowTitle,
                { color: m.periodReturnPts >= 0 ? c.statusSuccess : c.statusError },
              ]}
            >
              {m.periodReturnPts >= 0 ? "▲ +" : "▼ "}
              {m.periodReturnPts} pts ({m.periodReturnPct >= 0 ? "+" : ""}
              {m.periodReturnPct}%)
            </Text>
          </View>
          <View style={s.returnPillPositive}>
            <Text style={s.returnPillText}>All-Time +{m.allTimeReturnPct}%</Text>
          </View>
        </View>

        <ChartScrubber
          label="Athlete Equity Index and moving averages"
          width={W}
          height={H}
          plotTop={T}
          plotBottom={B}
          points={series.map((p, i) => ({
            id: p.id,
            x: toX(i),
            y: toY(p.nav),
            label: `${p.label} · 4W SMA ${p.sma4} · 12W EMA ${p.ema12}`,
            value: `NAV ${p.nav.toLocaleString()} pts (+${p.dividendPts} div · ${p.drawdownPct}% dd)`,
          }))}
        >
          <Svg preserveAspectRatio="none" width="100%" height={180} viewBox={`0 0 ${W} ${H}`}>
            {[0, 0.5, 1].map((frac) => {
              const y = T + frac * (B - T);
              const val = Math.round(maxV - frac * span);
              return (
                <G key={frac}>
                  <Line
                    x1={L}
                    x2={R}
                    y1={y}
                    y2={y}
                    stroke={c.line}
                    strokeDasharray="3 3"
                  />
                  <SvgText
                    x={L - 6}
                    y={y + 3}
                    fontSize={9}
                    fill={c.muted}
                    textAnchor="end"
                  >
                    {val}
                  </SvgText>
                </G>
              );
            })}
            <Polygon points={areaPoints} fill={c.fieldTeal} opacity={0.14} />
            <Polyline
              points={emaPoints}
              fill="none"
              stroke={c.muted}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <Polyline
              points={smaPoints}
              fill="none"
              stroke={c.tennis}
              strokeWidth={2}
            />
            <Polyline
              points={navPoints}
              fill="none"
              stroke={c.fieldTeal}
              strokeWidth={2.75}
            />
            {/* Lower Drawdown Strip */}
            <Line x1={L} x2={R} y1={142} y2={142} stroke={c.line} />
            {series.map((p, i) => {
              const x = toX(i);
              const ddH = Math.min(18, Math.abs(p.drawdownPct) * 2.2);
              return (
                <Rect
                  key={p.id}
                  x={x - 5}
                  y={142}
                  width={10}
                  height={Math.max(1.5, ddH)}
                  rx={2}
                  fill={p.drawdownPct < -2 ? c.statusError : c.secondary}
                  opacity={0.65}
                />
              );
            })}
            <SvgText x={L} y={170} fontSize={9} fill={c.muted}>
              {series[0]?.label}
            </SvgText>
            <SvgText
              x={(L + R) / 2}
              y={170}
              fontSize={9}
              fill={c.muted}
              textAnchor="middle"
            >
              Drawdown Floor ({m.maxDrawdownPct}% max)
            </SvgText>
            <SvgText x={R} y={170} fontSize={9} fill={c.muted} textAnchor="end">
              {series.at(-1)?.label}
            </SvgText>
          </Svg>
        </ChartScrubber>

        <View style={s.legendRow}>
          <LegendDot color={c.fieldTeal} label="Net Index (NAV)" />
          <LegendDot color={c.tennis} label="4W SMA (Fast)" />
          <LegendDot color={c.muted} label="12W EMA (Base)" />
          <Text style={f.small}>Sharpe {m.sharpeEfficiency} · Win {m.winRatePct}%</Text>
        </View>
      </View>
    );
  }

  if (conceptIndex === 1) {
    // Concept B: Weekly OHLC Candlesticks & Moving-Time Volume
    const currentCandle = candles.at(-1)!;
    if (timeLens === "point") {
      return (
        <View style={s.pointBox}>
          <Text style={f.small}>
            {currentCandle.weekLabel} · Live Weekly Candle
          </Text>
          <View style={s.kpiGrid}>
            <View style={s.kpiCell}>
              <Text style={f.small}>Lock Open</Text>
              <Text style={f.rowTitle}>{currentCandle.open}</Text>
            </View>
            <View style={s.kpiCell}>
              <Text style={f.small}>Week High</Text>
              <Text style={[f.rowTitle, { color: c.statusSuccess }]}>
                {currentCandle.high}
              </Text>
            </View>
            <View style={s.kpiCell}>
              <Text style={f.small}>Decay Floor</Text>
              <Text style={[f.rowTitle, { color: c.statusError }]}>
                {currentCandle.low}
              </Text>
            </View>
            <View style={s.kpiCell}>
              <Text style={f.small}>Current Close</Text>
              <Text style={f.rowTitle}>{currentCandle.close}</Text>
            </View>
          </View>
          <Text style={f.small}>
            Volume logged: {currentCandle.volumeHours} hrs · Activity Dividends: +
            {currentCandle.dividendPts} pts
          </Text>
        </View>
      );
    }

    const minLow = Math.min(...candles.map((d) => d.low)) - 15;
    const maxHigh = Math.max(...candles.map((d) => d.high)) + 15;
    const span = Math.max(1, maxHigh - minLow);
    const maxVol = Math.max(1, ...candles.map((d) => d.volumeHours));
    const W = 340;
    const H = 185;
    const L = 40;
    const R = 328;
    const T = 12;
    const B = 124;

    const toX = (i: number) =>
      L + ((i + 0.5) / Math.max(1, candles.length)) * (R - L);
    const toY = (v: number) => B - ((v - minLow) / span) * (B - T);

    return (
      <View style={{ gap: 8 }}>
        <ChartScrubber
          label="Weekly OHLC Effort Candlesticks and Volume"
          width={W}
          height={H}
          plotTop={T}
          plotBottom={B}
          points={candles.map((cd, i) => ({
            id: cd.id,
            x: toX(i),
            y: toY(cd.close),
            label: `${cd.weekLabel} · Vol ${cd.volumeHours}h · Div +${cd.dividendPts} pts`,
            value: `O ${cd.open} · H ${cd.high} · L ${cd.low} · C ${cd.close} (${cd.close >= cd.open ? "+" : ""}${cd.close - cd.open})`,
          }))}
        >
          <Svg preserveAspectRatio="none" width="100%" height={185} viewBox={`0 0 ${W} ${H}`}>
            {[0, 0.5, 1].map((frac) => {
              const y = T + frac * (B - T);
              const val = Math.round(maxHigh - frac * span);
              return (
                <G key={frac}>
                  <Line
                    x1={L}
                    x2={R}
                    y1={y}
                    y2={y}
                    stroke={c.line}
                    strokeDasharray="3 3"
                  />
                  <SvgText
                    x={L - 6}
                    y={y + 3}
                    fontSize={9}
                    fill={c.muted}
                    textAnchor="end"
                  >
                    {val}
                  </SvgText>
                </G>
              );
            })}
            {candles.map((cd, i) => {
              const x = toX(i);
              const yHigh = toY(cd.high);
              const yLow = toY(cd.low);
              const yOpen = toY(cd.open);
              const yClose = toY(cd.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));
              const color = cd.gain ? c.statusSuccess : c.statusError;
              const volH = (cd.volumeHours / maxVol) * 32;
              return (
                <G key={cd.id}>
                  {/* Wick */}
                  <Line
                    x1={x}
                    x2={x}
                    y1={yHigh}
                    y2={yLow}
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  {/* Body */}
                  <Rect
                    x={x - 6}
                    y={bodyTop}
                    width={12}
                    height={bodyHeight}
                    rx={2}
                    fill={color}
                  />
                  {/* Lower Volume Bar */}
                  <Rect
                    x={x - 5}
                    y={166 - volH}
                    width={10}
                    height={Math.max(2, volH)}
                    rx={2}
                    fill={c.fieldTeal}
                    opacity={0.45}
                  />
                </G>
              );
            })}
            <SvgText x={L - 5} y={137} textAnchor="end" fontSize={9} fill={c.muted}>{maxVol.toFixed(1)}h</SvgText>
            <SvgText x={L - 5} y={166} textAnchor="end" fontSize={9} fill={c.muted}>0h</SvgText>
            <Line x1={L} x2={R} y1={166} y2={166} stroke={c.line} />
            <SvgText x={L} y={180} fontSize={9} fill={c.muted}>
              {candles[0]?.weekLabel}
            </SvgText>
            <SvgText
              x={(L + R) / 2}
              y={180}
              fontSize={9}
              fill={c.muted}
              textAnchor="middle"
            >
              Bottom Bars = Weekly Training Hours
            </SvgText>
            <SvgText x={R} y={180} fontSize={9} fill={c.muted} textAnchor="end">
              {candles.at(-1)?.weekLabel}
            </SvgText>
          </Svg>
        </ChartScrubber>
        <View style={s.legendRow}>
          <LegendDot color={c.statusSuccess} label="Net Gain Week" />
          <LegendDot color={c.statusError} label="Net Drawdown Week" />
          <LegendDot color={c.fieldTeal} label="Moving Hours Volume" />
        </View>
      </View>
    );
  }

  // Concept C: Portfolio Allocation & Dividend Yield Ledger
  const paletteMap = {
    teal: c.fieldTeal,
    tennis: c.tennis,
    ink: c.ink,
    green: c.statusSuccess,
    secondary: c.secondary,
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={f.small}>
        Portfolio Allocation across Counted Sports & Recovery Assets
      </Text>
      <View style={s.stackedBarTrack}>
        {m.holdings.map((h) => (
          <View
            key={h.ticker}
            style={{
              flex: h.sharePct,
              backgroundColor: paletteMap[h.colorKey],
              height: "100%",
            }}
          />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        {m.holdings.map((h) => (
          <View key={h.ticker} style={s.holdingRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  backgroundColor: paletteMap[h.colorKey],
                }}
              />
              <View>
                <Text style={f.rowTitle}>
                  {h.sport} ({h.ticker})
                </Text>
                <Text style={f.small}>
                  {h.sharePct}% weight · {h.hours}h logged
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[f.rowTitle, { color: c.statusSuccess }]}>
                +{h.returnPts} pts
              </Text>
              <Text style={f.small}>{h.yieldPerHour} pts/hr yield</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ============================================================================
 * DOMAIN 2: DEDICATED VITALS & AUTONOMIC HEALTH MONITORING
 * ========================================================================== */

function VitalsConceptRenderer({
  conceptIndex,
  model,
  timeLens,
  selectedVital,
  onSelectVital,
}: {
  conceptIndex: AnalyticsConceptIndex;
  model: AnalyticsLabModel;
  timeLens: AnalyticsTimeLens;
  selectedVital: VitalMetricModel;
  onSelectVital: (id: VitalId) => void;
}) {
  const v = model.vitals;

  if (conceptIndex === 0) {
    // Concept A: Personal Baseline Corridor (7D vs 60D ±1σ)
    const pts = selectedVital.series;
    const badge = statusColors(selectedVital.status);

    return (
      <View style={{ gap: 10 }}>
        {/* Vital Picker Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.chipRow}>
            {v.metrics.map((item) => {
              const active = item.id === selectedVital.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Inspect vital ${item.name}`}
                  onPress={() => onSelectVital(item.id)}
                  style={[f.chip, active && f.chipActive]}
                >
                  <Text style={f.small}>
                    {item.shortName}: {item.formattedCurrent}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={s.betweenRow}>
          <View>
            <Text style={f.small}>
              {selectedVital.name} · {selectedVital.provider}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={s.heroNumber}>{selectedVital.formattedCurrent}</Text>
              <Text style={f.small}>{selectedVital.deltaLabel}</Text>
            </View>
          </View>
          <View style={[s.statusPill, { backgroundColor: badge.bg }]}>
            <Text style={[s.statusPillText, { color: badge.fg }]}>
              {selectedVital.statusLabel}
            </Text>
          </View>
        </View>

        {timeLens === "point" ? (
          // 1-Point Horizontal Normal Corridor Gauge
          <View style={s.pointBox}>
            <View style={s.betweenRow}>
              <Text style={f.small}>
                60-Day Personal Corridor: {selectedVital.baselineMin}–
                {selectedVital.baselineMax} {selectedVital.unit}
              </Text>
              <Text style={f.rowTitle}>Z = {selectedVital.zScore}σ</Text>
            </View>
            <View style={s.corridorBarOuter}>
              <View style={s.corridorNormalBand} />
              <View
                style={[
                  s.corridorPointer,
                  {
                    left: `${Math.max(6, Math.min(94, 50 + selectedVital.zScore * 22))}%`,
                    backgroundColor: badge.fg,
                  },
                ]}
              />
            </View>
            <Text style={f.small}>{selectedVital.insight}</Text>
          </View>
        ) : (
          // Historical Corridor Trend
          <VitalCorridorSvg vital={selectedVital} />
        )}
      </View>
    );
  }

  if (conceptIndex === 1) {
    // Concept B: 6-Vital Sparkline Telemetry Grid
    return (
      <View style={{ gap: 10 }}>
        <View style={s.betweenRow}>
          <Text style={f.small}>{v.autonomicStateLabel}</Text>
          <Text style={f.rowTitle}>Readiness {v.readinessComposite}%</Text>
        </View>
        <View style={s.bentoGrid}>
          {v.metrics.map((metric) => {
            const st = statusColors(metric.status);
            const isSelected = metric.id === selectedVital.id;
            return (
              <Pressable
                key={metric.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${metric.name} ${metric.formattedCurrent}, ${metric.statusLabel}`}
                onPress={() => onSelectVital(metric.id)}
                style={[
                  s.vitalCard,
                  isSelected && { borderColor: c.ink, borderWidth: 1.5 },
                ]}
              >
                <View style={s.betweenRow}>
                  <Text style={s.bentoKicker}>{metric.shortName}</Text>
                  <View style={[s.tinyPill, { backgroundColor: st.bg }]}>
                    <Text style={[s.tinyPillText, { color: st.fg }]}>
                      {metric.statusLabel}
                    </Text>
                  </View>
                </View>
                <View style={s.betweenRow}>
                  <Text style={s.bentoValue}>{metric.formattedCurrent}</Text>
                  {timeLens !== "point" ? (
                    <MiniSparkline
                      values={metric.series.map((p) => p.value)}
                      stroke={st.fg}
                    />
                  ) : null}
                </View>
                <Text style={f.small} numberOfLines={1}>
                  Corridor {metric.baselineMin}–{metric.baselineMax} {metric.unit}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={f.small}>{v.autonomicSummary}</Text>
      </View>
    );
  }

  // Concept C: Autonomic Balance Quadrant & Normalized Z-Score Deviation Bars
  return (
    <View style={{ gap: 12 }}>
      <Text style={f.small}>
        Normalized Z-Score Deviation (All 6 vitals on a unified -2σ to +2σ scale)
      </Text>
      <View style={{ gap: 8 }}>
        {v.metrics.map((m) => {
          const st = statusColors(m.status);
          const clampedZ = Math.max(-2, Math.min(2, m.zScore));
          const leftPct = clampedZ >= 0 ? 50 : 50 + (clampedZ / 2) * 45;
          const widthPct = Math.max(3, (Math.abs(clampedZ) / 2) * 45);
          return (
            <View key={m.id} style={{ gap: 3 }}>
              <View style={s.betweenRow}>
                <Text style={f.small}>
                  {m.shortName} ({m.formattedCurrent})
                </Text>
                <Text style={[f.small, { color: st.fg, fontFamily: fonts.bodyBold }]}>
                  {m.zScore >= 0 ? "+" : ""}
                  {m.zScore}σ
                </Text>
              </View>
              <View style={s.zTrack}>
                <View style={s.zNormalZone} />
                <View style={s.zCenterLine} />
                <View
                  style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: 2,
                    bottom: 2,
                    borderRadius: 4,
                    backgroundColor: st.fg,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* 2D Autonomic State Quadrant (HRV Z vs RHR Z) */}
      <View style={{ marginTop: 6, gap: 6 }}>
        <Text style={f.small}>
          Autonomic State Plane (X = RHR Stability · Y = HRV Parasympathetic Tone)
        </Text>
        <Svg preserveAspectRatio="none" width="100%" height={145} viewBox="0 0 340 145">
          <Rect x={20} y={8} width={300} height={120} rx={10} fill={c.soft} />
          {/* Optimal top-right quadrant highlight */}
          <Rect
            x={170}
            y={8}
            width={150}
            height={60}
            rx={6}
            fill={c.statusSuccessSoft}
          />
          {[-2, 0, 2].map(value => <G key={value}><SvgText x={170 + value * 60} y={140} textAnchor="middle" fontSize={9} fill={c.muted}>{value}σ</SvgText><SvgText x={16} y={71 - value * 24} textAnchor="end" fontSize={9} fill={c.muted}>{value}σ</SvgText></G>)}
          <Line x1={170} x2={170} y1={8} y2={128} stroke={c.line} strokeWidth={1.5} />
          <Line x1={20} x2={320} y1={68} y2={68} stroke={c.line} strokeWidth={1.5} />
          <SvgText x={28} y={24} fontSize={9} fill={c.muted}>
            Parasympathetic Fatigue
          </SvgText>
          <SvgText x={312} y={24} fontSize={9} fill={c.statusSuccess} textAnchor="end">
            Peak Readiness (+HRV, Low RHR)
          </SvgText>
          <SvgText x={28} y={120} fontSize={9} fill={c.statusError}>
            Sympathetic Strain (-HRV, High RHR)
          </SvgText>
          <SvgText x={312} y={120} fontSize={9} fill={c.muted} textAnchor="end">
            Normal Baseline
          </SvgText>
          {timeLens !== "point" && v.quadrantTrail.length > 1 ? (
            <Polyline
              points={v.quadrantTrail
                .map((pt) => {
                  const x = 170 + Math.max(-2, Math.min(2, pt.rhrZ)) * 60;
                  const y = 68 - Math.max(-2, Math.min(2, pt.hrvZ)) * 24;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
              fill="none"
              stroke={c.fieldTeal}
              strokeWidth={1.75}
              strokeDasharray="3 2"
            />
          ) : null}
          {v.quadrantTrail.map((pt, idx) => {
            if (timeLens === "point" && !pt.isToday) return null;
            const x = 170 + Math.max(-2, Math.min(2, pt.rhrZ)) * 60;
            const y = 68 - Math.max(-2, Math.min(2, pt.hrvZ)) * 24;
            return (
              <Circle
                key={`${pt.label}-${idx}`}
                cx={x}
                cy={y}
                r={pt.isToday ? 6 : 3}
                fill={pt.isToday ? c.tennis : c.fieldTeal}
                stroke={c.ink}
                strokeWidth={pt.isToday ? 2 : 0}
              />
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

function VitalCorridorSvg({ vital }: { vital: VitalMetricModel }) {
  const pts = vital.series;
  const allVals = pts.flatMap((p) => [
    p.value,
    p.rolling7d,
    p.baselineLow,
    p.baselineHigh,
  ]);
  const minV = Math.min(...allVals) - (vital.baselineMax - vital.baselineMin) * 0.25;
  const maxV = Math.max(...allVals) + (vital.baselineMax - vital.baselineMin) * 0.25;
  const span = Math.max(0.01, maxV - minV);
  const W = 340;
  const H = 155;
  const L = 40;
  const R = 328;
  const T = 12;
  const B = 130;

  const toX = (i: number) => L + (i / Math.max(1, pts.length - 1)) * (R - L);
  const toY = (v: number) => B - ((v - minV) / span) * (B - T);

  const yLow = toY(vital.baselineMin);
  const yHigh = toY(vital.baselineMax);
  const rollLine = pts
    .map((p, i) => `${toX(i).toFixed(1)},${toY(p.rolling7d).toFixed(1)}`)
    .join(" ");

  return (
    <View style={{ gap: 6 }}>
      <ChartScrubber
        label={`${vital.name} baseline corridor chart`}
        width={W}
        height={H}
        plotTop={T}
        plotBottom={B}
        points={pts.map((p, i) => ({
          id: p.day,
          x: toX(i),
          y: toY(p.value),
          label: `${p.label} · 7D Rolling ${p.rolling7d} ${vital.unit} (Normal ${p.baselineLow}–${p.baselineHigh})`,
          value: `${p.value} ${vital.unit}`,
        }))}
      >
        <Svg preserveAspectRatio="none" width="100%" height={155} viewBox={`0 0 ${W} ${H}`}>
          {/* Shaded 60-day Personal Normal Corridor */}
          <Rect
            x={L}
            y={Math.min(yHigh, yLow)}
            width={R - L}
            height={Math.max(6, Math.abs(yLow - yHigh))}
            fill={c.fieldTeal}
            opacity={0.14}
          />
          <Line
            x1={L}
            x2={R}
            y1={yHigh}
            y2={yHigh}
            stroke={c.fieldTeal}
            strokeDasharray="3 3"
            opacity={0.6}
          />
          <Line
            x1={L}
            x2={R}
            y1={yLow}
            y2={yLow}
            stroke={c.fieldTeal}
            strokeDasharray="3 3"
            opacity={0.6}
          />
          <SvgText x={L - 5} y={yHigh + 3} fontSize={9} fill={c.muted} textAnchor="end">
            {vital.baselineMax}
          </SvgText>
          <SvgText x={L - 5} y={yLow + 3} fontSize={9} fill={c.muted} textAnchor="end">
            {vital.baselineMin}
          </SvgText>

          {/* 7D Rolling Mean Line */}
          <Polyline
            points={rollLine}
            fill="none"
            stroke={c.ink}
            strokeWidth={2.5}
          />

          {/* Daily Raw Reading Nodes */}
          {pts.map((p, i) => {
            const outOfBand =
              p.value < p.baselineLow || p.value > p.baselineHigh;
            return (
              <Circle
                key={p.day}
                cx={toX(i)}
                cy={toY(p.value)}
                r={outOfBand ? 4.5 : 3.5}
                fill={outOfBand ? c.tennis : c.card}
                stroke={outOfBand ? c.statusError : c.fieldTeal}
                strokeWidth={2}
              />
            );
          })}
          <SvgText x={L} y={148} fontSize={9} fill={c.muted}>
            {pts[0]?.label}
          </SvgText>
          <SvgText
            x={(L + R) / 2}
            y={148}
            fontSize={9}
            fill={c.fieldTeal}
            textAnchor="middle"
          >
            Shaded Band = 60D Personal Normal (±1σ)
          </SvgText>
          <SvgText x={R} y={148} fontSize={9} fill={c.muted} textAnchor="end">
            {pts.at(-1)?.label}
          </SvgText>
        </Svg>
      </ChartScrubber>
      <Text style={f.small}>{vital.insight}</Text>
    </View>
  );
}

/* ============================================================================
 * DOMAIN 3: SLEEP & NIGHTLY RECOVERY ARCHITECTURE
 * ========================================================================== */

function SleepConceptRenderer({
  conceptIndex,
  model,
  timeLens,
  selectedNightId,
  onSelectNight,
}: {
  conceptIndex: AnalyticsConceptIndex;
  model: AnalyticsLabModel;
  timeLens: AnalyticsTimeLens;
  selectedNightId?: string | null;
  onSelectNight?: (id: string) => void;
}) {
  const sl = model.sleep;
  const activeNight = sl.nights.find((n) => n.id === selectedNightId) ?? sl.lastNight;

  if (conceptIndex === 0) {
    // Concept A: Nightly Architecture & Restorative Split
    const total = Math.max(
      1,
      activeNight.deepMin + activeNight.remMin + activeNight.lightMin + activeNight.awakeMin,
    );
    return (
      <View style={{ gap: 10 }}>
        <View style={s.betweenRow}>
          <View>
            <Text style={f.small}>
              {activeNight.id === sl.lastNight.id ? "Last Night" : "Selected Night"} ({activeNight.label}) · Sleep Score
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={s.heroNumber}>{activeNight.score}</Text>
              <Text style={f.rowTitle}>
                {formatMinutesAsHoursMins(activeNight.durationMin)}
              </Text>
            </View>
          </View>
          <View style={s.returnPillPositive}>
            <Text style={s.returnPillText}>{sl.contestRankLabel}</Text>
          </View>
        </View>

        <View style={s.stackedBarTrack}>
          <View
            style={{
              flex: activeNight.deepMin / total,
              backgroundColor: c.ink,
              height: "100%",
            }}
          />
          <View
            style={{
              flex: activeNight.remMin / total,
              backgroundColor: c.fieldTeal,
              height: "100%",
            }}
          />
          <View
            style={{
              flex: activeNight.lightMin / total,
              backgroundColor: c.secondary,
              height: "100%",
            }}
          />
          <View
            style={{
              flex: activeNight.awakeMin / total,
              backgroundColor: c.tennis,
              height: "100%",
            }}
          />
        </View>

        <View style={s.kpiGrid}>
          <View style={s.kpiCell}>
            <LegendDot color={c.ink} label="Deep (SWS)" />
            <Text style={f.rowTitle}>{formatMinutesAsHoursMins(activeNight.deepMin)}</Text>
          </View>
          <View style={s.kpiCell}>
            <LegendDot color={c.fieldTeal} label="REM" />
            <Text style={f.rowTitle}>{formatMinutesAsHoursMins(activeNight.remMin)}</Text>
          </View>
          <View style={s.kpiCell}>
            <LegendDot color={c.secondary} label="Light" />
            <Text style={f.rowTitle}>{formatMinutesAsHoursMins(activeNight.lightMin)}</Text>
          </View>
          <View style={s.kpiCell}>
            <LegendDot color={c.tennis} label="Awake" />
            <Text style={f.rowTitle}>{activeNight.awakeMin}m ({activeNight.efficiencyPct}% eff)</Text>
          </View>
        </View>
        <Text style={f.small}>
          Restorative share (Deep + REM): {activeNight.restorativePct}% vs {sl.avgRestorativePct}%{" "}
          period average.
        </Text>
      </View>
    );
  }

  if (conceptIndex === 1) {
    // Concept B: 14-Night Stacked Architecture Bars against 8.0h Target
    const nights = sl.nights;
    const maxMin = Math.max(520, ...nights.map((n) => n.durationMin));
    const W = 340;
    const H = 165;
    const L = 36;
    const R = 328;
    const T = 14;
    const B = 136;
    const targetY = B - (480 / maxMin) * (B - T);
    const toX = (i: number) =>
      L + ((i + 0.5) / Math.max(1, nights.length)) * (R - L);

    return (
      <View style={{ gap: 8 }}>
        <ChartScrubber
          label="Nightly sleep stage duration stack"
          width={W}
          height={H}
          plotTop={T}
          plotBottom={B}
          points={nights.map((n, i) => ({
            id: n.id,
            x: toX(i),
            y: B - (n.durationMin / maxMin) * (B - T),
            label: `${n.label} · Deep ${formatMinutesAsHoursMins(n.deepMin)} · REM ${formatMinutesAsHoursMins(n.remMin)}`,
            value: `${formatMinutesAsHoursMins(n.durationMin)} · Score ${n.score} (${n.restorativePct}% restorative)`,
          }))}
        >
          <Svg preserveAspectRatio="none" width="100%" height={165} viewBox={`0 0 ${W} ${H}`}>
            {[0, 240].map(minutes => <SvgText key={minutes} x={L - 4} y={B - minutes / maxMin * (B - T) + 3} textAnchor="end" fontSize={9} fill={c.muted}>{minutes / 60}h</SvgText>)}
            <Line
              x1={L}
              x2={R}
              y1={targetY}
              y2={targetY}
              stroke={c.statusSuccess}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <SvgText x={L - 4} y={targetY + 3} fontSize={9} fill={c.statusSuccess} textAnchor="end">
              8.0h
            </SvgText>
            {nights.map((n, i) => {
              const x = toX(i);
              const barW = Math.max(8, Math.min(18, (R - L) / nights.length - 6));
              const deepH = (n.deepMin / maxMin) * (B - T);
              const remH = (n.remMin / maxMin) * (B - T);
              const lightH = (n.lightMin / maxMin) * (B - T);
              return (
                <G key={n.id}>
                  <Rect
                    x={x - barW / 2}
                    y={B - deepH}
                    width={barW}
                    height={deepH}
                    fill={c.ink}
                  />
                  <Rect
                    x={x - barW / 2}
                    y={B - deepH - remH}
                    width={barW}
                    height={remH}
                    fill={c.fieldTeal}
                  />
                  <Rect
                    x={x - barW / 2}
                    y={B - deepH - remH - lightH}
                    width={barW}
                    height={lightH}
                    rx={2}
                    fill={c.secondary}
                    opacity={0.65}
                  />
                </G>
              );
            })}
            <Line x1={L} x2={R} y1={B} y2={B} stroke={c.line} />
            <SvgText x={L} y={154} fontSize={9} fill={c.muted}>
              {nights[0]?.label}
            </SvgText>
            <SvgText
              x={(L + R) / 2}
              y={154}
              fontSize={9}
              fill={c.muted}
              textAnchor="middle"
            >
              Avg {sl.avgDurationFormatted} · Score {sl.avgScore}
            </SvgText>
            <SvgText x={R} y={154} fontSize={9} fill={c.muted} textAnchor="end">
              {nights.at(-1)?.label}
            </SvgText>
          </Svg>
        </ChartScrubber>
        <View style={s.legendRow}>
          <LegendDot color={c.ink} label="Deep" />
          <LegendDot color={c.fieldTeal} label="REM" />
          <LegendDot color={c.secondary} label="Light" />
          <LegendDot color={c.statusSuccess} label="8.0h Target" />
        </View>
      </View>
    );
  }

  // Concept C: Circadian Bedtime Window & Sleep Debt
  const nights = sl.nights;
  const W = 340;
  const H = 150;
  const L = 42;
  const R = 328;
  const T = 12;
  const B = 126;
  // Map hour offset (-3 = 9 PM, +10 = 10 AM) to Y
  const toY = (hr: number) => T + ((hr + 3) / 13) * (B - T);
  const toX = (i: number) =>
    L + ((i + 0.5) / Math.max(1, nights.length)) * (R - L);

  return (
    <View style={{ gap: 8 }}>
      <View style={s.betweenRow}>
        <Text style={f.small}>
          Circadian Regularity: {sl.circadianRegularityPct}%
        </Text>
        <Text
          style={[
            f.rowTitle,
            { color: sl.cumulativeDebtMin > 60 ? c.statusError : c.statusSuccess },
          ]}
        >
          Sleep Debt: {sl.cumulativeDebtMin}m
        </Text>
      </View>
      <Svg preserveAspectRatio="none" width="100%" height={150} viewBox={`0 0 ${W} ${H}`}>
        <Line
          x1={L}
          x2={R}
          y1={toY(-1)}
          y2={toY(-1)}
          stroke={c.line}
          strokeDasharray="3 3"
        />
        <Line
          x1={L}
          x2={R}
          y1={toY(7)}
          y2={toY(7)}
          stroke={c.line}
          strokeDasharray="3 3"
        />
        <SvgText x={L - 5} y={toY(-1) + 3} fontSize={9} fill={c.muted} textAnchor="end">
          11pm
        </SvgText>
        <SvgText x={L - 5} y={toY(7) + 3} fontSize={9} fill={c.muted} textAnchor="end">
          7am
        </SvgText>
        {nights.map((n, i) => {
          const x = toX(i);
          const yStart = toY(n.bedtimeOffsetHr);
          const yEnd = toY(n.wakeOffsetHr);
          const barW = Math.max(7, Math.min(15, (R - L) / nights.length - 6));
          return (
            <Rect
              key={n.id}
              x={x - barW / 2}
              y={yStart}
              width={barW}
              height={Math.max(6, yEnd - yStart)}
              rx={barW / 2}
              fill={c.fieldTeal}
              opacity={0.82}
            />
          );
        })}
        <SvgText x={L} y={144} fontSize={9} fill={c.muted}>
          {nights[0]?.label}
        </SvgText>
        <SvgText
          x={(L + R) / 2}
          y={144}
          fontSize={9}
          fill={c.muted}
          textAnchor="middle"
        >
          Floating Bars = Bedtime to Wake Window
        </SvgText>
        <SvgText x={R} y={144} fontSize={9} fill={c.muted} textAnchor="end">
          {nights.at(-1)?.label}
        </SvgText>
      </Svg>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.chipRow}>
          {nights.map((n) => {
            const active = selectedNightId ? n.id === selectedNightId : n.id === sl.lastNight.id;
            return (
              <Pressable
                key={n.id}
                onPress={() => onSelectNight?.(n.id)}
                style={[f.chip, active && f.chipActive]}
              >
                <Text
                  style={[
                    f.small,
                    active && { color: c.card, fontFamily: fonts.bodyBold },
                  ]}
                >
                  {n.label} ({n.score} pts)
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

/* ============================================================================
 * DOMAIN 4: TRAINING VOLUME, ACWR LOAD & GHOST BURN-UP
 * ========================================================================== */

function LoadConceptRenderer({
  conceptIndex,
  model,
  timeLens,
}: {
  conceptIndex: AnalyticsConceptIndex;
  model: AnalyticsLabModel;
  timeLens: AnalyticsTimeLens;
}) {
  const ld = model.load;
  const pts = ld.series;
  const latest = pts.at(-1)!;

  if (conceptIndex === 0) {
    // Concept A: Cumulative Burn-Up vs Past-Self Ghost
    const maxCum = Math.max(
      1,
      ...pts.flatMap((p) => [p.cumCurrentHours, p.cumGhostHours, p.cumTargetHours]),
    );
    const W = 340;
    const H = 160;
    const L = 38;
    const R = 328;
    const T = 14;
    const B = 132;
    const toX = (i: number) => L + (i / Math.max(1, pts.length - 1)) * (R - L);
    const toY = (v: number) => B - (v / maxCum) * (B - T);

    const currLine = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toY(p.cumCurrentHours).toFixed(1)}`)
      .join(" ");
    const ghostLine = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toY(p.cumGhostHours).toFixed(1)}`)
      .join(" ");

    return (
      <View style={{ gap: 8 }}>
        <View style={s.betweenRow}>
          <View>
            <Text style={f.small}>Cumulative Period Volume vs. Prior Ghost</Text>
            <Text style={s.heroNumber}>{latest.cumCurrentHours} hrs</Text>
          </View>
          <View style={s.returnPillPositive}>
            <Text style={s.returnPillText}>
              {ld.ghostDeltaHours >= 0 ? "+" : ""}
              {ld.ghostDeltaHours}h vs Ghost
            </Text>
          </View>
        </View>

        <ChartScrubber
          label="Cumulative training hours burn-up vs past-self ghost"
          width={W}
          height={H}
          plotTop={T}
          plotBottom={B}
          points={pts.map((p, i) => ({
            id: p.id,
            x: toX(i),
            y: toY(p.cumCurrentHours),
            label: `${p.label} · Ghost ${p.cumGhostHours}h · Target ${p.cumTargetHours}h`,
            value: `${p.cumCurrentHours}h cumulative (${(p.cumCurrentHours - p.cumGhostHours) >= 0 ? "+" : ""}${(p.cumCurrentHours - p.cumGhostHours).toFixed(1)}h vs ghost)`,
          }))}
        >
          <Svg preserveAspectRatio="none" width="100%" height={160} viewBox={`0 0 ${W} ${H}`}>
            <NumericReferences left={L} right={R} top={T} bottom={B} max={maxCum} unit="Training (hrs)"/>
            <Line x1={L} x2={R} y1={B} y2={B} stroke={c.line} />
            <Polyline
              points={ghostLine}
              fill="none"
              stroke={c.muted}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
            <Polyline
              points={currLine}
              fill="none"
              stroke={c.fieldTeal}
              strokeWidth={3}
            />
            <Circle
              cx={toX(pts.length - 1)}
              cy={toY(latest.cumCurrentHours)}
              r={5}
              fill={c.tennis}
              stroke={c.ink}
              strokeWidth={2}
            />
            <SvgText x={L} y={150} fontSize={9} fill={c.muted}>
              {pts[0]?.label}
            </SvgText>
            <SvgText x={R} y={150} fontSize={9} fill={c.muted} textAnchor="end">
              {pts.at(-1)?.label}
            </SvgText>
          </Svg>
        </ChartScrubber>
        <View style={s.legendRow}>
          <LegendDot color={c.fieldTeal} label="Current Period Climb" />
          <LegendDot color={c.muted} label="Past-Self Ghost Trajectory" />
        </View>
      </View>
    );
  }

  if (conceptIndex === 1) {
    // Concept B: Acute:Chronic Workload Ratio (ACWR) & Sweet Spot
    const maxL = Math.max(
      1,
      ...pts.flatMap((p) => [p.acuteLoad, p.chronicLoad]),
    );
    const W = 340;
    const H = 155;
    const L = 36;
    const R = 328;
    const T = 14;
    const B = 128;
    const toX = (i: number) => L + (i / Math.max(1, pts.length - 1)) * (R - L);
    const toY = (v: number) => B - (v / maxL) * (B - T);

    const acutePts = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toY(p.acuteLoad).toFixed(1)}`)
      .join(" ");
    const chronicPts = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toY(p.chronicLoad).toFixed(1)}`)
      .join(" ");

    return (
      <View style={{ gap: 10 }}>
        <View style={s.betweenRow}>
          <View>
            <Text style={f.small}>Acute:Chronic Workload Ratio (ACWR)</Text>
            <Text style={s.heroNumber}>{ld.acwrCurrent}x</Text>
          </View>
          <View
            style={[
              s.statusPill,
              {
                backgroundColor:
                  ld.acwrCurrent > 1.35 ? "#fdecec" : c.statusSuccessSoft,
              },
            ]}
          >
            <Text
              style={[
                s.statusPillText,
                {
                  color:
                    ld.acwrCurrent > 1.35 ? c.statusError : c.statusSuccess,
                },
              ]}
            >
              {ld.acwrStatusLabel}
            </Text>
          </View>
        </View>

        {/* Horizontal ACWR Sweet Spot Gauge */}
        <View style={s.corridorBarOuter}>
          <View style={s.corridorNormalBand} />
          <View
            style={[
              s.corridorPointer,
              {
                left: `${Math.max(5, Math.min(95, ((ld.acwrCurrent - 0.5) / 1.3) * 100))}%`,
                backgroundColor:
                  ld.acwrCurrent > 1.35 ? c.statusError : c.statusSuccess,
              },
            ]}
          />
        </View>

        {timeLens !== "point" ? (
          <Svg preserveAspectRatio="none" width="100%" height={155} viewBox={`0 0 ${W} ${H}`}>
            <NumericReferences left={L} right={R} top={T} bottom={B} max={maxL} unit="Load"/>
            <Line x1={L} x2={R} y1={B} y2={B} stroke={c.line} />
            <Polyline
              points={chronicPts}
              fill="none"
              stroke={c.fieldTeal}
              strokeWidth={2.25}
            />
            <Polyline
              points={acutePts}
              fill="none"
              stroke={ld.acwrCurrent > 1.35 ? c.statusError : c.ink}
              strokeWidth={2.5}
            />
            <SvgText x={L} y={146} fontSize={9} fill={c.muted}>
              {pts[0]?.label}
            </SvgText>
          </Svg>
        ) : null}
        <View style={s.legendRow}>
          <LegendDot color={c.ink} label="7D Acute Fatigue (ATL)" />
          <LegendDot color={c.fieldTeal} label="28D Chronic Fitness (CTL)" />
        </View>
      </View>
    );
  }

  // Concept C: Multi-Sport Volume Stack
  const maxHrs = Math.max(1, ...pts.map((p) => p.totalHours));
  const W = 340;
  const H = 155;
  const L = 36;
  const R = 328;
  const T = 12;
  const B = 132;
  const toX = (i: number) =>
    L + ((i + 0.5) / Math.max(1, pts.length)) * (R - L);

  return (
    <View style={{ gap: 8 }}>
      <Svg preserveAspectRatio="none" width="100%" height={155} viewBox={`0 0 ${W} ${H}`}>
            <NumericReferences left={L} right={R} top={T} bottom={B} max={maxHrs} unit="Training (hrs)"/>
        <Line x1={L} x2={R} y1={B} y2={B} stroke={c.line} />
        {pts.map((p, i) => {
          const x = toX(i);
          const barW = Math.max(8, Math.min(18, (R - L) / pts.length - 6));
          const runH = (p.runningHours / maxHrs) * (B - T);
          const cycH = (p.cyclingHours / maxHrs) * (B - T);
          const strH = (p.strengthHours / maxHrs) * (B - T);
          const wlkH = (p.walkingHours / maxHrs) * (B - T);
          return (
            <G key={p.id}>
              <Rect
                x={x - barW / 2}
                y={B - runH}
                width={barW}
                height={runH}
                fill={c.fieldTeal}
              />
              <Rect
                x={x - barW / 2}
                y={B - runH - cycH}
                width={barW}
                height={cycH}
                fill={c.tennis}
              />
              <Rect
                x={x - barW / 2}
                y={B - runH - cycH - strH}
                width={barW}
                height={strH}
                fill={c.ink}
              />
              <Rect
                x={x - barW / 2}
                y={B - runH - cycH - strH - wlkH}
                width={barW}
                height={wlkH}
                rx={2}
                fill={c.statusSuccess}
              />
            </G>
          );
        })}
        <SvgText x={L} y={148} fontSize={9} fill={c.muted}>
          {pts[0]?.label}
        </SvgText>
        <SvgText x={R} y={148} fontSize={9} fill={c.muted} textAnchor="end">
          {pts.at(-1)?.label} ({latest.totalHours}h total)
        </SvgText>
      </Svg>
      <View style={s.legendRow}>
        <LegendDot color={c.fieldTeal} label="Run" />
        <LegendDot color={c.tennis} label="Cycle" />
        <LegendDot color={c.ink} label="Strength" />
        <LegendDot color={c.statusSuccess} label="Walk" />
      </View>
    </View>
  );
}

/* ============================================================================
 * DOMAIN 5: CARDIO PERFORMANCE, AEROBIC EFFICIENCY & HR ZONES
 * ========================================================================== */

function PerformanceConceptRenderer({
  conceptIndex,
  model,
  timeLens,
}: {
  conceptIndex: AnalyticsConceptIndex;
  model: AnalyticsLabModel;
  timeLens: AnalyticsTimeLens;
}) {
  const pf = model.performance;
  const pts = pf.series;

  if (conceptIndex === 0) {
    // Concept A: Pace-at-HR Aerobic Efficiency Factor (EF)
    const minEf = Math.min(...pts.map((p) => p.efficiencyFactor)) - 0.04;
    const maxEf = Math.max(...pts.map((p) => p.efficiencyFactor)) + 0.04;
    const span = Math.max(0.01, maxEf - minEf);
    const W = 340;
    const H = 155;
    const L = 40;
    const R = 328;
    const T = 14;
    const B = 128;
    const toX = (i: number) => L + (i / Math.max(1, pts.length - 1)) * (R - L);
    const toY = (v: number) => B - ((v - minEf) / span) * (B - T);
    const efLine = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toY(p.efficiencyFactor).toFixed(1)}`)
      .join(" ");

    return (
      <View style={{ gap: 8 }}>
        <View style={s.betweenRow}>
          <View>
            <Text style={f.small}>Aerobic Efficiency Factor (Speed ÷ HR)</Text>
            <Text style={s.heroNumber}>{pf.efCurrent}</Text>
          </View>
          <View style={s.returnPillPositive}>
            <Text style={s.returnPillText}>
              {pf.efDeltaPct >= 0 ? "+" : ""}
              {pf.efDeltaPct}% Fitter
            </Text>
          </View>
        </View>
        <ChartScrubber
          label="Aerobic efficiency factor trend"
          width={W}
          height={H}
          plotTop={T}
          plotBottom={B}
          points={pts.map((p, i) => ({
            id: p.id,
            x: toX(i),
            y: toY(p.efficiencyFactor),
            label: `${p.label} · Pace ${p.paceMinKm}/km @ ${p.avgHr} bpm · VO2 ${p.vo2Max}`,
            value: `EF ${p.efficiencyFactor} m/min/bpm`,
          }))}
        >
          <Svg preserveAspectRatio="none" width="100%" height={155} viewBox={`0 0 ${W} ${H}`}>
            <NumericReferences left={L} right={R} top={T} bottom={B} min={minEf} max={maxEf} unit="EF (m/min/bpm)" format={v => v.toFixed(2)}/>
            <Line x1={L} x2={R} y1={B} y2={B} stroke={c.line} />
            <Polyline
              points={efLine}
              fill="none"
              stroke={c.statusSuccess}
              strokeWidth={2.75}
            />
            {pts.map((p, i) => (
              <Circle
                key={p.id}
                cx={toX(i)}
                cy={toY(p.efficiencyFactor)}
                r={3.5}
                fill={c.card}
                stroke={c.statusSuccess}
                strokeWidth={2}
              />
            ))}
            <SvgText x={L} y={146} fontSize={9} fill={c.muted}>
              {pts[0]?.label} ({pts[0]?.paceMinKm}/km @ {pts[0]?.avgHr} bpm)
            </SvgText>
            <SvgText x={R} y={146} fontSize={9} fill={c.muted} textAnchor="end">
              {pts.at(-1)?.label} ({pts.at(-1)?.paceMinKm}/km @ {pts.at(-1)?.avgHr} bpm)
            </SvgText>
          </Svg>
        </ChartScrubber>
      </View>
    );
  }

  if (conceptIndex === 1) {
    // Concept B: 5-Zone HR Distribution & 80/20 Polarization
    const zoneColors = [
      c.secondary,
      c.fieldTeal,
      c.tennis,
      "#e07a2b",
      c.statusError,
    ];
    return (
      <View style={{ gap: 8 }}>
        <Text style={f.rowTitle}>{pf.polarizationLabel}</Text>
        {pf.zones.map((z, idx) => {
          const pct = timeLens === "point" ? z.sessionPct : z.monthPct;
          return (
            <View key={z.zone} style={{ gap: 3 }}>
              <View style={s.betweenRow}>
                <Text style={f.small}>
                  {z.name} ({z.bpmRange})
                </Text>
                <Text style={f.small}>
                  {pct}% (Target {z.targetPct}%)
                </Text>
              </View>
              <View style={s.zoneBarOuter}>
                <View
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    height: "100%",
                    borderRadius: 5,
                    backgroundColor: zoneColors[idx],
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // Concept C: PR & Critical Pace Curve
  return (
    <View style={{ gap: 8 }}>
      {pf.prCurve.map((pr) => (
        <View key={pr.id} style={s.holdingRow}>
          <View>
            <Text style={f.rowTitle}>{pr.distanceLabel}</Text>
            <Text style={f.small}>
              Prior {pr.priorFormatted} · {pr.paceMinKm.toFixed(2)} min/km
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={f.rowTitle}>
              {pr.currentFormatted} ({pr.deltaFormatted})
            </Text>
            <Text style={[f.small, { color: c.fieldTeal }]}>
              {pr.percentile}th percentile
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ============================================================================
 * DOMAIN 6: MULTI-VARIATE COMBINED OVERLAYS ("TOGETHER VS ISOLATED")
 * ========================================================================== */

function CombinedConceptRenderer({
  conceptIndex,
  model,
  timeLens,
}: {
  conceptIndex: AnalyticsConceptIndex;
  model: AnalyticsLabModel;
  timeLens: AnalyticsTimeLens;
}) {
  const cmb = model.combined;
  const pts = cmb.series;

  if (conceptIndex === 0) {
    // Concept A: Daily Strain Bars × Next-Morning Readiness Curve
    const W = 340;
    const H = 165;
    const L = 36;
    const R = 328;
    const T = 14;
    const B = 132;
    const toX = (i: number) =>
      L + ((i + 0.5) / Math.max(1, pts.length)) * (R - L);
    const toYReadiness = (r: number) => B - ((r - 30) / 70) * (B - T);

    const readyLine = pts
      .map((p, i) => `${toX(i).toFixed(1)},${toYReadiness(p.nextDayReadiness).toFixed(1)}`)
      .join(" ");

    return (
      <View style={{ gap: 8 }}>
        <View style={s.betweenRow}>
          <Text style={f.small}>
            Strain × Next-Day Readiness (r = {cmb.strainRecoveryCorrelation})
          </Text>
          <Text style={f.rowTitle}>
            Optimal Strain Ceiling: {cmb.optimalStrainCeiling}
          </Text>
        </View>
        <ChartScrubber
          label="Training strain bars overlaid with next-morning readiness"
          width={W}
          height={H}
          plotTop={T}
          plotBottom={B}
          points={pts.map((p, i) => ({
            id: p.id,
            x: toX(i),
            y: toYReadiness(p.nextDayReadiness),
            label: `${p.label} · ${p.workoutNote} · Next-Day HRV ${p.nextDayHrv} ms`,
            value: `Strain ${p.strainScore} → Readiness ${p.nextDayReadiness}%`,
          }))}
        >
          <Svg preserveAspectRatio="none" width="100%" height={165} viewBox={`0 0 ${W} ${H}`}>
            <NumericReferences left={L} right={R} top={T} bottom={B} min={30} max={100} unit="Readiness (%)" format={v => String(Math.round(v))}/>
            <Line x1={L} x2={R} y1={B} y2={B} stroke={c.line} />
            {pts.map((p, i) => {
              const x = toX(i);
              const barW = Math.max(8, Math.min(16, (R - L) / pts.length - 6));
              const strainH = (p.strainScore / 21) * (B - T);
              return (
                <Rect
                  key={p.id}
                  x={x - barW / 2}
                  y={B - strainH}
                  width={barW}
                  height={strainH}
                  rx={3}
                  fill={p.strainScore > 16 ? c.tennis : c.secondary}
                  opacity={0.55}
                />
              );
            })}
            <Polyline
              points={readyLine}
              fill="none"
              stroke={c.ink}
              strokeWidth={2.5}
            />
            {pts.map((p, i) => (
              <Circle
                key={`${p.id}-dot`}
                cx={toX(i)}
                cy={toYReadiness(p.nextDayReadiness)}
                r={3.5}
                fill={p.nextDayReadiness < 60 ? c.statusError : c.statusSuccess}
              />
            ))}
            <SvgText x={L} y={150} fontSize={9} fill={c.muted}>
              {pts[0]?.label} — {pts.at(-1)?.label}
            </SvgText>
          </Svg>
        </ChartScrubber>
      </View>
    );
  }

  if (conceptIndex === 1) {
    // Concept B: Restorative Sleep vs Next-Day Cardio Output
    return (
      <View style={{ gap: 8 }}>
        <View style={s.betweenRow}>
          <Text style={f.small}>
            Deep+REM Hours vs. Next-Day Aerobic Efficiency
          </Text>
          <Text style={[f.rowTitle, { color: c.statusSuccess }]}>
            r = +{cmb.sleepEfficiencyCorrelation}
          </Text>
        </View>
        {pts.slice(-5).map((p) => (
          <View key={p.id} style={s.holdingRow}>
            <View>
              <Text style={f.rowTitle}>
                {p.label} · {p.sleepRestorativeHr}h Deep+REM
              </Text>
              <Text style={f.small}>{p.workoutNote}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={f.rowTitle}>EF {p.aerobicEf}</Text>
              <Text style={f.small}>HRV {p.nextDayHrv} ms</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Concept C: Unified Morning Brief (1-Point Synthesis) vs Multi-Track Stack
  return (
    <View style={{ gap: 10 }}>
      <View style={s.pointBox}>
        <Text style={f.kicker}>1-Point Morning Readiness Synthesis</Text>
        <Text style={f.rowTitle}>{cmb.coachBriefHeadline}</Text>
        <Text style={f.small}>{cmb.coachBriefBody}</Text>
        <View style={s.kpiGrid}>
          <View style={s.kpiCell}>
            <Text style={f.small}>Readiness</Text>
            <Text style={f.rowTitle}>{model.vitals.readinessComposite}%</Text>
          </View>
          <View style={s.kpiCell}>
            <Text style={f.small}>ACWR Load</Text>
            <Text style={f.rowTitle}>{model.load.acwrCurrent}x</Text>
          </View>
          <View style={s.kpiCell}>
            <Text style={f.small}>Strain Cap</Text>
            <Text style={f.rowTitle}>{cmb.optimalStrainCeiling}</Text>
          </View>
          <View style={s.kpiCell}>
            <Text style={f.small}>$ATHL NAV</Text>
            <Text style={f.rowTitle}>{model.market.currentIndex}</Text>
          </View>
        </View>
      </View>
      {timeLens !== "point" ? (
        <Text style={f.small}>
          Toggle between &quot;1-Point&quot; and &quot;30D / All-Time&quot; above to see how
          every chart adapts from a single morning decision receipt to a full
          historical telemetry canvas.
        </Text>
      ) : null}
    </View>
  );
}

/** Minimal numeric references for the custom analytics plots. */
function NumericReferences({ left, right, top, bottom, min = 0, max, unit, format = (v: number) => v.toFixed(1) }: {
  left: number; right: number; top: number; bottom: number; min?: number; max: number; unit: string; format?: (value: number) => string;
}) {
  return <G>
    <SvgText x={left} y={Math.max(9, top - 4)} fontSize={9} fill={c.muted}>{unit}</SvgText>
    {[0, .5, 1].map(fraction => <G key={fraction}>
      <Line x1={left} x2={right} y1={bottom - fraction * (bottom - top)} y2={bottom - fraction * (bottom - top)} stroke={c.line} strokeWidth={.5}/>
      <SvgText x={left - 5} y={bottom - fraction * (bottom - top) + 3} textAnchor="end" fontSize={9} fill={c.muted}>{format(min + fraction * (max - min))}</SvgText>
    </G>)}
  </G>;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <Text style={f.small}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  controlDeck: {
    gap: 10,
    borderColor: c.line,
  },
  betweenRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  divider: {
    height: 1,
    backgroundColor: mobileSurfaces.divider,
    marginVertical: 2,
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: c.soft,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  segmentBtnActive: {
    backgroundColor: c.ink,
  },
  segmentLabel: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
    color: c.ink,
  },
  segmentLabelActive: {
    fontFamily: fonts.bodyBold,
    color: c.card,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: c.fieldTeal,
  },
  miniPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
  },
  miniPillText: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: c.ink,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: c.soft,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodyMedium,
    color: c.muted,
  },
  ruleCallout: {
    backgroundColor: c.actionSoft,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  ruleCalloutTitle: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: c.ink,
    textTransform: "uppercase",
  },
  modeTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: c.soft,
  },
  modeTagText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: c.fieldTeal,
  },
  heroNumber: {
    fontSize: 32,
    lineHeight: 36,
    fontFamily: fonts.bodyBold,
    color: c.ink,
    fontVariant: ["tabular-nums"],
  },
  returnPillPositive: {
    backgroundColor: c.statusSuccessSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  returnPillText: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: c.statusSuccess,
  },
  pointBox: {
    backgroundColor: c.soft,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiCell: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: c.card,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  stackedBarTrack: {
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: c.soft,
  },
  holdingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
  },
  tinyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tinyPillText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
  },
  corridorBarOuter: {
    height: 16,
    borderRadius: 8,
    backgroundColor: c.line,
    justifyContent: "center",
    position: "relative",
  },
  corridorNormalBand: {
    position: "absolute",
    left: "25%",
    width: "50%",
    top: 0,
    bottom: 0,
    borderRadius: 8,
    backgroundColor: c.fieldTeal,
    opacity: 0.25,
  },
  corridorPointer: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: c.card,
  },
  zTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: c.soft,
    position: "relative",
    overflow: "hidden",
  },
  zNormalZone: {
    position: "absolute",
    left: "27.5%",
    width: "45%",
    top: 0,
    bottom: 0,
    backgroundColor: c.fieldTeal,
    opacity: 0.14,
  },
  zCenterLine: {
    position: "absolute",
    left: "50%",
    width: 1.5,
    top: 0,
    bottom: 0,
    backgroundColor: c.ink,
  },
  zoneBarOuter: {
    height: 10,
    borderRadius: 5,
    backgroundColor: c.soft,
    overflow: "hidden",
  },
  metaFooter: {
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 8,
    gap: 2,
  },
  metaFooterLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: c.fieldTeal,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  bentoTile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.line,
    padding: 12,
    gap: 6,
  },
  vitalCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: c.soft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.line,
    padding: 10,
    gap: 5,
  },
  bentoKicker: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: c.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bentoValue: {
    fontSize: 20,
    fontFamily: fonts.bodyBold,
    color: c.ink,
    fontVariant: ["tabular-nums"],
  },
  ribbonBar: {
    backgroundColor: c.ink,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tickerItem: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  tickerSymbol: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: c.tennis,
  },
  tickerValue: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: c.card,
    fontVariant: ["tabular-nums"],
  },
  tickerDelta: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
  },
  tickerSub: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: "#b8c7d1",
  },
  tickerSep: {
    width: 1,
    height: 14,
    backgroundColor: "#2c4659",
  },
  backSubpageBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: c.ink,
    alignSelf: "flex-start",
  },
  backSubpageText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: c.card,
  },
});

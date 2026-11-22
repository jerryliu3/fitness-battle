import { useEffect, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { RaceCoverage } from "@fitness-battle/shared";
import {
  getCachedCoursePreviews,
  getCachedCoverage,
  loadAndCompileReplayField,
  loadCoursePreviewsCached,
  loadCoverageCached,
} from "../lib/observatory-replay-cache";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { FocusButton, FocusSegments, FocusSheet } from "../ui/focus";
import { IconButton } from "../ui/icon-button";
import { AppText } from "../ui/section";
import { MyResultsTab } from "./my-results-tab";
import { ObservatoryTab } from "./observatory-tab";
import { ReplayStudioView } from "./replay-studio-view";

type ShellTab = "observatory" | "replay" | "my_results";

const SHELL_TABS: readonly { value: ShellTab; label: string }[] = [
  { value: "observatory", label: "Overview" },
  { value: "replay", label: "Replay Studio" },
  { value: "my_results", label: "My Results" },
];

export function ObservatoryReplayShell({
  initialTab = "observatory",
  initialDistance = "marathon",
  initialEdition = "",
  initialSex = "all",
  initialQuery = "",
  initialIds = "",
}: {
  initialTab?: "observatory" | "replay";
  initialDistance?: string;
  initialEdition?: string;
  initialSex?: string;
  initialQuery?: string;
  initialIds?: string;
}) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ShellTab>(initialTab);
  const [replayMounted, setReplayMounted] = useState<boolean>(initialTab === "replay");
  const [myResultsMounted, setMyResultsMounted] = useState<boolean>(false);
  const [replayScope, setReplayScope] = useState<{
    edition: string;
    distance: string;
    sex: string;
    ids: string;
  }>({
    edition: initialEdition || "6",
    distance: initialDistance || "marathon",
    sex: initialSex || "all",
    ids: initialIds || "",
  });

  const [coverage, setCoverage] = useState<RaceCoverage[] | null>(() => getCachedCoverage());
  const [coursePreviews, setCoursePreviews] = useState<Record<string, [number, number][]>>(() =>
    getCachedCoursePreviews(),
  );
  const [authPrompt, setAuthPrompt] = useState<{ action: "save" | "pin"; target?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadCoverageCached().then(list => {
      if (!cancelled && list) setCoverage(list);
    });
    void loadCoursePreviewsCached().then(map => {
      if (!cancelled && map) setCoursePreviews(map);
    });
    const timer = setTimeout(() => {
      void loadAndCompileReplayField({
        editionId: Number(initialEdition || 6),
        distanceSlug: initialDistance || "marathon",
        sex: initialSex || "all",
        ids: initialIds || null,
      }).catch(() => {});
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [initialDistance, initialEdition, initialIds, initialSex]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.paper }]} edges={["top", "bottom"]}>
      {/* Progress-style Underline Tabs Masthead */}
      <View style={s.mast}>
        <View style={s.headerTop}>
          <IconButton
            icon="back"
            label="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/arena"))}
          />
          <AppText role="heading" style={{ flex: 1 }}>
            Rankings & Replay
          </AppText>
        </View>

        <FocusSegments
          variant="tabs"
          label="Overview, Replay Studio, and My Results"
          value={activeTab}
          options={SHELL_TABS}
          onChange={next => {
            if (next === "replay") setReplayMounted(true);
            if (next === "my_results") setMyResultsMounted(true);
            setActiveTab(next);
          }}
        />
      </View>

      {/* Keep visited tabs mounted in memory for zero-lag switching */}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: activeTab === "observatory" ? "flex" : "none" }}>
          <ObservatoryTab
            initialDistance={initialDistance}
            initialEdition={initialEdition}
            initialSex={initialSex}
            initialQuery={initialQuery}
            coverage={coverage}
            coursePreviews={coursePreviews}
            onRequireAuth={(action, target) => setAuthPrompt({ action, target })}
            onOpenReplay={opts => {
              setReplayScope({
                edition: String(opts.editionId),
                distance: opts.distanceSlug,
                sex: opts.sex,
                ids: opts.ids ?? "",
              });
              setReplayMounted(true);
              setActiveTab("replay");
            }}
          />
        </View>

        {replayMounted ? (
          <View style={{ flex: 1, display: activeTab === "replay" ? "flex" : "none" }}>
            <ReplayStudioView
              active={activeTab === "replay"}
              initialEdition={replayScope.edition}
              initialDistance={replayScope.distance}
              initialSex={replayScope.sex}
              initialIds={replayScope.ids}
              coverage={coverage}
              coursePreviews={coursePreviews}
              onRequireAuth={(action, target) => setAuthPrompt({ action, target })}
            />
          </View>
        ) : null}

        {myResultsMounted ? (
          <View style={{ flex: 1, display: activeTab === "my_results" ? "flex" : "none" }}>
            <MyResultsTab
              onExploreDistance={() => setActiveTab("observatory")}
              onCreateAccount={() => router.push("/welcome")}
            />
          </View>
        ) : null}
      </View>

      {/* Signed-Out Account Creation Popup Sheet */}
      <FocusSheet
        open={authPrompt !== null}
        title={authPrompt?.action === "pin" ? "Pin to Overview" : "Save to Overtaek"}
        onClose={() => setAuthPrompt(null)}
      >
        <View style={{ gap: 14 }}>
          <AppText role="body" secondary>
            Create a free Overtaek account to unlock{" "}
            <AppText role="label">{authPrompt?.target ?? "saved results and race watchlists"}</AppText> across Overview and Replay Studio.
          </AppText>
          <View style={{ gap: 10 }}>
            <FocusButton
              label="Create free account →"
              onPress={() => {
                setAuthPrompt(null);
                router.push("/welcome");
              }}
            />
            <FocusButton label="Cancel" secondary onPress={() => setAuthPrompt(null)} />
          </View>
        </View>
      </FocusSheet>
    </SafeAreaView>
  );
}

const sThemes = createThemedStyles(c => ({
  safe: {
    flex: 1,
  },
  mast: {
    backgroundColor: c.card,
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 2,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
}));

import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { RaceCoverage } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { mobileEnv } from "../lib/env";
import { useRaceFavorites } from "../lib/race-favorites";
import { createThemedStyles, useThemeColors, useThemedStyles } from "../theme";
import { FocusButton, FocusSheet } from "../ui/focus";
import { AppText } from "../ui/section";
import { ObservatoryTab } from "./observatory-tab";
import { ReplayStudioView } from "./replay-studio-view";

let coverageMemoryCache: RaceCoverage[] | null = null;
let coursePreviewsMemoryCache: Record<string, [number, number][]> = {};

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
  const { user } = useAuth();
  const saved = useRaceFavorites();

  const [activeTab, setActiveTab] = useState<"observatory" | "replay">(initialTab);
  const [replayMounted, setReplayMounted] = useState<boolean>(initialTab === "replay");
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

  const [coverage, setCoverage] = useState<RaceCoverage[] | null>(coverageMemoryCache);
  const [coursePreviews, setCoursePreviews] = useState<Record<string, [number, number][]>>(coursePreviewsMemoryCache);
  const [authPrompt, setAuthPrompt] = useState<{ action: "save" | "pin"; target?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!coverageMemoryCache) {
      fetch(`${mobileEnv.apiUrl}/api/rankings/coverage`)
        .then(r => (r.ok ? (r.json() as Promise<RaceCoverage[]>) : null))
        .then(list => {
          if (!cancelled && Array.isArray(list)) {
            coverageMemoryCache = list;
            setCoverage(list);
          }
        })
        .catch(() => {});
    }
    if (Object.keys(coursePreviewsMemoryCache).length === 0) {
      fetch(`${mobileEnv.apiUrl}/api/rankings/courses`)
        .then(r => (r.ok ? (r.json() as Promise<Record<string, [number, number][]>>) : null))
        .then(map => {
          if (!cancelled && map && typeof map === "object") {
            coursePreviewsMemoryCache = map;
            setCoursePreviews(map);
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const isSignedIn = user?.mode === "supabase";
  const savedCount = isSignedIn && saved.ready ? saved.ids.length : 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.paper }]} edges={["top", "bottom"]}>
      {/* Connected Masthead with Back, Observatory | Replay Studio Switcher & Saved Pill */}
      <View style={s.mast}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/arena"))}
          style={s.backBtn}
        >
          <AppText role="label" style={{ fontSize: 16 }}>←</AppText>
        </Pressable>

        <View style={s.navTrack} accessibilityRole="tablist">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "observatory" }}
            onPress={() => setActiveTab("observatory")}
            style={[s.navTab, activeTab === "observatory" && s.navTabActive]}
          >
            <AppText
              role="label"
              style={[s.navTabText, activeTab === "observatory" && s.navTabTextActive]}
            >
              Observatory
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "replay" }}
            onPress={() => {
              setReplayMounted(true);
              setActiveTab("replay");
            }}
            style={[s.navTab, activeTab === "replay" && s.navTabActive]}
          >
            <AppText
              role="label"
              style={[s.navTabText, activeTab === "replay" && s.navTabTextActive]}
            >
              ▶ Replay Studio
            </AppText>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Saved race results"
          onPress={() => {
            if (isSignedIn) router.push("/saved-race-results");
            else setAuthPrompt({ action: "save", target: "your saved results list" });
          }}
          style={s.savedPill}
        >
          <AppText role="caption" style={{ fontWeight: "700", color: c.ink }}>
            {savedCount > 0 ? `★ ${savedCount}` : "☆ Saved"}
          </AppText>
        </Pressable>
      </View>

      {/* Keep both tabs mounted in memory once visited for instant switching */}
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
      </View>

      {/* Signed-Out Account Creation Popup Sheet */}
      <FocusSheet
        open={authPrompt !== null}
        title={authPrompt?.action === "pin" ? "Pin to Observatory" : "Save to Overtaek"}
        onClose={() => setAuthPrompt(null)}
      >
        <View style={{ gap: 14 }}>
          <AppText role="body" secondary>
            Create a free Overtaek account to unlock{" "}
            <AppText role="label">{authPrompt?.target ?? "saved results and race watchlists"}</AppText> across Observatory and Replay Studio.
          </AppText>
          <View style={{ gap: 10 }}>
            <FocusButton
              label="Create free account →"
              onPress={() => {
                setAuthPrompt(null);
                router.push("/welcome");
              }}
            />
            <FocusButton
              label="Cancel"
              secondary
              onPress={() => setAuthPrompt(null)}
            />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
  },
  navTrack: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 999,
    backgroundColor: "#e9eff2",
    padding: 3,
    gap: 3,
  },
  navTab: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  navTabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#142b3b",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  navTabText: {
    fontSize: 12.5,
    color: c.muted,
    fontWeight: "700",
  },
  navTabTextActive: {
    color: c.ink,
  },
  savedPill: {
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: c.line,
    alignItems: "center",
    justifyContent: "center",
  },
}));

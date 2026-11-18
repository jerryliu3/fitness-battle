import { useFocusStyles } from "../ui/focus";
import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  athleteCardModelForPeer,
  distanceUnitLabel,
  formatDistanceM,
  formatMemberSince,
  SPORTS,
  type AthleteCardModel,
  type AwardCardModel,
  type ClubAchievement,
} from "@fitness-battle/shared";
import { ScreenHeader } from "../ui/screen-header";
import { AppText, SectionHeader, SectionStack } from "../ui/section";
import { AthleteCrest } from "./athlete-crest";
import { AchievementMeter } from "./achievement-meter";
import { useAchievementTileStyle } from "./achievements-catalog";
import { AwardShelf } from "../ui/award-shelf";
import { useAuth } from "../lib/auth";
import { mobileEnv } from "../lib/env";
import { requestApi } from "../lib/api";
import { useCompeteStore } from "../lib/compete-store";
import { supabase } from "../lib/supabase";

type PublicProfilePayload = {
  card: AthleteCardModel;
  awards: AwardCardModel[];
  achievements: ClubAchievement[];
  season: { meters: number; sessions: number; weeks: number };
  units: "metric" | "us";
  proudMoments: { id: string; label: string; detail: string }[];
  memberSince: string | null;
};

type ProfileRow = {
  city: string | null;
  country_code: string | null;
  created_at: string;
  lifetime_overtakes: number | null;
  primary_sport: string | null;
  display_name: string;
  avatar_url: string | null;
};

export function AthletePublicProfileScreen() {
  const f = useFocusStyles();
  const styles = useThemedStyles(stylesThemes);
  const appearanceColors = useThemeColors();
  const achievementTileStyle = useAchievementTileStyle();
  const router = useRouter();
  const { user, accessToken, offlineMode } = useAuth();
  const { state: ownState } = useCompeteStore();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    avatarUrl?: string;
    score?: string;
    contextLabel?: string;
    contextValue?: string;
    contextDetail?: string;
  }>();

  const athleteId = typeof params.id === "string" ? params.id : "";
  const isSelf = Boolean(user?.id && athleteId && user.id === athleteId);
  const [loading, setLoading] = useState(!isSelf);
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState<PublicProfilePayload | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!athleteId || isSelf) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [{ data: row }, payload] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, avatar_url, city, country_code, created_at, lifetime_overtakes, primary_sport")
            .eq("id", athleteId)
            .maybeSingle(),
          !offlineMode && accessToken
            ? requestApi<PublicProfilePayload>(
                mobileEnv.apiUrl,
                accessToken,
                `/api/athletes/${encodeURIComponent(athleteId)}/profile`,
                { cacheMs: 30_000 },
              ).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (row) setProfile(row as ProfileRow);
        if (payload) setRemote(payload);
        if (!row && !payload) setError("This athlete profile is unavailable.");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, athleteId, isSelf, offlineMode]);

  useEffect(() => {
    if (isSelf) router.replace("/athlete");
  }, [isSelf, router]);

  const cardModel = useMemo(() => {
    if (remote?.card) return remote.card;
    const name = profile?.display_name ?? params.name ?? "Athlete";
    const sportName = profile?.primary_sport
      ? SPORTS.find((item) => item.id === profile.primary_sport)?.name ?? profile.primary_sport
      : undefined;
    const memberSince = profile?.created_at ? formatMemberSince(profile.created_at) : null;
    const score = params.score ? Number(params.score) : null;
    return athleteCardModelForPeer({
      name,
      avatarUrl: profile?.avatar_url ?? params.avatarUrl,
      score: Number.isFinite(score) ? score : null,
      city: profile?.city,
      countryCode: profile?.country_code,
      overtakes: profile?.lifetime_overtakes ?? undefined,
      memberSince,
      sport: sportName,
    });
  }, [params.avatarUrl, params.name, params.score, profile, remote?.card]);

  const awards = remote?.awards ?? [];
  const achievements = remote?.achievements ?? [];
  const season = remote?.season ?? null;
  const units = remote?.units ?? "us";
  const proudMoments = remote?.proudMoments ?? [];

  if (isSelf && ownState) return null;

  if (!athleteId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScreenHeader localBack title="Athlete" onBack={() => router.back()} />
        <View style={f.content}>
          <AppText role="body" secondary>
            This profile is unavailable.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        localBack
        title={cardModel.name}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/today"))}
      />
      <ScrollView contentContainerStyle={f.content} showsVerticalScrollIndicator={false}>
        <SectionStack divided={false}>
          <AthleteCrest model={cardModel} />
          {params.contextValue ? (
            <View style={f.section}>
              <SectionHeader title={params.contextLabel ?? "This week"} />
              <AppText role="display">{params.contextValue}</AppText>
              {params.contextDetail ? (
                <AppText role="body" secondary>
                  {params.contextDetail}
                </AppText>
              ) : null}
            </View>
          ) : null}
          {loading ? (
            <AppText role="body" secondary>
              Loading profile…
            </AppText>
          ) : error && !remote ? (
            <AppText role="body" secondary>
              {error}
            </AppText>
          ) : null}
          {achievements.length > 0 ? (
            <View style={f.section}>
              <SectionHeader title="Achievements" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {achievements.map((row) => (
                  <View key={row.id} style={[achievementTileStyle.tile, { flex: 1 }]}>
                    <AchievementMeter row={row} />
                    <AppText role="label" style={{ textAlign: "center" }}>
                      {Math.min(row.current, row.target).toLocaleString()} / {row.target.toLocaleString()}
                    </AppText>
                    <AppText role="caption" secondary style={{ textAlign: "center" }}>
                      {row.title}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {awards.length > 0 ? (
            <View style={f.section}>
              <SectionHeader title="Podium & Awards" subtitle="Season awards and battle honors" />
              <AwardShelf cards={awards} />
            </View>
          ) : null}
          {season ? (
            <View style={f.section}>
              <SectionHeader title="Since the first mile" subtitle="Counted training" />
              <View style={[f.row, { paddingVertical: 12, justifyContent: "space-around" }]}>
                <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
                  <AppText role="display">{formatDistanceM(season.meters, units)}</AppText>
                  <AppText role="caption" secondary>
                    {distanceUnitLabel(units)} total
                  </AppText>
                </View>
                <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
                  <AppText role="display">{season.sessions}</AppText>
                  <AppText role="caption" secondary>
                    Sessions
                  </AppText>
                </View>
                <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
                  <AppText role="display">{season.weeks}</AppText>
                  <AppText role="caption" secondary>
                    Active weeks
                  </AppText>
                </View>
                <View style={{ alignItems: "center", gap: 4, flex: 1 }}>
                  <AppText role="display">{cardModel.overtakes}</AppText>
                  <AppText role="caption" secondary>
                    Overtakes
                  </AppText>
                </View>
              </View>
            </View>
          ) : null}
          {proudMoments.length > 0 ? (
            <View style={f.section}>
              <SectionHeader title="A few proud moments" subtitle="Milestones earned by showing up" />
              <View style={[f.row, { gap: 12, flexWrap: "wrap" }]}>
                {proudMoments.map((moment) => (
                  <View
                    key={moment.id}
                    style={[
                      f.card,
                      {
                        flex: 1,
                        minWidth: "45%",
                        padding: 14,
                        gap: 4,
                        backgroundColor: appearanceColors.card,
                      },
                    ]}
                  >
                    <AppText role="label">{moment.label}</AppText>
                    <AppText role="caption" secondary>
                      {moment.detail}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {error && remote ? (
            <AppText role="caption" secondary>
              Some profile details may be incomplete.
            </AppText>
          ) : null}
        </SectionStack>
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesThemes = createThemedStyles((themeColors) => ({
  safe: { flex: 1, backgroundColor: themeColors.paper },
}));
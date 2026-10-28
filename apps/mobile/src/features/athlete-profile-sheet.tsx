import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { SPORTS } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCompeteStore } from "../lib/compete-store";
import { supabase } from "../lib/supabase";
import { FocusButton, FocusSheet, f } from "../ui/focus";
import { AppText, SectionHeader } from "../ui/section";
import { AthleteProfileCard } from "./athlete-profile-card";

export type AthleteProfileSelection = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  you?: boolean;
  sample?: boolean;
  score?: number | null;
  contextLabel?: string;
  contextValue?: string;
  contextDetail?: string;
};

type PublicProfile = { city: string | null; created_at: string; lifetime_overtakes: number | null; primary_sport: string | null };
const isAccountId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function AthleteProfileSheet({ athlete, onClose }: { athlete: AthleteProfileSelection | null; onClose: () => void }) {
  const { user, offlineMode } = useAuth();
  const { state } = useCompeteStore();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [openOwnPage, setOpenOwnPage] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    if (athlete && !athlete.you && !athlete.sample && user && !offlineMode && isAccountId(athlete.id)) {
      void supabase.from("profiles").select("city, created_at, lifetime_overtakes, primary_sport").eq("id", athlete.id).maybeSingle().then(({ data }) => {
        if (!cancelled && data) setProfile(data as PublicProfile);
      });
    }
    return () => { cancelled = true; };
  }, [athlete?.id, athlete?.you, athlete?.sample, user?.id, offlineMode]);
  const own = athlete?.you && state ? state : null;
  const city = own?.city ?? profile?.city;
  const sport = own?.primary ?? profile?.primary_sport;
  const sportName = SPORTS.find((item) => item.id === sport)?.name;
  const overtakes = own ? own.lifetimeOvertakes : profile?.lifetime_overtakes;
  const joined = athlete?.you ? user?.createdAt : profile?.created_at;
  const joinedYear = joined && Number.isFinite(Date.parse(joined)) ? new Date(joined).getUTCFullYear() : null;
  return <FocusSheet open={!!athlete} title="Athlete profile" onClose={onClose} onClosed={() => {
    if (openOwnPage) { setOpenOwnPage(false); router.navigate("/athlete"); }
  }}>
    {athlete ? <View style={{ gap: 20 }}>
      <AthleteProfileCard name={athlete.name} avatarUrl={athlete.avatarUrl} city={city} score={athlete.score} since={joinedYear ? `Since ${joinedYear}` : undefined} />
      {athlete.sample ? <AppText role="caption" secondary>Sample athlete</AppText> : null}
      {athlete.contextValue ? <View style={f.section}>
        <SectionHeader title={athlete.contextLabel ?? "This week"} />
        <AppText role="display">{athlete.contextValue}</AppText>
        {athlete.contextDetail ? <AppText role="body" secondary>{athlete.contextDetail}</AppText> : null}
      </View> : null}
      {overtakes != null || sportName ? <View style={f.section}>
        <SectionHeader title="Athlete details" />
        <View style={[f.row, { gap: 16 }]}>
          {overtakes != null ? <View style={{ flex: 1, gap: 4 }}><AppText role="heading">{overtakes}</AppText><AppText role="caption" secondary>Overtakes</AppText></View> : null}
          {sportName ? <View style={{ flex: 1, gap: 4 }}><AppText role="heading">{sportName}</AppText><AppText role="caption" secondary>Primary sport</AppText></View> : null}
        </View>
      </View> : null}
      {athlete.you ? <FocusButton label="Your Athlete page" secondary onPress={() => { setOpenOwnPage(true); onClose(); }} /> : null}
    </View> : null}
  </FocusSheet>;
}

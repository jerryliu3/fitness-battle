import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SPORTS } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";
import { useCompeteStore } from "../lib/compete-store";
import { supabase } from "../lib/supabase";
import { FocusButton, FocusSheet, f } from "../ui/focus";
import { AppText, SectionHeader } from "../ui/section";
import { AppIcon } from "../ui/app-icon";
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
  const { user, accessToken, offlineMode } = useAuth();
  const { state } = useCompeteStore();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [openOwnPage, setOpenOwnPage] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const key = `${user?.id ?? ""}:${athlete?.id ?? ""}`;
  const current = useRef(key);
  current.current = key;
  useEffect(() => {
    let cancelled = false;
    setProfile(null); setReporting(false); setMessage(""); setNotice(""); setBusy(false);
    if (athlete && !athlete.you && !athlete.sample && user && !offlineMode && isAccountId(athlete.id)) {
      void supabase.from("profiles").select("city, created_at, lifetime_overtakes, primary_sport").eq("id", athlete.id).maybeSingle().then(({ data }) => {
        if (!cancelled && data) setProfile(data as PublicProfile);
      });
    }
    return () => { cancelled = true; };
  }, [athlete?.id, athlete?.you, athlete?.sample, user?.id, offlineMode]);
  async function submitReport() {
    if (!athlete || busy || message.trim().length < 10) return;
    const targetKey = key;
    setBusy(true); setNotice("");
    try {
      const result = await requestApi<{ sent?: boolean }>(mobileEnv.apiUrl, accessToken, "/api/issues", {
        body: { message: `Athlete report\nReported account: ${athlete.id}\n\n${message.trim()}` },
      });
      if (!result.sent) throw new Error("Your report could not be sent. Please try again.");
      if (current.current === targetKey) { setReporting(false); setMessage(""); setNotice("Report sent to the support team."); }
    } catch (error) {
      if (current.current === targetKey) setNotice(error instanceof Error ? error.message : "Could not send your report.");
    } finally { if (current.current === targetKey) setBusy(false); }
  }
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
      {!athlete.you && !athlete.sample && isAccountId(athlete.id) && user && !offlineMode ? reporting ? <View style={{ gap: 10 }}>
        <AppText role="heading">Report {athlete.name}?</AppText>
        <AppText role="body" secondary>Tell us what happened. Your report goes to the support team when you confirm.</AppText>
        <TextInput accessibilityLabel="Reason for reporting this athlete" multiline style={[f.input, { minHeight: 100, textAlignVertical: "top" }]} value={message} onChangeText={setMessage} maxLength={4900} editable={!busy} />
        <FocusButton label={busy ? "Sending…" : "Send report"} disabled={busy || message.trim().length < 10} onPress={() => void submitReport()} />
        <FocusButton label="Cancel" secondary disabled={busy} onPress={() => setReporting(false)} />
      </View> : <Pressable accessibilityRole="button" accessibilityLabel="Report athlete" onPress={() => { setNotice(""); setReporting(true); }} style={[f.row, { alignSelf: "flex-start", gap: 8, minHeight: 44 }]}><AppIcon name="compete" size={18} /><AppText role="label">Report</AppText></Pressable> : null}
      {notice ? <AppText role="body" secondary accessibilityLiveRegion="polite">{notice}</AppText> : null}
      {athlete.you ? <FocusButton label="Your Athlete page" secondary onPress={() => { setOpenOwnPage(true); onClose(); }} /> : null}
    </View> : null}
  </FocusSheet>;
}

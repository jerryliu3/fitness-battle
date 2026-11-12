import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { crewDerbyOpponent, crewDerbyScore, weeklyCompetitionLastDay, APP_TIMEZONE, type CrewDerby, type UnitSystem } from "@fitness-battle/shared";
import { useCachedApi } from "../lib/use-cached-api";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { FocusSheet, FocusButton, useFocusStyles } from "../ui/focus";

export function CrewDerbyCard({ crewId, units }: { crewId: string; units?: UnitSystem }) {
  const c = useThemeColors(), f = useFocusStyles(), router = useRouter();
  const api = useCachedApi<{ derby: CrewDerby | null }>(`/api/crews/derby?crewId=${encodeURIComponent(crewId)}`);
  const [open, setOpen] = useState(false);
  const [navigate, setNavigate] = useState(false);
  const derby = api.data?.derby;
  const own = derby?.teams.find(team => team.crew_id === crewId);
  const opponent = derby && crewDerbyOpponent(derby, crewId);
  if (!derby || !own || !opponent) return null;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Crew Derby standings" onPress={() => { setOpen(true); void api.reload(); }} style={[f.card, { backgroundColor: c.surfaceInverse, gap: 16 }]}>
      <AppText role="caption" style={{ color: c.textOnInverse }}>Crew Derby</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}><AppText role="row" style={{ color: c.textOnInverse }}>{own.name}</AppText><AppText role="value" style={{ color: c.tennis }}>{crewDerbyScore(derby.sport, own.score, units)}</AppText></View>
        <AppText role="caption" style={{ color: c.textOnInverse }}>vs</AppText>
        <View style={{ flex: 1, gap: 6 }}><AppText role="row" style={{ color: c.textOnInverse }}>{opponent.name}</AppText><AppText role="value" style={{ color: c.tennis }}>{crewDerbyScore(derby.sport, opponent.score, units)}</AppText></View>
      </View>
    </Pressable>
    <FocusSheet open={open} title="Crew Derby" minimal onClose={() => setOpen(false)} onClosed={() => { if (navigate) { setNavigate(false); router.navigate({ pathname: "/arena", params: { event: derby.sport } }); } }}>
      <AppText role="caption" secondary>{new Date(derby.wave_start).toLocaleDateString("en-US", { timeZone: APP_TIMEZONE })} – {weeklyCompetitionLastDay(new Date(derby.week_end)).toLocaleDateString("en-US", { timeZone: APP_TIMEZONE })} · {derby.sport}</AppText>
      {derby.teams.map(team => <View key={team.crew_id} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderColor: c.line }}><AppText role="caption" secondary>{team.place}</AppText><AppText role="row" style={{ flex: 1 }}>{team.name}{team.crew_id === crewId ? " · Us" : ""}</AppText><AppText role="value">{crewDerbyScore(derby.sport, team.score, units)}</AppText></View>)}
      <AppText role="caption" secondary>Each crew’s total is the sum of its registered members’ normal event scores.</AppText>
      {api.error ? <AppText role="caption" accessibilityRole="alert">Crew Derby could not refresh.</AppText> : null}
      <FocusButton label="Open sport event" onPress={() => { setNavigate(true); setOpen(false); }} />
    </FocusSheet>
  </>;
}

import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { APP_TIMEZONE, clubDuration, formatVolume, homeRecentActivities, sportById, type Activity, type CompeteState } from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { useCrewActivities } from "./use-crew-activities";
import { SHELL_COLORS as c } from "../theme";
import { FocusSheet, f } from "../ui/focus";

export function LatestActivity({ state, onOpen }: { state: CompeteState; onOpen: (activity: Activity) => void }) {
  const { user } = useAuth();
  const crew = useCrewActivities();
  const rows = homeRecentActivities(state, user?.id, crew.activities);
  const [selected, setSelected] = useState<{ account?: string; id: string } | null>(null);
  const detail = selected?.account === user?.id ? rows.find(row => row.id === selected?.id) : null;
  return <>
    {rows.length > 0 && <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={f.h2}>Latest activity</Text>
      {rows.map(row => <Pressable key={`${row.userId}:${row.id}`} accessibilityRole="button" onPress={() => row.ownActivity ? onOpen(row.ownActivity) : setSelected({ account: user?.id, id: row.id })}
        style={[f.row, { minHeight: 76, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }]}>
        {row.avatarUrl ? <Image source={{ uri: row.avatarUrl }} style={{ width: 42, height: 42, borderRadius: 14 }} /> : <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.actionSoft, alignItems: "center", justifyContent: "center" }}><Text style={f.h2}>↗</Text></View>}
        <View style={[f.grow, { gap: 4 }]}><Text style={f.rowTitle}>{row.ownActivity ? sportById(row.sport).name : `${row.name} · ${sportById(row.sport).name}`} · {clubDuration(row.movingSec)}</Text>
          <Text style={f.small}>{row.verified ? "GPS Tracked" : row.source === "manual" ? "Manual activity" : "Activity"}</Text></View>
        <Text style={f.small}>{new Date(row.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: APP_TIMEZONE })} →</Text>
      </Pressable>)}
    </View>}
    {crew.error && <Text style={f.small} accessibilityLiveRegion="polite">{crew.error}</Text>}
    <FocusSheet open={Boolean(detail)} title={detail ? `${detail.name}'s activity` : "Activity"} onClose={() => setSelected(null)}>
      {detail && <><Text style={f.h2}>{sportById(detail.sport).name}</Text><Text style={f.copy}>{clubDuration(detail.movingSec)} · {formatVolume(detail.sport, detail.distanceM, detail.movingSec, state.units)}</Text>
        <Text style={f.small}>{new Date(detail.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: APP_TIMEZONE, timeZoneName: "short" })}</Text></>}
    </FocusSheet>
  </>;
}

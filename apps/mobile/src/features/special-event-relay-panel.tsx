import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import {
  formatSpecialEventVolume,
  relayDayLabel,
  relayDaysBetween,
  relayDraftToLegs,
  relayTodayHeadline,
  type SpecialEventEdition,
  type SpecialEventRelayLineup,
  type UnitSystem,
} from "@fitness-battle/shared";
import { useAuth } from "../lib/auth";
import { requestApi } from "../lib/api";
import { mobileEnv } from "../lib/env";
import { useCachedApi } from "../lib/use-cached-api";
import { useThemeColors } from "../theme";
import { AppText } from "../ui/section";
import { FocusButton } from "../ui/focus";

export function SpecialEventRelayPanel({
  edition,
  crewId,
  units,
}: {
  edition: SpecialEventEdition;
  crewId: string;
  units: UnitSystem;
}) {
  const c = useThemeColors();
  const { accessToken } = useAuth();
  const api = useCachedApi<{ lineup: SpecialEventRelayLineup }>(
    `/api/special-events/${encodeURIComponent(edition.id)}/relay?crewId=${encodeURIComponent(crewId)}`,
  );
  const lineup = api.data?.lineup ?? null;
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!lineup) return;
    const map: Record<string, string> = {};
    for (const leg of lineup.legs) map[`${leg.legDay}:${leg.slotIndex}`] = leg.userId;
    setDraft(map);
  }, [lineup]);

  if (!lineup) {
    return (
      <View style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
        <AppText role="caption" secondary>{api.error || "Loading baton schedule…"}</AppText>
      </View>
    );
  }

  const canEdit = lineup.assignmentMode === "manual" && (!lineup.finalized || lineup.lockPolicy === "pre_day");
  const todayHeadline = relayTodayHeadline(lineup);

  function cycleMember(key: string) {
    if (!lineup || !lineup.roster.length) return;
    const current = draft[key] ?? "";
    const ids = ["", ...lineup.roster.map((m) => m.userId)];
    const next = ids[(ids.indexOf(current) + 1) % ids.length] ?? "";
    setDraft((prev) => ({ ...prev, [key]: next }));
  }

  async function saveLineup() {
    if (!lineup || saving) return;
    setSaving(true);
    setNote("");
    try {
      const legs = relayDraftToLegs(draft, lineup.finalized ? lineup.todayDay : undefined);
      await requestApi(mobileEnv.apiUrl, accessToken, `/api/special-events/${encodeURIComponent(edition.id)}/relay`, {
        method: "PUT",
        body: { crewId, legs },
      });
      await api.reload({ silent: true });
      setNote("Baton lineup saved.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not save lineup.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.card, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <AppText role="label">Daily baton schedule</AppText>
        <AppText role="caption" secondary>
          {lineup.assignmentMode === "random" ? "Random draw" : lineup.finalized ? (canEdit ? "Locks midnight ET" : "Locked") : "Locks Mon 6 AM ET"}
        </AppText>
      </View>

      {!lineup.finalized && lineup.assignmentMode === "random" ? (
        <AppText role="caption" secondary>
          Baton days are drawn randomly across opted-in crewmates when the event starts Monday 6:00 AM ET.
        </AppText>
      ) : lineup.finalized && !canEdit ? (
        <View style={{ gap: 8 }}>
          {todayHeadline ? <AppText role="caption">{todayHeadline}</AppText> : null}
          <View style={{ flexDirection: "row", gap: 4 }}>
            {lineup.legs.slice(0, 7).map((leg) => (
              <View
                key={`strip:${leg.legDay}:${leg.slotIndex}`}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  paddingHorizontal: 2,
                  borderRadius: 10,
                  borderWidth: leg.isToday ? 2 : 1,
                  borderColor: leg.isToday ? c.podiumGold : c.line,
                  backgroundColor: leg.isToday ? c.actionSoft : c.paper,
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <AppText role="caption" secondary>{relayDayLabel(leg.legDay).split(" ")[0]}</AppText>
                <AppText role="caption" numberOfLines={1}>{leg.displayName.split(" ")[0]}</AppText>
              </View>
            ))}
          </View>
          {lineup.legs.map((leg) => (
            <View
              key={`${leg.legDay}:${leg.slotIndex}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 6,
                paddingHorizontal: 8,
                borderRadius: 10,
                backgroundColor: leg.isToday ? c.actionSoft : undefined,
                borderBottomWidth: 1,
                borderColor: c.line,
              }}
            >
              <AppText role="caption" secondary>{relayDayLabel(leg.legDay)}</AppText>
              <AppText role="label" style={{ flex: 1 }}>{leg.displayName}{leg.isYou ? " · You" : ""}</AppText>
              <AppText role="caption">{formatSpecialEventVolume(edition.sport, leg.score, units)}</AppText>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {todayHeadline ? <AppText role="caption">{todayHeadline}</AppText> : null}
          <AppText role="caption" secondary>
            {lineup.finalized
              ? "Past and today’s legs are locked; tap future days to reassign before midnight ET."
              : "Tap a day to assign a teammate (empty slots auto-fill at start)."}
            {lineup.maxLegsPerMember ? ` Max ${lineup.maxLegsPerMember} days each.` : ""}
          </AppText>
          {relayDaysBetween(lineup.startDay, lineup.endDay).map((day) =>
            Array.from({ length: lineup.legsPerDay }, (_, idx) => {
              const slot = idx + 1;
              const key = `${day}:${slot}`;
              const leg = lineup.legs.find((l) => l.legDay === day && l.slotIndex === slot);
              const dayLocked = Boolean(lineup.finalized && (leg?.locked || day <= lineup.todayDay));
              if (dayLocked && leg) {
                return (
                  <View key={key} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: leg.isToday ? c.actionSoft : undefined, borderBottomWidth: 1, borderColor: c.line }}>
                    <AppText role="caption" secondary>{relayDayLabel(day)}{lineup.legsPerDay > 1 ? ` #${slot}` : ""}</AppText>
                    <AppText role="label" style={{ flex: 1 }}>{leg.displayName}{leg.isYou ? " · You" : ""}</AppText>
                    <AppText role="caption">{formatSpecialEventVolume(edition.sport, leg.score, units)}</AppText>
                  </View>
                );
              }
              const assigned = lineup.roster.find((m) => m.userId === draft[key]);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => cycleMember(key)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper }}
                >
                  <AppText role="caption" secondary>
                    {relayDayLabel(day)}{lineup.legsPerDay > 1 ? ` #${slot}` : ""}
                  </AppText>
                  <AppText role="label">{assigned ? assigned.displayName : "Auto-assign"}</AppText>
                </Pressable>
              );
            }),
          )}
          <FocusButton label={saving ? "Saving…" : "Save baton lineup"} secondary disabled={saving} onPress={() => void saveLineup()} />
        </View>
      )}

      {note ? <AppText role="caption">{note}</AppText> : null}
    </View>
  );
}

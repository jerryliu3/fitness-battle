import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  crewRelay,
  formatVolume,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { f } from "../ui/focus";
export function CrewRelay({
  members,
  entries,
  sport,
  format,
  targetM,
  targetSessions,
  units,
}: {
  members: { user_id: string; display_name: string }[];
  entries: {
    user_id: string;
    distance_m: number;
    moving_sec: number;
    session_count?: number;
  }[];
  sport: SportId;
  format: string;
  targetM: number;
  targetSessions: number;
  units?: UnitSystem;
}) {
  const [selected, setSelected] = useState(""),
    sessions = format === "personal_target" || sport === "strength";
  const model = crewRelay(
    members.map((m) => {
      const rows = entries.filter((e) => e.user_id === m.user_id);
      return {
        id: m.user_id,
        name: m.display_name,
        value: rows.reduce(
          (t, e) =>
            t + Number(sessions ? (e.session_count ?? 1) : e.distance_m),
          0,
        ),
        sessions: rows.reduce((t, e) => t + Number(e.session_count ?? 1), 0),
      };
    }),
    sessions
      ? targetSessions * members.length
      : format === "cooperative"
        ? targetM
        : null,
  );
  const member =
    model.segments.find((m) => m.id === selected) ?? model.segments[0];
  const volume = (v: number) =>
    sessions ? `${v} sessions` : formatVolume(sport, v, 0, units);
  return (
    <View style={{ gap: 12, marginTop: 12 }}>
      <View
        accessible
        accessibilityLabel={`${volume(model.total)} together${model.target ? ` of ${volume(model.target)}` : ""}`}
        style={{
          height: 48,
          borderRadius: 12,
          backgroundColor: "#eef0e9",
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {model.segments.map((m) => (
          <View
            key={m.id}
            style={{
              width: `${m.fraction * 100}%`,
              backgroundColor: m.color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {m.fraction > 0.12 ? (
              <Text style={f.small}>{m.name.slice(0, 2).toUpperCase()}</Text>
            ) : null}
          </View>
        ))}
        {model.finish !== null ? (
          <View
            style={{
              position: "absolute",
              left: `${Math.min(0.99, model.finish) * 100}%`,
              top: 0,
              bottom: 0,
              width: 2,
              backgroundColor: "#282f2c",
            }}
          />
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={f.row}>
          {model.segments.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityState={{ selected: member?.id === m.id }}
              style={[f.chip, member?.id === m.id && f.chipActive]}
              onPress={() => setSelected(m.id)}
            >
              <Text>{m.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {member ? (
        <Text style={f.copy}>
          {volume(member.value)} · {(member.share * 100).toFixed(1)}% of the
          crew
          {!sessions
            ? ` · ${member.sessions} session${member.sessions === 1 ? "" : "s"}`
            : ""}
        </Text>
      ) : null}
    </View>
  );
}

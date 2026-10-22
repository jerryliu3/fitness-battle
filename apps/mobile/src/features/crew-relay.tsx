import { useId, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  G,
  Path,
  Pattern,
  Rect,
  Text as SvgText,
} from "react-native-svg";
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
  userId,
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
  userId?: string;
}) {
  const [selected, setSelected] = useState(""),
    prefix = useId(),
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
    model.segments.find((m) => m.id === (selected || userId)) ??
    model.segments[0];
  const volume = (v: number) =>
      sessions
        ? `${v} session${v === 1 ? "" : "s"}`
        : formatVolume(sport, v, 0, units),
    scale =
      model.target === null ? model.total : Math.max(model.total, model.target);
  return (
    <View style={{ gap: 12, marginTop: 10 }}>
      <Svg
        viewBox="0 0 360 148"
        width="100%"
        height={160}
        accessibilityLabel={`${volume(model.total)} together${model.target ? ` of ${volume(model.target)}` : ""}`}
      >
        <Defs>
          <Pattern
            id={`${prefix}-weave`}
            width={6}
            height={5}
            patternUnits="userSpaceOnUse"
          >
            <Path d="M0 0H6" stroke="#282f2c" strokeOpacity={0.12} />
          </Pattern>
          <Pattern
            id={`${prefix}-finish`}
            width={8}
            height={8}
            patternUnits="userSpaceOnUse"
          >
            <Rect width={8} height={8} fill="white" />
            <Path d="M0 0H4V4H0ZM4 4H8V8H4Z" fill="#282f2c" />
          </Pattern>
          <ClipPath id={`${prefix}-tape`}>
            <Rect x={14} y={36} width={332} height={66} rx={8} />
          </ClipPath>
        </Defs>
        <G transform="rotate(-4 180 69)">
          <Rect x={14} y={44} width={332} height={66} rx={8} fill="#d4dacd" />
          <Rect
            x={14}
            y={36}
            width={332}
            height={66}
            rx={8}
            fill="#eef0e9"
            stroke="#d7ddcf"
          />
          <G clipPath={`url(#${prefix}-tape)`}>
            {model.segments
              .filter((m) => m.value > 0)
              .map((m) => (
                <G
                  key={m.id}
                  onPress={() => setSelected(m.id)}
                  accessibilityLabel={`${m.name}, ${volume(m.value)}`}
                >
                  <Rect
                    x={14 + m.start * 332}
                    y={36}
                    width={m.fraction * 332}
                    height={66}
                    fill={member?.id === m.id ? "#f1c75b" : m.color}
                  />
                  <Rect
                    x={14 + m.start * 332}
                    y={36}
                    width={m.fraction * 332}
                    height={66}
                    fill={`url(#${prefix}-weave)`}
                  />
                  <Path
                    d={`M ${14 + m.start * 332} 38 V100`}
                    stroke="#ffffff90"
                    strokeWidth={2}
                  />
                  {m.fraction > 0.1 ? (
                    <SvgText
                      x={14 + (m.start + m.fraction / 2) * 332}
                      y={73}
                      textAnchor="middle"
                      fill="#282f2c"
                      fontSize={11}
                      fontWeight="700"
                    >
                      {m.id === userId
                        ? "YOU"
                        : m.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                    </SvgText>
                  ) : null}
                </G>
              ))}
          </G>
          {model.finish !== null ? (
            <>
              <Rect
                x={Math.min(338, 14 + model.finish * 332 - 4)}
                y={25}
                width={8}
                height={89}
                fill={`url(#${prefix}-finish)`}
              />
              <Path
                d={`M ${Math.min(342, 14 + model.finish * 332)} 25 v-9 h17 l-5 6 5 6 h-17`}
                fill="#282f2c"
              />
            </>
          ) : null}
        </G>
        <SvgText x={14} y={140} fill="#616c63" fontSize={10}>
          0
        </SvgText>
        <SvgText x={346} y={140} textAnchor="end" fill="#616c63" fontSize={10}>
          {volume(scale)}
          {model.target !== null && model.total > model.target
            ? " · beyond goal"
            : ""}
        </SvgText>
      </Svg>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={f.row}>
          {model.segments.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={`Inspect ${m.name}'s contribution`}
              accessibilityState={{ selected: member?.id === m.id }}
              style={[f.chip, member?.id === m.id && f.chipActive]}
              onPress={() => setSelected(m.id)}
            >
              <Text>{m.id === userId ? "You" : m.name.split(" ")[0]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {member ? (
        <View
          style={[
            f.row,
            { backgroundColor: "#eef0e9", borderRadius: 16, padding: 16 },
          ]}
        >
          <View style={[f.avatar, { backgroundColor: member.color }]}>
            <Text>
              {member.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={f.rowTitle}>
              {member.id === userId ? "Your contribution" : member.name}
            </Text>
            <Text style={f.copy}>
              {volume(member.value)}
              {!sessions
                ? ` · ${member.sessions} session${member.sessions === 1 ? "" : "s"}`
                : ""}
            </Text>
            <Text style={f.small}>
              {(member.share * 100).toFixed(1)}% of the crew
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

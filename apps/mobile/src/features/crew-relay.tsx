import { useId, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { G, Text as SvgText } from "react-native-svg";
import {
  crewWeekRelay,
  crewRelayScene,
  formatVolume,
  type CrewWeekRelayInput,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { drawFieldNode } from "../ui/field-course";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";
type Props = CrewWeekRelayInput & { units?: UnitSystem; userId?: string };
export function CrewRelay(props: Props) {
  const { members, sport, units, userId } = props;
  const [selected, setSelected] = useState(""),
    [width, setWidth] = useState(320),
    prefix = useId();
  const { model, sessions, kind, target, label } = crewWeekRelay(props);
  const w = Math.max(width, members.length * 64 + 32),
    scene = crewRelayScene(model, w, prefix);
  const member =
    model.segments.find((m) => m.id === (selected || userId)) ??
    model.segments[0];
  const volume = (value: number) =>
    sessions
      ? `${value} sessions`
      : formatVolume(sport as SportId, value, 0, units);
  return (
    <View
      style={{ gap: 12, marginTop: 12 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={f.row}>
        <Text style={[f.small, f.grow]}>{label}</Text>
        {target ? <Text style={f.rowTitle}>{volume(target)}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={w > width}>
        <View style={{ width: w, height: scene.height }}>
          <Svg
            width={w}
            height={scene.height}
            accessibilityLabel={`${volume(model.total)} together${target ? ` of ${volume(target)} target` : "; target unavailable"}`}
          >
            {scene.ground.map(drawFieldNode)}
            {scene.segments.map(s=><G key={s.id}>{s.nodes.map(drawFieldNode)}</G>)}
            {scene.finish.map(drawFieldNode)}
            {target ? (
              <SvgText
                x={Math.max(64, Math.min(w - 64, (scene.finishX ?? 0) + 12))}
                y={222}
                textAnchor="middle"
                fill={c.ink}
                fontSize={11}
                fontWeight="700"
              >
                FINISH · {volume(target)}
              </SvgText>
            ) : (
              <SvgText
                x={w / 2}
                y={222}
                textAnchor="middle"
                fill={c.muted}
                fontSize={11}
              >
                A shared target has not been set
              </SvgText>
            )}
          </Svg>
          {scene.people.map((p) => {
            const m = model.segments.find((m) => m.id === p.id)!,
              person = members.find((m) => m.user_id === p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: member?.id === p.id }}
                accessibilityLabel={`${m.name}, ${volume(m.value)}`}
                onPress={() => setSelected(p.id)}
                style={[s.marker, { left: p.x - 28, top: p.y }]}
              >
                <View
                  style={[
                    s.photo,
                    { borderColor: member?.id === p.id ? c.ink : p.color },
                  ]}
                >
                  {person?.avatar_url ? (
                    <Image
                      source={{ uri: person.avatar_url }}
                      style={{ width: 34, height: 34, borderRadius: 17 }}
                    />
                  ) : (
                    <Text style={f.rowTitle}>
                      {m.name
                        .split(" ")
                        .map((v) => v[0])
                        .slice(0, 2)
                        .join("")}
                    </Text>
                  )}
                </View>
                <Text numberOfLines={1} style={[f.rowTitle, { fontSize: 11 }]}>
                  {m.name.split(" ")[0]}
                </Text>
                <Text numberOfLines={1} style={[f.small, { fontSize: 10 }]}>
                  {volume(m.value)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {member ? (
        <View accessibilityLiveRegion="polite">
          <Text style={f.rowTitle}>{member.name}</Text>
          <Text style={f.small}>
            {volume(member.value)} · {(member.share * 100).toFixed(1)}% of
            recorded crew activity · {member.sessions} {member.sessions===1?"session":"sessions"}
          </Text>
        </View>
      ) : null}
      {target ? (
        <Text style={f.small}>
          {model.remaining
            ? `${volume(model.remaining)} ${kind === "baseline" ? "to match last week" : "to the target"}`
            : model.total > target
              ? `${volume(model.total - target)} beyond ${kind === "baseline" ? "last week" : "the target"}`
              : "Target reached together."}
        </Text>
      ) : (
        <Text style={f.small}>
          Recorded contributions are shown without inventing a finish.
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  marker: {
    position: "absolute",
    width: 56,
    minHeight: 76,
    alignItems: "center",
    gap: 3,
  },
  photo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    backgroundColor: c.soft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

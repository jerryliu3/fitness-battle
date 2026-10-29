import { createThemedStyles, useThemedStyles, useThemeColors } from "../theme";
import { useFocusStyles } from "../ui/focus";
import { UserAvatar } from "../ui/user-avatar";
import { chartTextProps, AppText } from "../ui/section";
import { useEffect, useId, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Svg, { G, Text as SvgText } from "react-native-svg";
import {
  buildCrewRelayViewState,
  crewWeekRelay,
  type CrewWeekRelayInput,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { drawFieldNode } from "../ui/field-course";
import { SHELL_COLORS as c } from "../theme";
import { f } from "../ui/focus";

type Props = CrewWeekRelayInput & {
  units?: UnitSystem;
  userId?: string;
  /** Parent already presents the target and member details. */
  compact?: boolean;
  /** Hide the target row when the parent already shows it. */
  hideTargetSummary?: boolean;
  hiddenIds?: readonly string[];
  onSelectMember?: (id: string) => void;
};

export function CrewRelay(props: Props) {
  const c = useThemeColors();
  const s = useThemedStyles(sThemes);
  const f = useFocusStyles();

  const { members, sport, units, userId, compact, hideTargetSummary, onSelectMember, hiddenIds = [] } = props;
  const [selected, setSelected] = useState("");
  const [width, setWidth] = useState(320);
  const prefix = useId();
  const relay = crewWeekRelay(props);
  const view = buildCrewRelayViewState(relay, {
    selected,
    userId,
    containerWidth: width,
    scenePrefix: prefix,
    sport: sport as SportId,
    units,
  });

  useEffect(() => {
    if (
      selected &&
      !view.model.segments.some((segment) => segment.id === selected)
    ) {
      setSelected("");
    }
  }, [view.segmentKey, selected, view.model.segments]);

  const volume = view.volume;

  return (
    <View
      style={{ gap: 12, marginTop: 12 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {!compact && !hideTargetSummary && (
        <View style={f.row}>
          <AppText role="caption" secondary style={f.grow}>
            {view.label}
          </AppText>
          {view.target ? (
            <AppText role="value">{volume(view.target)}</AppText>
          ) : null}
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={view.width > width}
      >
        <View style={{ width: view.width, height: view.scene.height }}>
          <Svg
            width={view.width}
            height={view.scene.height}
            accessibilityLabel={`${volume(view.model.total)} together${view.target ? ` of ${volume(view.target)} target` : "; target unavailable"}`}
          >
            {view.scene.ground.map(drawFieldNode)}
            {view.scene.segments.map((s) => (
              <G key={s.id}>{s.nodes.map(drawFieldNode)}</G>
            ))}
            {view.scene.finish.map(drawFieldNode)}
            {view.target ? (
              <SvgText
                {...chartTextProps()}
                x={Math.max(
                  64,
                  Math.min(
                    view.width - 64,
                    (view.scene.finishX ?? 0) + 12,
                  ),
                )}
                y={222}
                textAnchor="middle"
                fill={c.ink}
              >
                FINISH · {volume(view.target)}
              </SvgText>
            ) : (
              <SvgText
                {...chartTextProps()}
                x={view.width / 2}
                y={222}
                textAnchor="middle"
                fill={c.muted}
              >
                A shared target has not been set
              </SvgText>
            )}
          </Svg>
          {view.scene.people.filter(p => !hiddenIds.includes(p.id)).map((p) => {
            const m = view.model.segments.find(
              (segment) => segment.id === p.id,
            )!;
            const person = members.find((member) => member.user_id === p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: view.member?.id === p.id }}
                accessibilityLabel={`${m.name}, ${volume(m.value)}`}
                onPress={() => {
                  setSelected(p.id);
                  onSelectMember?.(p.id);
                }}
                style={[s.marker, { left: p.x - 28, top: p.y }]}
              >
                <View
                  style={[
                    s.photo,
                    {
                      borderColor:
                        view.member?.id === p.id ? c.ink : p.color,
                    },
                  ]}
                >
                  <UserAvatar
                    src={person?.avatar_url}
                    name={m.name}
                    size={34}
                  />
                </View>
                <AppText role="label" numberOfLines={1}>
                  {m.name.split(" ")[0]}
                </AppText>
                <AppText role="caption" secondary numberOfLines={1}>
                  {volume(m.value)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {!compact && view.empty ? (
        <AppText role="caption" secondary>
          No one has logged activity this week yet.
        </AppText>
      ) : !compact && view.member && !hiddenIds.includes(view.member.id) ? (
        <View accessibilityLiveRegion="polite">
          <AppText role="row">{view.member.name}</AppText>
          <AppText role="body" secondary>
            {volume(view.member.value)} ·{" "}
            {(view.member.share * 100).toFixed(1)}% of recorded crew activity ·{" "}
            {view.member.sessions}{" "}
            {view.member.sessions === 1 ? "session" : "sessions"}
          </AppText>
        </View>
      ) : null}
      {!compact && view.rosterFootnote ? (
        <AppText role="caption" secondary>{view.rosterFootnote}</AppText>
      ) : null}
      {!compact && view.target ? (
        <AppText role="caption" secondary>
          {view.model.remaining
            ? `${volume(view.model.remaining)} ${view.kind === "baseline" ? "to match last week" : "to the target"}`
            : view.model.total > view.target
              ? `${volume(view.model.total - view.target)} beyond ${view.kind === "baseline" ? "last week" : "the target"}`
              : "Target reached together."}
        </AppText>
      ) : !compact ? (
        <AppText role="caption" secondary>
          Recorded contributions are shown without inventing a finish.
        </AppText>
      ) : null}
    </View>
  );
}

const sThemes = createThemedStyles((themeColors) => ({
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
    backgroundColor: themeColors.soft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
}));

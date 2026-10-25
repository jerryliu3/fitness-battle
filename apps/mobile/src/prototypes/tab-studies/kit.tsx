import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";
import { SHELL_COLORS, fonts } from "../../theme";
import { AppIcon } from "../../ui/app-icon";

export const palette = {
  ...SHELL_COLORS,
  teal: "#176c75",
  sky: "#c9d6e3",
  coral: "#c65d3b",
};
export type StudyConcept = {
  id: string;
  name: string;
  thesis: string;
  tradeoff: string;
  dark?: boolean;
};
const Inverse = createContext(false);
export function Copy({
  children,
  size = 15,
  muted = false,
  bold = false,
  color,
  style,
}: {
  children: ReactNode;
  size?: number;
  muted?: boolean;
  bold?: boolean;
  color?: string;
  style?: ViewStyle | object;
}) {
  const dark = useContext(Inverse);
  return (
    <Text
      style={[
        {
          fontFamily: bold ? fonts.bodyBold : fonts.body,
          fontSize: size,
          lineHeight: size * 1.32,
          color:
            color ??
            (dark
              ? muted
                ? "#b5c6ce"
                : "#ffffff"
              : muted
                ? palette.muted
                : palette.ink),
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Heading({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <View style={{ gap: 5 }}>
      {eyebrow && (
        <Copy size={11} bold muted>
          {eyebrow.toUpperCase()}
        </Copy>
      )}
      <Copy size={30} bold>
        {children}
      </Copy>
    </View>
  );
}
export function Row({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Stack({
  children,
  gap = 18,
}: {
  children: ReactNode;
  gap?: number;
}) {
  return <View style={{ gap }}>{children}</View>;
}
export function Card({
  children,
  dark = false,
  gold = false,
  style,
}: {
  children: ReactNode;
  dark?: boolean;
  gold?: boolean;
  style?: ViewStyle;
}) {
  const inherited = useContext(Inverse);
  return (
    <Inverse.Provider value={dark || (inherited && !gold)}>
      <View
        style={[
          s.card,
          {
            backgroundColor: dark
              ? palette.ink
              : gold
                ? palette.soft
                : inherited
                  ? "#203e4e"
                  : "white",
          },
          style,
        ]}
      >
        {children}
      </View>
    </Inverse.Provider>
  );
}
export function Action({
  label,
  onPress,
  primary = false,
  selected,
  small = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  selected?: boolean;
  small?: boolean;
}) {
  const dark = useContext(Inverse);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        {
          paddingHorizontal: small ? 12 : 17,
          backgroundColor:
            primary || selected ? palette.tennis : dark ? "#284858" : "#edf1ef",
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Copy
        size={small ? 12 : 14}
        bold
        color={primary || selected ? palette.ink : undefined}
      >
        {label}
      </Copy>
    </Pressable>
  );
}
export function Segments<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.segments}>
      {options.map((option) => (
        <View key={option} style={{ flexGrow: 1 }}>
          <Action
            small
            label={option}
            selected={value === option}
            onPress={() => onChange(option)}
          />
        </View>
      ))}
    </View>
  );
}
export function Door({
  title,
  note,
  value,
  onPress,
}: {
  title: string;
  note?: string;
  value?: string;
  onPress: () => void;
}) {
  const dark = useContext(Inverse);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.door,
        {
          borderColor: dark ? "#375260" : palette.line,
          opacity: pressed ? 0.55 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Copy bold>{title}</Copy>
        {note && (
          <Copy size={12} muted>
            {note}
          </Copy>
        )}
      </View>
      {value && <Copy bold>{value}</Copy>}
      <AppIcon
        name="chevron"
        size={18}
        color={dark ? "white" : palette.muted}
      />
    </Pressable>
  );
}
export function Stat({
  value,
  label,
  big = false,
}: {
  value: string;
  label: string;
  big?: boolean;
}) {
  return (
    <View style={{ flexShrink: 1, gap: 3 }}>
      <Copy size={big ? 48 : 25} bold>
        {value}
      </Copy>
      <Copy size={11} muted>
        {label}
      </Copy>
    </View>
  );
}
export function Avatar({
  name,
  size = 38,
  gold = false,
}: {
  name: string;
  size?: number;
  gold?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: gold ? palette.tennis : "#dce8e6",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Copy size={size * 0.33} bold color={palette.ink}>
        {name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")}
      </Copy>
    </View>
  );
}
export function Meter({
  value,
  total,
  label,
  color = palette.teal,
}: {
  value: number;
  total: number;
  label: string;
  color?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        height: 9,
        backgroundColor: "#dce5e2",
        borderRadius: 9,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.min(100, (value / total) * 100)}%`,
          height: 9,
          borderRadius: 9,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
export function Ring({
  value,
  total,
  label,
  caption,
}: {
  value: number;
  total: number;
  label: string;
  caption: string;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 10 }}>
      <View style={{ width: 214, height: 214 }}>
        <Svg
          width="214"
          height="214"
          viewBox="0 0 214 214"
          accessible
          accessibilityLabel={`${label}. ${caption}`}
        >
          <Circle
            cx="107"
            cy="107"
            r="92"
            fill="none"
            stroke="#dce5e2"
            strokeWidth="12"
          />
          <Circle
            cx="107"
            cy="107"
            r="92"
            fill="none"
            stroke={palette.teal}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(1, value / total) * 578} 578`}
            transform="rotate(-90 107 107)"
          />
        </Svg>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Copy size={40} bold>
            {label}
          </Copy>
          <Copy size={12} muted>
            {caption}
          </Copy>
        </View>
      </View>
    </View>
  );
}
export function Chart({
  values,
  labels,
  selected,
  onSelect,
  kind = "line",
  unit = "h",
  comparison,
}: {
  values: readonly number[];
  labels: readonly string[];
  selected: number;
  onSelect: (i: number) => void;
  kind?: "line" | "bar";
  unit?: string;
  comparison?: readonly number[];
}) {
  const dark = useContext(Inverse);
  const width = useRef(1);
  const max = Math.max(1, ...values, ...(comparison ?? [])) * 1.15;
  const x = (i: number) => 14 + (i * 292) / Math.max(1, values.length - 1);
  const y = (v: number) => 133 - (v / max) * 114;
  const inspect = (locationX: number) =>
    onSelect(
      Math.max(
        0,
        Math.min(
          values.length - 1,
          Math.round(
            (((locationX / width.current) * 320 - 14) / 292) *
              (values.length - 1),
          ),
        ),
      ),
    );
  return (
    <Stack gap={8}>
      <Row>
        <Copy bold>
          {labels[selected]} · {values[selected].toFixed(1)} {unit}
        </Copy>
        <Copy size={11} muted>
          Drag or tap to inspect
        </Copy>
      </Row>
      <View
        onLayout={(e) => {
          width.current = e.nativeEvent.layout.width;
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => inspect(e.nativeEvent.locationX)}
        onResponderMove={(e) => inspect(e.nativeEvent.locationX)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Inspect chart, ${labels[selected]}, ${values[selected]} ${unit}`}
        accessibilityValue={{ min: 0, max: values.length - 1, now: selected }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) =>
          onSelect(
            Math.max(
              0,
              Math.min(
                values.length - 1,
                selected + (e.nativeEvent.actionName === "increment" ? 1 : -1),
              ),
            ),
          )
        }
      >
        <Svg width="100%" height={154} viewBox="0 0 320 154" accessible={false}>
          {[19, 76, 133].map((v) => (
            <Line
              key={v}
              x1="8"
              x2="312"
              y1={v}
              y2={v}
              stroke={dark ? "#375260" : palette.line}
            />
          ))}
          {comparison && (
            <Polyline
              points={comparison.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={dark ? palette.sky : palette.muted}
              strokeDasharray="4 5"
              strokeWidth="2"
            />
          )}
          {kind === "line" ? (
            <>
              <Path
                d={`M${x(0)} 133 ${values.map((v, i) => `L${x(i)} ${y(v)}`).join(" ")} L${x(values.length - 1)} 133 Z`}
                fill={palette.teal}
                opacity=".09"
              />
              <Polyline
                points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
                stroke={dark ? palette.tennis : palette.teal}
                strokeWidth="3"
                fill="none"
              />
              <Line
                x1={x(selected)}
                x2={x(selected)}
                y1="8"
                y2="140"
                stroke={palette.muted}
                strokeDasharray="3 3"
              />
              <Circle
                cx={x(selected)}
                cy={y(values[selected])}
                r="5"
                fill={palette.tennis}
                stroke={palette.ink}
              />
            </>
          ) : (
            values.map((v, i) => (
              <Line
                key={i}
                x1={x(i)}
                x2={x(i)}
                y1="133"
                y2={y(v)}
                stroke={
                  selected === i
                    ? palette.tennis
                    : dark
                      ? palette.sky
                      : palette.teal
                }
                strokeWidth={Math.min(22, 200 / values.length)}
                strokeLinecap="round"
              />
            ))
          )}
        </Svg>
      </View>
      <Row style={{ flexWrap: "wrap", justifyContent: "flex-start", gap: 4 }}>
        {labels.map((label, i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`Inspect ${label}`}
            accessibilityState={{ selected: selected === i }}
            onPress={() => onSelect(i)}
            style={{
              minWidth: 35,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: selected === i ? 3 : 0,
              borderColor: palette.tennis,
              flexGrow: 1,
            }}
          >
            <Copy size={10} muted={selected !== i}>
              {label}
            </Copy>
          </Pressable>
        ))}
      </Row>
    </Stack>
  );
}

export type DetailPage = { title: string; render: () => ReactNode };
/** Detail pages own chart state so a captured navigation snapshot cannot freeze scrubbing. */
export function InspectChart(
  props: Omit<Parameters<typeof Chart>[0], "selected" | "onSelect">,
) {
  const [selected, setSelected] = useState(props.values.length - 1);
  return <Chart {...props} selected={selected} onSelect={setSelected} />;
}
export function useDrilldown() {
  const [pages, setPages] = useState<DetailPage[]>([]);
  return {
    pages,
    push: (page: DetailPage) => setPages((previous) => [...previous, page]),
    back: () => setPages((previous) => previous.slice(0, -1)),
    close: () => setPages([]),
  };
}
export function Drilldown({
  drill,
}: {
  drill: ReturnType<typeof useDrilldown>;
}) {
  const current = drill.pages.at(-1);
  return (
    <Modal
      visible={!!current}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={drill.back}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper }}>
        <View
          style={{ flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" }}
        >
          <View
            style={[
              s.row,
              { padding: 16, borderBottomWidth: 1, borderColor: palette.line },
            ]}
          >
            <Action label="‹ Back" onPress={drill.back} />
            <View style={{ flex: 1 }}>
              <Copy size={16} bold>
                {current?.title}
              </Copy>
            </View>
            <Action small label="Done" onPress={drill.close} />
          </View>
          {drill.pages.map((page, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                display: i === drill.pages.length - 1 ? "flex" : "none",
              }}
            >
              <ScrollView
                contentContainerStyle={{
                  padding: 22,
                  gap: 22,
                  paddingBottom: 60,
                }}
              >
                {page.render()}
              </ScrollView>
            </View>
          ))}
          <View style={{ padding: 12 }}>
            <Copy size={10} muted>
              Design prototype · Fictional data · Local changes only
            </Copy>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
export function Screen({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <Inverse.Provider value={dark}>
      <View
        style={{ flex: 1, backgroundColor: dark ? "#102b39" : palette.paper }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 21, gap: 22, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Inverse.Provider>
  );
}
export function Study({
  title,
  concepts,
  render,
  tab,
}: {
  title: string;
  concepts: readonly StudyConcept[];
  render: (c: StudyConcept) => ReactNode;
  tab: "Compete" | "Progress" | "Crew" | "Profile";
}) {
  const params = useLocalSearchParams<{ concept?: string; compare?: string }>();
  const [selected, setSelected] = useState(() =>
    concepts.some((c) => c.id === params.concept)
      ? params.concept!
      : concepts[0].id,
  );
  const [compare, setCompare] = useState(params.compare === "1");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const { width, height } = useWindowDimensions();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#eaf0ed" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
        <Row>
          <View style={{ flex: 1 }}>
            <Copy size={19} bold>
              {title}
            </Copy>
            <Copy size={11} muted>
              {concepts.length} native concepts · Fictional data
            </Copy>
          </View>
          <Action
            small
            label={compare ? "Focus" : "Compare"}
            onPress={() => setCompare(!compare)}
          />
        </Row>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingBottom: 8 }}
        >
          {concepts.map((c, i) => (
            <Action
              key={c.id}
              small
              label={`${String(i + 1).padStart(2, "0")} ${c.name}`}
              selected={selected === c.id}
              onPress={() => {
                setSelected(c.id);
                setCompare(false);
              }}
            />
          ))}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: width < 500 ? 0 : 20,
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {concepts
          .filter((c) => compare || c.id === selected)
          .map((c) => (
            <View
              key={c.id}
              style={{
                width: Math.min(width, 410),
                gap: 10,
                paddingBottom: 20,
              }}
            >
              <View style={{ paddingHorizontal: 18, gap: 6 }}>
                <Row>
                  <Copy bold>{c.name}</Copy>
                  <Action
                    small
                    label={shortlist.includes(c.id) ? "Saved ✓" : "Shortlist"}
                    selected={shortlist.includes(c.id)}
                    onPress={() =>
                      setShortlist((previous) =>
                        previous.includes(c.id)
                          ? previous.filter((id) => id !== c.id)
                          : [...previous, c.id],
                      )
                    }
                  />
                </Row>
                <Copy size={12}>{c.thesis}</Copy>
                <Copy size={11} muted>
                  Tradeoff: {c.tradeoff}
                </Copy>
              </View>
              <View
                style={{
                  height: compare ? 740 : Math.max(540, height - 290),
                  minHeight: 540,
                  overflow: "hidden",
                  borderRadius: width < 500 ? 0 : 28,
                  borderWidth: width < 500 ? 0 : 1,
                  borderColor: "#cbd7d1",
                  backgroundColor: palette.paper,
                }}
              >
                <View style={{ flex: 1 }}>{render(c)}</View>
                <View style={s.tabBar}>
                  {["Home", "Compete", "Progress", "Crew"].map(
                    (name, index) => (
                      <View
                        key={name}
                        style={{ alignItems: "center", gap: 4, flex: 1 }}
                      >
                        <AppIcon
                          name={
                            (["home", "compete", "progress", "crew"] as const)[
                              index
                            ]
                          }
                          size={21}
                          color={name === tab ? palette.teal : palette.muted}
                        />
                        <Copy
                          size={10}
                          bold={name === tab}
                          color={name === tab ? palette.teal : palette.muted}
                        >
                          {name}
                        </Copy>
                      </View>
                    ),
                  )}
                </View>
              </View>
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  card: { borderRadius: 20, padding: 19, gap: 16 },
  action: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  segments: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  door: {
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: palette.line,
  },
});

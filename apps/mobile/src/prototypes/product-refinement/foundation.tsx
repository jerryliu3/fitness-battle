import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { AppText as T, SectionHeader, Surface } from "../../ui/section";
import { AppIcon, type AppIconName } from "../../ui/app-icon";
import { UserAvatar } from "../../ui/user-avatar";
import { PhoneTabBar } from "../../ui/phone-tab-bar";
import { FocusSheet } from "../../ui/focus";
import { ChartScrubber } from "../../ui/chart-scrubber";
import { ChartSvg, ChartText } from "../../ui/chart-text";
import { SHELL_COLORS as c } from "../../theme";
export { T, c, Surface, SectionHeader, AppIcon, UserAvatar };
export const row: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
};
export const stack: ViewStyle = { gap: 12 };
export function Tap({
  children,
  onPress,
  label,
  style,
  selected,
  disabled,
}: {
  children: ReactNode;
  onPress: () => void;
  label?: string;
  style?: ViewStyle | ViewStyle[];
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        {
          minHeight: 44,
          justifyContent: "center",
          opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
export function IconTap({
  icon,
  label,
  onPress,
}: {
  icon: AppIconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Tap
      label={label}
      onPress={onPress}
      style={{
        width: 44,
        alignItems: "center",
        borderRadius: 22,
        backgroundColor: c.card,
      }}
    >
      <AppIcon name={icon} />
    </Tap>
  );
}
export function Action({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Tap
      label={label}
      onPress={onPress}
      style={{
        padding: 12,
        backgroundColor: secondary ? c.card : c.tennis,
        borderWidth: secondary ? 1 : 0,
        borderColor: c.line,
        borderRadius: 14,
        alignItems: "center",
      }}
    >
      <T role="label">{label}</T>
    </Tap>
  );
}
export function Pill({
  children,
  dark = false,
}: {
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: dark ? c.ink : c.soft,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
      }}
    >
      <T role="caption" style={{ color: dark ? c.card : c.ink }}>
        {children}
      </T>
    </View>
  );
}
export function Rule() {
  return (
    <View
      style={{ height: 1, backgroundColor: "#d0dad7", marginVertical: 4 }}
    />
  );
}
export function Metric({
  value,
  label,
  light = false,
}: {
  value: string;
  label: string;
  light?: boolean;
}) {
  return (
    <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
      <T role="heading" style={{ color: light ? c.card : c.ink }}>
        {value}
      </T>
      <T role="caption" style={{ color: light ? "#c9d6e3" : c.muted }}>
        {label}
      </T>
    </View>
  );
}
export type Page = {
  title: string;
  key: string;
  id?: string;
  item?: number;
  period?: string;
};
type Navigation = {
  push: (page: Page) => void;
  back: () => void;
  close: () => void;
};
const Nav = createContext<Navigation>({ push() {}, back() {}, close() {} });
export const useStudyNav = () => useContext(Nav);
export function Flow({
  children,
  render,
}: {
  children: ReactNode;
  render: (page: Page) => ReactNode;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const nav: Navigation = {
    push: (page) => setPages((p) => [...p, page]),
    back: () => setPages((p) => p.slice(0, -1)),
    close: () => setPages([]),
  };
  return (
    <Nav.Provider value={nav}>
      <View
        style={{ gap: 24 }}
        aria-hidden={pages.length > 0}
        accessibilityElementsHidden={pages.length > 0}
        importantForAccessibility={
          pages.length ? "no-hide-descendants" : "auto"
        }
      >
        {children}
      </View>
      <Modal
        visible={pages.length > 0}
        animationType="slide"
        onRequestClose={nav.back}
        presentationStyle="fullScreen"
      >
        <SafeAreaView
          accessibilityViewIsModal
          role="dialog"
          aria-modal={true}
          style={{ flex: 1, backgroundColor: c.paper }}
        >
          <View
            style={{
              ...row,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <IconTap icon="back" label="Back" onPress={nav.back} />
            <T
              role="heading"
              accessibilityRole="header"
              style={{ flex: 1, textAlign: "center" }}
            >
              {pages.at(-1)?.title}
            </T>
            <Tap onPress={nav.close}>
              <T role="label">Done</T>
            </Tap>
          </View>
          {pages.map((page, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                display: i === pages.length - 1 ? "flex" : "none",
              }}
              accessibilityElementsHidden={i !== pages.length - 1}
              importantForAccessibility={
                i !== pages.length - 1 ? "no-hide-descendants" : "auto"
              }
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  padding: 20,
                  gap: 24,
                  paddingBottom: 50,
                  maxWidth: 500,
                  width: "100%",
                  alignSelf: "center",
                }}
              >
                {render(page)}
              </ScrollView>
            </View>
          ))}
        </SafeAreaView>
      </Modal>
    </Nav.Provider>
  );
}
export function Study({
  tab,
  concepts,
  children,
  followup = false,
  reviewControls,
}: {
  followup?: boolean;
  reviewControls?: ReactNode;
  tab: "compete" | "progress" | "crew" | "profile";
  concepts: readonly string[];
  children: (index: number) => ReactNode;
}) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    concept?: string;
    compare?: string;
    clean?: string;
  }>();
  const [index, setIndex] = useState(
    Math.max(
      0,
      Math.min(concepts.length - 1, Number(params.concept ?? 1) - 1 || 0),
    ),
  );
  const [choosing, setChoosing] = useState(false);
  const compare = params.compare === "1";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }}>
      {params.clean !== "1" && (
        <View
          style={{
            ...row,
            paddingHorizontal: 16,
            backgroundColor: c.card,
            borderBottomWidth: 1,
            borderColor: c.line,
            justifyContent: "space-between",
          }}
        >
          <Tap
            label="Review hub"
            onPress={() => router.push("/refine" as "/today")}
          >
            <T role="caption">All studies</T>
          </Tap>
          <Tap
            label="Choose concept"
            onPress={() => setChoosing(true)}
            style={{ flex: 1, minWidth: 0, paddingHorizontal: 8 }}
          >
            <T role="label">
              {index + 1} / {concepts.length} · {concepts[index]}⌄
            </T>
          </Tap>
          <Tap
            label={compare ? "Focus view" : "Compare concepts"}
            onPress={() =>
              router.setParams({ compare: compare ? undefined : "1" })
            }
          >
            <AppIcon name={compare ? "person" : "expand"} size={18} />
          </Tap>
        </View>
      )}
      {params.clean !== "1" && reviewControls}
      {compare ? (
        <ScrollView
          horizontal
          contentContainerStyle={{
            padding: 24,
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          {concepts.map((name, i) => (
            <View key={name} style={{ gap: 12 }}>
              <T role="heading">
                {i + 1} · {name}
              </T>
              <View
                style={{
                  width: 390,
                  height: 844,
                  borderRadius: 32,
                  borderWidth: 1,
                  borderColor: c.line,
                  overflow: "hidden",
                }}
              >
                <ProductFrame tab={tab} followup={followup}>
                  {children(i)}
                </ProductFrame>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View
          style={{ flex: 1, maxWidth: 500, width: "100%", alignSelf: "center" }}
        >
          <ProductFrame tab={tab} followup={followup}>
            {children(index)}
          </ProductFrame>
        </View>
      )}
      <FocusSheet
        open={choosing}
        title={`${tab[0]!.toUpperCase()}${tab.slice(1)} directions`}
        onClose={() => setChoosing(false)}
      >
        {concepts.map((name, i) => (
          <Tap
            key={name}
            label={name}
            selected={i === index}
            onPress={() => {
              setIndex(i);
              router.setParams({ concept: String(i + 1) });
              setChoosing(false);
            }}
            style={{
              ...row,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <T role="heading" style={{ flex: 1 }}>
              {name}
            </T>
            <T role="label">{index === i ? "Selected" : "View"}</T>
          </Tap>
        ))}
        <T role="caption" secondary>
          Product-derived visual prototypes · fictional data · local
          interactions.
        </T>
      </FocusSheet>
    </SafeAreaView>
  );
}
function ProductFrame({
  tab,
  children,
  followup,
}: {
  tab: string;
  children: ReactNode;
  followup?: boolean;
}) {
  const router = useRouter();
  const routes = ["today", "arena", "you", "field"];
  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      {tab !== "profile" && (
        <View style={{ ...row, paddingHorizontal: 20, paddingVertical: 8 }}>
          <Tap
            label="Open your profile"
            onPress={() =>
              router.push(
                (followup
                  ? "/refine-next?tab=profile"
                  : "/refine-profile") as "/athlete",
              )
            }
          >
            <UserAvatar name="Alex Morgan" size={38} />
          </Tap>
          <View
            style={{
              backgroundColor: c.soft,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <T role="label">1,168</T>
          </View>
          <AppIcon name="flame" color={c.actionPressed} size={20} />
          <T role="label">4</T>
          <View style={{ flex: 1 }} />
          <T role="caption" secondary>
            Overtaek
          </T>
        </View>
      )}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: tab === "profile" ? 40 : 120,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {tab !== "profile" && (
        <PhoneTabBar
          state={{
            index:
              ({ compete: 1, progress: 2, crew: 3 } as Record<string, number>)[
                tab
              ] ?? -1,
            routes: routes.map((name) => ({ key: name, name })),
          }}
          navigateToTab={(key) =>
            router.push(
              (key === "today"
                ? "/today"
                : followup
                  ? `/refine-next?tab=${({ arena: "compete", you: "progress", field: "crew" } as Record<string, string>)[key]}`
                  : `/refine-${({ arena: "compete", you: "progress", field: "crew" } as Record<string, string>)[key]}`) as "/today",
            )
          }
        />
      )}
    </View>
  );
}
/** Shared production chart interaction; daily is a line, accumulated periods are bars. */
export function Plot({
  values,
  labels,
  bars = false,
  previous,
  unit = "hr",
  onSelect,
  compact = false,
}: {
  values: number[];
  labels: string[];
  bars?: boolean;
  previous?: number[];
  unit?: string;
  onSelect?: (index: number) => void;
  compact?: boolean;
}) {
  const max = Math.max(1, ...values, ...(previous ?? [])) * 1.12;
  const points = values.map((v, i) => ({
    id: String(i),
    x: 12 + (i / Math.max(1, values.length - 1)) * 286,
    y: 142 - (v / max) * 122,
    label: labels[i] ?? "",
    value: `${v.toFixed(1)} ${unit}`,
  }));
  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const chart = (
    <ChartSvg
      viewBox="0 0 320 175"
      width="100%"
      height={compact ? 90 : 175}
      preserveAspectRatio="none"
    >
      {!compact &&
        [0, 0.5, 1].map((v) => (
          <Line
            key={v}
            x1={10}
            x2={302}
            y1={142 - v * 122}
            y2={142 - v * 122}
            stroke={c.line}
            strokeDasharray="3 4"
          />
        ))}
      {previous && (
        <Path
          d={previous
            .map(
              (v, i) =>
                `${i ? "L" : "M"}${12 + (i / Math.max(1, previous.length - 1)) * 286},${142 - (v / max) * 122}`,
            )
            .join(" ")}
          fill="none"
          stroke="#aab8b7"
          strokeWidth={2}
          strokeDasharray="4 5"
        />
      )}
      {bars ? (
        points.map((p, i) => (
          <Rect
            key={i}
            x={p.x - Math.min(13, 90 / values.length)}
            y={p.y}
            width={Math.min(26, 180 / values.length)}
            height={142 - p.y}
            rx={4}
            fill={i === values.length - 1 ? c.tennis : c.secondary}
          />
        ))
      ) : (
        <>
          <Defs>
            <LinearGradient id="plot-fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.secondary} stopOpacity={0.2} />
              <Stop offset="1" stopColor={c.secondary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${path} L298,142 L12,142 Z`} fill="url(#plot-fill)" />
          <Path
            d={path}
            fill="none"
            stroke={c.secondary}
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p) => (
            <Circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={c.card}
              stroke={c.secondary}
              strokeWidth={2}
            />
          ))}
        </>
      )}
      {!compact &&
        labels.map(
          (label, i) =>
            (labels.length <= 7 || i % 2 === 0) && (
              <ChartText
                key={i}
                x={points[i]!.x}
                y={166}
                textAnchor={
                  i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"
                }
                fill={c.muted}
              >
                {label}
              </ChartText>
            ),
        )}
    </ChartSvg>
  );
  return compact ? (
    chart
  ) : (
    <ChartScrubber
      key={`${bars}:${labels.join()}`}
      label={`Training ${unit} by ${bars ? "period" : "day"}`}
      width={320}
      height={175}
      plotTop={14}
      plotBottom={142}
      points={points}
      onSelect={(id) => onSelect?.(Number(id))}
    >
      {chart}
    </ChartScrubber>
  );
}
export function Spark({
  values,
  color = c.secondary,
  height = 38,
}: {
  values: number[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 120 40"
      preserveAspectRatio="none"
    >
      <Path
        d={values
          .map(
            (v, i) =>
              `${i ? "L" : "M"}${(i / (values.length - 1)) * 116 + 2},${36 - (v / max) * 30}`,
          )
          .join(" ")}
        stroke={color}
        fill="none"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
export const layout = StyleSheet.create({
  inline: row,
  stack,
  section: { gap: 16 },
  soft: { padding: 16, backgroundColor: c.soft, borderRadius: 18, gap: 12 },
});

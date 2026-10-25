import { Children, Fragment, useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, View, StyleSheet, type TextProps, type TextStyle, type ViewProps, useWindowDimensions } from "react-native";
import { SHELL_COLORS as c, SHELL_RADIUS, SHELL_SECTION as geometry, SHELL_SPACING, SHELL_TYPOGRAPHY, type TypographyRole } from "@fitness-battle/shared";

const families = { 400: "DMSans_400Regular", 500: "DMSans_500Medium", 700: "DMSans_700Bold" } as const;
export function textStyle(role: TypographyRole): TextStyle {
  const token = SHELL_TYPOGRAPHY[role];
  return { fontFamily: families[token.weight], fontSize: token.size, lineHeight: token.lineHeight, letterSpacing: 0, textTransform: "none", fontStyle: "normal" };
}
export function chartTextProps() {
  return { fontFamily: families[SHELL_TYPOGRAPHY.caption.weight], fontSize: SHELL_TYPOGRAPHY.caption.size, fontWeight: "400" as const };
}
export function AppText({ role = "body", secondary = false, style, ...props }: Omit<TextProps, "role"> & { role?: TypographyRole; secondary?: boolean }) {
  return <Text {...props} style={[{ color: secondary ? c.muted : c.ink }, style, textStyle(role)]} />;
}
export function TextAction({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={styles.action}><AppText role="label">{label}</AppText></Pressable>;
}
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const { fontScale, width } = useWindowDimensions();
  const [wrapped, setWrapped] = useState(false);
  useEffect(() => setWrapped(false), [title, width, fontScale]);
  return <View style={styles.header}>
    <View style={[styles.heading, { flexBasis: wrapped ? "100%" : 200 * fontScale, flexGrow: 1, flexShrink: 1 }]}><AppText role="heading" accessibilityRole="header" onTextLayout={event => { if (event.nativeEvent.lines.length > 1) setWrapped(true); }}>{title}</AppText>{subtitle && <AppText secondary>{subtitle}</AppText>}</View>
    {action}
  </View>;
}
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <View style={styles.heading}><AppText role="display" accessibilityRole="header">{title}</AppText>{subtitle && <AppText secondary>{subtitle}</AppText>}</View>;
}
export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return <View style={styles.section}><SectionHeader title={title} subtitle={subtitle} action={action}/><View style={styles.content}>{children}</View></View>;
}
export function SectionStack({ children, divided = true }: { children: ReactNode; divided?: boolean }) {
  if (!divided) return <View style={{ gap: SHELL_SPACING.section }}>{children}</View>;
  const sections = Children.toArray(children);
  return <View>{sections.map((child, index) => <Fragment key={(child as { key?: string }).key ?? index}>{index > 0 && (divided ? <View style={styles.boundary}><View style={styles.divider}/></View> : <View style={{ height: SHELL_SPACING.section }}/>)}{child}</Fragment>)}</View>;
}
export function StatusBadge({ children, tone = "neutral", icon }: { children: ReactNode; tone?: "neutral" | "success"; icon?: ReactNode }) {
  return <View style={[styles.badge, { backgroundColor: tone === "success" ? c.statusSuccessSoft : c.soft }]}>{icon}<AppText role="label" style={{ color: tone === "success" ? c.green : c.ink, flexShrink: 1 }}>{children}</AppText></View>;
}
export function Surface({ style, ...props }: ViewProps) { return <View {...props} style={[styles.surface, style]}/>; }
export function ListRow({ title, subtitle, leading, trailing }: { title: string; subtitle?: string; leading?: ReactNode; trailing?: ReactNode }) {
  return <View style={styles.listRow}>{leading}<View style={{ flex: 1, minWidth: 0 }}><AppText role="label">{title}</AppText>{subtitle && <AppText role="body" secondary>{subtitle}</AppText>}</View>{trailing}</View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: 12, rowGap: 4 },
  heading: { gap: geometry.subtitleGap },
  action: { minHeight: 44, minWidth: 44, maxWidth: "100%", justifyContent: "center", paddingVertical: 12 },
  section: { gap: geometry.contentGap }, content: { gap: geometry.contentGap },
  boundary: { paddingTop: geometry.beforeDivider, paddingBottom: geometry.afterDivider },
  divider: { height: geometry.dividerWidth, backgroundColor: geometry.dividerColor },
  badge: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, maxWidth: "100%", paddingHorizontal: 8, paddingVertical: 4, borderRadius: SHELL_RADIUS.pill },
  surface: { backgroundColor: c.card, borderRadius: SHELL_RADIUS.card, borderWidth: 1, borderColor: c.line, padding: 20 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
});

export function FeatureCard({ title, description, badge, onPress }: { title: string; description: string; badge?: string; onPress?: () => void }) {
  const content = <>{badge && <StatusBadge>{badge}</StatusBadge>}<AppText role="heading" accessibilityRole="header">{title}</AppText><AppText role="body" secondary>{description}</AppText></>;
  const style = [styles.surface, { gap: 12, flexGrow: 1, flexBasis: 240, minWidth: 0 }];
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${description}`} onPress={onPress} style={style}>{content}</Pressable> : <View style={style}>{content}</View>;
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  useWindowDimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SHELL_COLORS as c } from "../theme";
import { useReducedMotion } from "./use-reduced-motion";
import { playCue } from "../lib/haptics";
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

export function FocusSheet({
  open,
  title,
  body,
  onClose,
  onClosed,
  children,
}: {
  open: boolean;
  title: string;
  body?: string;
  onClose: () => void;
  /** Run a sheet handoff only after the native modal has dismissed. */
  onClosed?: () => void;
  children?: ReactNode;
}) {
  // Keep the last open content during exit; callers often clear their selection
  // in onClose, which must not flash a different panel while the sheet slides away.
  const content = useRef({ title, body, children });
  if (open) content.current = { title, body, children };
  const closedCallback = useRef(onClosed);
  closedCallback.current = onClosed;
  const reduce = useReducedMotion();
  const [present, setPresent] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(windowHeight);
  useEffect(() => {
    if (open) void playCue("light");
  }, [open]);

  useEffect(() => {
    if (open && !present) {
      setPresent(true);
      return;
    }
    if (!present) return;
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: reduce ? 0 : open ? 300 : 220,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !open) {
        setPresent(false);
        if (Platform.OS !== "ios") closedCallback.current?.();
      }
    });
    return () => animation.stop();
  }, [open, present, progress, reduce]);

  return (
    <Modal
      visible={present}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onDismiss={Platform.OS === "ios" ? () => closedCallback.current?.() : undefined}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={f.modal}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: progress }]}
          pointerEvents={open ? "auto" : "none"}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close details"
            style={f.backdrop}
            onPress={onClose}
          />
        </Animated.View>
        <AnimatedSafeAreaView
          edges={["bottom"]}
          onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
          style={[
            f.sheet,
            {
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetHeight, 0],
                  }),
                },
              ],
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={f.handle} />
          <View style={f.sheetHead}>
            <Text style={f.kicker}>OVERTAEK</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              style={f.close}
            >
              <Text style={f.h2}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={f.sheetBody}
          >
            <Text accessibilityRole="header" style={f.title}>
              {content.current.title}
            </Text>
            {Boolean(content.current.body) && (
              <Text style={f.copy}>{content.current.body}</Text>
            )}
            {content.current.children}
          </ScrollView>
        </AnimatedSafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function FocusHeading({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body?: string;
}) {
  return (
    <View style={f.heading}>
      <Text style={f.kicker}>{kicker}</Text>
      <Text
        accessibilityRole="header"
        style={f.title}
      >
        {title}
      </Text>
      {Boolean(body) && (
        <Text style={f.copy}>{body}</Text>
      )}
    </View>
  );
}
export function FocusButton({
  label,
  accessibilityLabel,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        f.button,
        secondary && f.secondary,
        (pressed || disabled) && { opacity: 0.5 },
      ]}
    >
      <Text style={[f.buttonText, secondary && { color: c.ink }]}>{label}</Text>
    </Pressable>
  );
}
/** One grouped control for mutually exclusive views, rather than separate action buttons. */
export function FocusSegments<T extends string>({
  label,
  options,
  value,
  onChange,
  accent = false,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accent?: boolean;
}) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={f.segments}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => {
            if (value !== option.value) onChange(option.value);
          }}
          style={({ pressed }) => [
            f.segment,
            value === option.value && f.segmentSelected,
            value === option.value && accent && { backgroundColor: c.tennis },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[f.segmentText, value === option.value && { color: accent ? c.ink : c.card }]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FocusTextButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [f.textButton, pressed && { opacity: 0.5 }]}
    >
      <Text style={f.textButtonText}>{label}</Text>
    </Pressable>
  );
}

export function FocusDisclosure({
  title,
  detail,
  children,
  initialOpen = false,
  compact = false,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  initialOpen?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <View style={[f.disclosure, compact && f.disclosureCompact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[f.disclosureHead, compact && f.disclosureHeadCompact]}
      >
        <View style={f.grow}>
          <Text style={f.rowTitle}>{title}</Text>
          {Boolean(detail) && <Text style={f.small}>{detail}</Text>}
        </View>
        <Text style={f.h2}>{open ? "−" : "＋"}</Text>
      </Pressable>
      {open && (
        <View style={[f.disclosureBody, compact && f.disclosureBodyCompact]}>
          {children}
        </View>
      )}
    </View>
  );
}
export const f = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper },
  content: {
    padding: 22,
    paddingBottom: 34,
    gap: 18,
    maxWidth: 880,
    width: "100%",
    alignSelf: "center",
  },
  heading: {
    alignItems: "flex-start",
    gap: 8,
    marginVertical: 4,
    marginBottom: 8,
  },
  kicker: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    lineHeight: 16,
    textTransform: "uppercase",
    color: c.muted,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -1.3,
    color: c.ink,
  },
  h2: {
    fontFamily: "DMSans_500Medium",
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.6,
    color: c.ink,
  },
  copy: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: c.muted,
  },
  small: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: c.muted,
  },
  rowTitle: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: c.ink,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  grow: { flex: 1 },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 20,
    borderBottomWidth: 1,
    padding: 20,
    gap: 13,
  },
  button: {
    backgroundColor: c.actionPrimary,
    borderBottomWidth: 1,
    borderBottomColor: c.actionPrimary,
    borderRadius: 11,
    minHeight: 48,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: c.ink,
  },
  secondary: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  segments: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: 12,
    backgroundColor: c.soft,
    borderWidth: 1,
    borderColor: c.line,
  },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentSelected: { backgroundColor: c.ink },
  segmentText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: c.muted,
    textAlign: "center",
  },
  textButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  textButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: c.ink,
  },
  disclosureCompact: {
    borderWidth: 0,
    borderRadius: 12,
    backgroundColor: c.soft,
  },
  disclosureHeadCompact: { minHeight: 48, padding: 12 },
  disclosureBodyCompact: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  disclosure: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 15,
    overflow: "hidden",
  },
  disclosureHead: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 68,
  },
  disclosureBody: { paddingHorizontal: 20, paddingBottom: 23, gap: 15 },
  modal: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "#14211b80" },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    backgroundColor: c.paper,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 35,
    height: 4,
    borderRadius: 4,
    backgroundColor: c.line,
    marginBottom: 13,
  },
  sheetHead: {
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetBody: { padding: 24, paddingTop: 10, paddingBottom: 35, gap: 18 },
  close: {
    height: 44,
    width: 44,
    borderRadius: 18,
    backgroundColor: c.card,
    justifyContent: "center",
    alignItems: "center",
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    minHeight: 46,
  },
  chipActive: { borderColor: c.plum, backgroundColor: c.soft },
  chipRow: { flexDirection: "row", gap: 9, flexWrap: "wrap" },
  input: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: c.ink,
    minHeight: 49,
    padding: 14,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 10,
    backgroundColor: c.card,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: c.tennis,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: c.line },
  feedback: { padding: 14, backgroundColor: c.soft, borderRadius: 10 },
  massive: {
    fontFamily: "DMSans_400Regular",
    fontSize: 48,
    letterSpacing: -2,
    color: c.ink,
  },
});

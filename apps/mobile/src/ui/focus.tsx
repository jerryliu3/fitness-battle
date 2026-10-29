import { SHELL_SPACING, SHELL_SECTION, SHELL_RADIUS } from "@fitness-battle/shared";
import { AppText, PageHeader, textStyle } from "./section";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  BackHandler,
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
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SHELL_COLORS as c, mobileSurfaces } from "../theme";
import { useReducedMotion } from "./use-reduced-motion";
import { IconButton } from "./icon-button";
import { playCue } from "../lib/haptics";
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

function useSafeInsets() {
  try {
    return typeof useSafeAreaInsets === "function"
      ? useSafeAreaInsets()
      : { top: 0, bottom: 0, left: 0, right: 0 };
  } catch {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
}

export function FocusSheet({
  open,
  title,
  body,
  onClose,
  onClosed,
  children,
  minimal = false,
  fullScreen = false,
}: {
  open: boolean;
  title: string;
  body?: string;
  onClose: () => void;
  /** Run a sheet handoff only after the native modal has dismissed. */
  onClosed?: () => void;
  children?: ReactNode;
  minimal?: boolean;
  fullScreen?: boolean;
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
  const insets = useSafeInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxSheetHeight = fullScreen
    ? "100%"
    : Math.max(200, windowHeight - Math.max(insets.top, 24) - 24);
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
          edges={fullScreen ? ["top", "bottom"] : ["bottom"]}
          style={[
            f.sheet,
            { maxHeight: maxSheetHeight },
            fullScreen && { flex: 1, maxHeight: "100%", borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 0 },
            {
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [windowHeight, 0],
                  }),
                },
              ],
            },
          ]}
          accessibilityViewIsModal
        >
          {!fullScreen && <View style={f.handle} />}
          {fullScreen ? <View style={[f.row, { paddingHorizontal: 22, paddingVertical: 8 }]}>
            <IconButton icon="back" label="Return to previous screen" onPress={onClose} />
            <AppText role="heading" accessibilityRole="header" style={{ flex: 1, textAlign: "center" }}>{content.current.title}</AppText>
            <View style={{ width: 44 }} />
          </View> : !minimal && <View style={f.sheetHead}>
            <View />
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close dialog" style={f.close}>
              <AppText role="label">×</AppText>
            </Pressable>
          </View>}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={f.sheetBody}
          >
            {!fullScreen && <AppText role="display" accessibilityRole="header">
              {content.current.title}
            </AppText>}
            {Boolean(content.current.body) && (
              <Text style={textStyle("body")}>{content.current.body}</Text>
            )}
            {content.current.children}
          </ScrollView>
        </AnimatedSafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function FocusSidePanel({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [present, setPresent] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;
  const { width: windowWidth } = useWindowDimensions();
  const panelWidth = Math.min(windowWidth, 440);

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
      duration: reduce ? 0 : open ? 280 : 200,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !open) {
        setPresent(false);
      }
    });
    return () => animation.stop();
  }, [open, present, progress, reduce]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  if (!present) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 100,
          elevation: 100,
        },
      ]}
      pointerEvents={open ? "auto" : "none"}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, flexDirection: "row", justifyContent: "flex-end" }}
      >
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: progress }]}
          pointerEvents={open ? "auto" : "none"}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close panel"
            style={f.backdrop}
            onPress={onClose}
          />
        </Animated.View>
        <Animated.View
          style={{
            width: panelWidth,
            height: "100%",
            backgroundColor: c.paper,
            borderLeftWidth: 1,
            borderLeftColor: c.line,
            shadowColor: "#000",
            shadowOffset: { width: -4, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 16,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [panelWidth, 0],
                }),
              },
            ],
          }}
          accessibilityViewIsModal
        >
          <View
            style={{
              flex: 1,
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
              paddingLeft: Math.max(insets.left, 0),
              paddingRight: Math.max(insets.right, 0),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: c.line,
                gap: 8,
              }}
            >
              <IconButton icon="back" label="Close panel" onPress={onClose} />
              <AppText role="heading" accessibilityRole="header" style={{ flex: 1 }}>
                {title}
              </AppText>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
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
      <PageHeader title={title} subtitle={body}/>
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
      onPress={() => {
        if (disabled) return;
        void playCue("light");
        onPress();
      }}
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
  variant = "segments",
}: {
  label: string;
  options: readonly { value: T; label: string; accessibilityLabel?: string }[];
  value: T;
  onChange: (value: T) => void;
  accent?: boolean;
  variant?: "segments" | "tabs";
}) {
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const position = useRef(new Animated.Value(0)).current;
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const inset = variant === "tabs" ? 0 : 5;
  const gap = 4;
  const segmentWidth = Math.max(0, (width - inset * 2 - gap * (options.length - 1)) / Math.max(1, options.length));
  const initialized = useRef(false);
  useEffect(() => {
    if (!width) return;
    const animation = Animated.timing(position, {
      toValue: selectedIndex * (segmentWidth + gap),
      duration: reduce || !initialized.current ? 0 : 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    initialized.current = true;
    animation.start();
    return () => animation.stop();
  }, [selectedIndex, segmentWidth, width, reduce, position]);
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={[f.segments, variant === "tabs" && { backgroundColor: "transparent", borderWidth: 0, borderRadius: 0, padding: 0, borderBottomWidth: 1 }]}
    >
      {width > 0 && <Animated.View pointerEvents="none" style={{
        position: "absolute", left: inset, width: segmentWidth,
        ...(variant === "tabs" ? { bottom: 0, height: 2 } : { top: 4, bottom: 4, borderRadius: 20 }),
        backgroundColor: variant === "tabs" || !accent ? c.ink : c.tennis,
        transform: [{ translateX: position }],
      }} />}
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityLabel={option.accessibilityLabel ?? option.label}
          accessibilityState={{ selected: value === option.value }}
          onPress={() => {
            if (value === option.value) return;
            void playCue("selection");
            onChange(option.value);
          }}
          style={({ pressed }) => [
            f.segment,
            variant === "tabs" && { borderRadius: 0 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text
            style={[f.segmentText, value === option.value && { color: variant === "tabs" || accent ? c.ink : c.card }]}
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
      onPress={() => {
        void playCue("selection");
        onPress();
      }}
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
  style,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  initialOpen?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <View style={[f.disclosure, compact && f.disclosureCompact, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          void playCue("selection");
          setOpen(!open);
        }}
        style={[f.disclosureHead, compact && f.disclosureHeadCompact]}
      >
        <View style={f.grow}>
          <Text style={textStyle("row")}>{title}</Text>
          {Boolean(detail) && <AppText role="support" secondary>{detail}</AppText>}
        </View>
        <AppText role="label">{open ? "−" : "＋"}</AppText>
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
    padding: 20,
    paddingBottom: 120,
    gap: SHELL_SPACING.section,
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
    ...textStyle("label"),
    color: c.muted
},
  title: {
    ...textStyle("display"),
    color: c.ink,
  },
  h2: {
    ...textStyle("heading"),
    color: c.ink,
  },
  sectionTitle: {
    ...textStyle("heading"),
    color: c.ink,
  },
  copy: {
    ...textStyle("body"),
    color: c.muted,
  },
  small: {
    ...textStyle("caption"),
    color: c.muted,
  },
  rowTitle: {
    ...textStyle("row"),
    color: c.ink,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  grow: { flex: 1 },
  section: {
    gap: SHELL_SECTION.contentGap,
  },
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
    borderRadius: SHELL_RADIUS.control,
    minHeight: 48,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonText: {
    ...textStyle("label"),
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
    borderRadius: 24,
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
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentSelected: { backgroundColor: c.ink },
  segmentText: {
    ...textStyle("label"),
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
    ...textStyle("label"),
    color: c.ink,
  },
  disclosureCompact: {
    borderWidth: 0,
    borderRadius: 24,
    backgroundColor: c.soft,
  },
  disclosureHeadCompact: { minHeight: 48, padding: 12 },
  disclosureBodyCompact: { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  disclosure: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: mobileSurfaces.divider,
    overflow: "hidden",
  },
  disclosureHead: {
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 68,
  },
  disclosureBody: { paddingHorizontal: 0, paddingBottom: 23, gap: 15 },
  modal: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "#14211b80" },
  sheet: {
    borderTopLeftRadius: SHELL_RADIUS.sheet,
    borderTopRightRadius: SHELL_RADIUS.sheet,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    minHeight: 46,
  },
  chipActive: { borderColor: c.plum, backgroundColor: c.soft },
  chipRow: { flexDirection: "row", gap: 9, flexWrap: "wrap" },
  input: {
    ...textStyle("body"),
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
    ...textStyle("hero"),
    color: c.ink
},
});

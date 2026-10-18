import { useState, useEffect, type ReactNode } from "react";
import {
  AccessibilityInfo,
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
export function FocusSheet({
  open,
  title,
  body,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  body?: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => sub.remove();
  }, []);
  return (
    <Modal
      visible={open}
      transparent
      animationType={reduce ? "none" : "slide"}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={f.modal}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close details"
          style={f.backdrop}
          onPress={onClose}
        />
        <SafeAreaView
          edges={["bottom"]}
          style={f.sheet}
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
              {title}
            </Text>
            {body && <Text style={f.copy}>{body}</Text>}
            {children}
          </ScrollView>
        </SafeAreaView>
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
        style={[f.title, { textAlign: "center" }]}
      >
        {title}
      </Text>
      {body && <Text style={[f.copy, { textAlign: "center" }]}>{body}</Text>}
    </View>
  );
}
export function FocusButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
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
export function FocusDisclosure({
  title,
  detail,
  children,
  initialOpen = false,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <View style={f.disclosure}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={f.disclosureHead}
      >
        <View style={f.grow}>
          <Text style={f.rowTitle}>{title}</Text>
          {detail && <Text style={f.small}>{detail}</Text>}
        </View>
        <Text style={f.h2}>{open ? "−" : "＋"}</Text>
      </Pressable>
      {open && <View style={f.disclosureBody}>{children}</View>}
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
    alignItems: "center",
    gap: 9,
    marginVertical: 15,
    marginBottom: 17,
  },
  kicker: {
    fontFamily: "DMSans_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    lineHeight: 16,
    textTransform: "uppercase",
    color: c.muted,
  },
  title: {
    fontFamily: "DMSans_400Regular",
    fontSize: 34,
    lineHeight: 39,
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
    fontSize: 13,
    lineHeight: 22,
    color: c.muted,
  },
  small: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 18,
    color: c.muted,
  },
  rowTitle: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
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
    borderRadius: 16,
    borderBottomWidth: 3,
    padding: 23,
    gap: 13,
  },
  button: {
    backgroundColor: c.plum,
    borderBottomWidth: 3,
    borderBottomColor: "#1a201e",
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
    fontSize: 12,
    color: "#f5faed",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: c.line,
  },
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#14211b80" },
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

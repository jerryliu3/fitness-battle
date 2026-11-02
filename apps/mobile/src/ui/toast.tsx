import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { AppText } from "./section";
import { SHELL_COLORS as c } from "../theme";

type ToastAction = { label: string; onPress: () => void; disabled?: boolean };
type Notice = { id: string; message: string; dismiss: () => void; action?: ToastAction; durationMs: number | null; priority: number };
const ToastContext = createContext<{ show: (notice: Notice) => void; remove: (id: string) => void } | null>(null);

function ToastNotice({ notice }: { notice: Notice }) {
  const latest = useRef(notice.dismiss);
  latest.current = notice.dismiss;
  useEffect(() => {
    if (notice.durationMs === null || notice.action?.disabled) return;
    const timer = setTimeout(() => latest.current(), notice.durationMs);
    return () => clearTimeout(timer);
  }, [notice.id, notice.message, notice.durationMs, notice.action?.disabled]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy < -10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_, gesture) => { if (gesture.dy < -30 || gesture.vy < -.5) latest.current(); },
  }), []);
  return <View {...(Platform.OS === "web" ? {} : pan.panHandlers)} accessibilityActions={[{ name: "dismiss", label: "Dismiss notification" }]} onAccessibilityAction={() => latest.current()} style={{ marginVertical: 16, padding: 16, maxWidth: 560, alignSelf: "center", width: "100%", borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, elevation: 8, shadowColor: c.ink, shadowOpacity: .16, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, flexDirection: notice.action ? "column" : "row", alignItems: notice.action ? "stretch" : "center", gap: 12 }}>
    <AppText accessibilityLiveRegion="polite" style={notice.action ? undefined : { flex: 1 }}>{notice.message}</AppText>
    {notice.action ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(notice.action.disabled), busy: Boolean(notice.action.disabled) }} disabled={notice.action.disabled} onPress={() => { if (!notice.action?.disabled) notice.action?.onPress(); }} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: c.tennis, justifyContent: "center", opacity: notice.action.disabled ? .6 : 1 }}><AppText role="label">{notice.action.label}</AppText></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={notice.dismiss} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}><AppText role="label">Dismiss</AppText></Pressable>
    </View> : Platform.OS === "web" && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={notice.dismiss} style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}><AppText role="label">✕</AppText></Pressable>}
  </View>;
}

/** Read insets in the React tree before iOS reparents the host into the window. */
function ToastOverlay({ notice }: { notice: Notice }) {
  const insets = useSafeAreaInsets();
  const overlay = <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, paddingTop: insets.top, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, zIndex: 1000 }}>
    <ToastNotice notice={notice} />
  </View>;
  return Platform.OS === "ios" ? <FullWindowOverlay>{overlay}</FullWindowOverlay> : overlay;
}

/** Feedback floats above navigation and iOS sheets without taking page space. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const parent = useContext(ToastContext);
  const [notice, setNotice] = useState<Notice | null>(null);
  const show = useCallback((next: Notice) => setNotice(current => current && current.id !== next.id && current.priority > next.priority ? current : next), []);
  const remove = useCallback((id: string) => setNotice(current => current?.id === id ? null : current), []);
  const api = useMemo(() => ({ show, remove }), [show, remove]);
  // The iOS window host also covers sheets, so they share the root priority slot.
  if (parent && Platform.OS === "ios") return <>{children}</>;
  return <ToastContext.Provider value={api}>
    {children}
    {notice && <ToastOverlay notice={notice}/>}
  </ToastContext.Provider>;
}

export function Toast({ message, onDismiss, action, durationMs = 5000, priority = 0 }: {
  message: string; onDismiss?: () => void; action?: ToastAction; durationMs?: number | null; priority?: number;
}) {
  const api = useContext(ToastContext);
  const id = useId();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const current = useRef({ onDismiss, action });
  current.current = { onDismiss, action };
  const event = JSON.stringify([message, action?.label, Boolean(action?.disabled)]);
  useEffect(() => { setDismissed(null); }, [event]);
  useEffect(() => {
    if (!api || !message || event === dismissed) return;
    api.show({ id, message, durationMs, priority,
      action: current.current.action ? { ...current.current.action, onPress: () => current.current.action?.onPress() } : undefined,
      dismiss: () => { setDismissed(event); current.current.onDismiss?.(); api.remove(id); },
    });
    return () => api.remove(id);
  }, [api, id, message, event, dismissed, durationMs, priority]);
  return null;
}

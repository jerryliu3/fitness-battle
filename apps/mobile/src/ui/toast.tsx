import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "./section";
import { SHELL_COLORS as c } from "../theme";

type Notice = { id: string; message: string; dismiss: () => void };
const ToastContext = createContext<{ show: (notice: Notice) => void; remove: (id: string) => void } | null>(null);

function ToastNotice({ notice }: { notice: Notice }) {
  const latest = useRef(notice.dismiss);
  latest.current = notice.dismiss;
  useEffect(() => { const timer = setTimeout(() => latest.current(), 5000); return () => clearTimeout(timer); }, [notice.id, notice.message]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy < -10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_, gesture) => { if (gesture.dy < -30 || gesture.vy < -.5) latest.current(); },
  }), []);
  return <View {...(Platform.OS === "web" ? {} : pan.panHandlers)} accessible accessibilityLabel={notice.message} accessibilityActions={[{ name: "dismiss", label: "Dismiss notification" }]} onAccessibilityAction={() => latest.current()} style={{ margin: 16, padding: 16, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, elevation: 8, shadowColor: c.ink, shadowOpacity: .16, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, flexDirection: "row", alignItems: "center", gap: 12 }}>
    <AppText accessibilityLiveRegion="polite" style={{ flex: 1 }}>{notice.message}</AppText>
    {Platform.OS === "web" && <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={notice.dismiss}><AppText role="label">✕</AppText></Pressable>}
  </View>;
}

/** A root overlay keeps feedback out of scroll layouts and leaves the page interactive. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const show = useCallback((next: Notice) => setNotice(next), []);
  const remove = useCallback((id: string) => setNotice(current => current?.id === id ? null : current), []);
  const api = useMemo(() => ({ show, remove }), [show, remove]);
  return <ToastContext.Provider value={api}>
    {children}
    {notice && <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000 }}>
      <ToastNotice notice={notice} />
    </SafeAreaView>}
  </ToastContext.Provider>;
}

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const api = useContext(ToastContext);
  const id = useId();
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => {
    if (!api || !message) return;
    api.show({ id, message, dismiss: () => { dismiss.current(); api.remove(id); } });
    return () => api.remove(id);
  }, [api, id, message]);
  return null;
}

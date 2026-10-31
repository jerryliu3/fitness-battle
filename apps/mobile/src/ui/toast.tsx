import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "./section";
import { SHELL_COLORS as c } from "../theme";

type Notice = { id: string; message: string; dismiss: () => void };
const ToastContext = createContext<{ show: (notice: Notice) => void; remove: (id: string) => void } | null>(null);

/** A root overlay keeps feedback out of scroll layouts and leaves the page interactive. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const show = useCallback((next: Notice) => setNotice(next), []);
  const remove = useCallback((id: string) => setNotice(current => current?.id === id ? null : current), []);
  const api = useMemo(() => ({ show, remove }), [show, remove]);
  return <ToastContext.Provider value={api}>
    {children}
    {notice && <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000 }}>
      <View style={{ margin: 16, padding: 16, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, elevation: 8, shadowColor: c.ink, shadowOpacity: .16, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AppText accessibilityLiveRegion="polite" style={{ flex: 1 }}>{notice.message}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={notice.dismiss} style={{ minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" }}><AppText role="label">✕</AppText></Pressable>
      </View>
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

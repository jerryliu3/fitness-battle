"use client";

import {
  setCategoryEnabled,
  setMasterEnabled,
  type NotificationCategoryId,
  type NotificationDeliveryPayload,
  type NotificationPreferences,
} from "@fitness-battle/shared";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  deliverWebNotification,
  disableWebPush,
  enableWebPush,
  loadNotificationPreferences,
  saveNotificationPreferences,
  type DeliverResult,
} from "@/lib/push-notifications";

type NotificationApi = {
  prefs: NotificationPreferences | null;
  ready: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setCategory: (category: NotificationCategoryId, enabled: boolean) => void;
  sendTest: (payload?: NotificationDeliveryPayload) => DeliverResult;
};

const NotificationContext = createContext<NotificationApi>({
  prefs: null,
  ready: false,
  setEnabled: async () => {},
  setCategory: () => {},
  sendTest: () => ({ ok: false, reason: "blocked" }),
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    setPrefs(loadNotificationPreferences());
  }, []);

  async function setEnabled(enabled: boolean) {
    if (enabled) {
      setPrefs(await enableWebPush());
      return;
    }
    setPrefs(disableWebPush());
  }

  function setCategory(category: NotificationCategoryId, enabled: boolean) {
    setPrefs((prev) => {
      if (!prev) return prev;
      return saveNotificationPreferences(
        setCategoryEnabled(prev, category, enabled),
      );
    });
  }

  function sendTest(
    payload: NotificationDeliveryPayload = {
      category: "week_summary",
      title: "Overtaek",
      body: "Test push — delivery is stubbed on this device.",
      path: "/you#notifications",
    },
  ): DeliverResult {
    // Ensure master on before testing when already registered.
    if (prefs && !prefs.enabled && prefs.registration?.token) {
      const next = saveNotificationPreferences(setMasterEnabled(prefs, true));
      setPrefs(next);
    }
    return deliverWebNotification(payload);
  }

  return (
    <NotificationContext.Provider
      value={{
        prefs,
        ready: prefs != null,
        setEnabled,
        setCategory,
        sendTest,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

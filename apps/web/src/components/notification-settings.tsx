"use client";

import {
  NOTIFICATION_CATEGORIES,
  permissionLabel,
  setCategoryEnabled,
  type NotificationCategoryId,
  type NotificationPreferences,
} from "@fitness-battle/shared";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import {
  deliverWebNotification,
  disableWebPush,
  enableWebPush,
  hydrateNotificationPreferences,
  updateCategoryPreferences,
  type SyncIdentity,
} from "@/lib/push-notifications";

export function NotificationSettings() {
  const { user, demoMode } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accountPersisted, setAccountPersisted] = useState(false);

  const identity: SyncIdentity | null = user
    ? { userId: user.id, localOnly: demoMode || user.mode === "demo" }
    : null;

  useEffect(() => {
    let alive = true;
    void hydrateNotificationPreferences(identity).then((next) => {
      if (!alive) return;
      setPrefs(next);
      setAccountPersisted(Boolean(identity && !identity.localOnly));
    });
    return () => {
      alive = false;
    };
  }, [user?.id, demoMode, user?.mode]);

  if (!prefs) {
    return (
      <section className="fb-card" id="notifications">
        <h2>Notifications</h2>
        <p className="fb-copy">Loading…</p>
      </section>
    );
  }

  const current = prefs;

  async function onToggleMaster() {
    const turningOn = !current.enabled;
    setBusy(true);
    setNote(null);
    try {
      const next = turningOn
        ? await enableWebPush(identity)
        : await disableWebPush(identity);
      setPrefs(next);
      if (turningOn && !next.enabled) {
        setNote(
          next.permissionStatus === "denied"
            ? "Notifications are blocked in this browser. Allow them in site settings to arm push."
            : "Could not arm push on this browser.",
        );
        return;
      }
      const synced =
        identity && !identity.localOnly
          ? " Saved to your account."
          : " Stored on this device only (demo).";
      setNote(
        next.enabled
          ? `Push armed on this browser. Delivery still uses a stub token until APNs/FCM is wired.${synced}`
          : `Push turned off on this device.${synced}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function onToggleCategory(category: NotificationCategoryId) {
    setBusy(true);
    try {
      const next = await updateCategoryPreferences(
        setCategoryEnabled(current, category, !current.categories[category]),
        identity,
      );
      setPrefs(next);
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    const result = await deliverWebNotification(
      {
        category: "week_summary",
        title: "Overtaek",
        body: "Test push — delivery is stubbed on this device.",
        path: "/you#notifications",
      },
      identity,
    );
    if (!result.ok) {
      setNote("Turn notifications on and allow permission before testing.");
      return;
    }
    const where =
      result.mode === "browser"
        ? "Browser notification shown"
        : result.mode === "stub"
          ? "Stub delivery recorded"
          : "In-app stub delivery";
    setNote(
      `${where}${result.persisted ? " and saved to the outbox" : ""}.`,
    );
  }

  return (
    <section className="fb-card" id="notifications">
      <h2>Notifications</h2>
      <p className="fb-copy">
        Control push for this browser and your account. Preferences sync when
        you are signed in with live Supabase. Web uses the browser Notification
        API locally; iOS/Android register Expo push tokens and the server sends
        through the Expo Push Service (APNs/FCM).
      </p>

      <div className="fb-row">
        <span className="fb-grow">
          Push notifications
          <small>
            {permissionLabel(current.permissionStatus)}
            {current.registration?.token
              ? ` · ${current.registration.stub ? "stub" : "live"} token`
              : ""}
            {accountPersisted ? " · account sync on" : " · device only"}
          </small>
        </span>
        <button
          type="button"
          className={`fb-switch${current.enabled ? " on" : ""}`}
          role="switch"
          aria-checked={current.enabled}
          disabled={busy}
          onClick={() => void onToggleMaster()}
        >
          <span className="fb-switch-knob" />
          <span className="fb-sr-only">{current.enabled ? "On" : "Off"}</span>
        </button>
      </div>

      {NOTIFICATION_CATEGORIES.map((category) => (
        <div key={category.id} className="fb-row">
          <span className="fb-grow">
            {category.label}
            <small>{category.description}</small>
          </span>
          <button
            type="button"
            className={`fb-switch${current.categories[category.id] ? " on" : ""}`}
            role="switch"
            aria-checked={current.categories[category.id]}
            disabled={!current.enabled || busy}
            onClick={() => void onToggleCategory(category.id)}
          >
            <span className="fb-switch-knob" />
            <span className="fb-sr-only">
              {current.categories[category.id] ? "On" : "Off"}
            </span>
          </button>
        </div>
      ))}

      <button
        type="button"
        className="fb-btn-line"
        disabled={!current.enabled || busy}
        onClick={() => void onTest()}
      >
        Send test notification
      </button>
      {note ? <p className="fb-note">{note}</p> : null}
    </section>
  );
}

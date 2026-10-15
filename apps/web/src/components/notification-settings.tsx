"use client";

import {
  NOTIFICATION_CATEGORIES,
  permissionLabel,
  setCategoryEnabled,
  type NotificationCategoryId,
  type NotificationPreferences,
} from "@fitness-battle/shared";
import { useEffect, useState } from "react";
import {
  deliverWebNotification,
  disableWebPush,
  enableWebPush,
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/push-notifications";

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPrefs(loadNotificationPreferences());
  }, []);

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
      const next = turningOn ? await enableWebPush() : disableWebPush();
      setPrefs(next);
      if (turningOn && !next.enabled) {
        setNote(
          next.permissionStatus === "denied"
            ? "Notifications are blocked in this browser. Allow them in site settings to arm push."
            : "Could not arm push on this browser.",
        );
        return;
      }
      setNote(
        next.enabled
          ? "Push armed on this browser. Delivery still uses a stub token until a provider is wired."
          : "Push turned off on this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  function onToggleCategory(category: NotificationCategoryId) {
    setPrefs((prev) => {
      if (!prev) return prev;
      return saveNotificationPreferences(
        setCategoryEnabled(prev, category, !prev.categories[category]),
      );
    });
  }

  function onTest() {
    const result = deliverWebNotification({
      category: "week_summary",
      title: "Overtaek",
      body: "Test push — delivery is stubbed on this device.",
      path: "/you#notifications",
    });
    if (!result.ok) {
      setNote("Turn notifications on and allow permission before testing.");
      return;
    }
    setNote(
      result.mode === "browser"
        ? "Browser notification shown (stub registration)."
        : `Would deliver: ${result.payload.title} — ${result.payload.body}`,
    );
  }

  return (
    <section className="fb-card" id="notifications">
      <h2>Notifications</h2>
      <p className="fb-copy">
        Control push for this browser. Mobile apps have the same switches. Live
        APNs / FCM delivery is not wired yet — enabling registers a stub device
        token so the rest of the product can treat push as available.
      </p>

      <div className="fb-row">
        <span className="fb-grow">
          Push notifications
          <small>
            {permissionLabel(current.permissionStatus)}
            {current.registration?.token
              ? ` · ${current.registration.stub ? "stub" : "live"} token`
              : ""}
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
            disabled={!current.enabled}
            onClick={() => onToggleCategory(category.id)}
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
        disabled={!current.enabled}
        onClick={onTest}
      >
        Send test notification
      </button>
      {note ? <p className="fb-note">{note}</p> : null}
    </section>
  );
}

"use client";

import {
  NOTIFICATION_CATEGORIES,
  permissionLabel,
} from "@fitness-battle/shared";
import { useState } from "react";
import { useNotifications } from "./notification-context";

export function NotificationSettings() {
  const { prefs, ready, setEnabled, setCategory, sendTest } = useNotifications();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!ready || !prefs) {
    return (
      <section className="fb-card" id="notifications">
        <h2>Notifications</h2>
        <p className="fb-copy">Loading…</p>
      </section>
    );
  }

  async function onToggleMaster() {
    setBusy(true);
    setNote(null);
    try {
      await setEnabled(!prefs!.enabled);
      setNote(
        !prefs!.enabled
          ? "Push armed on this browser. Delivery still uses a stub token until a provider is wired."
          : "Push turned off on this device.",
      );
    } finally {
      setBusy(false);
    }
  }

  function onTest() {
    const result = sendTest();
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
            {permissionLabel(prefs.permissionStatus)}
            {prefs.registration?.token
              ? ` · ${prefs.registration.stub ? "stub" : "live"} token`
              : ""}
          </small>
        </span>
        <button
          type="button"
          className={`fb-switch${prefs.enabled ? " on" : ""}`}
          role="switch"
          aria-checked={prefs.enabled}
          disabled={busy}
          onClick={() => void onToggleMaster()}
        >
          <span className="fb-switch-knob" />
          <span className="fb-sr-only">
            {prefs.enabled ? "On" : "Off"}
          </span>
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
            className={`fb-switch${prefs.categories[category.id] ? " on" : ""}`}
            role="switch"
            aria-checked={prefs.categories[category.id]}
            disabled={!prefs.enabled}
            onClick={() =>
              setCategory(category.id, !prefs.categories[category.id])
            }
          >
            <span className="fb-switch-knob" />
            <span className="fb-sr-only">
              {prefs.categories[category.id] ? "On" : "Off"}
            </span>
          </button>
        </div>
      ))}

      <button
        type="button"
        className="fb-btn-line"
        disabled={!prefs.enabled}
        onClick={onTest}
      >
        Send test notification
      </button>
      {note ? <p className="fb-note">{note}</p> : null}
    </section>
  );
}

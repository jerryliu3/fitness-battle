"use client";

/**
 * Web Athlete → Notifications.
 * Real push delivery is mobile-only (Expo). The browser Notification API here
 * was stubbed for QA and is easy to confuse with a live web-push stack, so the
 * web surface is informational only.
 */
export function NotificationSettings() {
  return (
    <section className="fb-card" id="notifications">
      <h2>Notifications</h2>
      <p className="fb-copy">
        Push notifications are available in the Overtaek mobile app — not in
        this browser. Open Athlete → Notifications on your phone to arm reminders,
        weekly summaries, and competition alerts.
      </p>
      <p className="fb-note">
        Web stays quiet on purpose so this screen never pretends a browser push
        channel is live.
      </p>
    </section>
  );
}

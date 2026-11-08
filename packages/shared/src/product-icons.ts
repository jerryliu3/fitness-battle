/** Sport outlines from Tabler Icons (MIT), matching the native AppIcon set.
 * Shared SVG paths: presentation only, no platform imports. */
export const SPORT_ICON_PATHS = {
  running: "M11.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M4 17l5 1l.75 -1.5 M15 21v-4l-4 -3l1 -6 M7 12v-3l5 -1l3 3l3 1",
  cycling: "M2 18a3 3 0 1 0 6 0a3 3 0 0 0 -6 0 M16 18a3 3 0 1 0 6 0a3 3 0 0 0 -6 0 M12 19v-4l-3 -3l5 -4l2 3h3 M13.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
  walking: "M12 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0 M7 21l3 -4 M16 21l-2 -4l-3 -3l1 -6 M6 12l2 -3l4 -1l3 3l3 1",
  strength: "M2 12h1 M6 8h-2a1 1 0 0 0 -1 1v6a1 1 0 0 0 1 1h2 M6 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1 M9 12h6 M15 7v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-10a1 1 0 0 0 -1 -1h-1a1 1 0 0 0 -1 1 M18 8h2a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-2 M22 12h-1",
} as const;
export const SETTINGS_ICON_PATHS = {
  "Data Sync": "M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4",
  Preferences: "M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6",
  Notifications: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3m5 3h4",
  "How scoring works": "M4 20V12h4v8m2 0V8h4v12m2 0V4h4v16",
  Account: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21v-3a8 8 0 0 1 16 0v3",
} as const;

export const HOME_HEALTH_ICON_PATHS = {
  sleep: "M20 15a8 8 0 0 1-11-11A8 8 0 1 0 20 15Z",
  steps: "M8 3c-2 0-3 3-3 5s1 3 3 3 3-1 3-3-1-5-3-5Zm-2 11h4v5H6Zm11-5c-2 0-3 3-3 5s1 3 3 3 3-1 3-3-1-5-3-5Zm-2 11h4v2h-4Z",
  "resting-hr": "M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 8 15 8 15S25 10 20 5Z",
  hrv: "M2 12h4l3-7 5 14 3-7h5",
} as const;

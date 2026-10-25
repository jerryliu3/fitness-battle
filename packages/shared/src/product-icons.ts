/** Shared SVG paths: presentation only, no platform imports. */
export const SPORT_ICON_PATHS = {
  running: "M15 3a1.5 1.5 0 1 0 0 .01M12 7l3 3 4 1M12 7l-4 4H4m8-4-2 7 4 3v5m-4-8-3 6H3",
  cycling: "M6 14a4 4 0 1 0 0 8 4 4 0 0 0 0-8m12 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8M6 18l5-9 4 9H6m5-9h5l2 9M9 6h4m2-1h3l1 3",
  walking: "M13 3a1.5 1.5 0 1 0 0 .01M12 7l-2 7-3 7m3-7 5 3 1 5M12 7l4 5 4 1M12 7l-5 4-3 1",
  strength: "M3 8v8m3-11v14m0-7h12m0-7v14m3-11v8",
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

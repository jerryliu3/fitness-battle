import type { ProviderId } from "./compete/sports";
/** Small integration marks shared by the native SVG and DOM SVG adapters. */
export const INTEGRATION_ICONS: Record<ProviderId, { color: string; background: string; path: string }> = {
  strava: { color: "#fc4c02", background: "#fff1eb", path: "M9 2 2 14h4l3-5 3 5h4L9 2Zm8 12-3 6 3 4 6-10h-4l-2 4-2-4Z" },
  apple_health: { color: "#ff4775", background: "#fff0f4", path: "M12 21 3.5 12.5C-2 6.5 6 0 12 6c6-6 14 0 8.5 6.5L12 21Z" },
  google_health: { color: "#4285f4", background: "#edf4ff", path: "M12 21 3.5 12.5C-2 6.5 6 0 12 6c6-6 14 0 8.5 6.5L12 21Z" },
  garmin: { color: "#126ca6", background: "#edf6fb", path: "m12 3 10 18H2L12 3Zm0 7-4 7h8l-4-7Z" },
  whoop: { color: "#142b3b", background: "#edf2f4", path: "M1 5h4l3 10 2-7h4l2 7 3-10h4l-5 15h-4l-2-7-2 7H6L1 5Z" },
  oura: { color: "#746b5a", background: "#f5f2ed", path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" },
};

export const SOCIAL_AUTH_ICON_PATHS = {
  apple:
    "M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z",
  google: [
    "M21.8 12.23c0-.78-.07-1.53-.2-2.25H12v4.26h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.65Z",
    "M12 22c2.76 0 5.07-.91 6.76-2.47l-3.3-2.56c-.91.61-2.08.98-3.46.98-2.66 0-4.92-1.8-5.73-4.21H2.86v2.64A10 10 0 0 0 12 22Z",
    "M6.27 13.74A6.02 6.02 0 0 1 5.95 12c0-.61.11-1.2.32-1.74V7.62H2.86A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.38l3.2-2.64Z",
    "M12 5.98c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.06 2.93 14.75 2 12 2A10 10 0 0 0 2.86 7.62l3.41 2.64C7.08 7.78 9.34 5.98 12 5.98Z",
  ] as const,
  email:
    "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.5l8 5.33 8-5.33V7H4Zm16 10V9.9l-7.45 4.96a1 1 0 0 1-1.1 0L4 9.9V17h16Z",
} as const;

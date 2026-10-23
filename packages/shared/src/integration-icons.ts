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

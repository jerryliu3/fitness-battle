import { webEnv } from "./env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function rankingsConfig() {
  const url = webEnv.rankingsUrl;
  const anonKey = webEnv.rankingsAnonKey;
  return { url, anonKey, configured: url.length > 0 && anonKey.length > 0 };
}

export function createRankingsClient(): SupabaseClient | null {
  const { url, anonKey, configured } = rankingsConfig();
  if (!configured) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type LeaderboardRow = {
  id: number;
  athlete_name: string;
  sex: string;
  distance_slug: string;
  rank_time_ms: number;
  rank_clock: "chip" | "gun";
  age_years: number | null;
  result_date: string | null;
  event_name: string;
  edition_year: number;
  attribution: string;
  source_url: string;
};

export const DISTANCES = [
  { slug: "5k", label: "5K" },
  { slug: "10k", label: "10K" },
  { slug: "half-marathon", label: "Half marathon" },
  { slug: "marathon", label: "Marathon" },
] as const;

export function distanceSlug(param: string): string | null {
  if (param === "5k" || param === "10k") return param;
  if (param === "half-marathon") return "half_marathon";
  if (param === "marathon") return "marathon";
  return null;
}

export function clockLabel(clock: string): string {
  return clock === "chip" ? "Chip time" : "Official time";
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { SPORT_IDS, type SportId } from "@fitness-battle/shared";

/** Guest choices are local only; never treated as tracked activity, awards, or identity. */
export const GUEST_INTRO_SEEN_KEY = "overtaek-guest-intro-seen-v1";
export const GUEST_INTRO_DRAFT_KEY = "overtaek-guest-intro-draft-v1";
/** The intended new account's email, not a session or authorization token. */
export const GUEST_SIGNUP_PENDING_KEY = "overtaek-guest-signup-email-v1";

export type GuestIntroDraft = {
  sport: SportId;
  name: string;
  city: string;
  countryCode: string;
};

export async function readGuestIntroDraft(): Promise<GuestIntroDraft | null> {
  const raw = await AsyncStorage.getItem(GUEST_INTRO_DRAFT_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<GuestIntroDraft>;
    if (!SPORT_IDS.includes(candidate.sport as SportId)) return null;
    return {
      sport: candidate.sport as SportId,
      name: typeof candidate.name === "string" ? candidate.name.slice(0, 80) : "",
      city: typeof candidate.city === "string" ? candidate.city.slice(0, 80) : "",
      countryCode: typeof candidate.countryCode === "string" && /^[A-Z]{2}$/.test(candidate.countryCode) ? candidate.countryCode : "",
    };
  } catch { return null; }
}

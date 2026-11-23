import { APP_TIMEZONE, dayKey, isValidIanaTimeZone } from "../timezone";
import { crewSessionInstant } from "./crew-sessions";
import { sportById, type SportId } from "./sports";

/** Shared web/native form contract; accepts decimal-keyboard commas, never blank mileage. */
export function parseManualActivity(sport: SportId, mileage: string, duration: string, units: "us" | "metric" = "us"):
  | { distanceM: number; movingSec: number; error: null }
  | { error: string } {
  const decimal = (value: string) => {
    const input = value.trim();
    return /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(input) ? Number(input.replace(",", ".")) : NaN;
  };
  const movingSec = decimal(duration) * 60;
  if (!Number.isFinite(movingSec) || movingSec <= 0 || movingSec > 86400)
    return { error: "Enter a duration greater than 0 and no more than 1,440 minutes." };
  const distanceM = sportById(sport).gps ? decimal(mileage) * (units === "metric" ? 1000 : 1609.344) : 0;
  if (!Number.isFinite(distanceM) || distanceM < 0 || distanceM > 2_000_000)
    return { error: units === "metric" ? "Enter a distance between 0 and 2,000 km." : "Enter mileage between 0 and 1,242 miles." };
  return { distanceM, movingSec, error: null };
}

/** Optional local date & wall time in the account zone; never in the future. */
export function manualActivityInstant(
  time: string,
  now: Date,
  timeZone: string = APP_TIMEZONE,
  date?: string,
): { startedAt: string; error: null } | { error: string } {
  const zone = isValidIanaTimeZone(timeZone) ? timeZone : APP_TIMEZONE;
  const trimmedDate = date?.trim() ?? "";
  const trimmedTime = time.trim();
  if (!trimmedDate && !trimmedTime) return { startedAt: now.toISOString(), error: null };
  const targetDay = trimmedDate || dayKey(now, zone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDay)) {
    return { error: "Choose a valid date as YYYY-MM-DD." };
  }
  const targetTime = trimmedTime || new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now).replace(/^24:/, "00:");
  try {
    const startedAt = crewSessionInstant(targetDay, targetTime, zone);
    if (Date.parse(startedAt) > now.getTime()) {
      return { error: trimmedDate && trimmedDate !== dayKey(now, zone) ? "Choose a past date." : "Choose a time earlier today." };
    }
    return { startedAt, error: null };
  } catch {
    return { error: trimmedDate ? "Enter a valid date and time." : "Enter a valid time today as HH:MM." };
  }
}

import { inferRaceReplayTimeZone } from "@fitness-battle/shared";
import { MAJOR_EVENTS, NYRR_MARATHON_2026 } from "./catalog";

function normalizeEventName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/** IANA timezone for replay wall-clock display. */
export function replayTimeZoneForEdition(eventName: string, editionYear: number): string | null {
  const norm = normalizeEventName(eventName);
  for (const row of MAJOR_EVENTS) {
    if (row.editionYear !== editionYear || !row.timeZone) continue;
    const eventNorm = normalizeEventName(row.eventName);
    if (norm === eventNorm || norm.includes(eventNorm) || eventNorm.includes(norm)) {
      return row.timeZone;
    }
  }
  if (editionYear === 2026 && /new york/i.test(eventName)) {
    return "America/New_York";
  }
  return inferRaceReplayTimeZone(eventName);
}
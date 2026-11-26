import { MAJOR_EVENTS, NYRR_MARATHON_2026 } from "./catalog";

const NAME_HINTS: ReadonlyArray<{ pattern: RegExp; timeZone: string }> = [
  { pattern: /banff/i, timeZone: "America/Edmonton" },
  { pattern: /toronto/i, timeZone: "America/Toronto" },
  { pattern: /sydney/i, timeZone: "Australia/Sydney" },
  { pattern: /london/i, timeZone: "Europe/London" },
  { pattern: /berlin/i, timeZone: "Europe/Berlin" },
  { pattern: /boston/i, timeZone: "America/New_York" },
  { pattern: /chicago/i, timeZone: "America/Chicago" },
  { pattern: /san francisco/i, timeZone: "America/Los_Angeles" },
  { pattern: /tokyo/i, timeZone: "Asia/Tokyo" },
  { pattern: /new york/i, timeZone: "America/New_York" },
];

function inferRaceReplayTimeZone(eventName: string): string | null {
  for (const hint of NAME_HINTS) {
    if (hint.pattern.test(eventName)) return hint.timeZone;
  }
  return null;
}

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
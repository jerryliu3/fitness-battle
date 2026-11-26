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

/** Best-effort IANA zone from event title when edition metadata is unavailable. */
export function inferRaceReplayTimeZone(eventName: string): string | null {
  for (const hint of NAME_HINTS) {
    if (hint.pattern.test(eventName)) return hint.timeZone;
  }
  return null;
}
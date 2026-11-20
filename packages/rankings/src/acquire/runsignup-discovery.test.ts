import { expect, it } from "vitest";
import { runSignupCandidates } from "./runsignup-discovery";
import { upsertCandidateSql } from "./sql";

it("discovers historical event days and preserves reviewed inbox entries on reimport", () => {
  const race = {
    race_id: 42,
    name: "Capital Road Race",
    address: { city: "Olympia", state: "WA" },
    race_event_days: [
      { start_date: "6/14/2025 00:00", end_date: "6/14/2025 00:00" },
      { start_date: "8/1/2026 00:00", end_date: "8/2/2026 00:00" },
      { start_date: "9/1/2026 00:00", end_date: "9/1/2026 00:00" },
    ],
  };
  const [candidate, ...rest] = runSignupCandidates({ races: [{ race }] }, "2026-01-01", "2026-08-15");
  expect(rest).toEqual([]);
  expect(candidate).toMatchObject({
    discoveryKey: "runsignup:42:2026-08-01",
    editionYear: 2026,
    startsOn: "2026-08-01",
    locationText: "Olympia, WA",
    resultsUrls: [],
  });
  expect(upsertCandidateSql(candidate)).toContain("on conflict (dedupe_key) do nothing");
});

it("rejects invalid catalog payloads and impossible event dates", () => {
  expect(() => runSignupCandidates({ error: "Rate limited" }, "2026-01-01", "2026-08-15")).toThrow("races array");
  expect(() => runSignupCandidates({ races: [{ race: {
    race_id: 42, name: "Capital Road Race",
    race_event_days: [{ start_date: "2/30/2026 00:00", end_date: "3/1/2026 00:00" }],
  } }] }, "2026-01-01", "2026-08-15")).toThrow("Invalid event dates");
});

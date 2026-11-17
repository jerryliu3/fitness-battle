import { expect, it } from "vitest";
import { formatTimeZoneLabel } from "./timezone";
it.each([
  ["America/New_York", "2026-01-15T12:00:00Z", "New York (GMT−5)"],
  ["America/New_York", "2026-07-15T12:00:00Z", "New York (GMT−4)"],
  ["America/Los_Angeles", "2026-01-15T00:30:00Z", "Los Angeles (GMT−8)"],
  ["Asia/Kolkata", "2026-01-15T23:50:00Z", "Kolkata (GMT+5:30)"],
  ["Australia/Adelaide", "2026-01-15T12:00:00Z", "Adelaide (GMT+10:30)"],
  ["UTC", "2026-01-15T12:00:00Z", "UTC (GMT)"],
])("labels %s with its actual offset", (zone, at, label) => {
  expect(formatTimeZoneLabel(zone, new Date(at))).toBe(label);
});

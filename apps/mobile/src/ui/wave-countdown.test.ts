import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, it, vi } from "vitest";
vi.mock("./section", () => ({ AppText: "AppText" }));
import { WaveCountdown, waveCountdown } from "./wave-countdown";

it("formats hours, minutes and seconds and clamps at the start", () => {
  const now = Date.parse("2026-10-30T09:00:00Z");
  expect(waveCountdown("2026-10-30T10:02:03Z", now)).toBe("01:02:03");
  expect(waveCountdown("2026-10-30T09:00:00Z", now + 1000)).toBe("00:00:00");
});
it("ticks each second and clears its timer on unmount", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  const now = new Date("2026-10-30T09:00:00Z");
  vi.setSystemTime(now);
  let r!: ReactTestRenderer;
  await act(async () => { r = create(createElement(WaveCountdown, { start: "2026-10-30T10:00:00Z", now })); });
  const reading = () => r.root.findByType("AppText" as never).props.children.join("");
  expect(reading()).toBe("01:00:00 remaining");
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(reading()).toBe("00:59:59 remaining");
  await act(async () => r.unmount());
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

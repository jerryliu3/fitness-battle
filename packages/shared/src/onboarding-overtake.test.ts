import { describe, expect, it } from "vitest";
import { SPORT_IDS } from "./compete/sports";
import { createOnboardingOvertakeMoment, ONBOARDING_REPLAY_TUNING } from "./onboarding-overtake";
import { competitionMomentScene } from "./competition-moments";

describe("guest sport overtake", () => {
  for (const sport of SPORT_IDS) {
    it(`illustrates an overtake for ${sport} without account state`, () => {
      const moment = createOnboardingOvertakeMoment("Taylor", sport, "data:image/jpeg;base64,/9j/");
      expect(moment.lanes.find(l => l.you)?.avatarUrl).toBe("data:image/jpeg;base64,/9j/");
      expect(moment.lanes.filter(lane => !lane.you).every(lane => lane.avatarUrl?.startsWith("https://"))).toBe(true);
      expect(moment.sport).toBe(sport);
      expect(moment.unit).toBe(sport === "walking" ? "steps" : sport === "strength" ? "hrs" : "km");
      expect(moment.lanes.find(l => l.you)?.name).toBe("Taylor");
      expect(competitionMomentScene(moment, 0).rank).toBe(2);
      expect(competitionMomentScene(moment, 1).rank).toBe(1);
      expect(competitionMomentScene(moment, 1).count).toBe(1);
    });
  }
});


it("shortens the approach without changing the pass, and keeps the tighter view framed", () => {
  const moment = createOnboardingOvertakeMoment("You", "cycling");
  const duration = (tuning: typeof ONBOARDING_REPLAY_TUNING | undefined) => {
    let samples = 0;
    for (let i = 0; i <= 1000; i++) {
      const frame = competitionMomentScene(moment, i / 1000, tuning);
      if (frame.travel >= .45 && frame.travel < .5) samples++;
    }
    return samples / 1000 * (tuning?.durationMs ?? 13050);
  };
  expect(duration(ONBOARDING_REPLAY_TUNING)).toBeLessThan(duration(undefined) * .6);
  let previous = 0;
  for (let i = 0; i <= 100; i++) {
    const frame = competitionMomentScene(moment, i / 100, ONBOARDING_REPLAY_TUNING);
    expect(frame.travel).toBeGreaterThanOrEqual(previous);
    previous = frame.travel;
  }
  expect(competitionMomentScene(moment, 1, ONBOARDING_REPLAY_TUNING)).toMatchObject({ count: 1, rank: 1, travel: 1 });
  expect(competitionMomentScene(moment, .5, ONBOARDING_REPLAY_TUNING).view.span).toBeLessThan(competitionMomentScene(moment, .5).view.span);
});

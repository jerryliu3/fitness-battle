import { describe, expect, it } from "vitest";
import { SPORT_IDS } from "./compete/sports";
import { createOnboardingOvertakeMoment } from "./onboarding-overtake";
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

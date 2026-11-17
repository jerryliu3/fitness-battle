import { createRaceCourse } from "./race-course";
import type { CompetitionMoment } from "./competition-moments";
import { ONBOARDING_PORTRAITS } from "./onboarding-journey";
import type { SportId } from "./compete/sports";

/** An illustrative public course and two fictional racers; never applied to account state. */
export const onboardingOvertakeCourse = createRaceCourse("First overtake", [[-73.974,40.764],[-73.970,40.770],[-73.965,40.773]]);

export function createOnboardingOvertakeMoment(name = "Athlete", sport: SportId = "running", avatarUrl?: string): CompetitionMoment {
  const athleteName = name.trim() || "Athlete";
  const unit = sport === "walking" ? "steps" : sport === "strength" ? "hrs" : "km";
  const scale = sport === "walking" ? 10_000 : 1;
  const youBefore = .15 * scale;
  const youAfter = .85 * scale;
  const rival = .5 * scale;
  return {
    id: `onboarding-overtake:${sport}`, sport, unit,
    lanes: [
      { id: "you", name: athleteName, initials: athleteName.slice(0, 2).toUpperCase(), you: true, avatarUrl, value: youAfter },
      { id: "alex", name: "Alex", initials: "A", avatarUrl: ONBOARDING_PORTRAITS.alex, value: rival },
    ],
    plan: {
      youId: "you", youBefore, youAfter, rankBefore: 2, rankAfter: 1,
      hasOvertake: true, anyRivalMoved: false, overtakenIds: ["alex"], rivalSlideEnd: 0, durationMs: 6000,
      rivals: { alex: { id: "alex", name: "Alex", startValue: rival, endValue: rival, moved: false, overtaken: true } },
    },
  };
}


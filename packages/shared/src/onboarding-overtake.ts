import { createRaceCourse } from "./race-course";
import type { CompetitionMoment } from "./competition-moments";
import type { SportId } from "./compete/sports";

/** An illustrative public course and two fictional racers; never applied to account state. */
export const onboardingOvertakeCourse = createRaceCourse("Overtake tutorial · sample course", [[-73.974,40.764],[-73.970,40.770],[-73.965,40.773]]);

export function createOnboardingOvertakeMoment(name = "Athlete", sport: SportId = "running"): CompetitionMoment {
  const athleteName = name.trim() || "Athlete";
  const unit = sport === "running" || sport === "cycling" ? "km" : "pts";
  const youBefore = unit === "pts" ? 15 : .15;
  const youAfter = unit === "pts" ? 85 : .85;
  const rival = unit === "pts" ? 50 : .5;
  return {
    id: `onboarding-overtake:${sport}`, sport, unit,
    lanes: [
      { id: "you", name: athleteName, initials: athleteName.slice(0, 2).toUpperCase(), you: true, value: youAfter },
      { id: "alex", name: "Alex", initials: "A", value: rival },
    ],
    plan: {
      youId: "you", youBefore, youAfter, rankBefore: 2, rankAfter: 1,
      hasOvertake: true, anyRivalMoved: false, overtakenIds: ["alex"], rivalSlideEnd: 0, durationMs: 6000,
      rivals: { alex: { id: "alex", name: "Alex", startValue: rival, endValue: rival, moved: false, overtaken: true } },
    },
  };
}

export const onboardingOvertakeMoment: CompetitionMoment = createOnboardingOvertakeMoment();

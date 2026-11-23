export const COMPETITION_CLASSES = ["open", "wheelchair"] as const;
export type CompetitionClass = (typeof COMPETITION_CLASSES)[number];

/**
 * NYRR finishers-filter returns running age-grade % (ageGradePercent).
 * Wheelchair division athletes are graded against foot standards and exceed 100%.
 */
export const NYRR_WHEELCHAIR_AGE_GRADE_MIN = 100;

export function nyrrCompetitionClassFromFinisher(row: {
  ageGradePercent?: number | string | null;
}): CompetitionClass {
  const raw = row.ageGradePercent;
  const value = raw == null || raw === "" ? null : Number(raw);
  if (value != null && Number.isFinite(value) && value > NYRR_WHEELCHAIR_AGE_GRADE_MIN) {
    return "wheelchair";
  }
  return "open";
}

/** resultDetails.details.speed is average mph from NYRR split telemetry. */
export const NYRR_WHEELCHAIR_SPEED_MPH_MIN = 14;

export function nyrrCompetitionClassFromResultDetails(details: {
  percentAgeGrade?: number | string | null;
  speed?: number | string | null;
}): CompetitionClass | null {
  const age = details.percentAgeGrade;
  const ageN = age == null || age === "" ? null : Number(age);
  if (ageN != null && Number.isFinite(ageN) && ageN > NYRR_WHEELCHAIR_AGE_GRADE_MIN) {
    return "wheelchair";
  }
  const speed = details.speed;
  const speedN = speed == null || speed === "" ? null : Number(speed);
  if (speedN != null && Number.isFinite(speedN) && speedN >= NYRR_WHEELCHAIR_SPEED_MPH_MIN) {
    return "wheelchair";
  }
  if (ageN != null && Number.isFinite(ageN) && ageN <= NYRR_WHEELCHAIR_AGE_GRADE_MIN
    && (speedN == null || speedN < NYRR_WHEELCHAIR_SPEED_MPH_MIN)) {
    return "open";
  }
  return null;
}
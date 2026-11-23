import { describe, expect, it } from "vitest";
import {
  nyrrCompetitionClassFromFinisher,
  nyrrCompetitionClassFromResultDetails,
} from "./competition-class";

describe("nyrrCompetitionClassFromFinisher", () => {
  it("marks wheelchair from age-grade metadata above 100", () => {
    expect(nyrrCompetitionClassFromFinisher({ ageGradePercent: 139.61 })).toBe("wheelchair");
    expect(nyrrCompetitionClassFromFinisher({ ageGradePercent: 100 })).toBe("open");
    expect(nyrrCompetitionClassFromFinisher({ ageGradePercent: 97.57 })).toBe("open");
  });
});

describe("nyrrCompetitionClassFromResultDetails", () => {
  it("confirms wheelchair from percentAgeGrade or speed telemetry", () => {
    expect(nyrrCompetitionClassFromResultDetails({ percentAgeGrade: 139.61, speed: 16.4 })).toBe("wheelchair");
    expect(nyrrCompetitionClassFromResultDetails({ percentAgeGrade: 97.57, speed: 12.5 })).toBe("open");
    expect(nyrrCompetitionClassFromResultDetails({ speed: 16 })).toBe("wheelchair");
  });
});
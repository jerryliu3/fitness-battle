import { describe, expect, it } from "vitest";
import {
  effortScoreInBand,
  eloInBand,
  RANK_BANDS,
  rankForEffortScore,
  rankForElo,
  rankSymbolForRankName,
  rankSymbolForScore,
  effectiveRankSymbol,
} from "./ranks";

describe("fitness-style ranks", () => {
  it("orders Beginner → Champion with nine visual ranks", () => {
    expect(RANK_BANDS[0]?.name).toBe("Beginner");
    expect(RANK_BANDS.at(-1)?.name).toBe("Champion");
    expect(RANK_BANDS.map((band) => band.name)).toEqual([
      "Beginner",
      "Rookie",
      "Active",
      "Challenger",
      "Athlete",
      "Elite",
      "Master",
      "Olympian",
      "Champion",
    ]);
    expect(RANK_BANDS.map((band) => band.id)).toEqual([
      "beginner",
      "rookie",
      "active",
      "challenger",
      "athlete",
      "elite",
      "master",
      "olympian",
      "champion",
    ]);
  });

  it("maps Elo to bands and symbols", () => {
    expect(rankForElo(0).name).toBe("Beginner");
    expect(rankForElo(0).id).toBe("beginner");
    expect(rankForElo(500).name).toBe("Beginner");
    expect(rankForElo(500).id).toBe("beginner");
    expect(rankForElo(1250).name).toBe("Rookie");
    expect(rankForElo(1250).id).toBe("rookie");
    expect(rankForElo(2500).name).toBe("Active");
    expect(rankForElo(2500).id).toBe("active");
    expect(rankForElo(3750).name).toBe("Challenger");
    expect(rankForElo(5000).name).toBe("Athlete");
    expect(rankForElo(6250).name).toBe("Elite");
    expect(rankForElo(7500).name).toBe("Master");
    expect(rankForElo(8750).name).toBe("Olympian");
    expect(rankForElo(10000).name).toBe("Champion");
    expect(rankForEffortScore(2500).name).toBe("Active");
  });

  it("reports progress into the next band", () => {
    const ladder = eloInBand(6200);
    expect(ladder.band.name).toBe("Athlete");
    expect(ladder.next?.name).toBe("Elite");
    expect(ladder.intoNext).toBe(50);
    expect(effortScoreInBand(6200)).toEqual(ladder);
  });

  it("maps scores and legacy rank names onto laurel symbols", () => {
    expect(rankSymbolForScore(null)).toBe("beginner");
    expect(rankSymbolForScore(0)).toBe("beginner");
    expect(rankSymbolForScore(2500)).toBe("active");
    expect(rankSymbolForRankName("Unranked")).toBe("beginner");
    expect(rankSymbolForRankName("Developing")).toBe("rookie");
    expect(rankSymbolForRankName("Steady")).toBe("challenger");
    expect(rankSymbolForRankName("Strong")).toBe("athlete");
    expect(rankSymbolForRankName("Master")).toBe("master");
    expect(effectiveRankSymbol(null)).toBe("beginner");
    expect(effectiveRankSymbol({ rankSymbol: "elite", primary: "run" })).toBe("elite");
    expect(effectiveRankSymbol({
      primary: "run",
      ratings: [{ sport: "run", openElo: 2500, verifiedElo: 7500 }],
    })).toBe("master");
  });
});

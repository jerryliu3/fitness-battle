import { describe, expect, it } from "vitest";
import {
  effortScoreInBand,
  eloInBand,
  RANK_BANDS,
  rankForEffortScore,
  rankForElo,
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
    expect(rankForElo(0).name).toBe("Unranked");
    expect(rankForElo(0).id).toBe("beginner");
    expect(rankForElo(500).name).toBe("Beginner");
    expect(rankForElo(500).id).toBe("beginner");
    expect(rankForElo(800).name).toBe("Rookie");
    expect(rankForElo(800).id).toBe("rookie");
    expect(rankForElo(1000).name).toBe("Active");
    expect(rankForElo(1000).id).toBe("active");
    expect(rankForElo(1200).name).toBe("Challenger");
    expect(rankForElo(1400).name).toBe("Athlete");
    expect(rankForElo(1600).name).toBe("Elite");
    expect(rankForElo(1800).name).toBe("Master");
    expect(rankForElo(2000).name).toBe("Olympian");
    expect(rankForElo(2200).name).toBe("Champion");
    expect(rankForEffortScore(1000).name).toBe("Active");
  });

  it("reports progress into the next band", () => {
    const ladder = eloInBand(1550);
    expect(ladder.band.name).toBe("Athlete");
    expect(ladder.next?.name).toBe("Elite");
    expect(ladder.intoNext).toBe(50);
    expect(effortScoreInBand(1550)).toEqual(ladder);
  });
});

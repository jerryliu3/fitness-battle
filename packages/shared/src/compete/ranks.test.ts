import { describe, expect, it } from "vitest";
import {
  effortScoreInBand,
  eloInBand,
  RANK_BANDS,
  rankForEffortScore,
  rankForElo,
} from "./ranks";

describe("fitness-style ranks", () => {
  it("orders Beginner → Champion", () => {
    expect(RANK_BANDS[0]?.name).toBe("Beginner");
    expect(RANK_BANDS.at(-1)?.name).toBe("Champion");
    expect(RANK_BANDS.map((band) => band.name)).toEqual([
      "Beginner",
      "Developing",
      "Active",
      "Steady",
      "Strong",
      "Elite",
      "Olympian",
      "Champion",
    ]);
  });

  it("maps Elo to bands", () => {
    expect(rankForElo(500).name).toBe("Beginner");
    expect(rankForElo(1000).name).toBe("Active");
    expect(rankForElo(1600).name).toBe("Elite");
    expect(rankForElo(2000).name).toBe("Champion");
    expect(rankForEffortScore(1000).name).toBe("Active");
  });

  it("reports progress into the next band", () => {
    const ladder = eloInBand(1550);
    expect(ladder.band.name).toBe("Strong");
    expect(ladder.next?.name).toBe("Elite");
    expect(ladder.intoNext).toBe(50);
    expect(effortScoreInBand(1550)).toEqual(ladder);
  });
});

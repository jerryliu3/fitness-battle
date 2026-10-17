import { describe, expect, it } from "vitest";
import {
  createEmberScene,
  type EmberNode,
} from "@fitness-battle/shared/mascot";
import {
  dailyDistances,
  parseSelection,
  wardrobeReducer,
  weekSummary,
  WEEK_FIXTURES,
} from "./catalog";
import { recolorEmber } from "./skin-ember";

describe("brand gallery review state", () => {
  it("previews a locked finish without replacing the equipped character", () => {
    const original = { preview: "mint", equipped: "mint" } as const;
    const preview = wardrobeReducer(original, {
      type: "preview",
      skin: "night",
    });
    expect(preview).toEqual({ preview: "night", equipped: "mint" });
    expect(wardrobeReducer(preview, { type: "equip" })).toBe(preview);
    expect(wardrobeReducer(preview, { type: "cancel" })).toEqual(original);
  });
  it("applies an owned finish only after an explicit equip action", () => {
    const preview = wardrobeReducer(
      { preview: "classic", equipped: "classic" },
      { type: "preview", skin: "arcade" },
    );
    expect(preview.equipped).toBe("classic");
    expect(wardrobeReducer(preview, { type: "equip" })).toEqual({
      preview: "arcade",
      equipped: "arcade",
    });
  });
  it("normalizes an unknown deep link without executing or reflecting it", () => {
    expect(parseSelection("<script>", "../../today")).toEqual({
      concept: "everyday-club",
      view: "product",
    });
    expect(parseSelection("chain-reaction", "locker")).toEqual({
      concept: "chain-reaction",
      view: "locker",
    });
  });
  it("recomputes rank and the nearest gap when the selected week changes", () => {
    expect(weekSummary("current")).toEqual({
      total: 23.6,
      rank: 3,
      rival: "Alex",
      gap: 1.2,
      crewTotal: 97.8,
    });
    expect(weekSummary("previous")).toEqual({
      total: 29.4,
      rank: 2,
      rival: "Maya",
      gap: 1.8,
      crewTotal: 114,
    });
    for (const f of Object.values(WEEK_FIXTURES))
      expect(dailyDistances(f.you).reduce((sum, n) => sum + n, 0)).toBeCloseTo(
        f.you.at(-1)!,
      );
  });
});

describe("study-only Ember finishes", () => {
  it("recolors recursive paint attributes while preserving geometry and gradient references", () => {
    const nodes: EmberNode[] = [
      {
        tag: "g",
        attrs: { transform: "translate(1 2)" },
        children: [
          {
            tag: "path",
            attrs: { d: "M 1 2 L 3 4", fill: "#ffc629", stroke: "#234039" },
          },
          { tag: "stop", attrs: { offset: "70%", stopColor: "#ffc629" } },
          { tag: "path", attrs: { fill: "url(#original-gold)" } },
        ],
      },
    ];
    const snapshot = JSON.stringify(nodes);
    const result = recolorEmber(nodes, {
      "#ffc629": "#a58add",
      "#234039": "#2d1c47",
    });
    expect(result[0].children?.[0].attrs).toEqual({
      d: "M 1 2 L 3 4",
      fill: "#a58add",
      stroke: "#2d1c47",
    });
    expect(result[0].children?.[1].attrs.stopColor).toBe("#a58add");
    expect(result[0].children?.[2].attrs.fill).toBe("url(#original-gold)");
    expect(JSON.stringify(nodes)).toBe(snapshot);
  });
  it("leaves the canonical current Ember scene unchanged after rendering another finish", () => {
    const original = createEmberScene({ id: "reference" });
    const snapshot = JSON.stringify(original);
    recolorEmber(original, { "#ffc629": "#a58add", "#ffd648": "#cbb8ee" });
    expect(JSON.stringify(createEmberScene({ id: "reference" }))).toBe(
      snapshot,
    );
  });
});

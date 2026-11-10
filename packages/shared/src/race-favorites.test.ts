import { describe, expect, it } from "vitest";
import { createRaceFavorites, raceResultIds } from "./race-favorites";
describe("device race bookmarks", () => {
  it("keeps only distinct valid IDs", () => {
    expect(raceResultIds([2, 2, -1, "3", Infinity, 4])).toEqual([2, 4]);
  });
  it("does not overwrite storage when hydration failed", async () => {
    let writes = 0;
    const store = createRaceFavorites({read:async () => {throw new Error();},write:async () => {writes++;}});
    await store.load(); await store.toggle(2);
    expect(store.snapshot().ready).toBe(false);
    expect(writes).toBe(0);
  });
  it("rolls back a failed write and can retry", async () => {
    let fail = true;
    const store = createRaceFavorites({read:async () => "[1]",write:async () => {if(fail) throw new Error();}});
    await store.load(); await store.toggle(2);
    expect(store.snapshot().ids).toEqual([1]);
    expect(store.snapshot().error).not.toBe("");
    fail = false; await store.toggle(2);
    expect(store.snapshot().ids).toEqual([1,2]);
  });
});

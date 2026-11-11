import { describe, expect, it, vi } from "vitest";
import { readResultPages, type ResultsPage } from "./pagination";

function page(keys: string[], skippedYouth = 0, skippedUnparsed = 0, isExhausted?: boolean): ResultsPage {
  return {
    results: [],
    inputCount: keys.length,
    rowKeys: keys,
    skippedYouth,
    skippedUnparsed,
    isExhausted: isExhausted ?? (keys.length === 0),
  };
}

describe("results pagination", () => {
  it("continues through short and entirely excluded pages until upstream exhaustion", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page(["youth-1", "youth-2"], 2))
      .mockResolvedValueOnce(page(["adult-1"]))
      .mockResolvedValueOnce(page([]));
    expect(await readResultPages(fetchPage)).toHaveLength(2);
    expect(fetchPage.mock.calls.map(([number]) => number)).toEqual([1, 2, 3]);
  });

  it("rejects repeated results including excluded rows and non-adjacent repeats", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page(["youth-1"], 1))
      .mockResolvedValueOnce(page(["adult-2"]))
      .mockResolvedValueOnce(page(["youth-1"], 1));
    await expect(readResultPages(fetchPage)).rejects.toThrow("Repeated result on page 3");
  });

  it("rejects a partially overlapping page instead of silently deduplicating", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page(["1", "2"]))
      .mockResolvedValueOnce(page(["2", "3"]));
    await expect(readResultPages(fetchPage)).rejects.toThrow("Repeated result");
  });

  it("holds unparsed rows and exhausted page budgets rather than returning partial imports", async () => {
    await expect(readResultPages(async () => page(["bad"], 0, 1))).rejects.toThrow("Unparsed results");
    await expect(readResultPages(async (number) => page([String(number)]), 2)).rejects.toThrow("Page limit");
  });

  it("propagates upstream failures without returning earlier pages", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(page(["1"])).mockRejectedValueOnce(new Error("429"));
    await expect(readResultPages(fetchPage)).rejects.toThrow("429");
  });

  it("rejects an empty page without an explicit exhaustion signal", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(page(["1"]))
      .mockResolvedValueOnce(page([], 0, 0, false));
    await expect(readResultPages(fetchPage)).rejects.toThrow("without explicit exhaustion signal");
  });
});

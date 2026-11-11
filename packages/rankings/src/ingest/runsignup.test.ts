import { describe, expect, it, vi } from "vitest";
import { fetchRunSignupResults, parseRunSignupResults, runSignupResultsUrl, type RunSignupPayload } from "./runsignup";

const metadata = { individual_result_set_id: 10, public_results: "T", preliminary_results: "F" };
const options = { raceId: "1", eventId: "2", resultSetId: "10", distance: "5k" as const };
const adult = { result_id: 100, first_name: "Ada", last_name: "Lovelace", age: 36, gender: "F", chip_time: "21:32.11" };

function payload(results: object[], fields = {}): RunSignupPayload {
  return { individual_results_sets: [{ ...metadata, results, ...fields }] };
}

describe("RunSignup public finalized set ingestion", () => {
  it("pages one selected set through a youth-only page and supports nonbinary categories", async () => {
    const fetchJson = vi.fn()
      .mockResolvedValueOnce({ individual_results_sets: [metadata] })
      .mockResolvedValueOnce(payload([{ ...adult, result_id: 99, age: 16 }]))
      .mockResolvedValueOnce(payload([{ ...adult, gender: "X" }]))
      .mockResolvedValueOnce(payload([]));
    const pages = await fetchRunSignupResults({ ...options, pageSize: 100, fetchJson });
    expect(pages.map((page) => page.inputCount)).toEqual([1, 1]);
    expect(pages[0].skippedYouth).toBe(1);
    expect(pages[1].results[0]).toMatchObject({ athleteName: "Ada Lovelace", sex: "other", chipTimeMs: 1_292_110 });
    const urls = fetchJson.mock.calls.slice(1).map(([url]) => new URL(url));
    expect(urls.map((url) => url.searchParams.get("page"))).toEqual(["1", "2", "3"]);
    expect(urls.every((url) => url.searchParams.get("individual_result_set_id") === "10")).toBe(true);
    expect(urls.every((url) => url.searchParams.get("supports_nb") === "T")).toBe(true);
  });

  it.each([
    { public_results: "F" },
    { public_results: undefined },
    { preliminary_results: "T" },
    { preliminary_results: undefined },
  ])("does not fetch results without explicit public/final metadata: %j", async (fields) => {
    const fetchJson = vi.fn().mockResolvedValue({ individual_results_sets: [{ ...metadata, ...fields }] });
    await expect(fetchRunSignupResults({ ...options, fetchJson })).rejects.toThrow("public, finalized");
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });

  it("holds changes in access/finality or a provider ignoring the requested set", async () => {
    for (const fields of [{ public_results: "F" }, { preliminary_results: "T" }, { individual_result_set_id: 11 }]) {
      const fetchJson = vi.fn()
        .mockResolvedValueOnce({ individual_results_sets: [metadata] })
        .mockResolvedValueOnce(payload([adult], fields));
      await expect(fetchRunSignupResults({ ...options, fetchJson })).rejects.toThrow("import held");
    }
  });

  it("rejects repeated pages and response errors instead of publishing a truncated field", async () => {
    const fetchJson = vi.fn()
      .mockResolvedValueOnce({ individual_results_sets: [metadata] })
      .mockResolvedValue(payload([adult]));
    await expect(fetchRunSignupResults({ ...options, fetchJson })).rejects.toThrow("Repeated result");
    expect(() => parseRunSignupResults({} as RunSignupPayload, { distance: "5k", sourceUrl: "https://example.test" })).toThrow("Invalid RunSignup");
    expect(() => parseRunSignupResults(payload([adult], { results: undefined }), { distance: "5k", sourceUrl: "https://example.test" })).toThrow("Missing RunSignup results");
  });

  it("fails closed on unknown-public or unknown-finality rows", () => {
    for (const fields of [{ public_results: undefined }, { preliminary_results: undefined }]) {
      expect(parseRunSignupResults(payload([adult], fields), { distance: "5k", sourceUrl: "https://example.test" }).results).toEqual([]);
    }
  });

  it("requires numeric provider IDs", () => {
    expect(() => runSignupResultsUrl("1/elsewhere", "2", 1, 100, "10")).toThrow("numeric");
    expect(() => runSignupResultsUrl("1", "2", 1, 100, "")).toThrow("numeric");
  });
});

import { describe, expect, it } from "vitest";
import { parseResultsCsv } from "./csv";
import { divisionIsUnder18, personNameFromList } from "./names";
import { parseMikaTimingList } from "./mikatiming";
import { editionFromOpenTrack } from "./opentrack-import";
import { parseRunSignupResults, runSignupResultsUrl } from "./runsignup";
import { editionImportSql, snapshotIdentity } from "./sql";

const MIKA_ROW = `
<li class=" list-active list-group-item row">
<div class=" list-field type-place place-primary numeric">1</div>
<h4 class=" list-field type-fullname"><a href="?content=detail&amp;idp=ABC123&amp;event=MAR_1">Kiplimo, Jacob (UGA)</a></h4>
<div class=" list-field type-field"><div class="list-label">BIB</div>7</div>
<div class=" list-field type-age_class"><div class="list-label">Division</div>25-29</div>
<div class=" list-field type-time"><div class="list-label">Finish</div>02:02:44</div>
</li>
<li class=" list-group-item row">
<h4 class=" list-field type-fullname"><a href="?idp=YOUTH1">Young, Runner (USA)</a></h4>
<div class="list-label">BIB</div>99
<div class="list-label">Division</div>15-17
<div class="list-label">Finish</div>03:10:00
</li>
<li class=" list-group-item row">
<h4 class=" list-field type-fullname"><a href="?idp=DNF1">Stop, Early (GBR)</a></h4>
<div class="list-label">BIB</div>12
<div class="list-label">Division</div>30-34
<div class="list-label">Finish</div>DNF
</li>`;

describe("public results parsers", () => {
  it("reads a MikaTiming list row and drops an under-18 division", () => {
    const page = parseMikaTimingList(MIKA_ROW, {
      sex: "M",
      distance: "marathon",
      sourceUrl: "https://results.example/2025/",
    });
    expect(page.skippedYouth).toBe(1);
    expect(page.inputCount).toBe(3);
    expect(page.rowKeys).toEqual(["ABC123", "YOUTH1", "DNF1"]);
    expect(page.results.map((row) => row.externalResultId)).toEqual(["ABC123", "DNF1"]);
    expect(page.results[0]).toMatchObject({
      athleteName: "Jacob Kiplimo",
      normalizedBib: "7",
      sex: "male",
      distance: "marathon",
      chipTimeMs: 2 * 3600_000 + 2 * 60_000 + 44_000,
      finishStatus: "finished",
    });
    expect(page.results[1]?.finishStatus).toBe("dnf");
    expect(page.results[1]?.chipTimeMs).toBeNull();
  });

  it("recognizes an explicit empty MikaTiming results page", () => {
    const emptyHtml = `<div class="list-container"><div class="alert alert-info">No results found</div></div>`;
    const page = parseMikaTimingList(emptyHtml, {
      sex: "M",
      distance: "marathon",
      sourceUrl: "https://results.example/2025/",
    });
    expect(page.inputCount).toBe(0);
    expect(page.isExhausted).toBe(true);
    expect(page.results).toEqual([]);

    const emptyListHtml = `<div class="list-field"><ul class="list-group list-group-striped"></ul></div>`;
    const emptyListPage = parseMikaTimingList(emptyListHtml, {
      sex: "M",
      distance: "marathon",
      sourceUrl: "https://results.example/2025/",
    });
    expect(emptyListPage.inputCount).toBe(0);
    expect(emptyListPage.isExhausted).toBe(true);
  });

  it("rejects an unrecognized HTML response or changed markup without explicit empty state", () => {
    const challengeHtml = `<!DOCTYPE html><html><head><title>Just a moment...</title></head><body>Verify you are human</body></html>`;
    expect(() =>
      parseMikaTimingList(challengeHtml, {
        sex: "M",
        distance: "marathon",
        sourceUrl: "https://results.example/2025/",
      }),
    ).toThrow("Unrecognized MikaTiming response");

    const changedMarkupHtml = `<div class="list-container"><div class="changed-table"><span>Row 1</span></div></div>`;
    expect(() =>
      parseMikaTimingList(changedMarkupHtml, {
        sex: "M",
        distance: "marathon",
        sourceUrl: "https://results.example/2025/",
      }),
    ).toThrow("Unrecognized MikaTiming response");

    const errorBannerHtml = `<div class="list-container"><div class="alert alert-danger">Internal Server Error</div></div>`;
    expect(() =>
      parseMikaTimingList(errorBannerHtml, {
        sex: "M",
        distance: "marathon",
        sourceUrl: "https://results.example/2025/",
      }),
    ).toThrow("MikaTiming upstream error banner encountered");

    const warningBannerHtml = `<div class="list-container"><div class="alert alert-warning">Database temporarily unavailable</div></div>`;
    expect(() =>
      parseMikaTimingList(warningBannerHtml, {
        sex: "M",
        distance: "marathon",
        sourceUrl: "https://results.example/2025/",
      }),
    ).toThrow("MikaTiming upstream error banner encountered");
  });

  it("reads a forwarded CSV, including quoted commas", () => {
    const csv = [
      "name,bib,sex,chip_time,age,division",
      '"Ada Lovelace",10,F,21:04,36,',
      "Kid Runner,11,M,25:00,14,U16",
    ].join("\n");
    const page = parseResultsCsv(csv, { distance: "5k", sourceUrl: "file://results.csv" });
    expect(page.skippedYouth).toBe(1);
    expect(page.results).toHaveLength(1);
    expect(page.results[0]?.athleteName).toBe("Ada Lovelace");
    expect(page.results[0]?.categoryKey).toBe("5k:female");
  });

  it("reads public RunSignup JSON and skips private sets and youth", () => {
    const page = parseRunSignupResults(
      {
        individual_results_sets: [
          {
            public_results: "T",
            preliminary_results: "F",
            results: [
              {
                result_id: 10,
                bib: 4,
                first_name: "Ada",
                last_name: "Lovelace",
                gender: "F",
                chip_time: "21:32.11",
                clock_time: "",
                age: 36,
              },
              {
                result_id: 11,
                first_name: "Young",
                last_name: "Runner",
                gender: "M",
                chip_time: "25:00",
                age: 16,
              },
            ],
          },
          { public_results: "F", results: [{ result_id: 99, first_name: "Hidden", last_name: "Row", gender: "M", chip_time: "20:00", age: 30 }] },
        ],
      },
      { distance: "5k", sourceUrl: "https://runsignup.com/Rest/race/1/results/get-results" },
    );
    expect(page.skippedYouth).toBe(1);
    expect(page.skippedPrivate).toBe(1);
    expect(page.inputCount).toBe(3);
    expect(page.rowKeys).toHaveLength(3);
    expect(page.results).toHaveLength(1);
    expect(page.results[0]?.chipTimeMs).toBe(1_292_110);
  });

  it("selects one provider result set and preserves nonbinary category support", () => {
    const url = new URL(runSignupResultsUrl("1", "2", 3, 100, "4"));
    expect(url.searchParams.get("individual_result_set_id")).toBe("4");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("supports_nb")).toBe("T");
  });

  it("turns the OpenTrack fixture shape into an edition", () => {
    const edition = editionFromOpenTrack({
      id: "meet-1",
      date: "2025-09-07",
      fullName: "Sample 10K",
      events: [
        {
          eventId: "1",
          eventCode: "10K",
          genders: "M",
          units: [{ results: [{ bib: "2", performance: "30:28" }] }],
        },
      ],
      competitors: [{ competitorId: "2", fullName: "Bert Tippi", gender: "M", ageGroup: "SEN" }],
    });
    expect(edition.results).toHaveLength(1);
    expect(edition.displayAllowed).toBe(true);
    expect(edition.sourceSlug).toBe("opentrack");
  });

  it("names a MikaTiming finisher without the country code", () => {
    expect(personNameFromList("Sawe, Sabastian (KEN)")).toBe("Sabastian Sawe");
    expect(divisionIsUnder18("15-17")).toBe(true);
    expect(divisionIsUnder18("15-19")).toBe(false);
  });

  it("writes an idempotent import statement", () => {
    const edition = editionFromOpenTrack({
      id: "meet-1",
      date: "2025-09-07",
      fullName: "Sample 10K",
      events: [
        {
          eventId: "1",
          eventCode: "10K",
          genders: "F",
          units: [{ results: [{ bib: "15", performance: "34:27" }] }],
        },
      ],
      competitors: [{ competitorId: "15", fullName: "Liis Hussar", gender: "F", ageGroup: "SEN" }],
    });
    const snapshot = snapshotIdentity("{}", "fixtures/sample.json");
    const sql = editionImportSql(edition, snapshot);
    expect(sql).toContain("private.upsert_source_record");
    expect(sql).toContain("private.upsert_performance");
    expect(sql).toContain("on conflict (slug)");
    expect(sql).toContain("display_allowed = public.sources.display_allowed and excluded.display_allowed");
    expect(sql).toContain("for update");
    expect(sql).toContain("publication_state");
    expect(sql).toContain("ordinary acquisition cannot mutate a published edition");
    expect(snapshot.contentSha256).toHaveLength(64);
  });

  it("emits publication gates for frozen editions and authorized corrections", () => {
    const edition = editionFromOpenTrack({
      id: "meet-2",
      date: "2025-09-07",
      fullName: "Sample 10K",
      events: [
        {
          eventId: "1",
          eventCode: "10K",
          genders: "M",
          units: [{ results: [{ bib: "20", performance: "31:00" }] }],
        },
      ],
      competitors: [{ competitorId: "20", fullName: "Fast Runner", gender: "M", ageGroup: "SEN" }],
    });
    const snapshot = snapshotIdentity("{}", "fixtures/sample.json");

    // Correction import bumps revision and reconciles missing records
    const correctionSql = editionImportSql(edition, snapshot, { allowCorrection: true, expectedRevision: 2 });
    expect(correctionSql).toContain("revision = case when true then revision + 1 else revision end");
    expect(correctionSql).toContain("Expected edition revision % but found %; correction held', 2");
    expect(correctionSql).toContain("Expected edition revision % but edition does not exist; correction held', 2");
    expect(correctionSql).toContain("Source record lookup failed for % in edition %");
    expect(correctionSql).toContain("Reconcile corrected full-field population");
    expect(correctionSql).toContain("set eligible = false,");
    expect(correctionSql).toContain("and sr.last_ingestion_run_id <> v_run");

    // Standard import without correction does not run reconciliation
    expect(sql).not.toContain("sr.last_ingestion_run_id <> v_run");

    // Freeze import marks frozen
    const freezeSql = editionImportSql(edition, snapshot, { allowCorrection: true, freeze: true });
    expect(freezeSql).toContain("publication_state = 'frozen'");
    expect(freezeSql).toContain("imports cannot mutate a frozen edition");
  });
});

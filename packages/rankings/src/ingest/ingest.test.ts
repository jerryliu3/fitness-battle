import { describe, expect, it } from "vitest";
import { parseResultsCsv } from "./csv";
import { divisionIsUnder18, personNameFromList } from "./names";
import { parseMikaTimingList } from "./mikatiming";
import { editionFromOpenTrack } from "./opentrack-import";
import { parseRunSignupResults } from "./runsignup";
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
    expect(page.results).toHaveLength(1);
    expect(page.results[0]?.chipTimeMs).toBe(1_292_110);
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
    expect(snapshot.contentSha256).toHaveLength(64);
  });
});

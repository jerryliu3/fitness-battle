import {describe,expect,it} from "vitest";
import {
  buildCompiledReplayField,
  buildReplayCourseIndex,
  compactReplayPage,
  compileReplayRunner,
  evaluateFieldDistances,
  fillMercatorPositions,
  loadReplayCompactField,
  loadReplayField,
  pickNearestRunnerId,
  replayCoordinate,
  replayCoordinateAt,
  replayCourseBearing,
  replayDistance,
  replayFeatures,
  replayMercatorOffsetAt,
  replayTelemetry,
  replayTimeline,
  selectFieldRankSlice,
  validateReplayCourse,
  type ReplayCourse,
  type ReplayPage,
  type ReplayRunner,
} from "./race-replay";
const course:ReplayCourse={points:[[0,0,0],[.02,0,2000],[.04,0,4000],[.05,0,5000]],sourceUrl:"https://example.test/course",attribution:"Course"};
const runner:ReplayRunner={id:1,name:"Runner",startAt:null,splits:{clock:"chip",finishMs:1500000,sourceUrl:"https://example.test/results",checkpoints:[{distanceM:2000,elapsedMs:600000},{distanceM:4000,elapsedMs:1200000}]}};
const compiled=compileReplayRunner(runner,"5k")!;
describe("edition course replay",()=>{
  it("validates reviewed distance measures and bounds",()=>{
    expect(validateReplayCourse(course,"5k")).toBe(true);
    expect(validateReplayCourse(course,"10k")).toBe(false);
    expect(validateReplayCourse({...course,points:[[0,0,0],[1,1,0],[2,2,5000]]},"5k")).toBe(false);
    expect(replayCoordinate(course,3000)[0]).toBeCloseTo(.03);
    expect(replayCoordinate(course,999999)[0]).toBeCloseTo(.05);
    const loop={...course,points:[[0,0,0],[1,0,2500],[0,0,5000]] as [number,number,number][]};
    expect(replayCoordinate(loop,3750)[0]).toBeCloseTo(.5);
    expect(replayCoordinate({...course,points:[[179,0,0],[-179,0,5000]]},2500)[0]).toBe(-180);
  });
  it("turns the camera with the course and retains the finish approach",()=>{
    const turn:ReplayCourse={...course,points:[[0,0,0],[.02,0,2000],[.02,.03,5000]]};
    expect(replayCourseBearing(turn,250)).toBeCloseTo(90);
    expect(replayCourseBearing(turn,2500)).toBeCloseTo(0);
    expect(replayCourseBearing(turn,5000)).toBeCloseTo(0);
  });
  it("compiles flat pacing when only the finish split is recorded", () => {
    const flatOnly: ReplayRunner = {
      ...runner,
      splits: {
        ...runner.splits,
        checkpoints: [{ distanceM: 5000, elapsedMs: 1_500_000 }],
      },
    };
    const flatCompiled = compileReplayRunner(flatOnly, "5k")!;
    expect(replayDistance(flatCompiled, 750_000)).toBe(2500);
    expect(replayDistance(flatCompiled, 1_500_000)).toBe(5000);
  });
  it("interpolates only adjacent recorded checkpoints and holds the observed finish",()=>{
    expect(replayDistance(compiled,300000)).toBe(1000);
    expect(replayDistance(compiled,-1)).toBeNull();
    expect(replayDistance(compiled,9999999)).toBe(5000);
    const missing=compileReplayRunner({...runner,splits:{...runner.splits,checkpoints:[{distanceM:2000,elapsedMs:null},{distanceM:4000,elapsedMs:1200000}]}},"5k")!;
    expect(replayDistance(missing,600000)).toBeNull();
    expect(replayDistance(missing,1200000)).toBe(4000);
    expect(replayDistance(missing,1350000)).toBe(4500);
  });
  it("reports athlete elapsed time, distance and pace without extrapolating",()=>{
    expect(replayTelemetry(compiled,300000,null)).toEqual({distanceM:1000,elapsedMs:300000,currentPaceMsPerKm:300000});
    expect(replayTelemetry(compiled,9999999,null)).toEqual({distanceM:5000,elapsedMs:1500000,currentPaceMsPerKm:null});
    const delayed={...compiled,startMs:120000};
    expect(replayTelemetry(delayed,10000,0)).toBeNull();
    expect(replayTelemetry(delayed,120000,0)?.currentPaceMsPerKm).toBe(300000);
    expect(replayTelemetry(delayed,420000,0)?.elapsedMs).toBe(300000);
  });
  it("changes current pace at a checkpoint and withholds it across missing splits",()=>{
    const varied=compileReplayRunner({...runner,splits:{...runner.splits,checkpoints:[{distanceM:2000,elapsedMs:400000},{distanceM:4000,elapsedMs:1000000}]}},"5k")!;
    expect(replayTelemetry(varied,399999,null)?.currentPaceMsPerKm).toBe(200000);
    expect(replayTelemetry(varied,400000,null)?.currentPaceMsPerKm).toBe(300000);
    const gap=compileReplayRunner({...runner,splits:{...runner.splits,checkpoints:[{distanceM:2000,elapsedMs:600000},{distanceM:4000,elapsedMs:null}]}},"5k")!;
    expect(replayTelemetry(gap,600000,null)?.currentPaceMsPerKm).toBeNull();
    expect(replayTelemetry(gap,900000,null)).toBeNull();
  });
  it("requires every actual start for race-day replay",()=>{
    expect(replayTimeline([compiled],true).wallAvailable).toBe(false);
    const first={...compiled,startAt:"2025-01-01T00:00:00Z",startMs:Date.parse("2025-01-01T00:00:00Z")};
    const second={...first,id:2,startMs:first.startMs+600000};
    const timeline=replayTimeline([first,second],true);
    expect(timeline.duration).toBe(2100000);
    expect(replayFeatures(course,[first,second],300000,timeline.origin).features).toHaveLength(1);
    expect(replayTimeline([first,compiled],true).origin).toBeNull();
    expect(replayTimeline([{...first,splits:{...first.splits,clock:"gun"}}],true).wallAvailable).toBe(false);
  });
  it("handles a large field without per-runner DOM or argument-spread limits",()=>{
    const field=Array.from({length:50000},(_,id)=>({...compiled,id:id+1}));
    expect(replayTimeline(field,false).duration).toBe(1500000);
    expect(replayFeatures(course,field,300000).features).toHaveLength(50000);
  });
  it("pages every timing profile beyond 200 and rejects a changed course",async()=>{
    const fetchPage=async(after:number):Promise<ReplayPage>=>({version:"one",course:after===0 ? course : null,totalAvailable:2501,
      runners:Array.from({length:Math.min(1000,2501-after)},(_,i)=>({...runner,id:after+i+1})),next:after+1000<2501 ? after+1000 : null});
    expect((await loadReplayField(fetchPage,()=>false,()=>{})).runners).toHaveLength(2501);
    await expect(loadReplayField(async after=>({...await fetchPage(after),version:after ? "two" : "one"}),()=>false,()=>{})).rejects.toThrow("Course changed");
    await expect(loadReplayField(fetchPage,()=>true,()=>{})).rejects.toThrow("Cancelled");
  });
  it("validates and replays official Bank of America Chicago Marathon 2025 track", () => {
    const chicagoPoints: [number, number, number][] = [
      [-87.620677, 41.880905, 0],
      [-87.620586, 41.887717, 749.34],
      [-87.632515, 41.890135, 4997.33],
      [-87.639207, 41.932976, 10162.18],
      [-87.644702, 41.931996, 15148.63],
      [-87.634011, 41.890802, 20166.89],
      [-87.637007, 41.882819, 21213.98],
      [-87.67654, 41.877458, 24966.25],
      [-87.661478, 41.86335, 30117.28],
      [-87.626856, 41.845589, 35545.69],
      [-87.623775, 41.852992, 40044.85],
      [-87.620507, 41.869889, 42195],
    ];
    const testCourse: ReplayCourse = {
      points: chicagoPoints,
      sourceUrl: "https://www.chicago-marathon.com/",
      attribution: "Bank of America Chicago Marathon 2025 Course (Garmin Connect)",
    };
    expect(validateReplayCourse(testCourse, "marathon")).toBe(true);
    const startCoord = replayCoordinate(testCourse, 0);
    expect(startCoord[0]).toBeCloseTo(-87.620677, 5);
    expect(startCoord[1]).toBeCloseTo(41.880905, 5);
    const finishCoord = replayCoordinate(testCourse, 42195);
    expect(finishCoord[0]).toBeCloseTo(-87.620507, 5);
    expect(finishCoord[1]).toBeCloseTo(41.869889, 5);

    const kiplimo: ReplayRunner = {
      id: 154758,
      name: "Jacob Kiplimo",
      startAt: "2025-10-12T12:30:00Z",
      splits: {
        clock: "chip",
        finishMs: 7343000,
        sourceUrl: "https://chicago-history.r.mikatiming.com/2025/?content=detail&idp=9TGG96382C8702",
        checkpoints: [
          { distanceM: 5000, elapsedMs: 838000 },
          { distanceM: 10000, elapsedMs: 1705000 },
          { distanceM: 15000, elapsedMs: 2561000 },
          { distanceM: 20000, elapsedMs: 3426000 },
          { distanceM: 21097.5, elapsedMs: 3616000 },
          { distanceM: 25000, elapsedMs: 4272000 },
          { distanceM: 30000, elapsedMs: 5131000 },
          { distanceM: 35000, elapsedMs: 5993000 },
          { distanceM: 40000, elapsedMs: 6910000 },
          { distanceM: 42195, elapsedMs: 7343000 },
        ],
      },
    };
    const gejia: ReplayRunner = {
      id: 184306,
      name: "Hawi Feysa Gejia",
      startAt: "2025-10-12T12:30:00Z",
      splits: {
        clock: "chip",
        finishMs: 8097000,
        sourceUrl: "https://chicago-history.r.mikatiming.com/2025/?content=detail&idp=9TGG96382C86AF",
        checkpoints: [
          { distanceM: 5000, elapsedMs: 966000 },
          { distanceM: 10000, elapsedMs: 1928000 },
          { distanceM: 15000, elapsedMs: 2880000 },
          { distanceM: 20000, elapsedMs: 3839000 },
          { distanceM: 21097.5, elapsedMs: 4050000 },
          { distanceM: 25000, elapsedMs: 4799000 },
          { distanceM: 30000, elapsedMs: 5754000 },
          { distanceM: 35000, elapsedMs: 6718000 },
          { distanceM: 40000, elapsedMs: 7679000 },
          { distanceM: 42195, elapsedMs: 8097000 },
        ],
      },
    };

    const compiledKiplimo = compileReplayRunner(kiplimo, "marathon")!;
    const compiledGejia = compileReplayRunner(gejia, "marathon")!;
    expect(compiledKiplimo).not.toBeNull();
    expect(compiledGejia).not.toBeNull();

    const timeline = replayTimeline([compiledKiplimo, compiledGejia], true);
    expect(timeline.wallAvailable).toBe(true);
    expect(timeline.origin).toBe(Date.parse("2025-10-12T12:30:00Z"));
    expect(timeline.duration).toBe(8097000);

    const features = replayFeatures(testCourse, [compiledKiplimo, compiledGejia], 3600000, timeline.origin);
    expect(features.features).toHaveLength(2);
    expect(features.features[0].id).toBe(154758);
    expect(features.features[1].id).toBe(184306);
    // Jacob ran faster, so his distance at 3600s is greater than Hawi's
    expect(replayDistance(compiledKiplimo, 3600000)!).toBeGreaterThan(replayDistance(compiledGejia, 3600000)!);
    expect(features.features[0].geometry.coordinates[0]).toBeCloseTo(-87.636, 1);
    expect(features.features[0].geometry.coordinates[1]).toBeCloseTo(41.885, 1);
  });

  it("matches binary-search replayDistance & replayCoordinate across forward/backward scrubs with SoA + LUT", () => {
    const idx = buildReplayCourseIndex(course, 4096);
    for (const d of [0, 500, 2000, 3125, 4500, 5000, 9999]) {
      const a = replayCoordinate(course, d);
      const b = replayCoordinateAt(idx, d);
      expect(b[0]).toBeCloseTo(a[0], 3);
      expect(b[1]).toBeCloseTo(a[1], 3);
    }

    const r1 = compileReplayRunner(
      { ...runner, id: 10, startAt: "2025-01-01T00:00:00Z" },
      "5k",
    )!;
    const r2 = compileReplayRunner(
      {
        ...runner,
        id: 20,
        bib: "202",
        startAt: "2025-01-01T00:05:00Z",
        splits: {
          ...runner.splits,
          finishMs: 1200000,
          checkpoints: [
            { distanceM: 2000, elapsedMs: 500000 },
            { distanceM: 4000, elapsedMs: 950000 },
          ],
        },
      },
      "5k",
    )!;
    const rGap = compileReplayRunner(
      {
        ...runner,
        id: 30,
        startAt: "2025-01-01T00:00:00Z",
        splits: {
          ...runner.splits,
          checkpoints: [
            { distanceM: 2000, elapsedMs: null },
            { distanceM: 4000, elapsedMs: 1200000 },
          ],
        },
      },
      "5k",
    )!;

    const field = buildCompiledReplayField([r1, r2, rGap], true);
    expect(field.wallAvailable).toBe(true);
    expect(field.fastestFinishMs).toBe(1200000);
    const dist = new Float32Array(field.count);

    // Scrub forward then backward to exercise cursor walking in both directions
    const sampleTimes = [0, 150000, 600000, 1200000, 1500000, 1800000, 900000, 300000, 0];
    for (const t of sampleTimes) {
      evaluateFieldDistances(field, t, dist);
      for (let i = 0; i < field.count; i++) {
        const src = [r1, r2, rGap][i];
        const expected = replayDistance(src, t - (src.startMs - field.wallOrigin!));
        if (expected === null) {
          expect(dist[i]).toBe(-1);
        } else {
          expect(dist[i]).toBeCloseTo(expected, 3);
        }
      }
    }

    const outXY = new Float32Array(field.count * 2);
    const outIdx = new Int32Array(field.count);
    evaluateFieldDistances(field, 600000, dist);
    const written = fillMercatorPositions(idx, field, dist, outXY, outIdx);
    expect(written).toBe(2); // r1 and r2 active; rGap is in missing-split gap at 600s
    const [ox, oy] = replayMercatorOffsetAt(idx, dist[0]);
    expect(outXY[0]).toBeCloseTo(ox, 6);
    expect(outXY[1]).toBeCloseTo(oy, 6);
  });

  it("selects top leaderboard slices accurately for large fields without full sort", () => {
    const runners = Array.from({ length: 1200 }, (_, i) =>
      compileReplayRunner(
        {
          id: i + 1,
          name: `Runner ${i + 1}`,
          bib: String(1000 + i),
          startAt: null,
          splits: {
            clock: "chip",
            finishMs: 2000000 - i * 500,
            sourceUrl: "https://example.test/results",
            checkpoints: [{ distanceM: 5000, elapsedMs: 2000000 - i * 500 }],
          },
        },
        "5k",
      )!,
    );
    const field = buildCompiledReplayField(runners, false);
    const dist = new Float32Array(field.count);
    const maxD = evaluateFieldDistances(field, 500000, dist);
    expect(maxD).toBeGreaterThan(0);

    const topPage = selectFieldRankSlice(field, dist, "field", 0, 9);
    expect(topPage.total).toBe(1200);
    expect(topPage.indices).toHaveLength(9);
    // Runner index 1199 has fastest finish (2000000 - 1199*500) -> furthest at 500s
    expect(field.ids[topPage.indices[0]]).toBe(1200);
    expect(field.ids[topPage.indices[8]]).toBe(1192);

    const finishPage = selectFieldRankSlice(field, dist, "finish", 0, 5);
    expect(field.ids[finishPage.indices[0]]).toBe(1200);

    const bibMatch = selectFieldRankSlice(field, dist, "field", 0, 9, "#2199");
    expect(bibMatch.total).toBe(1);
    expect(field.ids[bibMatch.indices[0]]).toBe(1200);
  });

  it("compacts and streams replay pages and picks nearest runner on click", async () => {
    const legacyPage1: ReplayPage = {
      version: "v1",
      course,
      totalAvailable: 2,
      runners: [{ ...runner, id: 1, bib: "101", startAt: "2025-01-01T00:00:00.000Z" }],
      next: 1,
    };
    const legacyPage2: ReplayPage = {
      version: "v1",
      course: null,
      totalAvailable: 2,
      runners: [{ ...runner, id: 2, name: "Runner Two", bib: "202", splits: { ...runner.splits, finishMs: 1200000, checkpoints: [{ distanceM: 2000, elapsedMs: 500000 }, { distanceM: 4000, elapsedMs: 1000000 }] } }],
      next: null,
    };

    const compact1 = compactReplayPage(legacyPage1);
    const compact2 = compactReplayPage(legacyPage2);
    const loaded = await loadReplayCompactField(
      async after => (after === 0 ? compact1 : compact2),
      () => false,
      () => {},
    );
    expect(loaded.runners).toHaveLength(2);
    expect(loaded.runners[0].bib).toBe("101");
    expect(loaded.runners[1].splits.sourceUrl).toBe(course.sourceUrl);

    const compiledList = loaded.runners.map(r => compileReplayRunner(r, "5k")!);
    const idx = buildReplayCourseIndex(loaded.course, 4096);
    const field = buildCompiledReplayField(compiledList, false);
    const dist = new Float32Array(field.count);
    evaluateFieldDistances(field, 600000, dist);

    // Runner 2 is around 2400m (.024 lng), Runner 1 is at 2000m (.020 lng)
    expect(pickNearestRunnerId(idx, field, dist, 0.0241, 0, 12, 16)).toBe(2);
    expect(pickNearestRunnerId(idx, field, dist, 0.0199, 0, 12, 16)).toBe(1);
    expect(pickNearestRunnerId(idx, field, dist, 1.5, 1.5, 12, 16)).toBeNull();
  });
});

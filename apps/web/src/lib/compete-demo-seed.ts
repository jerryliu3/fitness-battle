import {
  freshHealthRatings,
  freshState,
  SPORT_IDS,
  type CompeteState,
  type SportId,
} from "@fitness-battle/shared";

function mondayOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff, 0, 0, 0, 0));
  return monday;
}

export function getDemoCompeteState(userId: string | null): CompeteState | null {
  if (!userId) return null;
  const id = userId.toLowerCase();
  const isAlice = id === "11111111-1111-4111-8111-111111111111" || id === "alice" || id.startsWith("alice");
  const isBob = id === "22222222-2222-4222-8222-222222222222" || id === "bob" || id.startsWith("bob");
  const isCarla = id === "33333333-3333-4333-8333-333333333333" || id === "carla" || id.startsWith("carla");
  const isDana = id === "44444444-4444-4444-8444-444444444444" || id === "dana" || id.startsWith("dana");

  if (!isAlice && !isBob && !isCarla && !isDana) return null;

  const monday = mondayOfCurrentWeek();
  const waveStartIso = monday.toISOString();
  const weekEndIso = new Date(monday.getTime() + 7 * 86400000).toISOString();
  const base = freshState(monday);

  if (isDana) {
    return {
      ...base,
      name: "Dana Singh",
      city: "Manhattan",
      calibrated: false,
      onboardingCompleted: false,
    };
  }

  if (isAlice) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...base,
      name: "Alice Park",
      city: "Brooklyn",
      primary: "running",
      focus: { family: "sport", id: "running" },
      calibrated: true,
      onboardingCompleted: true,
      lessonDoneOn: today,
      freezesLeft: 3,
      trainingGoal: {
        distance: "half",
        deadline: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      },
      ratings: SPORT_IDS.map((sport: SportId) => {
        if (sport === "running") {
          return {
            sport,
            verifiedElo: 1125,
            openElo: 1140,
            optedIn: true,
            lockVerified: 1100,
            lockOpen: 1115,
            lockPeriod: waveStartIso,
          };
        }
        if (sport === "cycling") {
          return {
            sport,
            verifiedElo: 1040,
            openElo: 1055,
            optedIn: true,
            lockVerified: 1020,
            lockOpen: 1035,
            lockPeriod: waveStartIso,
          };
        }
        return {
          sport,
          verifiedElo: 1000,
          openElo: 1000,
          optedIn: false,
          lockVerified: 1000,
          lockOpen: 1000,
          lockPeriod: waveStartIso,
        };
      }),
      healthRatings: freshHealthRatings(waveStartIso).map((hr) => ({
        ...hr,
        verifiedElo: 1080,
        openElo: 1080,
        optedIn: true,
      })),
      links: [
        { provider: "strava", linked: true, status: "connected" },
        { provider: "whoop", linked: true, status: "connected" },
        { provider: "garmin", linked: false, status: "stub" },
        { provider: "apple_health", linked: false, status: "disconnected" },
        { provider: "oura", linked: false, status: "disconnected" },
      ],
      enrollments: [
        {
          sport: "running",
          waveStart: waveStartIso,
          weekEnd: weekEndIso,
          capacity: 8,
          peerIds: ["33333333-3333-4333-8333-333333333333", "66666666-6666-4666-8666-666666666666"],
          syntheticIds: ["synth-pace-1140", "synth-tempo-1130"],
          autoEnrollNext: true,
          crewId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
        {
          sport: "cycling",
          waveStart: waveStartIso,
          weekEnd: weekEndIso,
          capacity: 8,
          peerIds: ["22222222-2222-4222-8222-222222222222"],
          syntheticIds: ["synth-cadence-1050"],
          autoEnrollNext: true,
          crewId: null,
        },
      ],
      crewBoard: {
        crewId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        crewName: "Weekday miles",
        sport: "running",
        waveStart: waveStartIso,
        weekEnd: weekEndIso,
        capacity: 8,
        memberIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
          "33333333-3333-4333-8333-333333333333",
          "55555555-5555-4555-8555-555555555555",
        ],
        syntheticIds: ["synth-pace-1140", "synth-tempo-1130"],
        members: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Alice Park",
            elo: 1140,
            distanceM: 35500,
            movingSec: 11280,
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Bob Chen",
            elo: 1060,
            distanceM: 6000,
            movingSec: 2100,
          },
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Carla Diaz",
            elo: 1190,
            distanceM: 31500,
            movingSec: 9300,
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            name: "Elena Rostova",
            elo: 1110,
            distanceM: 7500,
            movingSec: 2400,
          },
        ],
      },
      activities: [
        {
          id: "strava-act-alice-w0-mon",
          sport: "running",
          startedAt: new Date(monday.getTime() + 1 * 86400000 + 7 * 3600000).toISOString(),
          distanceM: 8200,
          movingSec: 2640,
          avgHr: 152,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
        {
          id: "strava-act-alice-w0-wed",
          sport: "running",
          startedAt: new Date(monday.getTime() + 3 * 86400000 + 18 * 3600000).toISOString(),
          distanceM: 10500,
          movingSec: 3240,
          avgHr: 161,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
        {
          id: "strava-act-alice-w0-fri",
          sport: "cycling",
          startedAt: new Date(monday.getTime() + 5 * 86400000 + 17 * 3600000).toISOString(),
          distanceM: 24000,
          movingSec: 3900,
          avgHr: 142,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
        {
          id: "strava-act-alice-w0-sat",
          sport: "running",
          startedAt: new Date(monday.getTime() + 6 * 86400000 + 8 * 3600000).toISOString(),
          distanceM: 16800,
          movingSec: 5400,
          avgHr: 158,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
      ],
      sleepNights: [
        {
          id: "slp-alice-d0",
          metric: "sleep",
          day: today,
          score: 88,
          durationMin: 465,
          efficiency: 94,
          deepMin: 85,
          remMin: 105,
          lightMin: 250,
          awakeMin: 25,
          source: "whoop",
          verified: true,
        },
        {
          id: "slp-alice-d1",
          metric: "sleep",
          day: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
          score: 91,
          durationMin: 480,
          efficiency: 96,
          deepMin: 95,
          remMin: 110,
          lightMin: 255,
          awakeMin: 20,
          source: "whoop",
          verified: true,
        },
        {
          id: "slp-alice-d2",
          metric: "sleep",
          day: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
          score: 82,
          durationMin: 440,
          efficiency: 91,
          deepMin: 75,
          remMin: 95,
          lightMin: 240,
          awakeMin: 30,
          source: "whoop",
          verified: true,
        },
      ],
      readiness: [
        { id: "readiness-alice-d0", provider: "whoop", day: today, score: 86 },
        { id: "readiness-alice-d1", provider: "whoop", day: new Date(Date.now() - 86400000).toISOString().slice(0, 10), score: 91 },
      ],
      periodResults: [
        {
          id: `res-${new Date(monday.getTime() - 7 * 86400000).toISOString()}-running-verified`,
          periodStart: new Date(monday.getTime() - 7 * 86400000).toISOString(),
          periodEnd: waveStartIso,
          sport: "running",
          track: "verified",
          place: 2,
          fieldSize: 8,
          effort: 42000,
          distanceM: 42000,
          movingSec: 13500,
          eloBefore: 1100,
          eloAfter: 1125,
          frozen: false,
          settledAt: waveStartIso,
          acknowledgedAt: waveStartIso,
        },
        {
          id: `res-${new Date(monday.getTime() - 14 * 86400000).toISOString()}-running-verified`,
          periodStart: new Date(monday.getTime() - 14 * 86400000).toISOString(),
          periodEnd: new Date(monday.getTime() - 7 * 86400000).toISOString(),
          sport: "running",
          track: "verified",
          place: 1,
          fieldSize: 8,
          effort: 46500,
          distanceM: 46500,
          movingSec: 14800,
          eloBefore: 1070,
          eloAfter: 1100,
          frozen: false,
          settledAt: new Date(monday.getTime() - 7 * 86400000).toISOString(),
          acknowledgedAt: new Date(monday.getTime() - 7 * 86400000).toISOString(),
        },
      ],
    };
  }

  if (isBob) {
    return {
      ...base,
      name: "Bob Chen",
      city: "Brooklyn",
      primary: "cycling",
      focus: { family: "sport", id: "cycling" },
      calibrated: true,
      onboardingCompleted: true,
      lessonDoneOn: new Date().toISOString().slice(0, 10),
      ratings: SPORT_IDS.map((sport: SportId) => {
        if (sport === "cycling") {
          return {
            sport,
            verifiedElo: 1170,
            openElo: 1195,
            optedIn: true,
            lockVerified: 1140,
            lockOpen: 1165,
            lockPeriod: waveStartIso,
          };
        }
        return {
          sport,
          verifiedElo: 1000,
          openElo: 1000,
          optedIn: false,
          lockVerified: 1000,
          lockOpen: 1000,
          lockPeriod: waveStartIso,
        };
      }),
      links: [
        { provider: "strava", linked: true, status: "connected" },
        { provider: "garmin", linked: true, status: "connected" },
      ],
      enrollments: [
        {
          sport: "cycling",
          waveStart: waveStartIso,
          weekEnd: weekEndIso,
          capacity: 8,
          peerIds: ["77777777-7777-4777-8777-777777777777"],
          syntheticIds: ["synth-peloton-1180"],
          autoEnrollNext: true,
          crewId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        },
      ],
      activities: [
        {
          id: "strava-act-bob-w0-mon",
          sport: "cycling",
          startedAt: new Date(monday.getTime() + 1 * 86400000 + 6 * 3600000).toISOString(),
          distanceM: 28000,
          movingSec: 3600,
          avgHr: 146,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
        {
          id: "strava-act-bob-w0-wed",
          sport: "cycling",
          startedAt: new Date(monday.getTime() + 3 * 86400000 + 6 * 3600000).toISOString(),
          distanceM: 42000,
          movingSec: 5200,
          avgHr: 154,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
      ],
    };
  }

  if (isCarla) {
    return {
      ...base,
      name: "Carla Diaz",
      city: "Brooklyn",
      primary: "running",
      focus: { family: "health", id: "sleep" },
      calibrated: true,
      onboardingCompleted: true,
      ratings: SPORT_IDS.map((sport: SportId) => {
        if (sport === "running") {
          return {
            sport,
            verifiedElo: 1205,
            openElo: 1220,
            optedIn: true,
            lockVerified: 1180,
            lockOpen: 1195,
            lockPeriod: waveStartIso,
          };
        }
        return {
          sport,
          verifiedElo: 1000,
          openElo: 1000,
          optedIn: false,
          lockVerified: 1000,
          lockOpen: 1000,
          lockPeriod: waveStartIso,
        };
      }),
      healthRatings: freshHealthRatings(waveStartIso).map((hr) => ({
        ...hr,
        verifiedElo: 1130,
        openElo: 1130,
        optedIn: true,
      })),
      links: [
        { provider: "strava", linked: true, status: "connected" },
        { provider: "oura", linked: true, status: "connected" },
      ],
      enrollments: [
        {
          sport: "running",
          waveStart: waveStartIso,
          weekEnd: weekEndIso,
          capacity: 8,
          peerIds: ["11111111-1111-4111-8111-111111111111"],
          syntheticIds: ["synth-ultra-1220"],
          autoEnrollNext: true,
          crewId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        },
      ],
      activities: [
        {
          id: "strava-act-carla-w0-mon",
          sport: "running",
          startedAt: new Date(monday.getTime() + 1 * 86400000 + 18 * 3600000).toISOString(),
          distanceM: 10400,
          movingSec: 3180,
          avgHr: 162,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
        {
          id: "strava-act-carla-w0-sat",
          sport: "running",
          startedAt: new Date(monday.getTime() + 6 * 86400000 + 9 * 3600000).toISOString(),
          distanceM: 21100,
          movingSec: 6120,
          avgHr: 166,
          verified: true,
          source: "strava",
          provenance: "recorded",
          disposition: "counted",
        },
      ],
    };
  }

  return null;
}

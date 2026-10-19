import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { loadCompeteAccount, hydrateFieldBoard } from "./compete-persist";

const url = "http://127.0.0.1:54621";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

describe.skipIf(!process.env.SEED_DB_TESTS)("Seed accounts in Supabase (needs local supabase: SEED_DB_TESTS=1)", () => {
  it("loads Alice with full rich data after sign in", async () => {
    const supabase = createClient(url, anonKey);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "alice@example.com",
      password: "password123",
    });
    expect(authError).toBeNull();
    expect(authData.user).not.toBeNull();
    const aliceId = authData.user!.id;
    expect(aliceId).toBe("11111111-1111-4111-8111-111111111111");

    const res = await loadCompeteAccount(supabase, aliceId);
    expect(res).not.toBeNull();
    const state = res!.state;
    expect(state.name).toBe("Alice Park");
    expect(state.city).toBe("Brooklyn");
    expect(state.calibrated).toBe(true);
    expect(state.onboardingCompleted).toBe(true);
    expect(state.activities.length).toBeGreaterThanOrEqual(4);
    expect(state.sleepNights.length).toBeGreaterThanOrEqual(7);
    expect(state.periodResults.length).toBeGreaterThanOrEqual(4);
    expect(state.ratings.find(r => r.sport === "running")?.verifiedElo).toBe(1125);
    expect(state.enrollments.length).toBeGreaterThanOrEqual(1);
    expect(state.enrollments[0].crewId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    const hydratedState = await hydrateFieldBoard(supabase, aliceId, state);
    expect(hydratedState.crewBoard).not.toBeNull();
    expect(hydratedState.crewBoard!.crewName).toBe("Weekday miles");
    expect(hydratedState.crewBoard!.members.length).toBeGreaterThanOrEqual(4);
    expect(hydratedState.crewBoard!.sport).toBe("running");
    const aliceMember = hydratedState.crewBoard!.members.find(m => m.id === aliceId);
    expect(aliceMember).toBeDefined();
    expect(aliceMember!.distanceM).toBeGreaterThanOrEqual(30000);

    const { weeklyBoard } = await import("@fitness-battle/shared");
    const { buildFieldModel } = await import("../features/field/model");
    const boardRows = weeklyBoard(hydratedState, "running", "open", new Date());
    expect(boardRows.length).toBeGreaterThanOrEqual(4);
    const competitorNames = boardRows.map(r => r.name);
    expect(competitorNames).toContain("Carla Diaz");
    expect(competitorNames).toContain("Bob Chen");

    const fieldModel = buildFieldModel(hydratedState, "running", "open", new Date());
    expect(fieldModel.runners.length).toBeGreaterThanOrEqual(4);
  });

  it("loads Bob with cycling focus after sign in", async () => {
    const supabase = createClient(url, anonKey);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "bob@example.com",
      password: "password123",
    });
    expect(authError).toBeNull();
    const bobId = authData.user!.id;
    const res = await loadCompeteAccount(supabase, bobId);
    expect(res).not.toBeNull();
    const state = res!.state;
    expect(state.name).toBe("Bob Chen");
    expect(state.primary).toBe("cycling");
    expect(state.activities.length).toBeGreaterThanOrEqual(3);
    expect(state.ratings.find(r => r.sport === "cycling")?.verifiedElo).toBe(1170);
  });

  it("loads Carla with running and sleep focus after sign in", async () => {
    const supabase = createClient(url, anonKey);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "carla@example.com",
      password: "password123",
    });
    expect(authError).toBeNull();
    const carlaId = authData.user!.id;
    const res = await loadCompeteAccount(supabase, carlaId);
    expect(res).not.toBeNull();
    const state = res!.state;
    expect(state.name).toBe("Carla Diaz");
    expect(state.focus.family).toBe("health");
    expect(state.focus.id).toBe("sleep");
    expect(state.sleepNights.length).toBeGreaterThanOrEqual(3);
    expect(state.ratings.find(r => r.sport === "running")?.verifiedElo).toBe(1205);
  });

  it("loads Dana as uncalibrated after sign in", async () => {
    const supabase = createClient(url, anonKey);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "dana@example.com",
      password: "password123",
    });
    expect(authError).toBeNull();
    const danaId = authData.user!.id;
    const res = await loadCompeteAccount(supabase, danaId);
    expect(res).not.toBeNull();
    const state = res!.state;
    expect(state.name).toBe("Dana Singh");
    expect(state.city).toBe("Manhattan");
    expect(state.calibrated).toBe(false);
    expect(state.onboardingCompleted).toBe(false);
  });

  it("loads test@test.com with rich data across all tables after sign in", async () => {
    const supabase = createClient(url, anonKey);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "test@test.com",
      password: "password123",
    });
    expect(authError).toBeNull();
    expect(authData.user).not.toBeNull();
    const testId = authData.user!.id;

    const res = await loadCompeteAccount(supabase, testId);
    expect(res).not.toBeNull();
    const state = res!.state;
    expect(state.name).toBe("Test Athlete");
    expect(state.city).toBe("New York");
    expect(state.calibrated).toBe(true);
    expect(state.onboardingCompleted).toBe(true);
    expect(state.activities.length).toBeGreaterThanOrEqual(15);
    expect(state.sleepNights.length).toBeGreaterThanOrEqual(5);
    expect(state.periodResults.length).toBeGreaterThanOrEqual(4);
    expect(state.ratings.find(r => r.sport === "running")?.verifiedElo).toBe(1150);
    expect(state.ratings.find(r => r.sport === "cycling")?.verifiedElo).toBe(1060);
    expect(state.enrollments.length).toBeGreaterThanOrEqual(1);

    const hydratedState = await hydrateFieldBoard(supabase, testId, state);
    expect(hydratedState.crewBoard).not.toBeNull();
    expect(hydratedState.crewBoard!.crewName).toBe("Weekday miles");
    expect(hydratedState.crewBoard!.sport).toBe("running");
  });
});

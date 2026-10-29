// Disposable Docker-only fixtures. Never accepts a remote URL or service key.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
const require = createRequire(`${process.cwd()}/apps/web/package.json`);
const { createClient } = require("@supabase/supabase-js");
const env = Object.fromEntries(fs.readFileSync("apps/web/.env.local", "utf8").split("\n").filter(x => x.includes("=")).map(x => { const i = x.indexOf("="); return [x.slice(0, i), x.slice(i + 1)]; }));
assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "http://127.0.0.1:54621", "Local Docker URL required");
const origin = process.env.WAVE_TEST_WEB_URL ?? "http://localhost:3019";
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const created = [];
const clients = [];
const run = `${Date.now()}`;
const password = "LocalWaveTest123!";
const sql = query => execFileSync("docker", ["exec", "-i", "supabase_db_fitness-battle", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tA"], { input: query, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
async function ok(result) { const value = await result; if (value.error) throw new Error(value.error.message); return value.data; }
async function athlete(label) {
  const email = `wave-local-${run}-${label}@example.invalid`;
  const auth = await ok(service.auth.admin.createUser({ email, password, email_confirm: true }));
  const id = auth.user.id; created.push(id);
  await ok(service.from("profiles").upsert({ id, display_name: `Wave ${label}`, primary_sport: "running" }));
  await ok(service.from("athlete_prefs").upsert({ user_id: id, clock_period_start: new Date().toISOString(), onboarding_completed: true }));
  await ok(service.from("sport_ratings").upsert(["running", "cycling", "walking", "strength"].map(sport => ({ user_id: id, sport, open_elo: 1000, verified_elo: 1000, opted_in: false, lock_open: 1000, lock_verified: 1000, lock_period: new Date().toISOString() }))));
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const login = await ok(client.auth.signInWithPassword({ email, password })); clients.push(client);
  return { id, client, token: login.session.access_token };
}
async function account(person, state, revision) {
  const response = await fetch(`${origin}/api/compete`, { method: state ? "PUT" : "GET", headers: { Authorization: `Bearer ${person.token}`, "Content-Type": "application/json" },
    ...(state ? { body: JSON.stringify({ accountId: person.id, state, updatedAt: revision }) } : {}) });
  const body = await response.json();
  return { status: response.status, ...body };
}
async function enroll(person, start, end, fieldId, auto = false) {
  await ok(service.from("sport_ratings").update({ opted_in: true, lock_period: start }).eq("user_id", person.id).eq("sport", "running"));
  await ok(service.from("wave_enrollments").insert({ user_id: person.id, sport: "running", wave_start: start, week_end: end, capacity: 8,
    registered_at: new Date(Date.parse(start) - 1000).toISOString(), auto_enroll_next: auto, field_id: fieldId ?? null }));
}
const passing = name => console.log(`PASS ${name}`);
try {
  const queue = await athlete("queue");
  const initial = await account(queue); assert.equal(initial.status, 200, JSON.stringify(initial));
  const forged = structuredClone(initial.state);
  forged.ratings = forged.ratings.map(r => ({ ...r, verifiedElo: 2400, openElo: 2400, optedIn: r.sport === "running" }));
  forged.enrollments = [{ sport: "running", waveStart: "2026-01-01T00:00:00Z", weekEnd: "2026-01-08T00:00:00Z", capacity: 16, peerIds: [], syntheticIds: [], autoEnrollNext: true }];
  forged.periodResults = [{ id: "forged", sport: "running", eloAfter: 2400 }];
  forged.effortMilestones = []; forged.freezesLeft = 999;
  const registered = await account(queue, forged, initial.updatedAt);
  assert.equal(registered.status, 200, JSON.stringify(registered));
  const enrollment = registered.state.enrollments[0];
  assert.ok(Date.parse(enrollment.waveStart) > Date.now()); assert.equal(enrollment.capacity, 8);
  assert.equal(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }).format(new Date(enrollment.waveStart)), "06");
  assert.equal(registered.state.ratings.find(r => r.sport === "running").verifiedElo, 1000);
  assert.equal(registered.state.periodResults.length, 0); assert.equal(registered.state.freezesLeft, 3);
  passing("server-derived next-6am registration ignores forged scores, dates, capacity and results");
  const direct = await queue.client.rpc("save_compete_account", { p_state: forged, p_activities: [], p_readiness: [], p_expected_updated_at: registered.updatedAt });
  assert.ok(direct.error); assert.match(direct.error.message, /permission denied/);
  assert.ok((await queue.client.from("sport_ratings").update({ open_elo: 2400 }).eq("user_id", queue.id)).error);
  passing("authenticated clients cannot call the score writer or update score tables");
  const cancelledState = structuredClone(registered.state); cancelledState.enrollments = [];
  cancelledState.ratings = cancelledState.ratings.map(r => ({ ...r, optedIn: false }));
  const cancelled = await account(queue, cancelledState, registered.updatedAt); assert.equal(cancelled.status, 200, JSON.stringify(cancelled));
  assert.equal(cancelled.state.enrollments.length, 0); passing("queued registration can be cancelled without a result");

  const a = await athlete("deadline-a"), b = await athlete("deadline-b");
  const start = new Date(Date.now() - 3600000).toISOString(), end = new Date(Date.now() + 4000).toISOString();
  const field = await ok(service.from("week_fields").insert({ sport: "running", wave_start: start, week_end: end, capacity: 8, member_ids: [a.id, b.id], synthetic_ids: Array.from({ length: 6 }, (_, i) => `synth:running:${i}`), roster_locked_at: new Date().toISOString() }).select().single());
  await enroll(a, start, end, field.id); await enroll(b, start, end, field.id);
  const category = (await ok(service.from("categories").select("id").eq("slug", "running").single())).id;
  const activity = await ok(service.from("activities").insert({ user_id: a.id, provider: "strava", external_id: `on-time-${run}`, category_id: category, started_at: new Date(Date.parse(start) + 60000).toISOString(), metric_value: 5000, sport: "running", distance_m: 5000, moving_sec: 1800, avg_hr: 150, verified: true, provenance: "recorded", disposition: "counted", compete_key: `strava-on-time-${run}`, source_label: "strava" }).select().single());
  const before = await ok(a.client.rpc("week_field_roster", { p_field_id: field.id }));
  assert.equal(before.find(r => r.user_id === a.id).verified_distance_m, 5000);
  await new Promise(resolve => setTimeout(resolve, Math.max(0, Date.parse(end) - Date.now() + 250)));
  await ok(service.from("activities").insert({ user_id: b.id, provider: "strava", external_id: `late-${run}`, category_id: category, started_at: new Date(Date.parse(start) + 120000).toISOString(), metric_value: 10000, sport: "running", distance_m: 10000, moving_sec: 3600, verified: true, provenance: "recorded", disposition: "counted", compete_key: `strava-late-${run}`, source_label: "strava" }));
  await ok(service.from("activities").update({ distance_m: 9000, metric_value: 9000, disposition: "excluded" }).eq("id", activity.id));
  const frozen = await ok(b.client.rpc("week_field_roster", { p_field_id: field.id }));
  assert.equal(frozen.find(r => r.user_id === a.id).verified_distance_m, 5000);
  assert.equal(frozen.find(r => r.user_id === b.id).verified_distance_m, 0);
  const resultA = await account(a), resultB = await account(b);
  assert.equal(resultA.status, 200, JSON.stringify(resultA)); assert.equal(resultB.status, 200, JSON.stringify(resultB));
  assert.equal(resultA.state.periodResults.find(r => r.track === "verified").distanceM, 5000);
  assert.equal(resultB.state.periodResults.find(r => r.track === "verified").distanceM, 0);
  const storedB = await ok(service.from("sport_ratings").select("verified_elo").eq("user_id", b.id).eq("sport", "running").single());
  assert.equal(Number(storedB.verified_elo), resultB.state.ratings.find(r => r.sport === "running").verifiedElo);
  const historyB = resultB.state.activities.find(r => r.id === `strava-late-${run}`); assert.equal(historyB.distanceM, 10000);
  const replay = await ok(b.client.rpc("competition_replay", { p_sport: "running", p_start: start, p_end: end, p_track: "verified" }));
  assert.equal(replay.events.length, 1); assert.equal(replay.events[0].distanceM, 5000);
  passing("closed roster, both settlements and replay ignore late imports/edits while training retains them");

  const flight = await athlete("in-flight");
  const flightStart = new Date(Date.now() - 3600000).toISOString(), flightEnd = new Date(Date.now() + 2500).toISOString();
  const flightField = await ok(service.from("week_fields").insert({ sport: "running", wave_start: flightStart, week_end: flightEnd, capacity: 8, member_ids: [flight.id], roster_locked_at: new Date().toISOString() }).select().single());
  await enroll(flight, flightStart, flightEnd, flightField.id);
  const writer = spawn("docker", ["exec", "-i", "supabase_db_fitness-battle", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { stdio: ["pipe", "pipe", "pipe"] });
  let writerError = "", writerFinished = false;
  writer.stderr.on("data", bytes => { writerError += bytes; }); writer.stdout.resume();
  const written = new Promise((resolve, reject) => { writer.on("error", reject); writer.on("close", code => { writerFinished = true; code === 0 ? resolve() : reject(new Error(writerError)); }); });
  writer.stdin.end(`begin; insert into public.activities(id,user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,verified,provenance,disposition,compete_key)
    values('${randomUUID()}','${flight.id}','strava','in-flight-${run}','${category}','${flightStart}',6000,'running',6000,1800,true,'recorded','counted','strava-in-flight-${run}'); select pg_sleep(3); commit;`);
  await new Promise(resolve => setTimeout(resolve, Math.max(0, Date.parse(flightEnd) - Date.now() + 30)));
  assert.equal(writerFinished, false, "reader must overlap the in-flight accepted transaction");
  const flightRoster = await ok(flight.client.rpc("week_field_roster", { p_field_id: flightField.id }));
  await written;
  assert.equal(flightRoster.find(r => r.user_id === flight.id).verified_distance_m, 6000);
  passing("deadline read waits for an accepted in-flight transaction and sees its committed facts");

  const peers = await Promise.all(Array.from({ length: 16 }, (_, i) => athlete(`concurrent-${i}`)));
  const waveStart = new Date(Date.now() - 2000).toISOString();
  const waveEnd = new Date(sql("select private.wave_week_end(clock_timestamp());")).toISOString();
  await Promise.all(peers.map(person => enroll(person, waveStart, waveEnd)));
  const resolved = await Promise.all(peers.map(person => ok(person.client.rpc("resolve_week_field", { p_sport: "running", p_wave_start: waveStart, p_week_end: waveEnd }))));
  assert.equal(new Set(resolved.map(f => f.id)).size, 2);
  for (let i = 0; i < peers.length; i++) { assert.ok(resolved[i].member_ids.includes(peers[i].id)); assert.equal(resolved[i].member_ids.length, 8); }
  const unique = [...new Map(resolved.map(f => [f.id, f])).values()];
  assert.equal(new Set(unique.flatMap(f => f.member_ids)).size, 16);
  passing("16 simultaneous authenticated roster resolutions produce two consistent eight-person fields");
  const current = await account(peers[0]); assert.equal(current.status, 200, JSON.stringify(current));
  const saves = await Promise.all(["One", "Two"].map(name => account(peers[0], { ...current.state, name }, current.updatedAt)));
  assert.deepEqual(saves.map(x => x.status).sort(), [200, 409]);
  passing("simultaneous account saves accept one revision and reject the stale write");
  console.log("All local wave checks passed.");
} finally {
  for (const client of clients) await client.auth.signOut().catch(() => {});
  if (created.length) await service.from("week_fields").delete().overlaps("member_ids", created);
  for (const id of created) await service.auth.admin.deleteUser(id).catch(() => {});
}

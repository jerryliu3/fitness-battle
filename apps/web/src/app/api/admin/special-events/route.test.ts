import { beforeEach, expect, it, vi } from "vitest";
import { buildSpecialEventPreset } from "@fitness-battle/shared";

const mock = vi.hoisted(() => ({ actor: "admin-1" as string | null, rpc: vi.fn(), from: vi.fn(), database: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ authorizeAdmin: async () => mock.actor, adminDatabase: mock.database }));
import { GET, PATCH, POST } from "./route";

const draft = { ...buildSpecialEventPreset("daily_survivor", "running", new Date("2026-11-18T20:00:00.000Z")), id: null };
const post = (body: unknown = draft) =>
  POST(new Request("https://test/api/admin/special-events", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  mock.actor = "admin-1";
  mock.database.mockReturnValue({ rpc: mock.rpc, from: mock.from });
});

it("enforces admin authorization and same-origin writes", async () => {
  mock.actor = null;
  expect((await GET(new Request("https://test/api/admin/special-events"))).status).toBe(403);
  expect((await post()).status).toBe(403);
  mock.actor = "admin-1";
  const cross = new Request("https://test/api/admin/special-events", {
    method: "POST",
    headers: { origin: "https://evil.example" },
    body: JSON.stringify(draft),
  });
  expect((await POST(cross)).status).toBe(403);
  expect(mock.database).not.toHaveBeenCalled();
});

it("validates payload before touching the service client", async () => {
  expect((await post({ ...draft, slug: "BAD SLUG!" })).status).toBe(400);
  expect(mock.rpc).not.toHaveBeenCalled();
});

it("saves editions through admin_save_special_event_edition with server actor", async () => {
  mock.rpc.mockResolvedValue({
    data: {
      id: "00000000-0000-4000-8000-000000000099",
      slug: draft.slug,
      series_key: draft.seriesKey,
      sport: draft.sport,
      title: draft.title,
      subtitle: draft.subtitle,
      rules_version: 1,
      config: draft.config,
      registration_opens_at: draft.registrationOpensAt,
      registration_closes_at: draft.registrationClosesAt,
      starts_at: draft.startsAt,
      ends_at: draft.endsAt,
      published: false,
      finalized_at: null,
      settled_at: null,
      created_at: "2026-11-18T20:00:00.000Z",
      updated_at: "2026-11-18T20:00:00.000Z",
    },
    error: null,
  });
  const res = await post({ ...draft, actor: "forged" });
  expect(res.status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith(
    "admin_save_special_event_edition",
    expect.objectContaining({ p_actor_id: "admin-1", p_slug: draft.slug }),
  );
});

it("maps duplicate slugs to 409 conflict", async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });
  expect((await post()).status).toBe(409);
});

it("advances editions via PATCH for admin QA", async () => {
  const id = "00000000-0000-4000-8000-000000000099";
  mock.rpc.mockResolvedValue({ data: { id, finalizedAt: "2026-11-23T11:00:00Z", settledAt: null }, error: null });
  const res = await PATCH(new Request("https://test/api/admin/special-events", { method: "PATCH", body: JSON.stringify({ editionId: id, action: "finalize" }) }));
  expect(res.status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith("admin_advance_special_event", { p_actor_id: "admin-1", p_edition_id: id, p_action: "finalize" });
});

it("saves repeating templates and triggers template scheduler", async () => {
  mock.rpc.mockResolvedValueOnce({
    data: {
      id: "00000000-0000-4000-8000-000000000077",
      series_key: draft.seriesKey,
      sport: draft.sport,
      title: draft.title,
      subtitle: draft.subtitle,
      config: draft.config,
      cadence_weeks: 2,
      active: true,
      next_start_at: draft.startsAt,
    },
    error: null,
  });
  const saveRes = await post({
    kind: "template",
    id: null,
    seriesKey: draft.seriesKey,
    sport: draft.sport,
    title: draft.title,
    subtitle: draft.subtitle,
    config: draft.config,
    cadenceWeeks: 2,
    active: true,
    nextStartAt: draft.startsAt,
  });
  expect(saveRes.status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith(
    "admin_save_special_event_template",
    expect.objectContaining({ p_actor_id: "admin-1", p_series_key: draft.seriesKey, p_cadence_weeks: 2 }),
  );

  mock.rpc.mockResolvedValueOnce({ data: 2, error: null });
  const runRes = await PATCH(new Request("https://test/api/admin/special-events", {
    method: "PATCH",
    body: JSON.stringify({ action: "materialize_templates" }),
  }));
  expect(runRes.status).toBe(200);
  expect(await runRes.json()).toEqual({ created: 2 });
  expect(mock.rpc).toHaveBeenCalledWith("admin_run_special_event_templates", { p_actor_id: "admin-1" });
});

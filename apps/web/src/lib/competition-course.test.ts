import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ snapshot: vi.fn(), catalog: vi.fn(), route: vi.fn(), save: vi.fn(), from: vi.fn(), filter: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./competition-authority", () => ({ competitionAuthorityDatabase: () => ({ from: mock.from }) }));
import { registeredCompetitionCourse } from "./competition-course";
const start = "2026-11-09T11:00:00Z", end = "2026-11-16T05:00:00Z";
const frozen = { route_name: "Frozen course", coordinates: [[0, 0], [.02, 0]] };
beforeEach(() => {
  vi.resetAllMocks();
  mock.from.mockImplementation((table: string) => {
    const query = { select: () => query, eq: (...args: unknown[]) => { mock.filter(table, ...args); return query; }, order: mock.catalog, maybeSingle: mock.snapshot, single: mock.route, upsert: mock.save };
    return query;
  });
  mock.save.mockResolvedValue({ error: null });
});
it("returns the frozen geometry without consulting the editable catalog", async () => {
  mock.snapshot.mockResolvedValue({ data: frozen, error: null });
  const result = await registeredCompetitionCourse(start, end);
  expect(result.name).toBe(frozen.route_name);
  expect(result.coordinates).toEqual(frozen.coordinates);
  expect(mock.catalog).not.toHaveBeenCalled();
  expect(mock.save).not.toHaveBeenCalled();
});
it("returns the persisted winner if another reader assigns a route concurrently", async () => {
  mock.snapshot.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: frozen, error: null });
  mock.catalog.mockResolvedValue({ data: [{ id: "a" }, { id: "b" }, { id: "c" }], error: null });
  mock.route.mockResolvedValue({ data: { id: "candidate", name: "Candidate course", coordinates: [[1, 1], [1.02, 1]] }, error: null });
  const result = await registeredCompetitionCourse(start, end);
  const ids = ["a", "b", "c"];
  expect(mock.filter).toHaveBeenCalledWith("race_routes", "id", ids[Math.floor(Date.parse(start) / 604_800_000) % ids.length]);
  expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({ wave_start: start, route_name: "Candidate course" }), { onConflict: "wave_start", ignoreDuplicates: true });
  expect(result.name).toBe("Frozen course");
  expect(result.coordinates).toEqual(frozen.coordinates);
});
it("does not invent a preview when the active catalog is empty", async () => {
  mock.snapshot.mockResolvedValue({ data: null, error: null });
  mock.catalog.mockResolvedValue({ data: [], error: null });
  await expect(registeredCompetitionCourse(start, end)).rejects.toThrow("competition_route_unavailable");
  expect(mock.save).not.toHaveBeenCalled();
});
it("does not return an uncommitted candidate after a failed freeze", async () => {
  mock.snapshot.mockResolvedValue({ data: null, error: null });
  mock.catalog.mockResolvedValue({ data: [{ id: "a" }], error: null });
  mock.route.mockResolvedValue({ data: { id: "a", name: "Candidate", coordinates: [[0, 0], [.02, 0]] }, error: null });
  mock.save.mockResolvedValue({ error: new Error("Write failed") });
  await expect(registeredCompetitionCourse(start, end)).rejects.toThrow("Write failed");
});

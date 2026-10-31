import { expect, it, vi } from "vitest";
import { loadEffortScoreEvents } from "./compete-persist";

it("loads every owner event, including identical timestamps across page boundaries", async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => ({ id: i + 1, sport: "running", track: "open", occurred_at: "2026-10-31T12:00:00Z", score_before: String(1000 + i), score_after: String(1001 + i) }));
  const owner = vi.fn();
  const page = vi.fn();
  const db = { from: (table: string) => {
    expect(table).toBe("effort_score_events");
    const query = { select: () => query, eq: (column: string, id: string) => { owner(column, id); return query; }, order: () => query,
      range: async (start: number, end: number) => { page(start, end); return { data: rows.slice(start, end + 1), error: null }; } };
    return query;
  } };
  const events = await loadEffortScoreEvents(db as never, "owner");
  expect(events).toHaveLength(1001);
  expect(new Set(events.map(event => event.id)).size).toBe(1001);
  expect(events.at(-1)).toMatchObject({ id: "1001", scoreBefore: 2000, scoreAfter: 2001 });
  expect(owner).toHaveBeenCalledWith("user_id", "owner");
  expect(page.mock.calls).toEqual([[0, 999], [1000, 1999]]);
});

it("reports unavailable history rather than returning a fabricated empty series", async () => {
  const query = { select: () => query, eq: () => query, order: () => query, range: async () => ({ data: null, error: { message: "unavailable" } }) };
  await expect(loadEffortScoreEvents({ from: () => query } as never, "owner")).rejects.toThrow("score_history_unavailable");
});

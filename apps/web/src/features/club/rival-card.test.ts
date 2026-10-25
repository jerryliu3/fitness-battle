import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const fixtures = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("@fitness-battle/shared", async importOriginal => ({ ...await importOriginal<typeof import("@fitness-battle/shared")>(), weeklyBoard: () => fixtures.rows }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: { children: ReactNode }) => createElement("a", props, children) }));
import { freshState } from "@fitness-battle/shared";
import { RivalCard } from "./rival-card";
it("renders an ordinal and the leader's trailing-rival gap while retaining the sport destination", () => {
  const state = freshState();
  state.primary = "running";
  state.units = "metric";
  state.ratings = state.ratings.map(r => ({ ...r, optedIn: r.sport === "running" }));
  fixtures.rows = [
    { id: "you", name: "Alex", you: true, place: 1, distanceM: 6000, effort: 0 },
    { id: "mara", name: "Mara Chen", you: false, place: 2, distanceM: 5000, effort: 0 },
  ];
  const html = renderToStaticMarkup(createElement(RivalCard, { state }));
  expect(html).toContain("1st");
  expect(html).toContain("1.0 km ahead of Mara");
  expect(html).toContain("Closest rival in your field");
  expect(html).toContain('href="/arena?event=running"');
  expect(html).not.toContain(" / ");
});

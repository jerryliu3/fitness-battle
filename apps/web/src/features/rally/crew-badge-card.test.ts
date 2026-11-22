import { act, create } from "react-test-renderer";
import { createElement, type ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { CrewBadgeCard } from "./crew-badge-card";

vi.mock("@/ui/sheet", () => ({ Sheet: ({ open, children }: { open: boolean; children: ReactNode }) => open ? children : null }));

it("opens the badge collection with earned results and requirements for unearned badges", async () => {
  let view!: ReturnType<typeof create>;
  await act(async () => {
    view = create(createElement(CrewBadgeCard, {
      crewName: "Sunday Striders",
      badges: [{ code: "full_crew", earned_at: "2026-11-16T05:00:00Z", contributors: 4, roster_size: 4 }],
    }));
  });
  expect(view.root.findAllByProps({ className: "crew-passport-seal" })).toHaveLength(4);
  expect(view.root.findAllByType("li")).toHaveLength(0);
  await act(async () => view.root.findByType("button").props.onClick());
  expect(view.root.findAllByType("li")).toHaveLength(4);
  const contents = JSON.stringify(view.toJSON());
  expect(contents).toContain("4 of 4 contributed");
  expect(contents).toContain("Reach a Weekly Contract target.");
  expect(contents).not.toContain("Crew highlights");
  await act(async () => view.unmount());
});

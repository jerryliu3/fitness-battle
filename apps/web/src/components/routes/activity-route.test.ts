import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { encodePolyline, type Activity } from "@fitness-battle/shared";

vi.mock("@/components/auth-context", () => ({ useAuth: () => ({ user: null, offlineMode: true }) }));
vi.mock("next/dynamic", () => ({ default: () => (props: object) => createElement("replay", props) }));
vi.mock("@/ui/sheet", () => ({ Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? children : null }));
vi.mock("@/lib/env", () => ({ webEnv: { mapboxAccessToken: "pk.test" } }));
import { ActivityRoute } from "./activity-route";

const activity: Activity = { id: "strava-42", sport: "running", startedAt: "2026-10-23T12:00:00Z", distanceM: 5000, movingSec: 1800, avgHr: null, verified: true, source: "strava", summaryPolyline: encodePolyline([[-122.4, 37.8], [-122.41, 37.81]]) };

describe("activity route entry", () => {
  it("opens a paused 2D viewer on demand and identifies the full PR activity", async () => {
    let view: ReturnType<typeof create>;
    await act(async () => { view = create(createElement(ActivityRoute, { activity, milestone: true })); });
    expect(view!.root.findAllByType("replay" as never)).toHaveLength(0);
    await act(async () => view!.root.findByProps({ className: "club-route-open" }).props.onClick());
    expect(view!.root.findByType("replay" as never).props).toMatchObject({ mode: "2d-overview", autoPlay: false });
    expect(JSON.stringify(view!.toJSON())).toContain("the record segment is not identified");
    await act(async () => view!.unmount());
  });

  it("omits maps for activities without recorded geometry", async () => {
    let view: ReturnType<typeof create>;
    await act(async () => { view = create(createElement(ActivityRoute, { activity: { ...activity, summaryPolyline: null } })); });
    expect(view!.toJSON()).toBeNull();
    await act(async () => view!.unmount());
  });
});

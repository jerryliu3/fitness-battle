import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getPoseRig } from "@/lib/vitals-pose-dev-server";

vi.mock("@/lib/vitals-pose-dev-server", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/vitals-pose-dev-server")>(),
  getPoseRig: vi.fn(async () => '{"poseParameterization":"local-ref"}'),
}));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("Anny rig development boundary", () => {
  it("does not export in production or off localhost", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await GET(new Request("http://localhost/api/dev/vitals-pose/rig?sex=male"))).status).toBe(404);
    vi.stubEnv("NODE_ENV", "development");
    expect((await GET(new Request("https://example.com/api/dev/vitals-pose/rig?sex=male"))).status).toBe(404);
    expect(getPoseRig).not.toHaveBeenCalled();
  });
  it("validates sex before starting Python", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await GET(new Request("http://localhost/api/dev/vitals-pose/rig?sex=other"))).status).toBe(400);
    expect(getPoseRig).not.toHaveBeenCalled();
  });
  it("returns rig data without caching the response", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await GET(new Request("http://localhost/api/dev/vitals-pose/rig?sex=female"));
    expect(getPoseRig).toHaveBeenCalledWith("female");
    expect(await response.json()).toEqual({ poseParameterization: "local-ref" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

vi.mock("@/lib/vitals-pose-dev-server", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/vitals-pose-dev-server")>();
  const { mergePoseFile } = await import("@/lib/vitals-pose");
  return {
    ...original,
    readMergedPoseFile: vi.fn(async () => mergePoseFile(undefined)),
    writeMergedPoseFile: vi.fn(async (bones) => mergePoseFile(bones)),
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("vitals-pose dev route", () => {
  it("returns 404 off localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      (await GET(new Request("https://example.com/api/dev/vitals-pose"))).status,
    ).toBe(404);
  });

  it("returns defaults on localhost", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await GET(new Request("http://localhost:3000/api/dev/vitals-pose"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { bones: { "upperarm01.L": { z: number } } };
    expect(body.bones["upperarm01.L"].z).toBe(-76);
  });

  it("persists pose on localhost POST", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await POST(
      new Request("http://127.0.0.1:3000/api/dev/vitals-pose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bones: { "upperarm01.L": { x: -18, y: 0, z: -80 } },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; bones: { "upperarm01.L": { z: number } } };
    expect(body.ok).toBe(true);
    expect(body.bones["upperarm01.L"].z).toBe(-80);
  });
});

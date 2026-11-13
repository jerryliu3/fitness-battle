import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const POSE_FILE = path.resolve(process.cwd(), "../../body-pipeline/local/pose.json");

beforeEach(async () => {
  await rm(POSE_FILE, { force: true });
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
